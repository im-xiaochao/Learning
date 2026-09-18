/**
 * 肖四题库修复 · 第九轮：题干 / 选项 / 材料 与《4套卷》试卷 PDF 对齐扫出来的 11 处。
 *
 *   node tools/_fix-x4i.mjs            # dry-run
 *   node tools/_fix-x4i.mjs --apply    # 写回
 *
 * 依据：tools/_x4_qalign.py（题干/选项/材料 ↔ 试卷 PDF OCR 的字符级对齐）
 *       + tools/_x4_find.py（用 OCR 框坐标定位到行，裁图人眼复核）。
 * 全部为形近字（国/围、千/干、侣/倡、登/叠、宜/宣、人/入）与漏字（禀、骸、崭、敢、防+僵）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FILE = path.join(ROOT, 'data/politics/questions.ts')
const APPLY = process.argv.includes('--apply')

/** [标签, 原, 新, 期望命中数] */
const TARGETED = [
  ['国绕 → 围绕', '并国绕全人类共同价值', '并围绕全人类共同价值', 1],
  ['总千事 → 总干事', '世界贸易组织总千事', '世界贸易组织总干事', 1],
  ['侣导 → 倡导', '侣导以人为本', '倡导以人为本', 1],
  ['登加 → 叠加', '个人理想的登加', '个人理想的叠加', 1],
  ['宜言书 → 宣言书', '的宜言书', '的宣言书', 1],
  ['思想人手 → 思想入手', '反对封建思想人手', '反对封建思想入手', 1],
  ['资源赋 → 资源禀赋', '各地资源赋不同', '各地资源禀赋不同', 1],
  ['恒星残 → 恒星残骸', '大质量恒星残中', '大质量恒星残骸中', 1],
  ['一个新课题 → 一个崭新课题', '党面临的一个新课题', '党面临的一个崭新课题', 1],
  ['做先锋 → 敢做先锋', '有为、做先锋的精气神', '有为、敢做先锋的精气神', 1],
  ['止思想化 → 防止思想僵化', '不断检验、止思想化', '不断检验、防止思想僵化', 1],
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
