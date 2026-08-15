# dsh-plugin-finder

Find DeepSeek Harness plugins from the [dsh.so](https://dsh.so) registry — like *find-skill*, but for dsh plugins.

This plugin registers one agent tool, **`find_plugin`**: describe a need in natural language, and it searches the dsh.so plugin index for the best-matching plugins, returning name, GitHub stars, topics, description, **verification level (L1–L5)**, **security status & risk**, an **install command**, and a detail link.

<p align="center">
  <a href="https://www.dsh.so" rel="dofollow">
    <img src="https://raw.githubusercontent.com/ihuajiu/dsh-plugin-finder/main/assets/dsh-so-logo.svg" alt="dsh.so logo" width="72">
  </a>
  <br>
  <strong>Powered by <a href="https://www.dsh.so" rel="dofollow">dsh.so</a></strong>
  <br>
  <em>the DeepSeek Harness plugin registry — discover, compare and install plugins · 发现、对比并安装 DSH 插件</em>
</p>

**中文版**: [README.zh.md](https://github.com/ihuajiu/dsh-plugin-finder/blob/main/README.zh.md)

## Table of Contents

1. [Install](#1-install)
2. [Peer Dependency Warnings (Important)](#2-peer-dependency-warnings-important)
3. [Usage](#3-usage)
4. [Output Format](#4-output-format)
5. [Search Tips](#5-search-tips)
6. [Configuration](#6-configuration)
7. [Data Source & Matching](#7-data-source--matching)
8. [FAQ](#8-faq)
9. [Development](#9-development)

---

## 1. Install

Install from the dsh.so marketplace (recommended):

```sh
dsh plugin --profile web add '@dsh.so/dsh-plugin-finder'
```

Other profiles work the same — just change the name:

```sh
dsh plugin --profile tui add '@dsh.so/dsh-plugin-finder'
dsh plugin --profile headless add '@dsh.so/dsh-plugin-finder'
```

Install from a local checkout (development):

```sh
dsh plugin --profile web add E:\AgentsWs\PluginBuilder\dsh-plugin-finder
```

> ⚠️ **Version note**: if you have **0.1.0**, upgrade first — 0.1.0 installed `@deepseek-ai/dsh-tools` as a regular dependency, which conflicts with the host's copy and crashes the agent loop with `Cannot read properties of undefined (reading 'prepare')`. **Fixed in 0.1.1**; reinstall with:
>
> ```sh
> dsh plugin --profile web add '@dsh.so/dsh-plugin-finder@^0.1.1'
> ```

**Restart the web profile** for the new bundle to load:

```sh
dsh web
```

After the restart, the `find_plugin` tool appears in the session — just tell the agent what you need (see [Usage](#3-usage)).

---

## 2. Peer Dependency Warnings (Important)

You will very likely see this pnpm output during install:

```
WARN  Issues with peer dependencies found
└─┬ @dsh.so/dsh-plugin-finder 0.1.1
  ├── ✕ missing peer @deepseek-ai/cordis@^4.0.1
  ├── ✕ missing peer @deepseek-ai/dsh-tools@0.1.0-rc.6
  └── ✕ missing peer @deepseek-ai/schemastery@^3.18.1
```

**This is a benign false positive — no action needed; the plugin works normally.**

### Why it appears

- `dsh plugin add` works by running `pnpm add` in the profile directory; pnpm checks peer dependencies **only against the web profile's own declared dependencies** (currently just `@dsh.so/dsh-plugin-finder`).
- The three `@deepseek-ai/*` packages are **managed by the DSH host** and actually live one level up, in `~/.dsh/profiles/node_modules`.
- At runtime, Node's module resolution **walks up the directory tree**, so the plugin resolves the host-provided packages just fine.

### How to verify it is fine

Just confirm the host-side versions satisfy the plugin's requirements. Verified on the current environment:

| Plugin requires | Host has | Result |
|---|---|---|
| `@deepseek-ai/cordis@^4.0.1` | 4.0.1 | ✅ |
| `@deepseek-ai/dsh-tools@0.1.0-rc.6` | 0.1.0-rc.6 | ✅ |
| `@deepseek-ai/schemastery@^3.18.1` | 3.18.1 | ✅ |

> In fact, **any** third-party DSH plugin that correctly declares peer dependencies triggers the same warning when installed into a profile (the harness's own `@deepseek-ai/dsh-tool-cordis` declares `@deepseek-ai/cordis` the same way). It is pnpm being "under-informed", not an error.

### Fixes to avoid

1. **Do not move the plugin's `peerDependencies` into `dependencies`** — every plugin would then ship its own copy of the host's core packages, shadowing the host's singletons and re-triggering the `ctx.tools` crash (the 0.1.0 bug above).
2. **Avoid explicitly installing the 3 peers into the profile** — versions get pinned there; when the host upgrades its core packages, the plugin keeps loading the old ones, causing silent API mismatch.

If you only want a clean CI log, you can install the peers explicitly (in exchange for a one-time `declares no dsh.bundle` notice):

```sh
dsh plugin --profile web add @deepseek-ai/cordis@4.0.1 @deepseek-ai/dsh-tools@0.1.0-rc.6 @deepseek-ai/schemastery@3.18.1
```

For daily use: **just ignore the warning**.

---

## 3. Usage

`find_plugin` is an **agent tool** — no manual command; just tell the agent what you need and it calls the tool automatically. A few example prompts (Chinese works too):

- "Find me a plugin for OCR / screenshots"
- "I need a terminal TUI plugin"
- "What dsh plugins exist for memory / RAG?"
- "Find me a plugin for price tracking"
- "帮我找支持 OCR / 截图转文字的 dsh 插件"
- "有没有能识别图片内容的插件?"

### Example conversations

**English — OCR / screenshots**

- **You:** *Find me a plugin for OCR / screenshots*
- **Agent:** *automatically calls `find_plugin` with `{"query": "vision OCR screenshots", "limit": 3}` and returns a ranked list — see [Output Format](#4-output-format)*
- **You:** *How do I install the top one?*
- **Agent:** *Run `dsh plugin --profile web add dsh-vision-router`, then restart `dsh web`.*

**中文 — 终端 TUI**

- **你:** *有没有终端 TUI 插件?*
- **助手:** *自动调用 `find_plugin`,query 为 `"terminal TUI"`* → 返回 `dsh-tianshu-tui`、`dsh-whale-tui`、`dsh-tui` 等结果
- **你:** *帮我装第一个*
- **助手:** *执行 `dsh plugin --profile web add dsh-tianshu-tui`,然后重启 `dsh web`。*

### Tool parameters

| Parameter | Required | Type | Description |
|---|---|---|---|
| `query` | ✅ | string | The need, e.g. `"vision OCR screenshots"`, `"memory rag"`. Chinese and English both work; English matches better |
| `limit` | ❌ | number | Max results; defaults to the `maxResults` config (5), clamped to 1–10 |

---

## 4. Output Format

Each result includes: rank, plugin name, stars, topics, **verification level (L1–L5)** and **security status/risk** badges, description, install command, detail link. Real examples below were captured from the live registry — ranks and star counts drift over time.

**`find_plugin("vision OCR screenshots", limit=3)`**

```
1. dsh-vision-router — 46★ [developer, vision] · ✔ 基础验证通过 · ⚠️ 安全提示:中风险
   Eyes for text-only DeepSeek Harness agents: built-in free vision chain (no key) + pixel-level vision tools (Q&A, grounding, crop, pixel diff, colors, OCR, SVG trace, cutout, screenshots)……
   Install: dsh plugin --profile web add dsh-vision-router
   https://www.dsh.so/plugins/dsh-vision-router/

2. agent-vision-toolkit — 819★ [developer, vision, automation, ai, ui] · ✔ 基础验证通过 · ⚠️ 安全提示:中风险
   为纯文本模型"看图"设计更好的视觉工具箱和技能,支持多图理解,图片问答,
   前端UI还原、GUI 自动化等……
   Install: dsh plugin --profile web add agent-vision-toolkit
   https://www.dsh.so/plugins/agent-vision-toolkit/

3. dsh-vision-toolkit — 317★ [vision, browser, automation, ui] · ✔ 基础验证通过 · ⚠️ 安全提示:中风险
   让纯文本模型更好地做视觉任务的DeepSeek Harness插件:带意图的图片问答、长截图 OCR、UI 还原等……
   Install: dsh plugin --profile web add dsh-vision-toolkit
   https://www.dsh.so/plugins/dsh-vision-toolkit/
```

**`find_plugin("terminal TUI", limit=3)`**

```
1. dsh-tianshu-tui — 132★ [terminal, ui] · ✔ 基础验证通过 · 🔒 安全通过:低风险
   dsh-tianshu-tui — DeepSeek Harness terminal UI
   Install: dsh plugin --profile web add dsh-tianshu-tui
   https://www.dsh.so/plugins/dsh-tianshu-tui/

2. dsh-whale-tui — 0★ [developer, terminal, ui] · ✔ 基础验证通过 · ⚠️ 安全提示:中风险
   grok-build style terminal UI for DeepSeek Harness: a Rust/ratatui TUI shipped as a dsh plugin bundle
   Install: dsh plugin --profile web add dsh-whale-tui
   https://www.dsh.so/plugins/dsh-whale-tui/

3. dsh-tui — 4★ [developer, terminal, ai, ui] · ✔ 已收录(未功能测试) · 🔒 安全通过:低风险
   Claude Code-style terminal UI for DeepSeek Harness agents, as an out-of-tree dsh plugin bundle
   Install: dsh plugin --profile web add dsh-tui
   https://www.dsh.so/plugins/dsh-tui-4/
```

**`find_plugin("memory rag", limit=3)`**

```
1. dsh-memory — 2★ [terminal, knowledge, storage] · ✔ 基础验证通过 · ⚠️ 安全提示:中风险
   Cited memory over DSH's lossless session log — distilled, human-auditable facts with citations……; memory_read/memory_expand tools, recall index, and a dsh-memory CLI.
   Install: dsh plugin --profile web add dsh-memory-2
   https://www.dsh.so/plugins/dsh-memory-2/

2. dsh-memory — 1★ [knowledge, storage] · ✔ 基础验证通过 · ⚠️ 安全提示:中风险
   Durable cross-session SQLite memory for DeepSeek Harness
   Install: dsh plugin --profile web add dsh-memory
   https://www.dsh.so/plugins/dsh-memory/

3. mindspace-dsh-session-memory — 1★ [knowledge, storage] · ✔ 基础验证通过 · 🔒 安全通过:低风险
   Editable, session-isolated personalization memory for DeepSeek Harness
   Install: dsh plugin --profile web add mindspace-dsh-session-memory
   https://www.dsh.so/plugins/mindspace-dsh-session-memory/
```

> 💡 Query intent matters: `"price tracking"` matches **cost/balance-tracking** plugins (`dsh-balance`, `deepseek-harness-wallet`), not price-comparison scrapers — matching reflects what the registry actually describes.

No-match response:

```
No plugins in the dsh.so registry matched that query. Suggest broader terms (e.g. "image", "terminal", "memory").
```

Every result (matches or no-match) ends with a **Powered by dsh.so** footer plus a copyright/license line (`dsh-plugin-finder v0.1.5 · © 2026 zhoushimin · Apache-2.0`). Disable with `attribution: false`.

---

## 5. Search Tips

- **Use English keywords**: matching tokenizes the query, so single English words (`ocr`, `rag`, `tui`) hit far better than long phrases.
- **Be specific**: `"terminal TUI"` beats vague descriptions.
- **Use topic tags**: e.g. `vision`, `browser`, `automation`, `ui` — topic hits weigh more.
- **An empty query returns the top entries by stars** (the model rarely does this, but the behavior exists).
- **Matching is keyword scoring, not AI semantics**: name hit +3, topic hit +2, description hit +1, ties broken by stars. If wording differs a lot, try rephrasing.

---

## 6. Configuration

Configure in the host composition or an agent preset's `cordis.yml` (defaults are fine, usually no change needed):

```yaml
- insert:
    - id: dsh-plugin-finder
      name: '@dsh.so/dsh-plugin-finder'
      config:
        indexUrl: https://www.dsh.so/plugins-index.json   # override for self-host / testing
        maxResults: 5                                      # default result count
        cacheTtlMs: 600000                                 # cache the index for 10 min
        timeoutMs: 15000                                   # fetch timeout (ms)
```

| Config | Default | Description |
|---|---|---|
| `indexUrl` | `https://www.dsh.so/plugins-index.json` | Machine-readable dsh.so plugin index URL |
| `maxResults` | `5` | Default result count when `limit` is not passed |
| `cacheTtlMs` | `600000` (10 min) | How long to reuse the fetched index before refetching |
| `timeoutMs` | `15000` | Fetch timeout in milliseconds |
| `attribution` | `true` | Append a "Powered by dsh.so" promotion and copyright footer to every result |

---

## 7. Data Source & Matching

- **Data source**: `https://www.dsh.so/plugins-index.json` — a machine-readable index of every plugin listed on dsh.so (id, name, description, stars, topics, install, url, verification level, security status & risk).
- **Matching**: the query is tokenized and each token is scored — name contains +3, topic contains +2, description contains +1; results sort by score, ties by stars, then take the top `limit`.
- **Cache**: the index is reused within `cacheTtlMs`; no repeated requests.

---

## 8. FAQ

**Q: Installed, but no `find_plugin` tool in the session?**
A: Check two things: ① `dsh plugin --profile web list` confirms it is installed; ② you must **restart** `dsh web` for a new bundle to load.

**Q: Should I act on the `missing peer` warnings?**
A: No — they are a false positive; see [Section 2](#2-peer-dependency-warnings-important).

**Q: No results for my query?**
A: Use broader English terms such as `"image"`, `"terminal"`, `"memory"`, or drop overly specific qualifiers.

**Q: How do I update the plugin?**
A: `dsh plugin --profile web add '@dsh.so/dsh-plugin-finder@latest'`, then restart.

**Q: How do I uninstall?**
A: `dsh plugin --profile web remove '@dsh.so/dsh-plugin-finder'`, then restart.

---

## 9. Development

```sh
pnpm install     # or npm install (peers come from the dsh host; devDependencies are for local build/test)
pnpm build       # tsc -> lib/
pnpm test        # node --test (match logic unit tests)
```

- The bundle patch is declared in `cordis.patch.yml`, referenced by `dsh.bundle.patch` in `package.json`.
- When publishing to npm, include `lib/`, `cordis.patch.yml`, `README.md`, and `README.zh.md` (see the `files` field in `package.json`).

---

## License

Apache-2.0 · Copyright (c) 2026 zhoushimin
