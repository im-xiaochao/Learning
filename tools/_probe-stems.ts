/** 临时探针：看材料题题干的小问写法（只读）。 */
import { POLITICS_QUESTIONS } from '../data'

const ids = process.argv.slice(2)
for (const q of POLITICS_QUESTIONS as any[]) {
  if (!ids.includes(q.id)) continue
  console.log('=====', q.id, q.type, '| tags:', (q.tags ?? []).join('/'))
  console.log('stem:', q.stem)
  console.log('answerPoints:', (q.answerPoints ?? []).length)
  console.log()
}
