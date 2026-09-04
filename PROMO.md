# dsh-plugin-finder 宣传文案

> 产品:DSH 插件 `dsh-plugin-finder` —— 让 DeepSeek Harness 的 Agent 自己会"找插件"。
> 版本参考:v0.1.2 · Apache-2.0 · 作者 zhoushimin

---

## 一、一句话 Slogan(候选)

1. **"你的 Agent,从此会自己找插件。"**
2. **"像找技能一样,找遍整个 dsh 插件市场。"**(find-skill for dsh plugins)
3. **"动动嘴,就能发现整个 DSH 插件宇宙。"**
4. **"从 0 到装好,一个自然语言查询的距离。"**
5. **"不问 Google,问你的 Agent——插件在哪,它知道。"**

---

## 二、短文案(社交媒体 / 社区帖子)

**版本 A(推荐,60 字以内)**

> 你的 DeepSeek Harness 缺个插件?不用翻市场、不用猜名字——装上 `dsh-plugin-finder`,直接对 Agent 说"帮我找个做 OCR 的插件",它自动检索 dsh.so 全市场,返回 star 数、简介、标签、安装命令和链接。一句话,插件到手。🧩

**版本 B(带亮点 bullet)**

> 🔍 `dsh-plugin-finder` —— DeepSeek Harness 的插件搜索引擎,已上线 dsh.so!
>
> • 自然语言找插件:中英文都行,"terminal TUI""memory RAG" 张口就来
> • 结果即答案:名称 / star / 标签 / 简介 / **安装命令** / 详情链接,一条龙
> • 零配置,装完即用,索引 10 分钟缓存
>
> 安装:`dsh plugin --profile web add @dsh-so/dsh-plugin-advisor`
> 装完重启 `dsh web`,对助手说需求即可。跟 find-skill 找技能一样,这次是找插件。🚀

---

## 三、市场页介绍(dsh.so / npm 简介)

**短描述(one-liner)**

> Find DeepSeek Harness plugins from the dsh.so registry — like find-skill, but for dsh plugins. 像找技能一样找插件。

**详细介绍(2~3 段)**

> dsh-plugin-finder 在 DeepSeek Harness 会话中注册一个 `plugin_advisor` 模型工具:你用一句自然语言描述需求(如"vision OCR screenshots""memory rag""终端 TUI"),它就会从 dsh.so 插件市场的实时索引中检索最匹配的插件,并按相关度排序返回——每条结果都包含插件名、GitHub star 数、标签、简介、可直接复制的**安装命令**和详情链接。从"想要"到"装好",全程不需要离开对话。
>
> 它与 find-skill 找技能的思路一脉相承:不用记插件名、不用翻目录,把"检索"这件小事交给 Agent。内置关键词打分(名称 +3 / 标签 +2 / 简介 +1,同分按 star 数排序),中英文查询均支持;索引 10 分钟缓存、可配置超时,轻量无依赖(仅声明 peer 依赖,宿主统一管理)。
>
> 安装: `dsh plugin --profile web add @dsh-so/dsh-plugin-advisor`(web / tui / headless 等 profile 均适用),重启后即可使用。Apache-2.0 开源。

---

## 四、长文(公众号 / 博客风格,约 900 字)

### 你的 Agent,从此会自己找插件

DeepSeek Harness 的插件生态正在快速生长:dsh.so 上已经有视觉、TUI、记忆、自动化等各个方向的插件。但插件一多,问题也来了——**你根本不知道有什么,更不知道哪个好用。**

装哪个?凭记忆搜名字?翻市场一个个看简介?等你挑完,写代码的兴致都凉了一半。

现在,这个烦恼可以交给 Agent 自己解决。

**dsh-plugin-finder** 是一个给 DeepSeek Harness 装"插件搜索引擎"的插件。装好之后,你的会话里会多出一个叫 `plugin_advisor` 的工具,而它的一切调用都是自动的:你只需要用一句人话说出需求——

> "帮我找支持 OCR / 截图转文字的 dsh 插件"
> "有没有终端 TUI 插件?"
> "我想做 RAG 记忆,有什么插件?"

Agent 会自动检索 dsh.so 的实时插件索引,按相关度排序返回结果:插件名、GitHub star 数、标签、简介、**安装命令**、详情链接,一应俱全。看到第一条,直接复制安装命令、重启 `dsh web`,插件就位。

**它和你想象中的"搜索"不太一样:**

- **结果是"答案",不是"链接列表"。** 每条都带安装命令和 star 数,零思考成本——就像 find-skill 帮你找技能一样,它帮你找插件。
- **中英文通吃。** 说中文、说英文都能匹配;给足关键词(如 `ocr`、`tui`、`rag`),命中更准。
- **轻量、无感知。** 索引 10 分钟缓存,不会每次调用都去抓网络;超时、结果条数、索引地址都可配置,自建镜像也支持。
- **开源、干净。** 只声明 peer 依赖、不打包宿主核心库,遵循 DSH 生态的规范做法,Apache-2.0 协议。

一句话总结:过去是"你去找插件",现在是"告诉 Agent 你要什么,它去找"。

**开始使用**

```sh
dsh plugin --profile web add @dsh-so/dsh-plugin-advisor
```

重启 `dsh web` 后,对助手说出你的需求即可。插件市场在 dsh.so 等你探索——而你的 Agent,已经知道门牌号了。

---

## 五、English Version

**Tagline**

> "Your agent finds the plugin. You just say what you need."

**Short pitch**

> `dsh-plugin-finder` gives DeepSeek Harness agents a built-in plugin search. Describe a need in plain language ("vision OCR screenshots", "terminal TUI", "memory rag") and the `plugin_advisor` tool scans the live dsh.so registry, returning ranked matches with name, GitHub stars, topics, description, a copy-paste **install command**, and a detail link. Like find-skill, but for dsh plugins.
>
> Install: `dsh plugin --profile web add @dsh-so/dsh-plugin-advisor` · restart `dsh web` · done.

**Longer (marketplace listing)**

> dsh-plugin-finder registers one agent tool, `plugin_advisor`, that searches the dsh.so registry of DeepSeek Harness plugins for the ones that match a need. Query in natural language (Chinese or English), and it returns plugin name, stars, topics, description, install command, and detail link — ranked by a lightweight keyword scorer (name +3, topic +2, description +1, ties broken by stars). The index is cached for 10 minutes and fully configurable (indexUrl, maxResults, cacheTtlMs, timeoutMs). Zero runtime dependencies beyond the host-provided peers. Apache-2.0.
