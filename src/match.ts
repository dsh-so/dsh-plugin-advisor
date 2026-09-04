/**
 * Matching logic for dsh-plugin-finder — pure functions, no framework imports.
 */

/** dsh.so verification level (L1–L5) — how far the plugin was actually tested. */
export type IndexVerification = {
  /** 1 (found) … 5 (feature tested). */
  level: number
  /** Human label, e.g. "L2 · Structured". */
  label: string
  /** ISO timestamp of the last verification pass. */
  lastVerifiedAt?: string | null
}

/** dsh.so automated security scan result. */
export type IndexSecurity = {
  status: 'audited' | 'pending' | 'failed' | 'skipped'
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'unknown'
  scannedAt?: string | null
  /** Static scan finding counts — present when audited. */
  counts?: { critical: number; warning: number; info: number }
  filesScanned?: number
}

export type IndexEntry = {
  id: string
  name: string
  description: string
  stars: number
  topics: string[]
  install: string
  url: string
  /** Present when the dsh.so index carries it. */
  verification?: IndexVerification
  security?: IndexSecurity
}

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fa5]+/)
    .filter((t) => t.length > 0)
}

/**
 * zh→en concept lexicon: registry descriptions are English, so common Chinese
 * capability words are mapped onto their English equivalents before scoring.
 */
const ZH_EN: [RegExp, string[]][] = [
  [/记忆|记事|备忘/, ['memory', 'recall', 'persistent']],
  [/本地|离线|隐私/, ['local', 'offline', 'privacy']],
  [/图像|图片|视觉|拍照|ocr|识别/, ['vision', 'image', 'ocr', 'screenshot']],
  [/语音|音频|说话|播客|听/, ['voice', 'audio', 'speech', 'tts']],
  [/视频|录像|动画/, ['video', 'animation']],
  [/终端|命令行|tui|cli/, ['terminal', 'tui', 'cli', 'shell']],
  [/搜索|检索|查找/, ['search', 'web', 'query']],
  [/浏览器|网页|上网/, ['browser', 'web']],
  [/价格|定价|费用|账单|钱|成本/, ['price', 'pricing', 'billing', 'cost']],
  [/用量|统计|监控|指标/, ['usage', 'metrics', 'monitor', 'stats']],
  [/模型|推理|大模型|聊天|对话/, ['model', 'llm', 'chat', 'inference']],
  [/文件|目录|磁盘/, ['file', 'filesystem', 'directory']],
  [/数据库|表格/, ['database', 'sqlite', 'sql']],
  [/翻译|语言/, ['translate', 'language']],
  [/天气/, ['weather']],
  [/邮件|邮箱/, ['email', 'mail']],
  [/日程|日历|提醒|定时/, ['calendar', 'schedule', 'reminder', 'cron']],
  [/图表|画图|绘图|可视化/, ['chart', 'diagram', 'visualization', 'draw']],
  [/文档|pdf|word|excel/, ['document', 'pdf', 'office', 'excel']],
  [/ppt|幻灯|演示/, ['pptx', 'slides', 'presentation']],
  [/代码|编程|开发|调试/, ['code', 'dev', 'debug']],
  [/知识|笔记|文档管理/, ['knowledge', 'notes', 'rag']],
  [/安全|扫描|审计/, ['security', 'scan', 'audit']],
  [/部署|上线|发布/, ['deploy', 'release', 'publish']],
  [/爬虫|抓取|采集/, ['scrape', 'crawl', 'fetch']],
  [/消息|通知|推送|聊天群/, ['notify', 'message', 'push', 'im']],
  [/地图|定位|导航/, ['map', 'location', 'geo']],
  [/下载|上传/, ['download', 'upload']],
  [/压缩|解压|打包/, ['zip', 'archive', 'compress']],
  [/密码|凭证|密钥/, ['password', 'secret', 'vault', 'credential']],
]

const CJK_RE = /[\u4e00-\u9fa5]/

/** Expand tokens: CJK runs yield zh→en concept words plus CJK bigrams. */
export function expandTokens(tokens: string[]): string[] {
  const out = new Set(tokens)
  for (const tk of tokens) {
    if (!CJK_RE.test(tk)) continue
    for (const [re, en] of ZH_EN) {
      if (re.test(tk)) for (const w of en) out.add(w)
    }
    for (let i = 0; i + 1 < tk.length; i++) {
      const pair = tk.slice(i, i + 2)
      if (CJK_RE.test(pair)) out.add(pair)
    }
  }
  return [...out]
}

export function score(entry: IndexEntry, tokens: string[]): number {
  let s = 0
  const name = entry.name.toLowerCase()
  const desc = (entry.description || '').toLowerCase()
  const topics = (entry.topics || []).map((t) => t.toLowerCase())
  for (const tk of tokens) {
    if (name.includes(tk)) s += 3
    if (topics.some((t) => t.includes(tk) || tk.includes(t))) s += 2
    if (desc.includes(tk)) s += 1
  }
  return s
}

/** Rank registry entries against a free-text query; empty query returns top by stars. */
export function findMatches(entries: IndexEntry[], query: string, limit: number): IndexEntry[] {
  const tokens = expandTokens(tokenize(query))
  if (!tokens.length) {
    return [...entries].sort((a, b) => b.stars - a.stars).slice(0, limit)
  }
  return entries
    .map((e) => ({ e, s: score(e, tokens) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.e.stars - a.e.stars)
    .slice(0, limit)
    .map((x) => x.e)
}
