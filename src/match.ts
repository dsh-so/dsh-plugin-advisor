/**
 * Matching logic for dsh-plugin-finder — pure functions, no framework imports.
 */

/** dsh.so verification level (L1–L5) — how far the plugin was actually tested. */
export type IndexVerification = {
  /** 1 (found) … 5 (feature tested). */
  level: number
  /** Human label, e.g. "L2 · Structured". */
  label: string
  /** ISO timestamp of the last verification pass. */
  lastVerifiedAt?: string | null
}

/** dsh.so automated security scan result. */
export type IndexSecurity = {
  status: 'audited' | 'pending' | 'failed' | 'skipped'
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'unknown'
  scannedAt?: string | null
  /** Static scan finding counts — present when audited. */
  counts?: { critical: number; warning: number; info: number }
  filesScanned?: number
}

export type IndexEntry = {
  id: string
  name: string
  description: string
  stars: number
  topics: string[]
  install: string
  url: string
  /** Present when the dsh.so index carries it. */
  verification?: IndexVerification
  security?: IndexSecurity
}

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fa5]+/)
    .filter((t) => t.length > 0)
}

export function score(entry: IndexEntry, tokens: string[]): number {
  let s = 0
  const name = entry.name.toLowerCase()
  const desc = (entry.description || '').toLowerCase()
  const topics = (entry.topics || []).map((t) => t.toLowerCase())
  for (const tk of tokens) {
    if (name.includes(tk)) s += 3
    if (topics.some((t) => t.includes(tk) || tk.includes(t))) s += 2
    if (desc.includes(tk)) s += 1
  }
  return s
}

/** Rank registry entries against a free-text query; empty query returns top by stars. */
export function findMatches(entries: IndexEntry[], query: string, limit: number): IndexEntry[] {
  const tokens = tokenize(query)
  if (!tokens.length) {
    return [...entries].sort((a, b) => b.stars - a.stars).slice(0, limit)
  }
  return entries
    .map((e) => ({ e, s: score(e, tokens) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.e.stars - a.e.stars)
    .slice(0, limit)
    .map((x) => x.e)
}
