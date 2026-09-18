/**
 * 检查所有材料题：「解析」与「采分点」内容是否重复（只读）。
 * 用法：cd tools && npx tsx _mat-dup.ts
 *
 * 结果页对材料题会同时渲染「采分点」和「解析」两个区块，
 * 若两者内容基本一致，用户就会看到同一段答案两遍。
 * 页面里的 pages-politics/question/question.vue → showExplanation 用同样的
 * 4-gram 重合度（阈值 0.9）决定是否隐藏解析，这里复算一遍做断言。
 */
import { POLITICS_QUESTIONS } from '../data'

const THRESHOLD = 0.9

const clean = (s: string) => (s ?? '').replace(/[\s，。、；：（）“”‘’《》,.;:()"'?!！？①②③④\-—]/g, '')

function gramOverlap(a: string, b: string, n = 4): number {
  const A = clean(a)
  const B = clean(b)
  if (A.length < n || B.length < n) return -1
  const setB = new Set<string>()
  for (let i = 0; i + n <= B.length; i++) setB.add(B.slice(i, i + n))
  let hit = 0
  let total = 0
  for (let i = 0; i + n <= A.length; i++) {
    total++
    if (setB.has(A.slice(i, i + n))) hit++
  }
  return total ? hit / total : -1
}

/** 与页面 showExplanation 同构：true = 渲染解析区块 */
function showExplanation(q: any): boolean {
  const pts: string[] = q.answerPoints ?? []
  const ex: string = q.explanation ?? ''
  if (q.type !== 'material' || !pts.length) return Boolean(ex)
  if (!ex) return false
  const r = gramOverlap(pts.join(''), ex)
  if (r < 0) return true
  return r < THRESHOLD
}

const bookOf = (tags: string[]) => (tags.includes('肖八') ? '肖八' : tags.includes('肖四') ? '肖四' : '样例')

let both = 0
let dup = 0
let onlyPts = 0
let onlyEx = 0
let neither = 0
const hidden: string[] = []
const shownBoth: string[] = []

for (const q of POLITICS_QUESTIONS as any[]) {
  if (q.type !== 'material') continue
  const pts: string[] = q.answerPoints ?? []
  const ex: string = q.explanation ?? ''
  if (pts.length && ex) {
    both++
    const r = gramOverlap(pts.join(''), ex)
    if (r >= THRESHOLD) {
      dup++
      hidden.push(q.id)
      console.log(`${bookOf(q.tags)}  ${q.id}  重合 ${(r * 100).toFixed(1)}%  → 隐藏解析，只显示采分点`)
    } else {
      shownBoth.push(q.id)
      console.log(`${bookOf(q.tags)}  ${q.id}  重合 ${(r * 100).toFixed(1)}%  → 两个区块都显示（解析是额外提示）`)
    }
  } else if (pts.length) onlyPts++
  else if (ex) onlyEx++
  else neither++
}

console.log(`\n材料题合计：两者都有 ${both}（隐藏解析 ${dup} / 都显示 ${both - dup}） / 只有采分点 ${onlyPts} / 只有解析 ${onlyEx} / 都没有 ${neither}`)

// —— 断言 ——
const fails: string[] = []
const expectHidden = 20
if (hidden.length !== expectHidden) fails.push(`应隐藏解析 ${expectHidden} 题，实际 ${hidden.length}`)
const mustShow = ['q-maozhongte-2', 'q-sixiu-2'] // 样例题：解析是「答题提示」，与采分点不同，必须都显示
for (const id of mustShow) {
  if (!shownBoth.includes(id)) fails.push(`${id} 的解析是额外提示，不应被隐藏`)
}
for (const id of hidden) {
  if (!/^q-(maozhongte|mayuan|shigang|sixiu|shizheng)-(1|2|3|4|5|6|7|8|9|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[01])$/.test(id)) {
    fails.push(`${id} 不在肖四题号范围内，阈值可能误伤`)
  }
}

console.log('')
if (fails.length) {
  console.log('❌ 断言失败：')
  for (const f of fails) console.log('   - ' + f)
  process.exit(1)
}
console.log(`✅ 通过 ${2 + hidden.length} / 失败 0`)
