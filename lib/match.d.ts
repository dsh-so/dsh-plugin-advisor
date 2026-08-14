/**
 * Matching logic for dsh-plugin-finder — pure functions, no framework imports.
 */
export interface IndexEntry {
    id: string;
    name: string;
    description: string;
    stars: number;
    topics: string[];
    install: string;
    url: string;
}
export declare function tokenize(query: string): string[];
export declare function score(entry: IndexEntry, tokens: string[]): number;
/** Rank registry entries against a free-text query; empty query returns top by stars. */
export declare function findMatches(entries: IndexEntry[], query: string, limit: number): IndexEntry[];
