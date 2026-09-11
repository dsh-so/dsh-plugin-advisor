<p align="center">
  <img src="assets/dsh-so-logo.svg" alt="dsh.so" width="88">
</p>

<h1 align="center">dsh-plugin-advisor</h1>

<p align="center">
  <strong>让 DSH Agent 自己会找插件 —— 一句自然语言检索 dsh.so 插件市场，拿回验证等级、安全状态与安装命令。</strong>
</p>

<p align="center">
  像 find-skill 找技能，这次是找插件。装完即用、零配置：插件只注册一个 `plugin_advisor` 工具，剩下的交给 Agent。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@dsh-so/dsh-plugin-advisor"><img src="https://img.shields.io/npm/v/@dsh-so/dsh-plugin-advisor?style=flat&label=npm&color=4D6BFE" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@dsh-so/dsh-plugin-advisor"><img src="https://img.shields.io/npm/dm/@dsh-so/dsh-plugin-advisor?style=flat&label=downloads&color=4D6BFE" alt="npm downloads"></a>
  <a href="https://github.com/dsh-so/dsh-plugin-advisor"><img src="https://img.shields.io/github/stars/dsh-so/dsh-plugin-advisor?style=flat&label=%E2%98%85&color=08C" alt="GitHub stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-2EA44F?style=flat" alt="Apache-2.0"></a>
  <img src="https://img.shields.io/badge/dsh-0.1.0--rc.6-4D6BFE?style=flat" alt="dsh rc.6">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat" alt="TypeScript 5">
</p>

**English**: [README.en.md](https://github.com/dsh-so/dsh-plugin-advisor/blob/main/README.en.md)

---

`plugin_advisor` 是 dsh.so 插件市场的检索入口：你用一句自然语言描述需求，它就从 dsh.so 实时插件索引里挑出最匹配的插件，返回**插件名、GitHub star 数、标签、简介、验证等级（L1–L5）、安全状态与风险等级、安装命令**和详情链接。从"想要"到"装好"，全程不必离开对话。

<p align="center">
  <strong>Powered by <a href="https://www.dsh.so" rel="dofollow">dsh.so</a></strong><br>
  <em>DeepSeek Harness 插件市场 —— 发现、对比并安装插件</em>
</p>

## 功能特性

- **一句话找插件** —— "帮我找个能做 OCR 的插件"就够了，不用记插件名、不用翻市场，Agent 会自己调用 `plugin_advisor`。
- **结果是一张卡，不是链接堆** —— 直接给出最匹配插件的 star 数、标签、验证等级、安全徽标与详情链接，并附 2 条备选。
- **默认质量门槛** —— 只返回 **L5（实测通过）** 且 **安全审计通过** 的插件；warning 级发现可接受，high/critical 风险直接排除。
- **能力缺口自动兜底** —— 已装工具都做不到时，AUTO-TRIGGER 让 Agent 先去插件市场找，再说"做不到"。
- **确认后一键装好** —— 用户明确同意后，工具直接调用 `dsh plugin add` 安装（卸载同理），装完提醒重启。
- **中英文通吃** —— 内置 zh→en 概念词典（记忆→memory、账单→billing…）加 CJK 二元组匹配，中文长句同样命中。
- **零运行依赖** —— 只声明 3 个 peer 依赖，由 dsh 宿主统一提供，绝不打包宿主核心库副本。
- **离线也不空手** —— 索引缓存 12 小时并落盘，profile 重启后依然有效；抓取失败时回退到陈旧缓存。
- **可自建索引** —— `indexUrl` 可指向任意自建镜像。

## 快速上手

1. **安装** —— `dsh plugin --profile web add @dsh-so/dsh-plugin-advisor`
2. **重启** —— `dsh web`（新 bundle 需要重启才会加载）
3. **说需求** —— 对助手说 *"帮我找支持 OCR / 截图转文字的 dsh 插件"*，它会自动检索，并在你确认后装好

## 安装

| 场景 | 命令 |
| --- | --- |
| dsh.so 市场（推荐） | `dsh plugin --profile web add @dsh-so/dsh-plugin-advisor` |
| 其他 profile | `dsh plugin --profile tui add @dsh-so/dsh-plugin-advisor`<br>`dsh plugin --profile headless add @dsh-so/dsh-plugin-advisor` |
| 本地源码（开发调试） | `dsh plugin --profile web add E:\AgentsWs\...\dsh-plugin-advisor` |
| 升级 | `dsh plugin --profile web add @dsh-so/dsh-plugin-advisor@latest` |
| 卸载 | `dsh plugin --profile web remove @dsh-so/dsh-plugin-advisor` |

安装、升级、卸载之后都要**重启 profile**（`dsh web`）才会生效。

> ⚠️ **版本提示**：若你装的是 **0.1.0**，请先升级 —— 0.1.0 把 `@deepseek-ai/dsh-tools` 装成了普通依赖，会与宿主副本冲突，导致 agent 循环崩溃（`Cannot read properties of undefined (reading 'prepare')`）。**0.1.1 起已修复**：
>
> `dsh plugin --profile web add @dsh-so/dsh-plugin-advisor@^0.1.1`

> ⚠️ 卸载务必用**包名**，绝不把本地路径传给 `remove`/`del`，否则会删掉源码目录的文件。

## 关于 peer 依赖警告（重要）

执行安装命令时，你大概率会看到这样一段 pnpm 输出：

```
WARN  Issues with peer dependencies found
└─┬ @dsh-so/dsh-plugin-advisor 0.1.1
  ├── ✕ missing peer @deepseek-ai/cordis@^4.0.1
  ├── ✕ missing peer @deepseek-ai/dsh-tools@0.1.0-rc.6
  └── ✕ missing peer @deepseek-ai/schemastery@^3.18.1
```

**这是正常的"误报"，不需要做任何处理，插件可以正常使用。**

### 为什么会出现

- `dsh plugin add` 的机制是在 profile 目录下执行 `pnpm add`；pnpm 校验 peer 依赖时，**只看 web profile 自己声明的依赖**（目前只有 `@dsh-so/dsh-plugin-advisor` 一个）。
- 而这 3 个 `@deepseek-ai/*` 包由 **DSH 宿主统一管理**，实际安装在上一级目录 `~/.dsh/profiles/node_modules`。
- 运行时 Node 的模块解析会**逐级向上查找**，所以插件能正常 `import` 到宿主提供的这些包。

### 如何确认没问题

| 插件要求 | 宿主实际版本 | 结果 |
|---|---|---|
| `@deepseek-ai/cordis@^4.0.1` | 4.0.1 | ✅ |
| `@deepseek-ai/dsh-tools@0.1.0-rc.6` | 0.1.0-rc.6 | ✅ |
| `@deepseek-ai/schemastery@^3.18.1` | 3.18.1 | ✅ |

- **目标依赖线**：dsh rc.6 系列（`@deepseek-ai/dsh-tools@0.1.0-rc.6` · `@deepseek-ai/cordis@^4.0.1` · `@deepseek-ai/schemastery@^3.18.1`）。
- **实测环境**：dsh 10.28.1（web profile）。
- **状态**：作者声明（Declared），未经独立验证 —— 遵循 dsh.so 兼容性矩阵语义。
- **升级 dsh 后自查**：重启 profile 确认 `plugin_advisor` 存在；若大版本升级跨了依赖线，先 `dsh plugin --profile web update @dsh-so/dsh-plugin-advisor` 再试。

> 事实上，DSH 生态里**任何**正确声明了 peer 依赖的第三方插件，装进 profile 时都会出现类似警告（harness 自己的 `@deepseek-ai/dsh-tool-cordis` 也是这么声明 `@deepseek-ai/cordis` 的）。这是 pnpm 的"信息缺失"提示，不是错误。

### 不建议的"修复"方式

1. **不要把插件的 `peerDependencies` 改成 `dependencies`** —— 那会让每个插件自带一份宿主核心包副本，遮蔽宿主单例，反而触发 `ctx.tools` 崩溃（即 0.1.0 的 bug）。
2. **不建议把 3 个 peer 显式装进 profile** —— 版本会被钉死在 profile 里；宿主将来升级核心包时，插件仍加载旧版，产生 API 错位的隐蔽问题。

若只是想让 CI 日志干净，可以显式安装（会换来一次性的 `declares no dsh.bundle` 提示）：

```sh
dsh plugin --profile web add @deepseek-ai/cordis@4.0.1 @deepseek-ai/dsh-tools@0.1.0-rc.6 @deepseek-ai/schemastery@3.18.1
```

日常使用：**直接忽略警告即可**。

## 使用方法

`plugin_advisor` 是**模型工具**，不需要手动敲命令 —— 直接对助手说需求，它会自动调用。示例（中英文均可）：

- "帮我找支持 OCR / 截图转文字的 dsh 插件"
- "有没有终端 TUI 插件？"
- "我想做 RAG 记忆，有什么插件"
- "Find me a plugin for price tracking"

### 完整对话示例

**中文 —— OCR / 截图**

- **你**：*帮我找支持 OCR / 截图转文字的 dsh 插件*
- **助手**：*自动调用 `plugin_advisor`，参数 `{"query": "vision OCR screenshots", "limit": 3}`，返回一张推荐卡 —— 见下文[输出格式](#输出格式)*
- **你**：*装第一个*
- **助手**：*调用 `plugin_advisor` 并传 `install: "github:leozou320-ai/dsh-macos-vision-ocr"`，装好后提醒你重启 `dsh web`。*

**English —— terminal TUI**

- **You**: *I need a terminal TUI plugin*
- **Agent**: *calls `plugin_advisor` with `"terminal TUI"`* → returns ranked matches
- **You**: *Install the first one*
- **Agent**: *calls the tool again with `install`, then reminds you to restart `dsh web`.*

### 能力缺口自动搜索与安装确认

当你的需求**已安装的插件都无法满足**时，agent 会自动调用 `plugin_advisor` 搜索缺失的能力。结果默认通过质量门槛 —— **L5（实测）验证等级** 且 **安全审计通过**（warning 级发现可接受，排除 high/critical 风险）。随后工具会高亮最匹配的一个插件、给出安装命令，并**先向用户确认再安装** —— 未经同意不会安装任何插件。

### 工具参数

| 参数 | 必填 | 类型 | 说明 |
|---|---|---|---|
| `query` | 查询时必填 | string | 需求描述，如 `"vision OCR screenshots"`、`"memory rag"`。中英文均可，英文短词命中率更高 |
| `limit` | ❌ | number | 返回条数，默认取配置 `maxResults`（5），上限 10 |
| `install` | ❌ | string | **仅在用户明确同意安装后**传入安装目标：npm 包名（可带 scope 与 `@version`）或 `github:owner/repo` |
| `remove` | ❌ | string | **仅在用户明确要求卸载后**传入已安装的包名（不接受 `github:` 目标） |
| `profile` | ❌ | string | 安装/卸载的目标 profile，默认 `web`；非法字符会被过滤 |

## 输出格式

每次检索渲染成一张**推荐卡**：最匹配插件（名称 / star / 标签 / 验证等级 / 安全徽标 / 简介 / 详情链接）加 2 条备选。

**`plugin_advisor("vision OCR screenshots", limit=3)`** —— 真实输出（取自 dsh.so 实时索引，排名与 star 数会随时间变化）：

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

徽标含义：

| 徽标 | 含义 |
|---|---|
| 🏅 `L5 · Run tested` | 验证等级：L1 收录 → L5 实际跑通功能测试 |
| 🔒 安全通过:低风险 | 安全审计通过，低风险 |
| ⚠️ 安全提示:中风险 | 已审计但有 warning 级发现（默认门槛仍会放行） |
| ⏳ 安全检测进行中 / ❓ 未通过 / 🚨 高风险 | 未审计、审计失败或 high/critical 风险（默认门槛会排除） |

无匹配时：

```
没有找到完全匹配的 dsh.so 插件。已自动用更宽泛的关键词再试一次也没有结果。
可以直接告诉用户：该需求暂时没有现成插件，可关注 dsh.so 的更新，或描述更具体的需求换个说法再试。
```

每条结果（匹配或无匹配）末尾都会附带 **Powered by dsh.so** 推广与版权行（`dsh-plugin-advisor v0.2.1 · © 2026 zhoushimin · Apache-2.0`），可用 `attribution: false` 关闭。

## 查询技巧

- **中文查询已优化**：内置中英概念词典（记忆→memory、账单→billing 等）与 CJK 二元组匹配，中文长句也能命中；英文短词仍最优。
- **把需求说具体**：`"terminal TUI"` 比 `"好看的界面"` 结果更准。
- **可以用标签词**：如 `vision`、`browser`、`automation`、`ui`，标签命中权重更高。
- **空 query 会按 star 数返回 Top N**（模型一般不会这么用，但行为如此）。
- **匹配是关键词打分，不是 AI 语义**：名称命中 +3、标签命中 +2、简介命中 +1，同分按 star 数排序。措辞差异大时，换个说法再试。

## 配置

在宿主 composition 或 agent preset 的 `cordis.yml` 中配置（默认值即可，通常无需修改）：

```yaml
- insert:
    - id: dsh-plugin-finder
      name: @dsh-so/dsh-plugin-advisor
      config:
        indexUrl: https://www.dsh.so/plugins-index.json   # 索引地址，自建/测试时覆盖
        maxResults: 5                                      # 默认返回条数
        cacheTtlMs: 43200000                               # 索引缓存 12 小时
        timeoutMs: 15000                                   # 抓取超时（毫秒）
```

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `indexUrl` | `https://www.dsh.so/plugins-index.json` | dsh.so 机器可读插件索引地址 |
| `maxResults` | `5` | 未传 `limit` 时的默认返回条数 |
| `cacheTtlMs` | `43200000`（12 小时） | 索引缓存时长：一天最多抓取 2 次 |
| `timeoutMs` | `15000` | 抓取索引的超时时间（毫秒） |
| `attribution` | `true` | 在每次结果末尾追加 "Powered by dsh.so" 推广与版权信息 |
| `minVerificationLevel` | `5` | 结果需达到的最低验证等级（L1–L5），`0` 表示不过滤 |
| `requireLowRisk` | `true` | 仅保留已审计插件；warning 可接受，排除 high/critical |

## 数据来源、缓存与匹配规则

- **数据源**：`https://www.dsh.so/plugins-index.json` —— dsh.so 全部插件的机器可读索引（id、name、description、stars、topics、install、url、verification 验证等级、security 安全状态与风险）。
- **匹配**：query 分词 → 中文概念扩展（zh→en 词典 + CJK 二元组）→ 逐 token 打分（名称 +3 / 标签 +2 / 简介 +1）→ 按总分排序，同分按 star 数排序，取前 `limit` 条。
- **质量门槛**：先按 `minVerificationLevel` 与 `requireLowRisk` 过滤，再对通过者排序。
- **缓存**：内存 + 磁盘双层，命中 `cacheTtlMs` 内直接复用；磁盘缓存位于 `%TEMP%\dsh-plugin-advisor\index-<hash>.json`（按 `indexUrl` 的 sha256 前 16 位命名），profile 重启后依然有效。抓取失败时回退到陈旧缓存。

### 仓库结构

```
dsh-plugin-advisor/
├── src/
│   ├── index.ts              插件入口：Config schema、plugin_advisor 工具、卡片渲染、索引抓取与磁盘缓存
│   └── match.ts              纯函数匹配：分词、中英概念词典、CJK 二元组、打分排序
├── test/match.test.ts        匹配逻辑单测（node --test）
├── scripts/
│   ├── verify-install.mjs    发布后自检：npm / GitHub 两路安装 + 功能冒烟
│   ├── sync-readmes.mjs      中英 README 小节同步
│   └── restart-dsh-web.ps1   本地重启助手
├── assets/dsh-so-logo.svg    dsh.so 标志
├── cordis.patch.yml          bundle patch（package.json 的 dsh.bundle.patch 指向它）
└── README.md · README.en.md  中文（默认）/ 英文文档
```

## 常见问题 FAQ

**Q: 装完插件，会话里没有 `plugin_advisor` 工具？**
A: 检查两步：① `dsh plugin --profile web list` 确认已安装；② 安装后需要**重启** `dsh web` 才能加载新 bundle。

**Q: 安装时的一堆 `missing peer` 警告要不要管？**
A: 不用管，是误报，见上文「关于 peer 依赖警告（重要）」。

**Q: 查询没结果？**
A: 换更宽的英文词，如 `"image"`、`"terminal"`、`"memory"`；或去掉过具体的限定词。

**Q: 插件升级了，怎么更新？**
A: `dsh plugin --profile web add @dsh-so/dsh-plugin-advisor@latest`，然后重启。

**Q: 怎么卸载？**
A: `dsh plugin --profile web remove @dsh-so/dsh-plugin-advisor`，然后重启。

**Q: PowerShell 报错 "The splatting operator '@' cannot be used..."？**
A: 只发生在 **scoped 包**（`@scope/name`）上 —— PowerShell 把行首 `@` 当展开运算符，需要加引号：`dsh plugin --profile web add '@scope/name'`。

**Q: 启动报 `ERR_MODULE_NOT_FOUND: Cannot find package '@dsh-so/dsh-plugin-advisor'`？**
A: 有残留的安装条目（或 bundle patch 的 `name`）仍引用旧包名。先按包名移除再重装：`dsh plugin --profile web remove @dsh-so/dsh-plugin-advisor`，然后重新 `add`。

**Q: npmjs.com 页面显示的版本比注册表旧？**
A: 网页有缓存，注册表才是权威。终端验证：`npm view @dsh-so/dsh-plugin-advisor version --prefer-online`；网页硬刷新（Ctrl+F5）或稍等几分钟。

**Q: 怎么查看当前安装的版本？**
A: `dsh plugin --profile web list` 看 profile 的依赖；`npm view @dsh-so/dsh-plugin-advisor version` 看 npm 上的最新版。

## 开发与发布

```sh
pnpm install     # 或 npm install（peer 依赖由宿主提供，仅 devDependencies 用于本地构建/测试）
pnpm build       # tsc -> lib/
pnpm test        # node --test（匹配逻辑单测）
```

- 插件 bundle 声明在 `cordis.patch.yml`，`package.json` 的 `dsh.bundle.patch` 指向它。
- 发布 npm 包需包含 `lib/`、`cordis.patch.yml`、`README.md`（中文，默认）、`README.en.md`（英文）与 `assets/`（见 package.json `files` 字段）。

### 发布后自检

每次 `npm publish` 后跑一遍自动安装检查，确认两种安装来源都能装上已发布的产物：

```sh
npm run verify:install            # 离线：npm registry + GitHub，功能冒烟
npm run verify:install -- --live  # 额外查询真实 dsh.so 索引
```

脚本会把 `@dsh-so/dsh-plugin-advisor@<version>` 分别从 npm 和 `github:dsh-so/dsh-plugin-advisor` 装进临时目录（模拟 dsh profile 的 settings），校验包名/版本与 `lib/index.js`、`lib/match.js` 是否齐备，再对匹配逻辑做一次功能冒烟；任一来源失败即非零退出。`npm run verify`（test + verify:install）是完整闸门。

## 许可

[Apache-2.0](LICENSE) · Copyright (c) 2026 zhoushimin
