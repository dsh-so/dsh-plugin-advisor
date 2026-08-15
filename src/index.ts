import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import Schema from '@deepseek-ai/schemastery'
import { findMatches } from './match.js'
import type { IndexEntry } from './match.js'

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
}

export const Config: Schema<Config> = Schema.object({
  indexUrl: Schema.string().default('https://www.dsh.so/plugins-index.json'),
  maxResults: Schema.number().default(5),
  cacheTtlMs: Schema.number().default(10 * 60 * 1000),
  timeoutMs: Schema.number().default(15000),
  attribution: Schema.boolean().default(true),
})

/** Version constant — keep in sync with package.json on release. */
const VERSION = '0.1.5'

/** Footer promoting dsh.so and carrying the copyright/license notice. */
function footer(config: Config): string {
  if (config.attribution === false) return ''
  return (
    '\n\n---\n' +
    'Powered by dsh.so — the DeepSeek Harness plugin registry · https://www.dsh.so\n' +
    `dsh-plugin-finder v${VERSION} · © 2026 zhoushimin · Apache-2.0`
  )
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
      headers: { 'user-agent': 'dsh-plugin-finder/0.1' },
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
      name: 'find_plugin',
      description:
        'Search the dsh.so registry of DeepSeek Harness plugins for ones that match a need. ' +
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
            if (m.verification?.label) badges.push(m.verification.label)
            if (m.security) {
              const risk = m.security.riskLevel && m.security.riskLevel !== 'unknown' ? '/' + m.security.riskLevel : ''
              badges.push(m.security.status + risk)
            }
            const head =
              `${i + 1}. ${m.name} — ${m.stars.toLocaleString('en-US')}★ [${(m.topics || []).join(', ')}]` +
              (badges.length ? ' · ' + badges.join(' · ') : '')
            return `${head}\n   ${m.description}\n   Install: ${m.install}\n   ${m.url}`
          })
          return [{ type: 'text', text: lines.join('\n\n') + footer(config) }]
        },
      },
      async execute(args, exec) {
        const query = String(args.query ?? '')
        const limit = Math.min(Math.max(1, Number(args.limit) || config.maxResults), 10)
        const entries = await loadIndex(config, exec.signal)
        return {
          matches: findMatches(entries, query, limit).map((e) => ({
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
