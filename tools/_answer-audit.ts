/**
 * 政治题库 **答案键可信度**检查（只读，不改数据）。
 *
 * 动机：答案键（`answerKey` / `answerKeys`）是**唯一没有独立第二来源**的字段——
 * 题干、选项、解析都能拿去和 PDF 文本层做全量 n-gram 比对（`_verify-x8.ts`），
 * 但答案键只有一个来源（答案速查表）。所以能做的验证是**交叉印证**：
 * 解析里通常会用三种写法点明正确选项——
 *
 *   `A、B正确`   `A、B、C、D全选`   `本题选D`
 *
 * 若解析点明了答案，而答案键与之不符 → 真缺陷（用户会看到「答对却判错」）。
 * 若解析**没有**点明答案 → 该题答案键属于「单源未印证」，需要单独知道有多少。
 *
 * 用法：cd tools && npx tsx _answer-audit.ts
 */
import { POLITICS_QUESTIONS } from '../data'

type Q = any
const QS = POLITICS_QUESTIONS as Q[]

const bookOf = (tags: string[]) =>
  tags?.includes('肖八') ? '肖八' : tags?.includes('肖四') ? '肖四' : '样例题'

/**
 * 从解析里抽出「解析认为正确的选项」；抽不到返回 null。
 *
 * ⚠️ 解析点明答案有**四种**写法，少认一种就会把正确的题判成「答案与解析矛盾」：
 *
 *   `A、B正确`            顿号连写
 *   `ABCD全选`            全选（以它为准，出现时忽略其它）
 *   `A正确。…B正确。…`     **逐句分点**——多选题最常用，必须收**全部**匹配
 *                          （只取第一个匹配会把 `ABCD` 的题误判成 `A`，实测 34 处假阳性）
 *   `本题选D`             单选口语
 *
 * `C错误` 这类反向陈述不能计入，所以只认「正确」不认「错误」。
 */
function claimedFromExpl(expl: string): string[] | null {
  const f = (expl ?? '').replace(/\n/g, '')
  const uniq = (raw: string) => [...new Set(raw.match(/[A-D]/g) ?? [])].sort()

  // ① 全选优先：`A、B、C、D全选`
  const allSel = f.match(/([A-D](?:\s*、\s*[A-D])+)\s*全选/)
  if (allSel) return uniq(allSel[1])

  // ② 逐句点明——收**全部** `X正确`，不是只收第一处
  const hits = [...f.matchAll(/([A-D](?:\s*、?\s*[A-D])*)\s*正确/g)].map((m) => m[1])
  const letters = uniq(hits.join(''))
  if (letters.length) return letters

  // ③ `本题选D`
  const pick = f.match(/本题选\s*([A-D](?:\s*[A-D])*)/)
  if (pick) return uniq(pick[1])

  return null
}

const stats: Record<string, { total: number; checked: number; mismatch: number }> = {}
const bad: string[] = []
const unchecked: Record<string, string[]> = {}

for (const q of QS) {
  const book = bookOf(q.tags ?? [])
  stats[book] ??= { total: 0, checked: 0, mismatch: 0 }
  stats[book].total++

  if (q.type === 'material') continue // 材料题没有答案键
  const claimed = claimedFromExpl(q.explanation ?? '')
  const actual: string[] = (
    q.type === 'choice' ? [q.answerKey] : (q.answerKeys ?? [])
  ).filter(Boolean).sort()

  if (!claimed) {
    unchecked[book] ??= []
    unchecked[book].push(q.id)
    continue
  }
  stats[book].checked++
  const same = claimed.length === actual.length && claimed.every((c, i) => c === actual[i])
  if (!same) {
    stats[book].mismatch++
    bad.push(`[${book}] ${q.id}  答案键 ${actual.join('')}  解析说 ${claimed.join('')}`)
  }
}

console.log('===== 答案键交叉印证 =====\n')
console.log('卷      题数   解析点明答案   印证一致   不一致')
for (const [b, s] of Object.entries(stats)) {
  const ok = s.checked - s.mismatch
  console.log(
    `${b.padEnd(7)} ${String(s.total).padStart(4)}   ${String(s.checked).padStart(10)}   ${String(ok).padStart(8)}   ${String(s.mismatch).padStart(6)}`,
  )
}
const tot = Object.values(stats).reduce(
  (a, s) => ({ t: a.t + s.total, c: a.c + s.checked, m: a.m + s.mismatch }),
  { t: 0, c: 0, m: 0 },
)
console.log(
  `${'合计'.padEnd(6)} ${String(tot.t).padStart(4)}   ${String(tot.c).padStart(10)}   ${String(tot.c - tot.m).padStart(8)}   ${String(tot.m).padStart(6)}`,
)
const cov = tot.c ? ((tot.c - tot.m) / tot.c) * 100 : 100
console.log(`\n已印证的答案键里，一致率 ${cov.toFixed(2)}%（${tot.c - tot.m}/${tot.c}）`)

if (bad.length) {
  console.log('\n❌ 不一致明细：')
  for (const b of bad) console.log('  ' + b)
} else {
  console.log('\n✅ 解析点明答案的题里，答案键与解析 100% 一致')
}

// 未印证的题按卷统计（这些题的答案键只有「答案速查表」一个来源）
console.log('\n----- 单源未印证（解析没点明答案）-----')
for (const [b, ids] of Object.entries(unchecked)) {
  const s = stats[b]
  console.log(`${b}：${ids.length} / ${s.total} 题`)
  if (ids.length <= 12) console.log('   ' + ids.join(', '))
}
