import { defineTool } from '@deepseek-ai/dsh-tools';
import Schema from '@deepseek-ai/schemastery';
import { findMatches } from './match.js';
export const name = 'dsh-plugin-finder';
export const inject = ['tools'];
export const Config = Schema.object({
    indexUrl: Schema.string().default('https://www.dsh.so/plugins-index.json'),
    maxResults: Schema.number().default(5),
    cacheTtlMs: Schema.number().default(10 * 60 * 1000),
    timeoutMs: Schema.number().default(15000),
});
let cache = null;
async function loadIndex(config, signal) {
    if (cache && Date.now() - cache.at < config.cacheTtlMs)
        return cache.entries;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.timeoutMs);
    signal?.addEventListener('abort', () => ctrl.abort(), { once: true });
    try {
        const res = await fetch(config.indexUrl, {
            signal: ctrl.signal,
            headers: { 'user-agent': 'dsh-plugin-finder/0.1' },
        });
        if (!res.ok)
            throw new Error('dsh.so index request failed: HTTP ' + res.status);
        const json = (await res.json());
        const entries = json.plugins || [];
        cache = { at: Date.now(), entries };
        return entries;
    }
    finally {
        clearTimeout(timer);
    }
}
export function apply(ctx, config) {
    ctx.tools.register(defineTool({
        name: 'find_plugin',
        description: 'Search the dsh.so registry of DeepSeek Harness plugins for ones that match a need. ' +
            'Returns plugin name, GitHub stars, topics, an install command, and a detail link. ' +
            'Use when the user wants to find, compare, or install a dsh plugin.',
        parameters: {
            query: {
                type: 'string',
                required: true,
                description: 'What the user wants to do, e.g. "vision OCR screenshots", "terminal TUI", "memory rag", "price tracking".',
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
                            text: 'No plugins in the dsh.so registry matched that query. Suggest broader terms (e.g. "image", "terminal", "memory").',
                        },
                    ];
                }
                const lines = matches.map((m, i) => `${i + 1}. ${m.name} — ${m.stars.toLocaleString('en-US')}★ [${(m.topics || []).join(', ')}]\n   ${m.description}\n   Install: ${m.install}\n   ${m.url}`);
                return [{ type: 'text', text: lines.join('\n\n') }];
            },
        },
        async execute(args, exec) {
            const query = String(args.query ?? '');
            const limit = Math.min(Math.max(1, Number(args.limit) || config.maxResults), 10);
            const entries = await loadIndex(config, exec.signal);
            return {
                matches: findMatches(entries, query, limit).map((e) => ({
                    name: e.name,
                    description: e.description,
                    stars: e.stars,
                    topics: e.topics,
                    install: e.install,
                    url: e.url,
                })),
            };
        },
    }));
}
