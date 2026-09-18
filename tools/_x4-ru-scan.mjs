/**
 * 扫描肖四区间里「入 → 人」形近字误识的候选。
 *
 *   node tools/_x4-ru-scan.mjs
 *
 * 做法：先列一批含「入」的常用词，再把「入」换成「人」在区间里搜，
 * 命中就把上下文打出来，人工判定哪些是真误识（如「投人的增加」），
 * 哪些是正常词（如「促进人的全面发展」）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FILE = path.join(ROOT, 'data/politics/questions.ts')
const src = fs.readFileSync(FILE, 'utf8')
const START = 'export const POLITICS_QUESTIONS'
const END = '...POLITICS_QUESTIONS_X8'
const mid = src.slice(src.indexOf(START), src.indexOf(END))

const RU = [
  '投入', '进入', '转入', '陷入', '入侵', '侵入', '加入', '出入', '深入', '收入',
  '融入', '纳入', '卷入', '列入', '步入', '切入', '介入', '编入', '录入', '考入',
  '摄入', '吸入', '渗入', '汇入', '导入', '输入', '买入', '购入', '打入', '闯入',
  '迈入', '踏入', '走入', '奔入', '涌入', '流入', '注入', '嵌入', '植入', '插入',
  '放入', '装入', '填入', '写入', '计入', '算入', '归入', '引入', '潜入', '带入',
  '传入', '转入', '驶入', '闯入', '侵入', '踏入', '灌入', '融入',
]

const seen = new Map()
for (const w of RU) {
  const bad = w[0] + '人' + (w[2] || '')
  let idx = -1
  while ((idx = mid.indexOf(bad, idx + 1)) !== -1) {
    const ctx = mid.slice(Math.max(0, idx - 12), idx + 14).replace(/\n/g, '⏎')
    if (!seen.has(bad)) seen.set(bad, [])
    seen.get(bad).push(ctx)
  }
}

if (!seen.size) {
  console.log('没有命中。')
} else {
  for (const [bad, list] of [...seen].sort()) {
    console.log(`\n### ${bad}（${list.length}）`)
    for (const c of list) console.log('   ', c)
  }
}
