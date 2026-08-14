import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
export declare const name = "dsh-plugin-finder";
export declare const inject: string[];
export interface Config {
    /** URL of the machine-readable dsh.so plugin index. */
    indexUrl: string;
    /** Default result count when the model does not pass a limit. */
    maxResults: number;
    /** How long to reuse the fetched index before refetching. */
    cacheTtlMs: number;
    /** Abort the fetch after this many milliseconds. */
    timeoutMs: number;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;
