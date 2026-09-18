/**
 * 肖八全量比对：把 `questions-x8.ts` 的每个字段与**源文本层**逐窗口比对。
 *
 * 原理
 * ----
 * 肖八客观题的题干/选项来自《选择题速刷刷题本》的**文本层**（不是 OCR 猜字），
 * 解析来自《答案解析》的文本层。既然有权威源，就不该靠「漏字/错字探测器」去猜——
 * 直接逐窗口比对，任何缺失 / 多字 / 换字都会让包含它的窗口在源里查不到。
 *
 * 窗口取 12 个「有效字符」（去掉全部标点与空白后）。命中不了就说明这段和源不一致，
 * 再把源里对齐位置的原文打印出来，直接照抄即可。
 *
 * 用法：npx tsx tools/_verify-x8.ts [窗口宽]
 */
import fs from 'node:fs'
import path from 'node:path'

import { POLITICS_QUESTIONS_X8 } from '../data/politics/questions-x8'

const ROOT = path.resolve(import.meta.dirname, '..')
const W = Number(process.argv[2] ?? 12)

/** 只留汉字 / 数字 / 拉丁字母，标点空白全去掉（源文本层与正文的标点风格不同） */
const norm = (s: string) => (s ?? '').replace(/[^\u4e00-\u9fff0-9A-Za-z]/g, '')

/**
 * 源文本层里夹着页眉页脚，不清掉会让正文中间凭空多出 `24PAGE27`、
 * `2026考研政治冲刺8套卷六答案及解析` 之类，比对全假警报。
 * 有的页眉独占一行，有的和正文拼在同一行，所以先做全局正则，再按行去纯页码。
 */
const JUNK = [
  // 速刷刷题本的页脚块（三行）
  /公众号[：:]\s*做题本集结地/g,
  /\d{2}\s*肖秀荣\s*8\s*套卷选择/g,
  /·\s*第\s*\d+\s*页[，,]\s*共\s*\d+\s*页\s*·/g,
  // 答案解析的页眉（「2026 考研政治冲刺8套卷(四)答案及解析」等十几种变体，
  // 数字间夹空格、套号有 ⊗/❸/G 之类坏字形）。
  // 注意别用 `[^\n]*` 收尾——清洗时已经把行拼起来了，`[^\n]` 会一路吞到文件末尾。
  // 也别写 `分册?`：`?` 只作用于「册」，等于要求后面必须有「分」，要写 `(?:分册)?`。
  /2\s*0\s*2\s*6\s*考研政治[\s\S]{0,30}?(?:答案及解析|分册)(?:分册)?/g,
  /26\s*肖秀荣八套卷目录/g,
]
// 页眉的「分册」二字常被单独折到下一行，上面那条匹配完还剩它；纯页码同理。
const JUNK_LINE = /^\s*(?:\d{1,4}|分册)\s*$/

function loadSource(file: string): string {
  const p = path.join(ROOT, 'tools', file)
  if (!fs.existsSync(p)) throw new Error(`源文件不存在：${p}`)
  let raw = fs.readFileSync(p, 'utf8')
  raw = raw.replace(/@@@PAGE\s*\d+/g, '')
  // 先按行去掉纯页码，再把行拼起来——页眉有时会**折行**（「2026考研政治冲刺」/
  // 「⊗套卷答案及解析分册」），不拼起来正则跨不过换行，就漏掉了。
  raw = raw.split('\n').filter((l) => !JUNK_LINE.test(l)).join('')
  for (const re of JUNK) raw = raw.replace(re, '')
  return norm(raw)
}

/** n = 3..W 的窗口集合 */
function buildGrams(stream: string): Map<number, Set<string>> {
  const m = new Map<number, Set<string>>()
  for (let n = 3; n <= W; n++) m.set(n, new Set())
  for (let i = 0; i < stream.length; i++) {
    for (let n = 3; n <= W; n++) {
      if (i + n > stream.length) break
      m.get(n)!.add(stream.slice(i, i + n))
    }
  }
  return m
}

type Bad = { id: string; field: string; text: string; off: number; win: string }

function check(
  id: string,
  field: string,
  text: string,
  grams: Map<number, Set<string>>,
  stream: string,
  bad: Bad[],
) {
  const t = norm(text)
  if (t.length < 3) return
  if (t.length < W) {
    if (!grams.get(t.length)!.has(t)) bad.push({ id, field, text: t, off: 0, win: t })
    return
  }
  const set = grams.get(W)!
  for (let i = 0; i + W <= t.length; i++) {
    const win = t.slice(i, i + W)
    if (!set.has(win)) bad.push({ id, field, text: t, off: i, win })
  }
}

/** 在源里找到与该字段对齐的位置，打印源原文 */
function srcAround(stream: string, grams: Set<string>, t: string, off: number): string {
  let best = { score: -1, pos: -1 }
  for (let a = Math.max(0, off - 8); a + 8 <= t.length; a++) {
    const idx = stream.indexOf(t.slice(a, a + 8))
    if (idx < 0) continue
    const pos = idx - a
    // pos < 0 说明这个锚点在源里出现得更靠前，对不上；不排除的话
    // 后面 slice 拿到负数下标会**从文件末尾回绕**，打印出完全无关的尾页内容。
    if (pos < 0) continue
    let score = 0
    for (let i = 0; i + W <= t.length; i++) {
      if (stream.slice(pos + i, pos + i + W) === t.slice(i, i + W)) score++
    }
    if (score > best.score) best = { score, pos }
  }
  if (best.pos < 0) return '(源里定位不到，可能整段都是新写的)'
  return stream.slice(Math.max(0, best.pos - 8), best.pos + t.length + 8)
}

const SUASHUA = loadSource('_x8-suashua.txt')
const ANSWERS = loadSource('_x8-answers.txt')
const gSua = buildGrams(SUASHUA)
const gAns = buildGrams(ANSWERS)

/**
 * 人工补过头的参考答案跳过比对。
 *
 * `_x8-manual.json` 的 `ref_prefix` 是「源书 `N. 参考答案（1）…` 整行被『扫描全能王』
 * 绿色答案标签覆盖、行内文字在文本层整行丢失」时手工重建的（见 肖八修复明细.md）。
 * 这类参考答案的头部本来就不在源文本层里，比对器只会报假阳性——所以键直接从
 * 补丁表派生，而不是硬编码题号（补丁表变了这里自动跟着变）。
 *
 * `ref_cut` 不用跳过：它是把串进本题的下一题尾巴切掉，切完仍是我们文本的**前缀**，
 * 每个窗口照样能在源里找到。
 */
const MANUAL = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'tools', '_x8-manual.json'), 'utf8'),
) as { ref_prefix?: Record<string, string> }
const PREFIXED = new Set(
  Object.keys(MANUAL.ref_prefix ?? {}).map((k) => {
    const [s, n] = k.split('-')
    return `q-x8-s${s}-${n.padStart(2, '0')}`
  }),
)

const badSua: Bad[] = []
const badAns: Bad[] = []
let skipped = 0

for (const q of POLITICS_QUESTIONS_X8) {
  if (q.type !== 'material') {
    // 客观题的题干 / 选项来自《速刷刷题本》文本层
    check(q.id, 'stem', q.stem, gSua, SUASHUA, badSua)
    for (const o of q.options ?? []) check(q.id, `opt-${o.key}`, o.text, gSua, SUASHUA, badSua)
  }
  // 材料题的材料来自扫描件 OCR（另测），但参考答案同样出自《答案解析》文本层
  if (PREFIXED.has(q.id)) {
    skipped++
    continue
  }
  check(q.id, 'expl', q.explanation ?? '', gAns, ANSWERS, badAns)
}
console.log(`（人工补头跳过 ${skipped} 题：${[...PREFIXED].join(', ')}）`)

function report(title: string, bad: Bad[], stream: string, grams: Set<string>) {
  // 同一字段的连续窗口合并成一条
  const byField = new Map<string, Bad[]>()
  for (const b of bad) {
    const k = `${b.id}|${b.field}`
    byField.set(k, [...(byField.get(k) ?? []), b])
  }
  console.log(`\n===== ${title}：${byField.size} 个字段与源不一致（${bad.length} 个窗口）=====`)
  for (const [k, list] of byField) {
    const [id, field] = k.split('|')
    const t = list[0].text
    const lo = Math.max(0, Math.min(...list.map((b) => b.off)) - 4)
    const hi = Math.min(t.length, Math.max(...list.map((b) => b.off)) + W + 4)
    console.log(`\n${id}  [${field}]  位置 ${lo}..${hi}`)
    console.log(`  正文: …${t.slice(lo, hi)}…`)
    console.log(`  源文: …${srcAround(stream, grams, t, lo)}…`)
  }
}

report('题干 / 选项 vs 速刷刷题本', badSua, SUASHUA, gSua.get(W)!)
report('解析 vs 答案解析', badAns, ANSWERS, gAns.get(W)!)
console.log(`\n合计不一致字段：题干/选项 ${new Set(badSua.map((b) => b.id + b.field)).size}，解析 ${new Set(badAns.map((b) => b.id + b.field)).size}`)
