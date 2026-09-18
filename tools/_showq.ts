/** 打印指定题目的完整记录，用于人工判读。用法：npx tsx _showq.ts <id> ... */
import { POLITICS_QUESTIONS } from '../data'

const QS = POLITICS_QUESTIONS as any[]
const ids = process.argv.slice(2)
if (!ids.length) {
  console.log('用法：npx tsx _showq.ts <id> [id...]')
  process.exit(0)
}
for (const id of ids) {
  const q = QS.find((x) => x.id === id)
  if (!q) {
    console.log('未找到', id)
    continue
  }
  console.log('='.repeat(72))
  console.log('id:', q.id, '| type:', q.type, '| tags:', JSON.stringify(q.tags))
  console.log('stem:', q.stem)
  const pts: string[] = q.answerPoints ?? []
  console.log('--- answerPoints (' + pts.length + ' 条) ---')
  pts.forEach((p, i) => console.log('  [' + (i + 1) + '] ' + p))
  console.log('--- explanation ---')
  console.log(' ', (q.explanation ?? '').slice(0, 500))
  console.log()
}
