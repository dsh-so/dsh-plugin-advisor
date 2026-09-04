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
    /** Append a "Powered by dsh.so" promotion and copyright footer to every tool result. */
    attribution: boolean;
    /** Minimum registry verification level (L1–L5) a result must have. 0 disables the filter. */
    minVerificationLevel: number;
    /** When true, only return plugins whose latest security scan is audited and low risk. */
    requireLowRisk: boolean;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;
