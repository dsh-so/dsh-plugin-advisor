# dsh-plugin-finder

Find DeepSeek Harness plugins from the [dsh.so](https://dsh.so) registry — like *find-skill*, but for dsh plugins.
在 dsh.so 插件市场中检索 DeepSeek Harness 插件——类似 *find-skill*,但面向 dsh 插件。

This plugin registers one agent tool, **`find_plugin`**: describe a need in natural language, and it searches the dsh.so plugin index for the best-matching plugins, returning name, GitHub stars, topics, description, an **install command**, and a detail link.
本插件在会话中注册一个 **`find_plugin`** 工具:用一句自然语言描述需求,它从 dsh.so 插件市场索引中检索最匹配的插件,返回插件名、GitHub star 数、标签、简介、**安装命令**和详情链接。

> **Registry / 收录**: <a href="https://www.dsh.so" rel="dofollow">dsh.so</a> — the DeepSeek Harness plugin registry · dsh.so 插件市场

## Table of Contents / 目录

1. [Install / 安装](#1-install--安装)
2. [Peer Dependency Warnings (Important) / 安装时的 peer 依赖警告(重要)](#2-peer-dependency-warnings-important--安装时的-peer-依赖警告重要)
3. [Usage / 使用方法](#3-usage--使用方法)
4. [Output Format / 返回结果格式](#4-output-format--返回结果格式)
5. [Search Tips / 查询技巧](#5-search-tips--查询技巧)
6. [Configuration / 配置](#6-configuration--配置)
7. [Data Source & Matching / 数据来源与匹配规则](#7-data-source--matching--数据来源与匹配规则)
8. [FAQ / 常见问题](#8-faq--常见问题)
9. [Development / 开发与发布](#9-development--开发与发布)

---

## 1. Install / 安装

Install from the dsh.so marketplace (recommended) / 从 dsh.so 插件市场安装(推荐):

```sh
dsh plugin --profile web add dsh-plugin-finder
```

Other profiles work the same — just change the name / 其他 profile 同理,替换名字即可:

```sh
dsh plugin --profile tui add dsh-plugin-finder
dsh plugin --profile headless add dsh-plugin-finder
```

Install from a local checkout (development) / 从本地源码目录安装(开发调试时):

```sh
dsh plugin --profile web add E:\AgentsWs\PluginBuilder\dsh-plugin-finder
```

> ⚠️ **Version note / 版本提示**: if you have **0.1.0**, upgrade first — 0.1.0 installed `@deepseek-ai/dsh-tools` as a regular dependency, which conflicts with the host's copy and crashes the agent loop with `Cannot read properties of undefined (reading 'prepare')`. **Fixed in 0.1.1**; reinstall with / 若你装的是 **0.1.0**,请先升级——0.1.0 把 `@deepseek-ai/dsh-tools` 装成了普通依赖,会与宿主副本冲突导致 agent 循环崩溃(`Cannot read properties of undefined (reading 'prepare')`)。**0.1.1 已修复**,重新安装:
>
> ```sh
> dsh plugin --profile web add dsh-plugin-finder@^0.1.1
> ```

**Restart the web profile** for the new bundle to load / 安装完成后,**重启 web profile** 才能生效:

```sh
dsh web
```

After the restart, the `find_plugin` tool appears in the session — just tell the agent what you need (see [Usage](#3-usage--使用方法)).
重启后,会话里就会出现 `find_plugin` 工具,直接对助手说需求即可触发(见[使用方法](#3-usage--使用方法))。

---

## 2. Peer Dependency Warnings (Important) / 安装时的 peer 依赖警告(重要)

You will very likely see this pnpm output during install / 执行安装命令时,你大概率会看到这样一段 pnpm 输出:

```
WARN  Issues with peer dependencies found
└─┬ dsh-plugin-finder 0.1.1
  ├── ✕ missing peer @deepseek-ai/cordis@^4.0.1
  ├── ✕ missing peer @deepseek-ai/dsh-tools@0.1.0-rc.6
  └── ✕ missing peer @deepseek-ai/schemastery@^3.18.1
```

**This is a benign false positive — no action needed; the plugin works normally.**
**这是正常的"误报",不需要做任何处理,插件可以正常使用。**

### Why it appears / 为什么会出现

- `dsh plugin add` works by running `pnpm add` in the profile directory; pnpm checks peer dependencies **only against the web profile's own declared dependencies** (currently just `dsh-plugin-finder`).
- The three `@deepseek-ai/*` packages are **managed by the DSH host** and actually live one level up, in `~/.dsh/profiles/node_modules`.
- At runtime, Node's module resolution **walks up the directory tree**, so the plugin resolves the host-provided packages just fine.

- `dsh plugin add` 的机制是在 profile 目录下执行 `pnpm add`;pnpm 校验 peer 依赖时,**只看 web profile 自己声明的依赖**(目前只有 `dsh-plugin-finder` 一个)。
- 而这 3 个 `@deepseek-ai/*` 包由 **DSH 宿主(harness)统一管理**,实际安装在上一级目录 `~/.dsh/profiles/node_modules`。
- 运行时,Node 的模块解析会**逐级向上查找**,所以插件能正常 `import` 到宿主提供的这些包。

### How to verify it is fine / 如何确认没问题

Just confirm the host-side versions satisfy the plugin's requirements. Verified on the current environment / 只需确认宿主侧的实际版本满足插件要求。当前环境实测:

| Plugin requires / 插件要求 | Host has / 宿主实际版本 | Result / 结果 |
|---|---|---|
| `@deepseek-ai/cordis@^4.0.1` | 4.0.1 | ✅ |
| `@deepseek-ai/dsh-tools@0.1.0-rc.6` | 0.1.0-rc.6 | ✅ |
| `@deepseek-ai/schemastery@^3.18.1` | 3.18.1 | ✅ |

> In fact, **any** third-party DSH plugin that correctly declares peer dependencies triggers the same warning when installed into a profile (the harness's own `@deepseek-ai/dsh-tool-cordis` declares `@deepseek-ai/cordis` the same way). It is pnpm being "under-informed", not an error.
> 事实上,DSH 生态里**任何**正确声明了 peer 依赖的第三方插件,装进 profile 时都会出现类似的警告(harness 自己的 `@deepseek-ai/dsh-tool-cordis` 也是这么声明 `@deepseek-ai/cordis` 的)。这是 pnpm 的"信息缺失"提示,不是错误。

### Fixes to avoid / 不建议的"修复"方式

1. **Do not move the plugin's `peerDependencies` into `dependencies`** — every plugin would then ship its own copy of the host's core packages, shadowing the host's singletons and re-triggering the `ctx.tools` crash (the 0.1.0 bug above).
2. **Avoid explicitly installing the 3 peers into the profile** — versions get pinned there; when the host upgrades its core packages, the plugin keeps loading the old ones, causing silent API mismatch.

1. **不要把插件的 `peerDependencies` 改成 `dependencies`** —— 那会让每个插件自带一份宿主核心包的副本,遮蔽宿主的单例,反而会触发 `ctx.tools` 崩溃(即上面 0.1.0 的 bug)。
2. **不建议把 3 个 peer 显式装进 profile** —— 版本会被钉死在 profile 里,未来宿主升级核心包时,插件仍加载旧版,产生 API 错位的隐蔽问题。

If you only want a clean CI log, you can install the peers explicitly (in exchange for a one-time `declares no dsh.bundle` notice) / 如果只是想让 CI 日志干净,可以显式安装(会换来一次性的 `declares no dsh.bundle` 提示):

```sh
dsh plugin --profile web add @deepseek-ai/cordis@4.0.1 @deepseek-ai/dsh-tools@0.1.0-rc.6 @deepseek-ai/schemastery@3.18.1
```

For daily use: **just ignore the warning** / 日常使用:**直接忽略警告即可**。

---

## 3. Usage / 使用方法

`find_plugin` is an **agent tool** — no manual command; just tell the agent what you need and it calls the tool automatically / `find_plugin` 是**模型工具**,不需要手动输入命令——直接对助手说需求,它会自动调用:

- "帮我找支持 OCR / 截图转文字的 dsh 插件"
- "有没有终端 TUI 插件?"
- "我想做 RAG 记忆,有什么插件"
- "Find me a plugin for price tracking"

### Tool parameters / 工具参数

| Parameter / 参数 | Required / 必填 | Type / 类型 | Description / 说明 |
|---|---|---|---|
| `query` | ✅ | string | The need, e.g. `"vision OCR screenshots"`, `"memory rag"`. Chinese and English both work; English matches better / 需求描述,如 `"vision OCR screenshots"`、`"memory rag"`。中英文均可,英文命中率更高 |
| `limit` | ❌ | number | Max results; defaults to the `maxResults` config (5), clamped to 1–10 / 返回条数,默认取插件配置 `maxResults`(默认 5),范围 1–10 |

---

## 4. Output Format / 返回结果格式

Each result includes: rank, plugin name, stars, topics, description, install command, detail link. Real example (query `"vision OCR screenshots"`, limit=3) / 每条结果包含:排名、插件名、star 数、标签、简介、安装命令、详情链接。真实示例(查询 `"vision OCR screenshots"`,limit=3):

```
1. agent-vision-toolkit — 496★ [developer, vision, automation, network, ai, ui]
   为纯文本模型"看图"设计更好的视觉工具箱和技能,支持多图理解,图片问答,
   前端UI还原、GUI 自动化等……
   Install: dsh plugin --profile web add agent-vision-toolkit
   https://www.dsh.so/plugins/agent-vision-toolkit/

2. dsh-vision-toolkit — 140★ [vision, browser, automation, network, ui]
   让纯文本模型更好地做视觉任务的DeepSeek Harness插件……
   Install: dsh plugin --profile web add dsh-vision-toolkit
   https://www.dsh.so/plugins/dsh-vision-toolkit/

3. shadow-vision — 2★ [vision, network, data, ai]
   Open-source MCP vision server……
   Install: dsh plugin --profile web add shadow-vision
   https://www.dsh.so/plugins/shadow-vision/
```

No-match response / 无匹配时返回提示:

```
No plugins in the dsh.so registry matched that query. Suggest broader terms (e.g. "image", "terminal", "memory").
```

---

## 5. Search Tips / 查询技巧

- **Use English keywords / 用英文关键词**: matching tokenizes the query, so single English words (`ocr`, `rag`, `tui`) hit far better than long phrases / 工具内部按 token 分词匹配,英文单词(如 `ocr`、`rag`、`tui`)命中率远高于长句。
- **Be specific / 把需求说具体**: `"terminal TUI"` beats `"好看的界面"` / `"terminal TUI"` 比 `"好看的界面"` 结果更准。
- **Use topic tags / 可以用标签词**: e.g. `vision`, `browser`, `automation`, `ui` — topic hits weigh more / 如 `vision`、`browser`、`automation`、`ui`,标签命中权重更高。
- **An empty query returns the top entries by stars / 空 query 会按 star 数返回 Top N**(the model rarely does this, but the behavior exists) /(模型一般不会这么用,但行为如此)。
- **Matching is keyword scoring, not AI semantics / 匹配是关键词打分,不是 AI 语义**: name hit +3, topic hit +2, description hit +1, ties broken by stars. If wording differs a lot, try rephrasing / 名称命中 +3、标签命中 +2、简介命中 +1,同分按 star 数排序。措辞差异大时,换个说法再试。

---

## 6. Configuration / 配置

Configure in the host composition or an agent preset's `cordis.yml` (defaults are fine, usually no change needed) / 在宿主 composition 或 agent preset 的 `cordis.yml` 中配置(默认值即可,通常无需修改):

```yaml
- insert:
    - id: dsh-plugin-finder
      name: dsh-plugin-finder
      config:
        indexUrl: https://www.dsh.so/plugins-index.json   # 索引地址,自建/测试时覆盖
        maxResults: 5                                      # 默认返回条数
        cacheTtlMs: 600000                                 # 索引缓存 10 分钟
        timeoutMs: 15000                                   # 抓取超时(毫秒)
```

| Config / 配置项 | Default / 默认值 | Description / 说明 |
|---|---|---|
| `indexUrl` | `https://www.dsh.so/plugins-index.json` | Machine-readable dsh.so plugin index URL / dsh.so 机器可读插件索引地址 |
| `maxResults` | `5` | Default result count when `limit` is not passed / 未传 `limit` 时的默认返回条数 |
| `cacheTtlMs` | `600000` (10 min / 10 分钟) | How long to reuse the fetched index before refetching / 索引缓存时长,避免每次调用都重新抓取 |
| `timeoutMs` | `15000` | Fetch timeout in milliseconds / 抓取索引的超时时间(毫秒) |

---

## 7. Data Source & Matching / 数据来源与匹配规则

- **Data source / 数据源**: `https://www.dsh.so/plugins-index.json` — a machine-readable index of every plugin listed on dsh.so (id, name, description, stars, topics, install, url) / dsh.so 全部插件的机器可读索引(id、name、description、stars、topics、install、url)。
- **Matching / 匹配**: the query is tokenized and each token is scored — name contains +3, topic contains +2, description contains +1; results sort by score, ties by stars, then take the top `limit` / query 分词后对每个 token 打分——名称包含 +3、标签包含 +2、简介包含 +1;按总分排序,同分按 star 数排序,取前 `limit` 条。
- **Cache / 缓存**: the index is reused within `cacheTtlMs`; no repeated requests / 索引在 `cacheTtlMs` 内复用,不重复请求。

---

## 8. FAQ / 常见问题

**Q: Installed, but no `find_plugin` tool in the session / 装完插件,会话里没有 `find_plugin` 工具?**
A: Check two things: ① `dsh plugin --profile web list` confirms it is installed; ② you must **restart** `dsh web` for a new bundle to load / 检查两步:① `dsh plugin --profile web list` 确认已安装;② 安装后需要**重启** `dsh web` 才能加载新 bundle。

**Q: Should I act on the `missing peer` warnings / 安装时的一堆 `missing peer` 警告要不要管?**
A: No — they are a false positive; see [Section 2](#2-peer-dependency-warnings-important--安装时的-peer-依赖警告重要) / 不用管,是误报,见[第 2 节](#2-peer-dependency-warnings-important--安装时的-peer-依赖警告重要)。

**Q: No results for my query / 查询没结果?**
A: Use broader English terms such as `"image"`, `"terminal"`, `"memory"`, or drop overly specific qualifiers / 换更宽的英文词,如 `"image"`、`"terminal"`、`"memory"`;或去掉过具体的限定词。

**Q: How do I update the plugin / 插件升级了,怎么更新?**
A: `dsh plugin --profile web add dsh-plugin-finder@latest`, then restart / `dsh plugin --profile web add dsh-plugin-finder@latest`,然后重启。

**Q: How do I uninstall / 怎么卸载?**
A: `dsh plugin --profile web remove dsh-plugin-finder`, then restart / `dsh plugin --profile web remove dsh-plugin-finder`,然后重启。

---

## 9. Development / 开发与发布

```sh
pnpm install     # or npm install (peers come from the dsh host; devDependencies are for local build/test)
                 # 或 npm install(peer 依赖由宿主提供,仅 devDependencies 用于本地构建/测试)
pnpm build       # tsc -> lib/
pnpm test        # node --test(match logic unit tests / 匹配逻辑单测)
```

- The bundle patch is declared in `cordis.patch.yml`, referenced by `dsh.bundle.patch` in `package.json` / 插件 bundle 声明在 `cordis.patch.yml`,`package.json` 的 `dsh.bundle.patch` 指向它。
- When publishing to npm, include `lib/`, `cordis.patch.yml`, and `README.md` (see the `files` field in `package.json`) / 发布 npm 包需包含 `lib/`、`cordis.patch.yml`、`README.md`(见 package.json `files` 字段)。

---

## License

Apache-2.0 · Copyright (c) 2026 zhoushimin
