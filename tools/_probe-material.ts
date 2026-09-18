/** 临时探针：统计材料题的小问数与采分点数（只读）。 */
import { POLITICS_QUESTIONS } from '../data'

const ms = (POLITICS_QUESTIONS as any[]).filter((q) => q.type === 'material')
console.log('材料题数', ms.length)
for (const q of ms) {
  const sub = (q.stem.match(/[（(]\s*[1-9]\s*[)）]/g) ?? []).length
  const pts = (q.answerPoints ?? []).length
  const flag = pts < Math.max(2, sub) ? '  <<<' : ''
  console.log(`${q.id.padEnd(22)} 小问标记 ${sub}  采分点 ${pts}${flag}`)
}
