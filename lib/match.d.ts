/**
 * Matching logic for dsh-plugin-finder — pure functions, no framework imports.
 */
/** dsh.so verification level (L1–L5) — how far the plugin was actually tested. */
export type IndexVerification = {
    /** 1 (found) … 5 (feature tested). */
    level: number;
    /** Human label, e.g. "L2 · Structured". */
    label: string;
    /** ISO timestamp of the last verification pass. */
    lastVerifiedAt?: string | null;
};
/** dsh.so automated security scan result. */
export type IndexSecurity = {
    status: 'audited' | 'pending' | 'failed' | 'skipped';
    riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
    scannedAt?: string | null;
    /** Static scan finding counts — present when audited. */
    counts?: {
        critical: number;
        warning: number;
        info: number;
    };
    filesScanned?: number;
};
export type IndexEntry = {
    id: string;
    name: string;
    description: string;
    stars: number;
    topics: string[];
    install: string;
    url: string;
    /** Present when the dsh.so index carries it. */
    verification?: IndexVerification;
    security?: IndexSecurity;
};
export declare function tokenize(query: string): string[];
/** Expand tokens: CJK runs yield zh→en concept words plus CJK bigrams. */
export declare function expandTokens(tokens: string[]): string[];
export declare function score(entry: IndexEntry, tokens: string[]): number;
/** Rank registry entries against a free-text query; empty query returns top by stars. */
export declare function findMatches(entries: IndexEntry[], query: string, limit: number): IndexEntry[];
