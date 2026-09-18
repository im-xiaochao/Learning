/**
 * 肖四题库修复 · 第四轮（缺字 / 解析尾部截断，依据另一次 OCR 交叉验证）。
 *
 *   node tools/_fix-x4d.mjs            # dry-run
 *   node tools/_fix-x4d.mjs --apply    # 写回
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
const head = src.slice(0, i), mid0 = src.slice(i, j), tail = src.slice(j)
let mid = mid0

const TARGETED = [
  ['推行权主义 → 推行霸权主义', '在世界范围内推行权主义和强权政治', '在世界范围内推行霸权主义和强权政治', 1],
  ['解析尾部截断补全（q-maozhongte-33）',
    '依法治国各项工作都要围绕这个总抓手"',
    '依法治国各项工作都要围绕这个总抓手来谋划、来推进。C正确。"', 1],
]

const report = []
let failed = false
for (const [label, from, to, expect] of TARGETED) {
  const n = mid.split(from).length - 1
  const ok = n === expect
  if (!ok) failed = true
  report.push(`${ok ? '✓' : '✗'} ${label.padEnd(40)} 命中 ${String(n).padStart(2)}（期望 ${expect}）`)
  if (ok) mid = mid.split(from).join(to)
}
console.log(report.join('\n'))
console.log('\n改动字符数：', mid.length - mid0.length)
if (failed) { console.log('\n❌ 命中数不符，未写文件。'); process.exit(1) }
if (!APPLY) { console.log('\n（dry-run；加 --apply 写回）'); process.exit(0) }
fs.writeFileSync(FILE, head + mid + tail, 'utf8')
console.log('\n✅ 已写回', FILE)
