/**
 * 肖四题库修复 · 第三轮（标点错乱 / 引号错配 / 缺字）。
 *
 *   node tools/_fix-x4c.mjs            # dry-run
 *   node tools/_fix-x4c.mjs --apply    # 写回
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
  ['毛泽东同志谈话：·与·· → ，与。”“', '共产党人·就万万不能沾染官你习气··我们要养成一种新的风气', '共产党人，就万万不能沾染官僚习气。”“我们要养成一种新的风气', 1],
  ['养老服务…·…… → 养老服务……', '养老服务…·……“十四五”', '养老服务……“十四五”', 1],
  ['新举措····中国 → 新举措……中国', '新举措····中国', '新举措……中国', 1],
  ['对行业规范的避守 → 遵守', '规范的避守之上', '规范的遵守之上', 1],
  ['（2）评选·“最美家庭” → 去掉 ·', '（2）评选·“最美家庭”', '（2）评选“最美家庭”', 1],
  ['工程，，让…要持续抓下去说到这里 → ”，…。说到这里', '高质量发展工程，，让乡镇面貌有了新的变化，要持续抓下去说到这里', '高质量发展工程”，让乡镇面貌有了新的变化，要持续抓下去。说到这里', 1],
  ['‘六小龙””等追问 → ‘六小龙’”等追问', '培养出‘六小龙””等追问', '培养出‘六小龙’”等追问', 1],
  ['科研可挖的“并，。” → ‘井’。”', '说得好：“做科研最不怕的就是“问题’，有“问题’的地方正是科研可挖的“并，。”大胆假设', '说得好：“做科研最不怕的就是‘问题’，有‘问题’的地方正是科研可挖的‘井’。”大胆假设', 1],
  ['革命家下的家底 → 革命家打下的江山、攒下的家底', '毛泽东等老一辈革命家下的家底', '毛泽东等老一辈革命家打下的江山、攒下的家底', 2],
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
