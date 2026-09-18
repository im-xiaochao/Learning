/**
 * 肖四题库修复 · 第八轮：审计剩下的三处内容问题。
 *
 *   node tools/_fix-x4h.mjs            # dry-run
 *   node tools/_fix-x4h.mjs --apply    # 写回
 *
 * 依据：tools/_x4-answerocr.out（答案解析 PDF 150dpi 整页 OCR）。
 *   「思想侮化」→「思想僵化」（第二轮只改了「破除了侮化的」那一处，漏了这两处）
 *   「落下惟幕」→「落下帷幕」（同上，第二轮只改了「运动的惟幕」）
 *   q-maozhongte-14 解析/采分点结尾被截断，补回「资兴业的沃土。」
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FILE = path.join(ROOT, 'data/politics/questions.ts')
const APPLY = process.argv.includes('--apply')

/** [标签, 原, 新, 期望命中数] */
const TARGETED = [
  ['侮化 → 僵化', '侮化', '僵化', 2],
  ['惟幕 → 帷幕', '惟幕', '帷幕', 2],
  ['补回解析结尾', '确保了中国经济始终是各类企业投', '确保了中国经济始终是各类企业投资兴业的沃土。', 2],
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
