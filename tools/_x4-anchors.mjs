import fs from 'node:fs'
const src = fs.readFileSync('data/politics/questions.ts', 'utf8')
const mid = src.slice(src.indexOf('export const POLITICS_QUESTIONS'), src.indexOf('...POLITICS_QUESTIONS_X8'))
const re = /id:\s*"(q-[a-z0-9-]+)"/g
const b = []
let m
while ((m = re.exec(mid))) b.push({ id: m[1], at: m.index })
for (let k = 0; k < b.length; k++) b[k].t = mid.slice(b[k].at, k + 1 < b.length ? b[k + 1].at : mid.length)
for (const x of b) {
  if (!/type:\s*'material'/.test(x.t)) continue
  const ap = (x.t.match(/answerPoints:\s*\[([\s\S]*?)\n\s*\],/) || [, ''])[1]
  const a0 = (ap.match(/"([^"]+)"/) || [, ''])[1]
  const ex = (x.t.match(/explanation:\s*"([^"]*)"/) || [, ''])[1]
  console.log(x.id.padEnd(18), JSON.stringify(a0.slice(0, 16)), '|', JSON.stringify(ex.slice(0, 16)), ex ? 'HAS_EX' : 'NO_EX')
}
