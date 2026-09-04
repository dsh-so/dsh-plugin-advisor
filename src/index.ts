import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import Schema from '@deepseek-ai/schemastery'
import { findMatches } from './match.js'
import type { IndexEntry, IndexVerification, IndexSecurity } from './match.js'

export const name = 'dsh-plugin-finder'
export const inject = ['tools']

export interface Config {
  /** URL of the machine-readable dsh.so plugin index. */
  indexUrl: string
  /** Default result count when the model does not pass a limit. */
  maxResults: number
  /** How long to reuse the fetched index before refetching. */
  cacheTtlMs: number
  /** Abort the fetch after this many milliseconds. */
  timeoutMs: number
  /** Append a "Powered by dsh.so" promotion and copyright footer to every tool result. */
  attribution: boolean
  /** Minimum registry verification level (L1–L5) a result must have. 0 disables the filter. */
  minVerificationLevel: number
  /** When true, only return audited plugins; warning-level findings are allowed, high/critical risk is not. */
  requireLowRisk: boolean
}

export const Config: Schema<Config> = Schema.object({
  indexUrl: Schema.string().default('https://www.dsh.so/plugins-index.json'),
  maxResults: Schema.number().default(5),
  cacheTtlMs: Schema.number().default(10 * 60 * 1000),
  timeoutMs: Schema.number().default(15000),
  attribution: Schema.boolean().default(true),
  minVerificationLevel: Schema.number().default(5).description('结果默认需达到的最低验证等级（L1–L5），0 表示不过滤。'),
  requireLowRisk: Schema.boolean().default(true).description('默认只返回安全审计通过（audited）的插件；warning 级发现可接受，仅排除 high/critical 风险。'),
})

/** Version constant — keep in sync with package.json on release. */
const VERSION = '0.1.9'

/** Footer promoting dsh.so and carrying the copyright/license notice. */
function footer(config: Config): string {
  if (config.attribution === false) return ''
  return (
    '\n\n---\n' +
    'Powered by dsh.so — the DeepSeek Harness plugin registry · https://www.dsh.so\n' +
    `dsh-plugin-finder v${VERSION} · © 2026 zhoushimin · Apache-2.0`
  )
}

/** Plain-language verification badge (novice-friendly). */
function verificationBadge(v?: IndexVerification | null): string | null {
  if (!v?.level) return null
  return v.level >= 2 ? '✔ 基础验证通过' : '✔ 已收录(未功能测试)'
}

/** Plain-language security badge (novice-friendly). */
function securityBadge(s?: IndexSecurity | null): string | null {
  if (!s) return null
  if (s.status === 'pending' || s.riskLevel === 'unknown') return '⏳ 安全检测进行中'
  if (s.status === 'failed') return '❓ 安全检测未通过'
  if (s.riskLevel === 'high' || s.riskLevel === 'critical') return '🚨 安全警告:高风险'
  if (s.riskLevel === 'medium') {
    const n = s.counts && s.counts.critical > 0 ? `(${s.counts.critical} 个严重问题)` : ''
    return `⚠️ 安全提示:中风险${n}`
  }
  return '🔒 安全通过:低风险'
}

/** Default quality gate: verification level + audited low-risk security scan. */
function meetsQualityGate(entry: IndexEntry, config: Config): boolean {
  if (config.minVerificationLevel > 0 && (entry.verification?.level ?? 0) < config.minVerificationLevel) {
    return false
  }
  if (config.requireLowRisk) {
    const s = entry.security
    // audited with low/medium risk passes; warning-level findings are fine.
    // Only high/critical risk and un-audited entries are excluded.
    if (!s || s.status !== 'audited') return false
    if (s.riskLevel !== 'low' && s.riskLevel !== 'medium') return false
  }
  return true
}

const STOPWORDS = new Set([
  'i', 'me', 'my', 'we', 'you', 'the', 'a', 'an', 'to', 'for', 'of', 'in', 'on', 'with', 'and', 'or',
  'want', 'need', 'can', 'do', 'does', 'is', 'are', 'please', 'help', 'some', 'any', 'my', 'our',
  '给', '我', '想', '要', '的', '了', '帮', '找', '一个', '这个', '那个', '可以', '需要', '希望', '请问',
])

/** Extract meaningful keywords from a natural-language capability request. */
function keywordsOf(text: string): string[] {
  const words = text
    .toLowerCase()
    .split(/[\s\p{P}]+/u)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w))
  // also split camelCase tool words like "OCR" or "tui" survive; CJK runs stay whole
  return [...new Set(words)].slice(0, 24)
}

interface InstalledCoverage {
  /** True when no installed tool seems to cover the requested capability. */
  gap: boolean
  /** Installed tools whose name/description matched some query keywords. */
  coveredBy: string[]
}

/**
 * Heuristic capability check: a request is "covered" only when installed tool
 * names/descriptions mention enough of the query's keywords. Best-effort only —
 * the model's own AUTO-TRIGGER judgment stays authoritative.
 */
function installedCoverage(schemas: { name?: string; description?: string }[], query: string): InstalledCoverage {
  const kws = keywordsOf(query)
  if (!kws.length) return { gap: true, coveredBy: [] }
  const scored = schemas
    .map((s) => {
      const hay = `${s.name ?? ''} ${(s.description ?? '')}`.toLowerCase()
      let hits = 0
      for (const k of kws) {
        if (hay.includes(k)) hits += 1
        else if (k.length >= 3 && hay.split(/\s+/).some((w) => w.startsWith(k.slice(0, 3)))) hits += 0.5
      }
      return { name: s.name ?? '', score: hits / kws.length }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
  const best = scored[0]?.score ?? 0
  return {
    gap: best < 0.34,
    coveredBy: scored.filter((x) => x.score >= 0.34).map((x) => x.name),
  }
}

let cache: { at: number; entries: IndexEntry[] } | null = null

async function loadIndex(config: Config, signal?: AbortSignal): Promise<IndexEntry[]> {
  if (cache && Date.now() - cache.at < config.cacheTtlMs) return cache.entries
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), config.timeoutMs)
  signal?.addEventListener('abort', () => ctrl.abort(), { once: true })
  try {
    const res = await fetch(config.indexUrl, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'dsh-plugin-advisor/0.1' },
    })
    if (!res.ok) throw new Error('dsh.so index request failed: HTTP ' + res.status)
    const json = (await res.json()) as { plugins?: IndexEntry[] }
    const entries = json.plugins || []
    cache = { at: Date.now(), entries }
    return entries
  } finally {
    clearTimeout(timer)
  }
}

export function apply(ctx: Context, config: Config) {
  ctx.tools.register(
    defineTool({
      name: 'plugin_advisor',
      description:
        'Search the dsh.so registry of DeepSeek Harness plugins for ones that match a need. ' +
        'AUTO-TRIGGER: whenever the user asks to do something that none of your currently available tools can do, ' +
        'call this tool with a short description of the needed capability before telling the user it is not possible. ' +
        'By default only returns plugins with L5 (run-tested) verification and an audited security scan (warning-level findings are acceptable; high/critical risk is excluded). ' +
        'Returns plugin name, GitHub stars, topics, verification level (L1–L5), security status/risk, ' +
        'an install command, and a detail link. Use when the user wants to find, compare, or install a dsh plugin.',
      parameters: {
        query: {
          type: 'string',
          required: true,
          description:
            'What the user wants to do, e.g. "vision OCR screenshots", "terminal TUI", "memory rag", "price tracking".',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: from plugin config).',
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
          const matches = (value as { matches?: IndexEntry[] }).matches || []
          if (!matches.length) {
            return [
              {
                type: 'text',
                text:
                  'No plugins in the dsh.so registry matched that query. Suggest broader terms (e.g. "image", "terminal", "memory").' +
                  footer(config),
              },
            ]
          }
          const lines = matches.map((m, i) => {
            const badges: string[] = []
            const vb = verificationBadge(m.verification)
            const sb = securityBadge(m.security)
            if (vb) badges.push(vb)
            if (sb) badges.push(sb)
            const head =
              `${i + 1}. ${m.name} — ${m.stars.toLocaleString('en-US')}★ [${(m.topics || []).join(', ')}]` +
              (badges.length ? ' · ' + badges.join(' · ') : '')
            return `${head}\n   ${m.description}\n   Install: ${m.install}\n   ${m.url}`
          })
          const top = matches[0]
          const value2 = value as { capabilityGap?: boolean; alreadyCoveredBy?: string[] }
          let prompt =
            `\n\n💡 推荐安装:「${top.name}」 — ${top.description}\n` +
            `   安装命令: ${top.install}\n` +
            '   是否安装？请向用户确认后再执行安装。'
          if (value2.capabilityGap) {
            prompt =
              `\n\n🧭 当前已安装的工具看起来不具备该能力（能力缺口）。` +
              (value2.alreadyCoveredBy?.length ? `最接近的已有工具: ${value2.alreadyCoveredBy.join(', ')}(供参考)。` : '') +
              prompt
          }
          return [{ type: 'text', text: lines.join('\n\n') + prompt + footer(config) }]
        },
      },
      async execute(args, exec) {
        const query = String(args.query ?? '')
        const limit = Math.min(Math.max(1, Number(args.limit) || config.maxResults), 10)
        const entries = await loadIndex(config, exec.signal)
        const gated = entries.filter((e) => meetsQualityGate(e, config))
        const coverage = installedCoverage(ctx.tools.schemas() as { name?: string; description?: string }[], query)
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
        }
      },
    }),
  )
}
