/**
 * 核对 tools/_fix-x4e.mjs 里 20 条「补回开头」是否真的接得上、前面还有没有丢内容。
 *
 *   node tools/_x4-headcheck.mjs
 *
 * 做法：把每个 head 归一化（去换行/空白、全角半角标点统一）后在 _x4-answerocr.out 里找，
 * 打印命中点前面 40 个字符。若前面紧跟的是「（1）」「（2）」「第N题」「参考答案」之类
 * 的边界，说明 head 起点正确；若是半截句子，说明 head 前面还丢了内容。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OCR = fs.readFileSync(path.join(ROOT, 'tools/_x4-answerocr.out'), 'utf8')

const norm = (s) => s
  .replace(/\r/g, '')
  .replace(/[\s\u3000]+/g, '')
  .replace(/[,]/g, '，')
  .replace(/[;]/g, '；')
  .replace(/[:]/g, '：')
  .replace(/[?]/g, '？')
  .replace(/[!]/g, '！')
  .replace(/[()]/g, (m) => (m === '(' ? '（' : '）'))
  .replace(/[“”]/g, '"')

const ocrN = norm(OCR)
// 归一化后，字符位置与原文不再一一对应；改用「逐字符映射」保留原始下标。
const map = []
{
  let k = 0
  for (let i = 0; i < OCR.length; i++) {
    const c = norm(OCR[i])
    if (!c) continue
    map[k++] = i
  }
}

const SRC = fs.readFileSync(path.join(ROOT, 'tools/_fix-x4e.mjs'), 'utf8')
const body = SRC.slice(SRC.indexOf('const HEADS'), SRC.indexOf(']\n\nconst src'))
const HEADS = []
for (const m of body.matchAll(/\['(q-[a-z0-9-]+)',\s*'([^']*)',\s*\n?\s*'([^']*)'\]/g)) {
  HEADS.push([m[1], m[2], m[3]])
}

let bad = 0
for (const [id, anchor, head] of HEADS) {
  const probe = norm(head + anchor)
  const at = ocrN.indexOf(probe)
  if (at < 0) {
    console.log(`? ${id}  归一化后在 OCR 里找不到（可能是 OCR 本身把这段读错了）`)
    bad++
    continue
  }
  const rawAt = map[at]
  const before = OCR.slice(Math.max(0, rawAt - 60), rawAt).replace(/\n/g, '⏎')
  const headRaw = OCR.slice(rawAt, rawAt + head.length).replace(/\n/g, '⏎')
  const ok = /(^|⏎|。|）|题|案|。)\s*$/.test(before) || before.endsWith('⏎')
  console.log(`${ok ? '✓' : '✗'} ${id}`)
  console.log(`   前文：…${before}`)
  console.log(`   补入：${headRaw}`)
  if (!ok) bad++
}

console.log(`\n共 ${HEADS.length} 条，可疑 ${bad} 条`)
