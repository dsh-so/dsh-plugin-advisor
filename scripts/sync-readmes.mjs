import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const EN = `### Capability-gap auto search & install confirmation

When your request cannot be handled by any **installed** tool, the agent automatically calls \`plugin_advisor\` with a description of the missing capability. Results pass a default quality gate — **L5 (run-tested) verification** and an **audited security scan** (warning-level findings are kept; high/critical risk is excluded). The tool then highlights the single best match, prints its install command, and **asks the user to confirm before installing** — nothing is installed without consent.

`
const ZH = `### 能力缺口自动搜索与安装确认

当你的需求**已安装的插件都无法满足**时，agent 会自动调用 \`plugin_advisor\` 搜索缺失的能力。结果默认通过质量门槛——**L5（实测）验证等级** 且 **安全审计通过**（warning 级发现可接受，排除 high/critical 风险）。随后工具会高亮最匹配的一个插件、给出安装命令，并**先向用户确认再安装**——未经同意不会安装任何插件。

`
for (const [f, block, head] of [['README.md', EN, '### Tool parameters'], ['README.zh.md', ZH, '### 工具参数']]) {
  const p = join(root, f)
  let t = readFileSync(p, 'utf8')
  t = t.replace(head, block + head)
  writeFileSync(p, t)
  console.log(f, '| inserted:', t.includes('Capability-gap auto search') || t.includes('能力缺口自动搜索'))
}
