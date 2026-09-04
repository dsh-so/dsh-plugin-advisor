import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineTool } from '@deepseek-ai/dsh-tools';
import Schema from '@deepseek-ai/schemastery';
import { findMatches } from './match.js';
export const name = 'dsh-plugin-finder';
export const inject = ['tools'];
export const Config = Schema.object({
    indexUrl: Schema.string().default('https://www.dsh.so/plugins-index.json'),
    maxResults: Schema.number().default(5),
    cacheTtlMs: Schema.number().default(12 * 60 * 60 * 1000).description('索引缓存有效期；默认 12 小时，即一天最多拉取 2 次。'),
    timeoutMs: Schema.number().default(15000),
    attribution: Schema.boolean().default(true),
    minVerificationLevel: Schema.number().default(5).description('结果默认需达到的最低验证等级（L1–L5），0 表示不过滤。'),
    requireLowRisk: Schema.boolean().default(true).description('默认只返回安全审计通过（audited）的插件；warning 级发现可接受，仅排除 high/critical 风险。'),
});
/** Version constant — keep in sync with package.json on release. */
const VERSION = '0.1.9';
/** Footer promoting dsh.so and carrying the copyright/license notice. */
function footer(config) {
    if (config.attribution === false)
        return '';
    return ('\n\n---\n' +
        'Powered by dsh.so — the DeepSeek Harness plugin registry · https://www.dsh.so\n' +
        `dsh-plugin-advisor v${VERSION} · © 2026 zhoushimin · Apache-2.0`);
}
/** Plain-language verification badge (novice-friendly). */
function verificationBadge(v) {
    if (!v?.level)
        return null;
    return `🏅 ${v.label || `L${v.level}`}`;
}
/** Plain-language security badge (novice-friendly). */
function securityBadge(s) {
    if (!s)
        return null;
    if (s.status === 'pending' || s.riskLevel === 'unknown')
        return '⏳ 安全检测进行中';
    if (s.status === 'failed')
        return '❓ 安全检测未通过';
    if (s.riskLevel === 'high' || s.riskLevel === 'critical')
        return '🚨 安全警告:高风险';
    if (s.riskLevel === 'medium') {
        const n = s.counts && s.counts.critical > 0 ? `(${s.counts.critical} 个严重问题)` : '';
        return `⚠️ 安全提示:中风险${n}`;
    }
    return '🔒 安全通过:低风险';
}
/** Default quality gate: verification level + audited low-risk security scan. */
function meetsQualityGate(entry, config) {
    if (config.minVerificationLevel > 0 && (entry.verification?.level ?? 0) < config.minVerificationLevel) {
        return false;
    }
    if (config.requireLowRisk) {
        const s = entry.security;
        // audited with low/medium risk passes; warning-level findings are fine.
        // Only high/critical risk and un-audited entries are excluded.
        if (!s || s.status !== 'audited')
            return false;
        if (s.riskLevel !== 'low' && s.riskLevel !== 'medium')
            return false;
    }
    return true;
}
const STOPWORDS = new Set([
    'i', 'me', 'my', 'we', 'you', 'the', 'a', 'an', 'to', 'for', 'of', 'in', 'on', 'with', 'and', 'or',
    'want', 'need', 'can', 'do', 'does', 'is', 'are', 'please', 'help', 'some', 'any', 'my', 'our',
    '给', '我', '想', '要', '的', '了', '帮', '找', '一个', '这个', '那个', '可以', '需要', '希望', '请问',
]);
/** Extract meaningful keywords from a natural-language capability request. */
function keywordsOf(text) {
    const words = text
        .toLowerCase()
        .split(/[\s\p{P}]+/u)
        .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
    // also split camelCase tool words like "OCR" or "tui" survive; CJK runs stay whole
    return [...new Set(words)].slice(0, 24);
}
/**
 * Heuristic capability check: a request is "covered" only when installed tool
 * names/descriptions mention enough of the query's keywords. Best-effort only —
 * the model's own AUTO-TRIGGER judgment stays authoritative.
 */
function installedCoverage(schemas, query) {
    const kws = keywordsOf(query);
    if (!kws.length)
        return { gap: true, coveredBy: [] };
    const scored = schemas
        .map((s) => {
        const hay = `${s.name ?? ''} ${(s.description ?? '')}`.toLowerCase();
        let hits = 0;
        for (const k of kws) {
            if (hay.includes(k))
                hits += 1;
            else if (k.length >= 3 && hay.split(/\s+/).some((w) => w.startsWith(k.slice(0, 3))))
                hits += 0.5;
        }
        return { name: s.name ?? '', score: hits / kws.length };
    })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    const best = scored[0]?.score ?? 0;
    return {
        gap: best < 0.34,
        coveredBy: scored.filter((x) => x.score >= 0.34).map((x) => x.name),
    };
}
/**
 * Validate an install target before it reaches the shell. Accepts npm package
 * names (scoped or not, with optional @version) and github: owner/repo specs.
 * Everything else — shell metacharacters, flags, URLs — is rejected.
 */
function sanitizeInstallTarget(raw) {
    const target = raw.trim();
    if (!target || target.length > 200)
        return null;
    const npm = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(@[a-z0-9-_.^~]*)?$/i;
    const git = /^github:[a-z0-9][a-z0-9-]*\/[a-z0-9._-]+$/i;
    return npm.test(target) || git.test(target) ? target : null;
}
/** Run `dsh plugin --profile <profile> add <target>` and capture its output. */
function runInstall(target, profile) {
    const cmdline = `dsh plugin --profile ${profile} add ${target}`;
    const r = spawnSync(cmdline, {
        shell: true,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 5 * 60 * 1000,
    });
    const log = ((r.stdout || '') + (r.stderr || '')).trim();
    return { ok: r.status === 0, log: log || (r.error ? String(r.error) : `exit ${r.status}`) };
}
/** Run `dsh plugin --profile <profile> remove <pkg>` (package name only) and capture its output. */
function runRemove(pkg, profile) {
    const cmdline = `dsh plugin --profile ${profile} remove ${pkg}`;
    const r = spawnSync(cmdline, {
        shell: true,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 5 * 60 * 1000,
    });
    const log = ((r.stdout || '') + (r.stderr || '')).trim();
    return { ok: r.status === 0, log: log || (r.error ? String(r.error) : `exit ${r.status}`) };
}
let cache = null;
/** Disk-backed cache so the fetch budget survives profile restarts. */
function cacheFileFor(indexUrl) {
    const hash = createHash('sha256').update(indexUrl).digest('hex').slice(0, 16);
    const dir = join(tmpdir(), 'dsh-plugin-advisor');
    try {
        mkdirSync(dir, { recursive: true });
    }
    catch { }
    return join(dir, `index-${hash}.json`);
}
function readDiskCache(indexUrl) {
    try {
        const file = cacheFileFor(indexUrl);
        if (!existsSync(file))
            return null;
        const parsed = JSON.parse(readFileSync(file, 'utf8'));
        if (!parsed || typeof parsed.at !== 'number' || !Array.isArray(parsed.entries))
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
function writeDiskCache(indexUrl, at, entries) {
    try {
        writeFileSync(cacheFileFor(indexUrl), JSON.stringify({ at, entries }));
    }
    catch { }
}
async function loadIndex(config, signal) {
    const now = Date.now();
    if (cache && now - cache.at < config.cacheTtlMs)
        return cache.entries;
    const disk = readDiskCache(config.indexUrl);
    if (disk && now - disk.at < config.cacheTtlMs) {
        cache = disk;
        return disk.entries;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.timeoutMs);
    signal?.addEventListener('abort', () => ctrl.abort(), { once: true });
    try {
        const res = await fetch(config.indexUrl, {
            signal: ctrl.signal,
            headers: { 'user-agent': 'dsh-plugin-advisor/0.1' },
        });
        if (!res.ok)
            throw new Error('dsh.so index request failed: HTTP ' + res.status);
        const json = (await res.json());
        const entries = json.plugins || [];
        cache = { at: now, entries };
        writeDiskCache(config.indexUrl, now, entries);
        return entries;
    }
    catch (e) {
        // Stale cache is far better than no cache when offline / rate-limited.
        if (disk)
            return disk.entries;
        throw e;
    }
}
export function apply(ctx, config) {
    ctx.tools.register(defineTool({
        name: 'plugin_advisor',
        description: 'Search the dsh.so registry of DeepSeek Harness plugins for ones that match a need. ' +
            'AUTO-TRIGGER: whenever the user asks to do something that none of your currently available tools can do, ' +
            'call this tool with a short description of the needed capability before telling the user it is not possible. ' +
            'By default only returns plugins with L5 (run-tested) verification and an audited security scan (warning-level findings are acceptable; high/critical risk is excluded). ' +
            'Returns plugin name, GitHub stars, topics, verification level (L1–L5), security status/risk, ' +
            'an install command, and a detail link. Use when the user wants to find, compare, or install a dsh plugin.',
        parameters: {
            query: {
                type: 'string',
                description: 'What the user wants to do, e.g. "vision OCR screenshots", "terminal TUI", "memory rag", "price tracking". ' +
                    'Required when `install` is not passed.',
            },
            limit: {
                type: 'number',
                description: 'Maximum number of results (default: from plugin config).',
            },
            install: {
                type: 'string',
                description: 'Install target to install now, e.g. "dsh-vision-router", "@scope/pkg@1.2.0" or "github:owner/repo". ' +
                    'ONLY pass this after the user explicitly confirmed installation; run the search first, then ask.',
            },
            profile: {
                type: 'string',
                description: 'dsh profile to install into (default "web").',
            },
            remove: {
                type: 'string',
                description: 'Package name to uninstall now, e.g. "dsh-vision-router". ' +
                    'ONLY pass this after the user confirmed removal. 用于用后即焚：任务完成后按用户意愿移除临时安装的插件。',
            },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: true,
                properties: {
                    matches: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: true,
                            properties: {
                                name: { type: 'string' },
                                description: { type: 'string' },
                                stars: { type: 'number' },
                                topics: { type: 'array', items: { type: 'string' } },
                                install: { type: 'string' },
                                url: { type: 'string' },
                                verification: {
                                    type: 'object',
                                    additionalProperties: true,
                                    properties: {
                                        level: { type: 'number' },
                                        label: { type: 'string' },
                                        lastVerifiedAt: { oneOf: [{ type: 'string' }, { type: 'null' }] },
                                    },
                                },
                                security: {
                                    type: 'object',
                                    additionalProperties: true,
                                    properties: {
                                        status: { type: 'string' },
                                        riskLevel: { type: 'string' },
                                        scannedAt: { oneOf: [{ type: 'string' }, { type: 'null' }] },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            render: (_args, value) => {
                const matches = value.matches || [];
                if (!matches.length) {
                    return [
                        {
                            type: 'text',
                            text: '没有找到完全匹配的 dsh.so 插件。已自动用更宽泛的关键词再试一次也没有结果。\n' +
                                '可以直接告诉用户：该需求暂时没有现成插件，可关注 dsh.so 的更新，或描述更具体的需求换个说法再试。' +
                                footer(config),
                        },
                    ];
                }
                const top = matches[0];
                const value2 = value;
                const vb = verificationBadge(top.verification);
                const sb = securityBadge(top.security);
                const badges = [vb, sb].filter(Boolean).join(' · ');
                const head = value2.capabilityGap
                    ? '🧭 当前已安装的工具不具备这个能力，帮你找到了最匹配的插件：'
                    : '✅ 帮你找到了最匹配的插件：';
                const covered = value2.capabilityGap && value2.alreadyCoveredBy?.length
                    ? `（最接近的已有工具: ${value2.alreadyCoveredBy.join('、')}，供参考）\n`
                    : '';
                const card = `${head}\n` +
                    covered +
                    `\n🏆 推荐：「${top.name}」${top.stars ? ` · ${top.stars.toLocaleString('en-US')}★` : ''}${(top.topics || []).length ? ` · ${(top.topics || []).join('/')}` : ''}${badges ? `\n   ${badges}` : ''}\n` +
                    `   ${top.description}\n` +
                    `   详情: ${top.url}\n\n` +
                    `👉 直接回复「安装」即可自动装好（无需手动敲命令）；装完重启一次 dsh web 即可使用。`;
                const others = matches.slice(1);
                const altBlock = others.length
                    ? '\n\n📋 备选（如对推荐不满意可换）：\n' +
                        others
                            .map((m, i) => {
                            const b2 = [verificationBadge(m.verification), securityBadge(m.security)].filter(Boolean).join(' · ');
                            return `${i + 2}. ${m.name}${m.stars ? ` — ${m.stars.toLocaleString('en-US')}★` : ''}${b2 ? ` · ${b2}` : ''}\n   ${m.description.slice(0, 120)}${m.description.length > 120 ? '…' : ''}\n   ${m.install}`;
                        })
                            .join('\n')
                    : '';
                return [{ type: 'text', text: card + altBlock + footer(config) }];
            },
        },
        async execute(args, exec) {
            const removeRaw = String(args.remove ?? '').trim();
            if (removeRaw) {
                const pkg = sanitizeInstallTarget(removeRaw);
                if (!pkg || pkg.startsWith('github:')) {
                    const out = {};
                    out.removed = false;
                    out.error = `Rejected remove target "${removeRaw}" — pass an installed npm package name (as shown in dsh plugin list).`;
                    return out;
                }
                const profile = String(args.profile ?? 'web').replace(/[^a-z0-9_-]/gi, '') || 'web';
                const { ok, log } = runRemove(pkg, profile);
                const out = {};
                out.removed = ok;
                out.target = pkg;
                out.profile = profile;
                out.log = log.slice(-4000);
                out.note = ok
                    ? `Removed ${pkg} from profile "${profile}". It unloads on the next dsh web restart — remind the user to restart.`
                    : log.includes('ERR_PNPM_IGNORED_BUILDS')
                        ? 'pnpm exited non-zero because another dependency in this profile has unapproved build scripts (unrelated to this removal). Run `pnpm approve-builds` in the profile directory, then retry.'
                        : 'Remove failed — show the log to the user.';
                return out;
            }
            const installRaw = String(args.install ?? '').trim();
            if (installRaw) {
                const target = sanitizeInstallTarget(installRaw);
                const out = {};
                if (!target) {
                    out.installed = false;
                    out.error = `Rejected install target "${installRaw}" — not a valid npm package name or github:owner/repo spec.`;
                    return out;
                }
                const profile = String(args.profile ?? 'web').replace(/[^a-z0-9_-]/gi, '') || 'web';
                const { ok, log } = runInstall(target, profile);
                out.installed = ok;
                out.target = target;
                out.profile = profile;
                out.log = log.slice(-4000);
                out.note = ok
                    ? `Installed ${target} into profile "${profile}". It loads on the next dsh web restart — remind the user to restart. ` +
                        `用后即焚：当用户借助该插件完成任务后，主动提醒可以移除它（再次调用本工具传 remove 参数即可）；用户确认后执行移除。`
                    : log.includes('ERR_PNPM_IGNORED_BUILDS')
                        ? 'pnpm exited non-zero because another dependency in this profile has unapproved build scripts (unrelated to this install). Run `pnpm approve-builds` in the profile directory, then retry the install.'
                        : 'Install failed — show the log to the user.';
                return out;
            }
            const query = String(args.query ?? '').trim();
            if (!query) {
                const out = { matches: [], error: 'Pass either `query` (to search) or `install` (to install a confirmed target).' };
                return out;
            }
            const limit = Math.min(Math.max(1, Number(args.limit) || config.maxResults), 10);
            const entries = await loadIndex(config, exec.signal);
            const gated = entries.filter((e) => meetsQualityGate(e, config));
            const coverage = installedCoverage(ctx.tools.schemas(), query);
            return {
                capabilityGap: coverage.gap,
                ...(coverage.coveredBy.length ? { alreadyCoveredBy: coverage.coveredBy } : {}),
                matches: findMatches(gated, query, limit).map((e) => ({
                    name: e.name,
                    description: e.description,
                    stars: e.stars,
                    topics: e.topics,
                    install: e.install,
                    url: e.url,
                    ...(e.verification ? { verification: e.verification } : {}),
                    ...(e.security ? { security: e.security } : {}),
                })),
            };
        },
    }));
}
