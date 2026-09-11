<p align="center">
  <img src="assets/dsh-so-logo.svg" alt="dsh.so" width="88">
</p>

<h1 align="center">dsh-plugin-advisor</h1>

<p align="center">
  <strong>Let your DSH agent find its own plugins — one natural-language query against the dsh.so registry, back comes the verification level, security status and install command.</strong>
</p>

<p align="center">
  Like find-skill, but for dsh plugins. Install and go — zero configuration: the plugin registers one `plugin_advisor` tool and the agent does the rest.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@dsh-so/dsh-plugin-advisor"><img src="https://img.shields.io/npm/v/@dsh-so/dsh-plugin-advisor?style=flat&label=npm&color=4D6BFE" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@dsh-so/dsh-plugin-advisor"><img src="https://img.shields.io/npm/dm/@dsh-so/dsh-plugin-advisor?style=flat&label=downloads&color=4D6BFE" alt="npm downloads"></a>
  <a href="https://github.com/dsh-so/dsh-plugin-advisor"><img src="https://img.shields.io/github/stars/dsh-so/dsh-plugin-advisor?style=flat&label=%E2%98%85&color=08C" alt="GitHub stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-2EA44F?style=flat" alt="Apache-2.0"></a>
  <img src="https://img.shields.io/badge/dsh-0.1.0--rc.6-4D6BFE?style=flat" alt="dsh rc.6">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat" alt="TypeScript 5">
</p>

**简体中文（default）**: [README.md](https://github.com/dsh-so/dsh-plugin-advisor/blob/main/README.md)

---

`plugin_advisor` is the search entry point to the dsh.so registry: describe a need in plain language and it picks the best-matching plugins from the live dsh.so index, returning **name, GitHub stars, topics, description, verification level (L1–L5), security status & risk, install command** and a detail link. From "I want" to "it is installed" without leaving the conversation.

<p align="center">
  <strong>Powered by <a href="https://www.dsh.so" rel="dofollow">dsh.so</a></strong><br>
  <em>the DeepSeek Harness plugin registry — discover, compare and install plugins</em>
</p>

## Features

- **Find plugins in one sentence** — "find me a plugin that does OCR" is enough; no names to memorise, no marketplace to browse. The agent calls `plugin_advisor` for you.
- **A card, not a pile of links** — the best match with stars, topics, verification level, security badge and detail link, plus 2 alternatives.
- **Quality gate on by default** — only **L5 (run-tested)** plugins with an **audited security scan**; warning-level findings pass, high/critical risk is excluded.
- **Capability-gap fallback** — when no installed tool can do the job, the AUTO-TRIGGER rule makes the agent search the registry *before* saying "not possible".
- **Install after confirmation** — once you explicitly agree, the tool runs `dsh plugin add` itself (and `remove` likewise), then reminds you to restart.
- **Chinese and English** — a built-in zh→en concept lexicon (记忆→memory, 账单→billing…) plus CJK bigram matching; short English keywords still score best.
- **No runtime dependencies** — only 3 peer dependencies, provided by the dsh host; the plugin never bundles a copy of the host core.
- **Works offline too** — the index is cached for 12 hours and persisted to disk, so it survives profile restarts; a failed fetch falls back to the stale cache.
- **Point it anywhere** — `indexUrl` can target a self-hosted mirror.

## Quick start

1. **Install** — `dsh plugin --profile web add @dsh-so/dsh-plugin-advisor`
2. **Restart** — `dsh web` (a new bundle only loads on restart)
3. **Ask** — tell the agent *"Find me a plugin for OCR / screenshots"*; it searches and installs once you confirm

## Install

| Scenario | Command |
| --- | --- |
| dsh.so registry (recommended) | `dsh plugin --profile web add @dsh-so/dsh-plugin-advisor` |
| Other profiles | `dsh plugin --profile tui add @dsh-so/dsh-plugin-advisor`<br>`dsh plugin --profile headless add @dsh-so/dsh-plugin-advisor` |
| Local checkout (development) | `dsh plugin --profile web add E:\AgentsWs\...\dsh-plugin-advisor` |
| Upgrade | `dsh plugin --profile web add @dsh-so/dsh-plugin-advisor@latest` |
| Uninstall | `dsh plugin --profile web remove @dsh-so/dsh-plugin-advisor` |

Installing, upgrading and uninstalling all require a **profile restart** (`dsh web`) to take effect.

> ⚠️ **Version note**: if you have **0.1.0**, upgrade first — 0.1.0 installed `@deepseek-ai/dsh-tools` as a regular dependency, which conflicts with the host's copy and crashes the agent loop with `Cannot read properties of undefined (reading 'prepare')`. **Fixed in 0.1.1**:
>
> `dsh plugin --profile web add @dsh-so/dsh-plugin-advisor@^0.1.1`

> ⚠️ Always remove by **package name** — never pass a local path to `remove`/`del`, or it deletes the source directory's files.

## Peer dependency warnings (important)

You will very likely see this pnpm output during install:

```
WARN  Issues with peer dependencies found
└─┬ @dsh-so/dsh-plugin-advisor 0.1.1
  ├── ✕ missing peer @deepseek-ai/cordis@^4.0.1
  ├── ✕ missing peer @deepseek-ai/dsh-tools@0.1.0-rc.6
  └── ✕ missing peer @deepseek-ai/schemastery@^3.18.1
```

**This is a benign false positive — no action needed; the plugin works normally.**

### Why it appears

- `dsh plugin add` works by running `pnpm add` in the profile directory; pnpm checks peer dependencies **only against the profile's own declared dependencies** (currently just `@dsh-so/dsh-plugin-advisor`).
- The three `@deepseek-ai/*` packages are **managed by the DSH host** and actually live one level up, in `~/.dsh/profiles/node_modules`.
- At runtime, Node's module resolution **walks up the directory tree**, so the plugin resolves the host-provided packages just fine.

### How to verify it is fine

| Plugin requires | Host has | Result |
|---|---|---|
| `@deepseek-ai/cordis@^4.0.1` | 4.0.1 | ✅ |
| `@deepseek-ai/dsh-tools@0.1.0-rc.6` | 0.1.0-rc.6 | ✅ |
| `@deepseek-ai/schemastery@^3.18.1` | 3.18.1 | ✅ |

- **Target dependency line**: the dsh rc.6 series (`@deepseek-ai/dsh-tools@0.1.0-rc.6` · `@deepseek-ai/cordis@^4.0.1` · `@deepseek-ai/schemastery@^3.18.1`).
- **Tested on**: dsh 10.28.1 (web profile).
- **Status**: author-declared (Declared), not independently verified — follows dsh.so's compatibility-matrix semantics.
- **After upgrading dsh**: restart the profile and confirm `plugin_advisor` appears; if a major upgrade crosses the dependency line, run `dsh plugin --profile web update @dsh-so/dsh-plugin-advisor` first.

> In fact, **any** third-party DSH plugin that correctly declares peer dependencies triggers the same warning when installed into a profile (the harness's own `@deepseek-ai/dsh-tool-cordis` declares `@deepseek-ai/cordis` the same way). It is pnpm being "under-informed", not an error.

### Fixes to avoid

1. **Do not move the plugin's `peerDependencies` into `dependencies`** — every plugin would then ship its own copy of the host's core packages, shadowing the host's singletons and re-triggering the `ctx.tools` crash (the 0.1.0 bug).
2. **Avoid explicitly installing the 3 peers into the profile** — versions get pinned there; when the host upgrades its core packages, the plugin keeps loading the old ones, causing silent API mismatch.

If you only want a clean CI log, you can install the peers explicitly (in exchange for a one-time `declares no dsh.bundle` notice):

```sh
dsh plugin --profile web add @deepseek-ai/cordis@4.0.1 @deepseek-ai/dsh-tools@0.1.0-rc.6 @deepseek-ai/schemastery@3.18.1
```

For daily use: **just ignore the warning**.

## Usage

`plugin_advisor` is an **agent tool** — no manual command; just tell the agent what you need and it calls the tool automatically. Example prompts (Chinese works too):

- "Find me a plugin for OCR / screenshots"
- "I need a terminal TUI plugin"
- "What dsh plugins exist for memory / RAG?"
- "Find me a plugin for price tracking"

### Example conversations

**English — OCR / screenshots**

- **You**: *Find me a plugin for OCR / screenshots*
- **Agent**: *calls `plugin_advisor` with `{"query": "vision OCR screenshots", "limit": 3}` and returns a recommendation card — see [Output format](#output-format) below*
- **You**: *Install the first one*
- **Agent**: *calls `plugin_advisor` with `install: "github:leozou320-ai/dsh-macos-vision-ocr"`, then reminds you to restart `dsh web`.*

**中文 — 终端 TUI**

- **你**: *有没有终端 TUI 插件？*
- **助手**: *自动调用 `plugin_advisor`，query 为 `"terminal TUI"`* → 返回按相关度排序的结果
- **你**: *帮我装第一个*
- **助手**: *带着 `install` 再调一次工具，装好后提醒重启 `dsh web`。*

### Capability-gap auto search & install confirmation

When your request cannot be handled by any **installed** tool, the agent automatically calls `plugin_advisor` with a description of the missing capability. Results pass a default quality gate — **L5 (run-tested) verification** and an **audited security scan** (warning-level findings are kept; high/critical risk is excluded). The tool then highlights the single best match, prints its install command, and **asks the user to confirm before installing** — nothing is installed without consent.

### Tool parameters

| Parameter | Required | Type | Description |
|---|---|---|---|
| `query` | required to search | string | The need, e.g. `"vision OCR screenshots"`, `"memory rag"`. English and Chinese both work; short English keywords score best |
| `limit` | ❌ | number | Max results; defaults to the `maxResults` config (5), clamped to 10 |
| `install` | ❌ | string | **Only after the user explicitly confirmed** — the install target: an npm package name (optionally scoped / `@version`) or a `github:owner/repo` spec |
| `remove` | ❌ | string | **Only after the user explicitly asked to uninstall** — an installed package name (`github:` targets are rejected) |
| `profile` | ❌ | string | Target profile for install/remove, default `web`; invalid characters are stripped |

## Output format

Every search renders as a **recommendation card**: the best match (name / stars / topics / verification level / security badge / description / detail link) plus 2 alternatives.

**`plugin_advisor("vision OCR screenshots", limit=3)`** — real output (captured from the live dsh.so index; ranks and star counts drift over time):

```
✅ 帮你找到了最匹配的插件

🏆 **dsh-macos-vision-ocr**  1★
`vision` `desktop` `network`
🏅 L5 · Run tested · 🔒 安全通过:低风险
Offline macOS Vision OCR for DSH — accurate, local, API-key free. | DSH 本地离线 OCR 插件
🔗 https://www.dsh.so/artifact/dsh-macos-vision-ocr/
━━━━━━━━━━━━━━━━━━━━━━━━━━
👉 回复「**安装**」即可自动装好，重启一次 dsh web 生效

**备选**：
2. **dsh-vision-router** (1,086★) — Eyes for text-only DSH agents: built-in free v…
3. **ds-vision-plugin** (5★) — Paste images into DSH with a four-model vision…
```

(The card is localized in Chinese; the underlying data is English.)

Badge meanings:

| Badge | Meaning |
|---|---|
| 🏅 `L5 · Run tested` | Verification level: L1 indexed → L5 feature actually run-tested |
| 🔒 安全通过:低风险 | Security audit passed, low risk |
| ⚠️ 安全提示:中风险 | Audited with warning-level findings (still passes the default gate) |
| ⏳ 安全检测进行中 / ❓ 未通过 / 🚨 高风险 | Not audited, audit failed, or high/critical risk (excluded by the default gate) |

No match:

```
没有找到完全匹配的 dsh.so 插件。已自动用更宽泛的关键词再试一次也没有结果。
可以直接告诉用户：该需求暂时没有现成插件，可关注 dsh.so 的更新，或描述更具体的需求换个说法再试。
```

Every result (match or no-match) ends with a **Powered by dsh.so** footer plus the copyright line (`dsh-plugin-advisor v0.2.1 · © 2026 zhoushimin · Apache-2.0`). Disable with `attribution: false`.

## Search tips

- **Chinese queries are optimized**: a built-in zh→en concept lexicon (记忆→memory, 账单→billing…) plus CJK bigram matching; short English keywords still score best.
- **Be specific**: `"terminal TUI"` beats vague descriptions.
- **Use topic tags**: e.g. `vision`, `browser`, `automation`, `ui` — topic hits weigh more.
- **An empty query returns the top entries by stars** (the model rarely does this, but the behavior exists).
- **Matching is keyword scoring, not AI semantics**: name hit +3, topic hit +2, description hit +1, ties broken by stars. If wording differs a lot, try rephrasing.

## Configuration

Configure in the host composition or an agent preset's `cordis.yml` (defaults are fine, usually no change needed):

```yaml
- insert:
    - id: dsh-plugin-finder
      name: @dsh-so/dsh-plugin-advisor
      config:
        indexUrl: https://www.dsh.so/plugins-index.json   # override for self-host / testing
        maxResults: 5                                      # default result count
        cacheTtlMs: 43200000                               # cache the index for 12 hours
        timeoutMs: 15000                                   # fetch timeout (ms)
```

| Config | Default | Description |
|---|---|---|
| `indexUrl` | `https://www.dsh.so/plugins-index.json` | Machine-readable dsh.so plugin index URL |
| `maxResults` | `5` | Default result count when `limit` is not passed |
| `cacheTtlMs` | `43200000` (12 hours) | How long to reuse the fetched index — at most 2 fetches per day |
| `timeoutMs` | `15000` | Fetch timeout in milliseconds |
| `attribution` | `true` | Append a "Powered by dsh.so" promotion and copyright footer to every result |
| `minVerificationLevel` | `5` | Minimum verification level (L1–L5) a result must have; `0` disables the filter |
| `requireLowRisk` | `true` | Only audited plugins; warning-level findings are kept, high/critical risk excluded |

## Data source, cache & matching

- **Data source**: `https://www.dsh.so/plugins-index.json` — a machine-readable index of every plugin listed on dsh.so (id, name, description, stars, topics, install, url, verification level, security status & risk).
- **Matching**: tokenize the query → expand Chinese concepts (zh→en lexicon + CJK bigrams) → score each token (name +3 / topic +2 / description +1) → sort by score, ties by stars, then take the top `limit`.
- **Quality gate**: filter by `minVerificationLevel` and `requireLowRisk` first, then rank the survivors.
- **Cache**: memory plus disk, reused within `cacheTtlMs`; the disk cache lives at `%TEMP%\dsh-plugin-advisor\index-<hash>.json` (named after the first 16 hex chars of the `indexUrl` sha256) and survives profile restarts. A failed fetch falls back to the stale cache.

### Repository layout

```
dsh-plugin-advisor/
├── src/
│   ├── index.ts              Plugin entry: Config schema, plugin_advisor tool, card rendering, index fetch + disk cache
│   └── match.ts              Pure-function matching: tokenizer, zh-en lexicon, CJK bigrams, scoring
├── test/match.test.ts        Matching unit tests (node --test)
├── scripts/
│   ├── verify-install.mjs    Post-release self-check: npm / GitHub install paths + functional smoke
│   ├── sync-readmes.mjs      Keeps a shared section of the zh/en READMEs in sync
│   └── restart-dsh-web.ps1   Local restart helper
├── assets/dsh-so-logo.svg    dsh.so logo
├── cordis.patch.yml          Bundle patch (referenced by dsh.bundle.patch in package.json)
└── README.md · README.en.md  Chinese (default) / English docs
```

## FAQ

**Q: Installed, but no `plugin_advisor` tool in the session?**
A: Check two things: ① `dsh plugin --profile web list` confirms it is installed; ② you must **restart** `dsh web` for a new bundle to load.

**Q: Should I act on the `missing peer` warnings?**
A: No — they are a false positive; see [Peer dependency warnings](#peer-dependency-warnings-important) above.

**Q: No results for my query?**
A: Use broader English terms such as `"image"`, `"terminal"`, `"memory"`, or drop overly specific qualifiers.

**Q: How do I update the plugin?**
A: `dsh plugin --profile web add @dsh-so/dsh-plugin-advisor@latest`, then restart.

**Q: How do I uninstall?**
A: `dsh plugin --profile web remove @dsh-so/dsh-plugin-advisor`, then restart.

**Q: PowerShell error "The splatting operator '@' cannot be used..."?**
A: That only happens with **scoped** packages (`@scope/name`) — PowerShell treats a leading `@` as the splat operator, so quote the name: `dsh plugin --profile web add '@scope/name'`.

**Q: Boot fails with `ERR_MODULE_NOT_FOUND: Cannot find package '@dsh-so/dsh-plugin-advisor'`?**
A: A stale install entry (or the bundle patch `name`) still references the old name. Remove by package name and reinstall: `dsh plugin --profile web remove @dsh-so/dsh-plugin-advisor`, then `add` again.

**Q: The npmjs.com page shows an older version than the registry?**
A: The website caches; the registry is authoritative. Verify in a terminal: `npm view @dsh-so/dsh-plugin-advisor version --prefer-online`; hard-refresh the page (Ctrl+F5) or wait a few minutes.

**Q: How do I check which version is installed?**
A: `dsh plugin --profile web list` shows the profile's dependency; `npm view @dsh-so/dsh-plugin-advisor version` shows the latest on npm.

## Development & release

```sh
pnpm install     # or npm install (peers come from the dsh host; devDependencies are for local build/test)
pnpm build       # tsc -> lib/
pnpm test        # node --test (match logic unit tests)
```

- The bundle patch is declared in `cordis.patch.yml`, referenced by `dsh.bundle.patch` in `package.json`.
- When publishing to npm, ship `lib/`, `cordis.patch.yml`, `README.md` (Chinese, the default), `README.en.md` (English) and `assets/` — see the `files` field in `package.json`.

### Post-release self-check

After each `npm publish`, run the automated install check to confirm both install sources still work against the released artifact:

```sh
npm run verify:install            # offline: npm registry + GitHub, functional smoke
npm run verify:install -- --live  # also queries the real dsh.so index
```

The script installs `@dsh-so/dsh-plugin-advisor@<version>` from npm and from `github:dsh-so/dsh-plugin-advisor` into throwaway dirs (mirroring a dsh profile's settings), asserts the installed bundle matches the expected name/version and ships `lib/index.js` + `lib/match.js`, then runs a functional smoke of the matching logic. It exits non-zero if either source breaks. `npm run verify` (test + verify:install) is the full gate.

## License

[Apache-2.0](LICENSE) · Copyright (c) 2026 zhoushimin
