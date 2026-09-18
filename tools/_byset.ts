import { POLITICS_QUESTIONS } from '../data'
const setOf = (t: string[]) => {
  const x = (t ?? []).find((s) => /^第\d+套$/.test(s))
  return x ? Number(x.slice(1, -1)) : 0
}
const bookOf = (t: string[]) => (t.includes('肖八') ? 'x8' : t.includes('肖四') ? 'x4' : 'sample')

const rows: Record<string, { c: number; m: number; mt: number; bad: number; detail: string[] }> = {}
for (const q of POLITICS_QUESTIONS as any[]) {
  const k = `${bookOf(q.tags)} 第${setOf(q.tags)}套`
  rows[k] = rows[k] ?? { c: 0, m: 0, mt: 0, bad: 0, detail: [] }
  const r = rows[k]
  if (q.type === 'choice') r.c++
  else if (q.type === 'multi') r.m++
  else r.mt++
  const probs: string[] = []
  const opts = q.options ?? []
  if ((q.type === 'choice' || q.type === 'multi') && opts.length === 0) probs.push('无选项')
  if (q.type === 'choice' && !q.answerKey) probs.push('无答案')
  if (q.type === 'multi' && !(q.answerKeys ?? []).length) probs.push('无答案')
  if (q.type === 'multi' && (q.answerKeys ?? []).length === 1) probs.push('答案只1项')
  if (q.type === 'material' && !(q.answerPoints ?? []).length) probs.push('无参考答案')
  if (/转档缺失/.test(q.stem ?? '')) probs.push('题干缺失')
  if (/转档缺失/.test(q.explanation ?? '')) probs.push('解析缺失')
  if (probs.length) {
    r.bad++
    r.detail.push(`${q.id}(${probs.join(',')})`)
  }
}
console.log('卷'.padEnd(14) + '单选'.padStart(5) + '多选'.padStart(5) + '材料'.padStart(5) + '  有硬伤的题数')
for (const k of Object.keys(rows).sort()) {
  const r = rows[k]
  console.log(k.padEnd(14) + String(r.c).padStart(5) + String(r.m).padStart(5) + String(r.mt).padStart(5) + '  ' + String(r.bad).padStart(3) + ' / ' + (r.c + r.m + r.mt))
}
console.log('\n肖八 各套硬伤明细：')
for (const k of Object.keys(rows).sort()) {
  if (!k.startsWith('x8')) continue
  console.log(' ' + k + ' → ' + rows[k].detail.join(' '))
}
