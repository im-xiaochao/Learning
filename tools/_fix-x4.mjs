/**
 * 肖四题库修复（dry-run / apply）。
 *
 *   node tools/_fix-x4.mjs            # 只报告命中数，不写文件
 *   node tools/_fix-x4.mjs --apply    # 写回 data/politics/questions.ts
 *
 * 只改 `export const POLITICS_QUESTIONS` 到 `...POLITICS_QUESTIONS_X8` 之间的肖四区间。
 * 每条替换都带命中数断言，对不上就整体中止（不写文件）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FILE = path.join(ROOT, 'data/politics/questions.ts')
const APPLY = process.argv.includes('--apply')

const src = fs.readFileSync(FILE, 'utf8')
const START = 'export const POLITICS_QUESTIONS'
const END = '...POLITICS_QUESTIONS_X8'
const i = src.indexOf(START)
const j = src.indexOf(END)
if (i < 0 || j < 0 || j < i) throw new Error('找不到肖四区间标记')
const head = src.slice(0, i)
const mid0 = src.slice(i, j)
const tail = src.slice(j)
let mid = mid0

/* ── 1. 定向修复（精确串） ─────────────────────────────────────────── */
const TARGETED = [
  ['①-④ 题干补序号（枚举缺 ④）',
    '③管理和制度层面的创新价值观和意识形态层面的创新',
    '③管理和制度层面的创新④价值观和意识形态层面的创新', 1],
  ['选项 A：@ → ①②',
    '{ key: "A", text: "@" },', '{ key: "A", text: "①②" },', 1],
  ['选项 C：②@ → ②④',
    '{ key: "C", text: "②@" },', '{ key: "C", text: "②④" },', 1],
  ['选项 D：@3 → ②③',
    '{ key: "D", text: "@3" },', '{ key: "D", text: "②③" },', 1],
  ['解析开头乱码 [简桁 + 引号',
    'explanation: "[简桁中国创新的\\"加速度”,离不开坚实的政策支持和丰沃的培育土壤。',
    'explanation: "中国创新的“加速度”，离不开坚实的政策支持和丰沃的培育土壤。', 1],
  ['q-shigang-21 解析尾部混入的第 9 题答案/简析',
    '\\n9.谷案BCD\\n简析中共七大制定了党的政治路线', '\u0000CUT\u0000', 1],
  ['q-mayuan-36 解析尾部卷眉',
    'A、C、D正确。B错误。\\n2026米考研政治终极预测4套卷（四）答案及解析"',
    'A、C、D正确。B错误。"', 1],
  ['q-mayuan-39 采分点尾部卷眉',
    '推动发展自由贸易。20266考研政治终极预测4套卷"',
    '推动发展自由贸易。"', 1],
  ['q-mayuan-39 解析尾部卷眉',
    '推动发展自由贸易。\\n20266考研政治\\n终极预测4套卷"',
    '推动发展自由贸易。"', 1],
  ['战时共产主义政策表述（另一次 OCR 交叉验证）',
    '以余粮收集制和取润\\n系为主要特征的战时共产主义政策',
    '以余粮收集制和取消商品货币关系为主要特征的战时共产主义政策', 1],
  ['断优势 → 垄断优势（选项 D 丢了「垄」）',
    '以取得在别国的断优势', '以取得在别国的垄断优势', 1],
  ['私人断企业 → 私人垄断企业',
    '私人断企业', '私人垄断企业', 2],
  ['促进了断资本 → 促进了垄断资本',
    '共同促进了断资本向', '共同促进了垄断资本向', 1],
  ['取高额 → 获取高额',
    '取高额', '获取高额', 1],
]

/* ── 2. 形近字（OCR）批量替换 ─────────────────────────────────────── */
const OCR = [
  ['深人', '深入'], ['收人', '收入'], ['融人', '融入'], ['千部', '干部'], ['苹命', '革命'],
  ['磅磷', '磅礴'], ['仔务', '任务'], ['福证', '福祉'], ['选代', '迭代'], ['顽痒', '顽瘴'],
  ['平买', '赎买'], ['身全球', '跻身全球'], ['安安全', '安全'], ['垒断', '垄断'],
  ['谷案', '答案'], ['驱待', '亟待'], ['驱须', '亟须'], ['边睡', '边陲'], ['捉高', '提高'],
  ['自已', '自己'], ['惊涛浪', '惊涛骇浪'], ['中流柱', '中流砥柱'],
  ['揽下的家底', '攒下的家底'], ['不努力、接续', '不懈努力、接续'], ['取润', '取消'],
]

const report = []
let failed = false

for (const [label, from, to, expect] of TARGETED) {
  const n = mid.split(from).length - 1
  const ok = n === expect
  if (!ok) failed = true
  report.push(`${ok ? '✓' : '✗'} 定向 ${label.padEnd(44)} 命中 ${n}（期望 ${expect}）`)
  if (ok) {
    if (to === '\u0000CUT\u0000') {
      // 截断到该标记：删除标记及其后直到字符串结尾
      mid = mid.replace(from, '\u0000MARK\u0000')
      mid = mid.replace(/\u0000MARK\u0000[\s\S]*?"/g, (m) => '"')
    } else {
      mid = mid.split(from).join(to)
    }
  }
}

for (const [from, to] of OCR) {
  const n = mid.split(from).length - 1
  report.push(`  OCR  ${from.padEnd(6)} → ${to.padEnd(10)} ${String(n).padStart(3)} 处`)
  if (n) mid = mid.split(from).join(to)
}

/* ── 3. 标点归一（只动中文邻接的半角标点） ─────────────────────────── */
const CJK = '[\\u4e00-\\u9fa5“”‘’（）《》、，。；：！？…—]'
const PUNCT = [
  [new RegExp(`(${CJK}|[0-9A-Za-z])\\,(?=${CJK})`, 'g'), '$1，'],
  [new RegExp(`(?<=${CJK})\\,(${CJK})`, 'g'), '，$1'],
  [new RegExp(`(${CJK}|[0-9A-Za-z])\\,(?=[0-9A-Za-z])`, 'g'), '$1，'],
  [new RegExp(`(?<=[0-9A-Za-z])\\,(${CJK})`, 'g'), '，$1'],
  [new RegExp(`(${CJK})\\;(?=${CJK})`, 'g'), '$1；'],
  [new RegExp(`(${CJK})\\:(?=${CJK})`, 'g'), '$1：'],
  [new RegExp(`(?<=${CJK})\\:(?=[0-9A-Za-z])`, 'g'), '：'],
  [new RegExp(`(?<=[0-9A-Za-z])\\:(?=${CJK})`, 'g'), '：'],
  [/（(\d)\)/g, '（$1）'],
  [/\((\d)\)/g, '（$1）'],
  [/([\u4e00-\u9fa5])\((?=[\u4e00-\u9fa5])/g, '$1（'],
  [/(?<=[\u4e00-\u9fa5])\)/g, '）'],
]
for (const [re, rep] of PUNCT) {
  const before = mid
  mid = mid.replace(re, rep)
  const n = countDiff(before, mid)
  report.push(`  标点 ${String(re).slice(0, 46).padEnd(46)} 改动 ${n}`)
}

function countDiff(a, b) {
  if (a.length !== b.length) return Math.abs(a.length - b.length)
  let d = 0
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) d++
  return d
}

console.log(report.join('\n'))
console.log('\n改动字符数：', mid.length - mid0.length)

if (failed) {
  console.log('\n❌ 有定向替换命中数不符，未写文件。')
  process.exit(1)
}
if (!APPLY) {
  console.log('\n（dry-run，未写文件；加 --apply 写回）')
  process.exit(0)
}
fs.writeFileSync(FILE, head + mid + tail, 'utf8')
console.log('\n✅ 已写回', FILE)
