import { POLITICS_QUESTIONS } from '../data'
const bookOf = (t: string[]) => (t.includes('肖八') ? 'x8' : t.includes('肖四') ? 'x4' : 'sample')
const setOf = (t: string[]) => {
  const x = t.find((s) => /^第\d+套$/.test(s))
  return x ? x.slice(1, -1) : '0'
}
const acc: Record<string, Record<string, number>> = {}
const multiAcc: Record<string, Record<string, number>> = {}
for (const q of POLITICS_QUESTIONS as any[]) {
  const k = `${bookOf(q.tags)} 第${setOf(q.tags)}套`
  acc[k] = acc[k] ?? {}
  multiAcc[k] = multiAcc[k] ?? {}
  if (q.type === 'choice' && q.answerKey) acc[k][q.answerKey] = (acc[k][q.answerKey] ?? 0) + 1
  if (q.type === 'multi' && q.answerKeys && q.answerKeys.length) {
    const kk = [...q.answerKeys].sort().join('')
    multiAcc[k][kk] = (multiAcc[k][kk] ?? 0) + 1
  }
}
console.log('单选答案分布')
for (const k of Object.keys(acc).sort()) {
  const v = acc[k]
  const t = ['A', 'B', 'C', 'D'].reduce((a, c) => a + (v[c] ?? 0), 0)
  const cols = ['A', 'B', 'C', 'D'].map((c) => c + '=' + String(v[c] ?? 0).padStart(2)).join(' ')
  console.log('  ' + k.padEnd(14) + String(t).padStart(3) + '  ' + cols)
}
console.log('')
console.log('多选答案组合分布')
for (const k of Object.keys(multiAcc).sort()) {
  const v = multiAcc[k]
  const top = Object.entries(v)
    .sort((a, b) => b[1] - a[1])
    .map(([a, b]) => a + ':' + b)
    .join(' ')
  console.log('  ' + k.padEnd(14) + top)
}
