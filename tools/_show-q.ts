import { POLITICS_QUESTIONS } from '../data'
const want = process.argv.slice(2)
for (const q of POLITICS_QUESTIONS as any[]) {
  if (!want.includes(q.id)) continue
  console.log('='.repeat(70))
  console.log(q.id, '|', q.type, '|', q.module, '|', q.difficulty, '|', JSON.stringify(q.tags))
  console.log('STEM:', q.stem)
  if (q.options) console.log('OPTS:', q.options.map((o: any) => `${o.key}.${o.text}`).join('\n      '))
  console.log('ANS :', q.answerKey ?? JSON.stringify(q.answerKeys))
  console.log('EXP :', (q.explanation ?? '').slice(0, 400))
  if (q.answerPoints) console.log('PTS :', q.answerPoints.length, '条')
  if (q.material) console.log('MAT :', q.material.title, q.material.paragraphs.length, '段')
}
