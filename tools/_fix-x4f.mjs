/**
 * 肖四题库修复 · 第六轮：补最后三处形近字错字。
 *
 *   node tools/_fix-x4f.mjs            # dry-run
 *   node tools/_fix-x4f.mjs --apply    # 写回
 *
 * 依据：答案解析 PDF 原图（tools/_x4_crop.py 裁出的 _od_tmp/crops/p29*.png）。
 *   「中流磁柱」→「中流砥柱」（题干，磁/砥 形近）
 *   「快择」→「抉择」（快/抉 形近，扌被认成忄）
 *   「全民族亡图存」→「全民族救亡图存」（缺「救」字）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FILE = path.join(ROOT, 'data/politics/questions.ts')
const APPLY = process.argv.includes('--apply')

/** [标签, 原, 新, 期望命中数] */
const TARGETED = [
  ['中流磁柱 → 中流砥柱', '中流磁柱', '中流砥柱', 1],
  ['快择 → 抉择', '方向和道路的快择', '方向和道路的抉择', 2],
  ['亡图存 → 救亡图存', '全民族亡图存的希望', '全民族救亡图存的希望', 2],
]

const src = fs.readFileSync(FILE, 'utf8')
const gI = src.indexOf('export const POLITICS_QUESTIONS')
const gJ = src.indexOf('...POLITICS_QUESTIONS_X8')
if (gI < 0 || gJ < 0 || gJ < gI) throw new Error('找不到肖四区间标记')
let mid = src.slice(gI, gJ)

let failed = false
let changed = 0
const before = mid.length

for (const [label, from, to, expect] of TARGETED) {
  let n = 0
  let i = -1
  while ((i = mid.indexOf(from, i + 1)) >= 0) { n++; i += from.length - 1 }
  const ok = n === expect
  if (!ok) failed = true
  console.log(`${ok ? '✓' : '✗'} ${label}  命中 ${n}（期望 ${expect}）`)
  if (ok) mid = mid.split(from).join(to)
}
changed = Math.abs(mid.length - before)

console.log(`\n改动字符数：${changed}`)
if (failed) { console.log('\n❌ 有问题，未写文件。'); process.exit(1) }
if (!APPLY) { console.log('\n（dry-run；加 --apply 写回）'); process.exit(0) }
fs.writeFileSync(FILE, src.slice(0, gI) + mid + src.slice(gJ), 'utf8')
console.log('\n✅ 已写回', FILE)
