/**
 * 肖四题库修复 · 第七轮：字符级对齐扫出来的最后两处。
 *
 *   node tools/_fix-x4g.mjs            # dry-run
 *   node tools/_fix-x4g.mjs --apply    # 写回
 *
 * 依据：tools/_x4_align.py（肖四 explanation 与答案解析 PDF OCR 的字符级对齐）
 *       + tools/_x4_crop.py 裁图人眼核对。
 *   「收\n人水平」→「收入水平」（入被认成 人，且中间多插了一个换行）
 *   「为即将在全国执政的学发出钟」→「为即将在全国执政的党发出警钟」
 *       （党→学 形近；原文本是「发出警钟」，源文件漏了「警」字）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FILE = path.join(ROOT, 'data/politics/questions.ts')
const APPLY = process.argv.includes('--apply')

/** [标签, 原, 新, 期望命中数] */
const TARGETED = [
  ['收\\n人水平 → 收入水平', '收\\n人水平', '收入水平', 1],
  ['执政的学发出钟 → 执政的党发出警钟', '为即将在全国执政的学发出钟', '为即将在全国执政的党发出警钟', 2],
]

const src = fs.readFileSync(FILE, 'utf8')
const gI = src.indexOf('export const POLITICS_QUESTIONS')
const gJ = src.indexOf('...POLITICS_QUESTIONS_X8')
if (gI < 0 || gJ < 0 || gJ < gI) throw new Error('找不到肖四区间标记')
let mid = src.slice(gI, gJ)

let failed = false
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

console.log(`\n改动字符数：${Math.abs(mid.length - before)}`)
if (failed) { console.log('\n❌ 有问题，未写文件。'); process.exit(1) }
if (!APPLY) { console.log('\n（dry-run；加 --apply 写回）'); process.exit(0) }
fs.writeFileSync(FILE, src.slice(0, gI) + mid + src.slice(gJ), 'utf8')
console.log('\n✅ 已写回', FILE)
