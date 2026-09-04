# dsh-plugin-finder

在 dsh.so 插件市场中检索 DeepSeek Harness 插件——类似 *find-skill*,但面向 dsh 插件。

本插件在会话中注册一个 **`plugin_advisor`** 工具:用一句自然语言描述需求,它从 dsh.so 插件市场索引中检索最匹配的插件,返回插件名、GitHub star 数、标签、简介、**验证级别(L1–L5)**、**安全状态与风险等级**、**安装命令**和详情链接。

<p align="center">
  <a href="https://www.dsh.so" rel="dofollow">
    <img src="https://raw.githubusercontent.com/dsh-so/dsh-plugin-advisor/main/assets/dsh-so-logo.svg" alt="dsh.so 标志" width="72">
  </a>
  <br>
  <strong>Powered by <a href="https://www.dsh.so" rel="dofollow">dsh.so</a></strong>
  <br>
  <em>DeepSeek Harness 插件市场——发现、对比并安装插件</em>
</p>

**English**: [README.md](https://github.com/dsh-so/dsh-plugin-advisor/blob/main/README.md)

## 目录

1. [安装](#1-安装)
2. [安装时的 peer 依赖警告(重要)](#2-安装时的-peer-依赖警告重要)
3. [使用方法](#3-使用方法)
4. [返回结果格式](#4-返回结果格式)
5. [查询技巧](#5-查询技巧)
6. [配置](#6-配置)
7. [数据来源与匹配规则](#7-数据来源与匹配规则)
8. [常见问题 FAQ](#8-常见问题-faq)
9. [开发与发布](#9-开发与发布)

---

## 1. 安装

从 dsh.so 插件市场安装(推荐):

```sh
dsh plugin --profile web add @dsh-so/dsh-plugin-advisor
```

其他 profile 同理,替换名字即可:

```sh
dsh plugin --profile tui add @dsh-so/dsh-plugin-advisor
dsh plugin --profile headless add @dsh-so/dsh-plugin-advisor
```

从本地源码目录安装(开发调试时):

```sh
dsh plugin --profile web add E:\AgentsWs\PluginBuilder\dsh-plugin-finder
```

> ⚠️ **版本提示**:若你装的是 **0.1.0**,请先升级——0.1.0 把 `@deepseek-ai/dsh-tools` 装成了普通依赖,会与宿主副本冲突导致 agent 循环崩溃(`Cannot read properties of undefined (reading 'prepare')`)。**0.1.1 已修复**,重新安装:
>
> ```sh
> dsh plugin --profile web add @dsh-so/dsh-plugin-advisor@^0.1.1
> ```

安装完成后,**重启 web profile** 才能生效:

```sh
dsh web
```

重启后,会话里就会出现 `plugin_advisor` 工具,直接对助手说需求即可触发(见[使用方法](#3-使用方法))。

### 升级

```sh
dsh plugin --profile web add @dsh-so/dsh-plugin-advisor@latest
dsh web    # 重启以加载新 bundle
```

### 卸载

```sh
dsh plugin --profile web remove @dsh-so/dsh-plugin-advisor
dsh web    # 重启以卸载 bundle
```

> ⚠️ 卸载务必用**包名**,绝不把本地路径传给 `remove`/`del`,否则会删掉源码目录的文件。

---

## 2. 安装时的 peer 依赖警告(重要)

执行安装命令时,你大概率会看到这样一段 pnpm 输出:

```
WARN  Issues with peer dependencies found
└─┬ @dsh-so/dsh-plugin-advisor 0.1.1
  ├── ✕ missing peer @deepseek-ai/cordis@^4.0.1
  ├── ✕ missing peer @deepseek-ai/dsh-tools@0.1.0-rc.6
  └── ✕ missing peer @deepseek-ai/schemastery@^3.18.1
```

**这是正常的"误报",不需要做任何处理,插件可以正常使用。**

### 为什么会出现

- `dsh plugin add` 的机制是在 profile 目录下执行 `pnpm add`;pnpm 校验 peer 依赖时,**只看 web profile 自己声明的依赖**(目前只有 `@dsh-so/dsh-plugin-advisor` 一个)。
- 而这 3 个 `@deepseek-ai/*` 包由 **DSH 宿主(harness)统一管理**,实际安装在上一级目录 `~/.dsh/profiles/node_modules`。
- 运行时,Node 的模块解析会**逐级向上查找**,所以插件能正常 `import` 到宿主提供的这些包。

### 如何确认没问题

只需确认宿主侧的实际版本满足插件要求。当前环境实测:

| 插件要求 | 宿主实际版本 | 结果 |
|---|---|---|
| `@deepseek-ai/cordis@^4.0.1` | 4.0.1 | ✅ |
| `@deepseek-ai/dsh-tools@0.1.0-rc.6` | 0.1.0-rc.6 | ✅ |
| `@deepseek-ai/schemastery@^3.18.1` | 3.18.1 | ✅ |

### dsh 适配版本 / Compatibility with dsh

- **目标依赖线**:`@deepseek-ai/dsh-tools@0.1.0-rc.6` · `@deepseek-ai/cordis@^4.0.1` · `@deepseek-ai/schemastery@^3.18.1`(即 dsh rc.6 系列)。
- **实测环境**:dsh 10.28.1(web profile)。
- **状态**:作者声明(Declared),未经独立验证——遵循 dsh.so 兼容性矩阵语义。
- **升级 dsh 后自查**:重启 profile,确认 `plugin_advisor` 存在;若大版本升级跨了依赖线,先执行 `dsh plugin --profile web update @dsh-so/dsh-plugin-advisor` 再试。

> 事实上,DSH 生态里**任何**正确声明了 peer 依赖的第三方插件,装进 profile 时都会出现类似的警告(harness 自己的 `@deepseek-ai/dsh-tool-cordis` 也是这么声明 `@deepseek-ai/cordis` 的)。这是 pnpm 的"信息缺失"提示,不是错误。

### 不建议的"修复"方式

1. **不要把插件的 `peerDependencies` 改成 `dependencies`** —— 那会让每个插件自带一份宿主核心包的副本,遮蔽宿主的单例,反而会触发 `ctx.tools` 崩溃(即上面 0.1.0 的 bug)。
2. **不建议把 3 个 peer 显式装进 profile** —— 版本会被钉死在 profile 里,未来宿主升级核心包时,插件仍加载旧版,产生 API 错位的隐蔽问题。

如果只是想让 CI 日志干净,可以显式安装(会换来一次性的 `declares no dsh.bundle` 提示):

```sh
dsh plugin --profile web add @deepseek-ai/cordis@4.0.1 @deepseek-ai/dsh-tools@0.1.0-rc.6 @deepseek-ai/schemastery@3.18.1
```

日常使用:**直接忽略警告即可**。

---

## 3. 使用方法

`plugin_advisor` 是**模型工具**,不需要手动输入命令——直接对助手说需求,它会自动调用。示例(中英文均可):

- "帮我找支持 OCR / 截图转文字的 dsh 插件"
- "有没有终端 TUI 插件?"
- "我想做 RAG 记忆,有什么插件"
- "Find me a plugin for price tracking"
- "有没有能识别图片内容的插件?"

### 完整对话示例

**中文 — OCR / 截图**

- **你:** *帮我找支持 OCR / 截图转文字的 dsh 插件*
- **助手:** *自动调用 `plugin_advisor`,参数 `{"query": "vision OCR screenshots", "limit": 3}`,返回按相关度排序的结果——见[返回结果格式](#4-返回结果格式)*
- **你:** *第一个怎么装?*
- **助手:** *执行 `dsh plugin --profile web add dsh-vision-router`,然后重启 `dsh web`。*

**English — terminal TUI**

- **You:** *I need a terminal TUI plugin*
- **Agent:** *calls `plugin_advisor` with query `"terminal TUI"`* → returns `dsh-tianshu-tui`, `dsh-whale-tui`, `dsh-tui`
- **You:** *Install the first one*
- **Agent:** *Run `dsh plugin --profile web add dsh-tianshu-tui`, then restart `dsh web`.*

### 工具参数

| 参数 | 必填 | 类型 | 说明 |
|---|---|---|---|
| `query` | ✅ | string | 需求描述,如 `"vision OCR screenshots"`、`"memory rag"`。中英文均可,英文命中率更高 |
| `limit` | ❌ | number | 返回条数,默认取插件配置 `maxResults`(默认 5),范围 1–10 |

---

## 4. 返回结果格式

每条结果包含:排名、插件名、star 数、标签、**验证级别(L1–L5)**与**安全状态/风险**徽标、简介、安装命令、详情链接。以下为**真实示例**(取自 dsh.so 实时索引,排名与 star 数会随时间变化)。

**`plugin_advisor("vision OCR screenshots", limit=3)`**

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

**`plugin_advisor("terminal TUI", limit=3)`**

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

**`plugin_advisor("memory rag", limit=3)`**

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

> 💡 查询意图很重要:`"price tracking"` 匹配到的是**费用/余额追踪**类插件(`dsh-balance`、`deepseek-harness-wallet`),而不是比价爬虫——匹配结果反映的是索引里实际存在的描述。

无匹配时返回提示:

```
No plugins in the dsh.so registry matched that query. Suggest broader terms (e.g. "image", "terminal", "memory").
```

每条结果(匹配或无匹配)末尾都会附带 **Powered by dsh.so** 推广信息和版权行(`dsh-plugin-finder v0.1.8 · © 2026 zhoushimin · Apache-2.0`)。可通过 `attribution: false` 关闭。

---

## 5. 查询技巧

- **用英文关键词**:工具内部按 token 分词匹配,英文单词(如 `ocr`、`rag`、`tui`)命中率远高于长句。
- **把需求说具体**:`"terminal TUI"` 比 `"好看的界面"` 结果更准。
- **可以用标签词**:如 `vision`、`browser`、`automation`、`ui`,标签命中权重更高。
- **空 query 会按 star 数返回 Top N**(模型一般不会这么用,但行为如此)。
- **匹配是关键词打分,不是 AI 语义**:名称命中 +3、标签命中 +2、简介命中 +1,同分按 star 数排序。措辞差异大时,换个说法再试。

---

## 6. 配置

在宿主 composition 或 agent preset 的 `cordis.yml` 中配置(默认值即可,通常无需修改):

```yaml
- insert:
    - id: dsh-plugin-finder
      name: @dsh-so/dsh-plugin-advisor
      config:
        indexUrl: https://www.dsh.so/plugins-index.json   # 索引地址,自建/测试时覆盖
        maxResults: 5                                      # 默认返回条数
        cacheTtlMs: 600000                                 # 索引缓存 10 分钟
        timeoutMs: 15000                                   # 抓取超时(毫秒)
```

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `indexUrl` | `https://www.dsh.so/plugins-index.json` | dsh.so 机器可读插件索引地址 |
| `maxResults` | `5` | 未传 `limit` 时的默认返回条数 |
| `cacheTtlMs` | `600000`(10 分钟) | 索引缓存时长,避免每次调用都重新抓取 |
| `timeoutMs` | `15000` | 抓取索引的超时时间(毫秒) |
| `attribution` | `true` | 在每次结果末尾追加 "Powered by dsh.so" 推广与版权信息 |

---

## 7. 数据来源与匹配规则

- **数据源**:`https://www.dsh.so/plugins-index.json` —— dsh.so 全部插件的机器可读索引(id、name、description、stars、topics、install、url、verification 验证级别、security 安全状态与风险)。
- **匹配**:query 分词后对每个 token 打分——名称包含 +3、标签包含 +2、简介包含 +1;按总分排序,同分按 star 数排序,取前 `limit` 条。
- **缓存**:索引在 `cacheTtlMs` 内复用,不重复请求。

---

## 8. 常见问题 FAQ

**Q: 装完插件,会话里没有 `plugin_advisor` 工具?**
A: 检查两步:① `dsh plugin --profile web list` 确认已安装;② 安装后需要**重启** `dsh web` 才能加载新 bundle。

**Q: 安装时的一堆 `missing peer` 警告要不要管?**
A: 不用管,是误报,见[第 2 节](#2-安装时的-peer-依赖警告重要)。

**Q: 查询没结果?**
A: 换更宽的英文词,如 `"image"`、`"terminal"`、`"memory"`;或去掉过具体的限定词。

**Q: 插件升级了,怎么更新?**
A: `dsh plugin --profile web add @dsh-so/dsh-plugin-advisor@latest`,然后重启。

**Q: 怎么卸载?**
A: `dsh plugin --profile web remove @dsh-so/dsh-plugin-advisor`,然后重启。

**Q: PowerShell 报错 "The splatting operator '@' cannot be used..."?**
A: 只发生在 **scoped 包**(`@scope/name`)上——PowerShell 把行首 `@` 当展开运算符,需要加引号:`dsh plugin --profile web add '@scope/name'`。本插件是**无前缀包**,不需要引号。

**Q: 启动报 `ERR_MODULE_NOT_FOUND: Cannot find package '@dsh-so/dsh-plugin-advisor'`?**
A: 有残留的安装条目(或 bundle patch 的 `name`)仍引用旧的无 scope 包名。先按包名移除再重装:`dsh plugin --profile web remove @dsh-so/dsh-plugin-advisor`,然后重新 `add`。

**Q: npmjs.com 页面显示的版本比注册表旧?**
A: 网页有缓存,注册表才是权威。终端验证:`npm view @dsh-so/dsh-plugin-advisor version --prefer-online`;网页硬刷新(Ctrl+F5)或稍等几分钟。

**Q: 怎么查看当前安装的版本?**
A: `dsh plugin --profile web list` 看 profile 的依赖;`npm view @dsh-so/dsh-plugin-advisor version` 看 npm 上的最新版。

---

## 9. 开发与发布

```sh
pnpm install     # 或 npm install(peer 依赖由宿主提供,仅 devDependencies 用于本地构建/测试)
pnpm build       # tsc -> lib/
pnpm test        # node --test(匹配逻辑单测)
```

- 插件 bundle 声明在 `cordis.patch.yml`,`package.json` 的 `dsh.bundle.patch` 指向它。
- 发布 npm 包需包含 `lib/`、`cordis.patch.yml`、`README.md`、`README.zh.md`(见 package.json `files` 字段)。

---

## License

Apache-2.0 · Copyright (c) 2026 zhoushimin
