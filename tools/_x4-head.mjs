/**
 * 从整页 OCR（tools/_x4-answerocr.out）里，为每道肖四材料题找出「答案开头丢失的那段」。
 *
 *   node tools/_x4-head.mjs
 *
 * 做法：拿源里 answerPoints[0] 的前 18 个字（归一化后）去 OCR 全文里找，
 * 命中位置之前的 240 字就是丢失的开头。
 */
import fs from 'node:fs'

const ROOT = '.'
const src = fs.readFileSync(`${ROOT}/data/politics/questions.ts`, 'utf8')
const mid = src.slice(src.indexOf('export const POLITICS_QUESTIONS'), src.indexOf('...POLITICS_QUESTIONS_X8'))

// 拆题
const blocks = []
const reId = /id:\s*"(q-[a-z0-9-]+)"/g
let m
while ((m = reId.exec(mid))) blocks.push({ id: m[1], at: m.index })
for (let k = 0; k < blocks.length; k++) blocks[k].text = mid.slice(blocks[k].at, k + 1 < blocks.length ? blocks[k + 1].at : mid.length)

const norm = (s) => s.replace(/\s+/g, '').replace(/[,;:()?!"]/g, (c) => ({ ',': '，', ';': '；', ':': '：', '(': '（', ')': '）', '?': '？', '!': '！', '"': '' }[c]))

const ocrRaw = fs.readFileSync(`${ROOT}/tools/_x4-answerocr.out`, 'utf8')
const ocr = norm(ocrRaw)

const out = []
for (const b of blocks) {
  if (!/type:\s*'material'/.test(b.text)) continue
  const ap = (b.text.match(/answerPoints:\s*\[([\s\S]*?)\n\s*\],/) || [, ''])[1]
  const first = (ap.match(/"([^"]{20,})"/) || [, ''])[1]
  if (!first) { out.push([b.id, '（找不到 answerPoints[0]）', '']); continue }
  const key = norm(first).slice(0, 18)
  const i = ocr.indexOf(key)
  if (i < 0) { out.push([b.id, `（OCR 里找不到起点「${key}」）`, '']); continue }
  out.push([b.id, ocr.slice(Math.max(0, i - 240), i), key])
}
for (const [id, head, key] of out) {
  console.log(`\n═══ ${id}\n  丢失的开头 → …${head}\n  ↓接上源里的：${key}…`)
}
