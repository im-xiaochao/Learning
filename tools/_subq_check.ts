/**
 * 材料题「小问标记」一致性检查。
 *
 * 背景：材料题的 `answerPoints` 是按段落存的采分点，`explanation` 是整段参考答案。
 * 转档切分时，小问标记 `（2）` 有时**掉在了段落边界上**——要么粘在上一条段尾，
 * 要么整个丢失。`explanation` 里则一直是对的。
 *
 * 为什么用户会看到：`pages-politics/question/question.vue` 的 `showExplanation` 在
 * 采分点与解析 4-gram 重合 ≥90% 时**只渲染采分点**。此时若采分点缺 `（2）`，
 * 第 (2) 问的答案就会读成第 (1) 问的续写。
 *
 * 用法：cd tools && npx tsx _subq_check.ts
 */
import { POLITICS_QUESTIONS } from '../data'

type Q = any
const QS = POLITICS_QUESTIONS as Q[]
const norm = (s: string) => (s ?? '').replace(/[^\u4e00-\u9fff0-9A-Za-z]/g, '')
const markers = (s: string) =>
  new Set([...String(s ?? '').matchAll(/[（(]\s*([1-9])\s*[)）]/g)].map((m) => Number(m[1])))

function gramOverlap(a: string, b: string, n = 4): number {
  const A = norm(a)
  const B = norm(b)
  if (A.length < n) return -1
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

const rows: { id: string; book: string; set: number; missing: number[]; hidden: boolean }[] = []

for (const q of QS) {
  if (q.type !== 'material') continue
  const stemM = markers(q.stem)
  if (stemM.size < 2) continue // 只有一问的不看
  const expM = markers(q.explanation)
  const pts = (q.answerPoints ?? []).join('\n')
  const ptM = markers(pts)
  const missing = [...stemM].filter((v) => expM.has(v) && !ptM.has(v))
  if (!missing.length) continue
  // 解析是否会被页面隐藏（隐藏 → 用户只看采分点 → 问题可见）
  const ov = gramOverlap(q.explanation ?? '', pts)
  rows.push({
    id: q.id,
    book: (q.tags ?? []).includes('肖八') ? '肖八' : (q.tags ?? []).includes('肖四') ? '肖四' : '样例题',
    set: Number(((q.tags ?? []).find((t: string) => /^第\d+套$/.test(t)) ?? '第0套').slice(1, -1)),
    missing,
    hidden: ov >= 0.9,
  })
}

console.log(`材料题（≥2 问）里，采分点缺小问标记的：${rows.length} 道\n`)
for (const r of rows)
  console.log(
    `  [${r.book} 第${r.set}套] ${r.id}  缺 ${r.missing.map((v) => '（' + v + '）').join('')}` +
      `  解析被隐藏=${r.hidden ? '是（用户会看到）' : '否（解析会补上）'}`,
  )
const visible = rows.filter((r) => r.hidden).length
console.log(`\n其中解析被隐藏、用户确实会看到的：${visible} 道`)
