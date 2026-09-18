/**
 * 肖四交叉校验：把源文件的「正文」与两份独立 OCR 结果逐字对齐，
 * 找出「两次 OCR 一致、而源不同」的位置（≈ 可判定的 OCR 形近字误识）。
 *
 *   node tools/_x4-cross.mjs              # 只打印高置信「源错」块
 *   node tools/_x4-cross.mjs --all        # 打印所有含汉字的差异块
 *   node tools/_x4-cross.mjs --only=q-maozhongte-31
 *
 * 源文件按「模块」排序（q-maozhongte-* / q-mayuan-* / …），OCR 按「套内题号」排序，
 * 所以先用题干前缀把两边配对，再逐字对齐。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')

/* ── 源：按对象字面量解析（比正则剥壳可靠） ────────────────────── */
const src = read('data/politics/questions.ts')
const mid = src.slice(src.indexOf('export const POLITICS_QUESTIONS'), src.indexOf('...POLITICS_QUESTIONS_X8'))
const srcQ = []
const reId = /id:\s*"(q-[a-z0-9-]+)"/g
let m
while ((m = reId.exec(mid))) srcQ.push({ id: m[1], at: m.index })
for (let k = 0; k < srcQ.length; k++) {
  const from = mid.lastIndexOf('{', srcQ[k].at)
  const to = k + 1 < srcQ.length ? mid.lastIndexOf('}', srcQ[k + 1].at) + 1 : mid.lastIndexOf('}')
  const lit = mid.slice(from, to)
  let obj = null
  try { obj = new Function('return (' + lit + ')')() } catch (e) { console.log(`⚠️ 解析失败 ${srcQ[k].id}: ${e.message}`) }
  srcQ[k].obj = obj
  srcQ[k].set = obj ? +(String(obj.tags.find((t) => /^第\d套$/.test(t)) || '').match(/\d/) || [0])[0] : 0
  srcQ[k].kind = obj ? obj.type : '?'
  srcQ[k].stem = obj ? obj.stem : ''
}

/* ── OCR ───────────────────────────────────────────────────────── */
const bank = JSON.parse(read('_od_tmp/bank_x4.json'))
const full = JSON.parse(read('_od_tmp/x4_full.json'))
const ocrBank = []
for (const s of bank) for (const q of s.questions) ocrBank.push({ set: s.setNo, kind: q.type, no: q.no, stem: q.stem || '', q })
const ocrFull = []
for (const v of full) {
  for (const q of v.singles || []) ocrFull.push({ set: v.vol, kind: 'choice', no: q.no, stem: q.stem || '', q })
  for (const q of v.multis || []) ocrFull.push({ set: v.vol, kind: 'multi', no: q.no, stem: q.stem || '', q })
  for (const q of v.materials || []) ocrFull.push({ set: v.vol, kind: 'material', no: q.no, stem: q.stem || '', q })
}

/* ── 正文抽取 ──────────────────────────────────────────────────── */
const str = (v) => (typeof v === 'string' ? v : '')
// 归一：去空白、半角标点→全角、去引号差异
const PUNCT_MAP = { ',': '，', ';': '；', ':': '：', '(': '（', ')': '）', '?': '？', '!': '！', '"': '', "'": '', '“': '', '”': '', '‘': '', '’': '' }
const norm = (s) => s.replace(/\s+/g, '').replace(/[,;:()?!"]|['“”‘’]/g, (c) => PUNCT_MAP[c] ?? '')

function bodyOf(obj) {
  const parts = [str(obj.stem)]
  for (const o of obj.options || []) parts.push(str(o.text))
  parts.push(str(obj.answerKey), str((obj.answerKeys || []).join('')), str(obj.answer))
  parts.push(str(obj.explanation), str(obj.analysis))
  for (const p of (obj.material && obj.material.paragraphs) || []) parts.push(str(p))
  for (const p of obj.paragraphs || []) parts.push(str(p))
  for (const p of obj.answerPoints || []) parts.push(str(p))
  return norm(parts.join(''))
}

/* ── 配对 ──────────────────────────────────────────────────────── */
const cleanStem = (s) => s.replace(/^[\s\d.、．()（）]+/, '')
const prefixLen = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i }
function pairUp(s, pool) {
  let best = null, bestScore = -1
  for (const c of pool) {
    if (c.set !== s.set || c.kind !== s.kind) continue
    const sc = prefixLen(cleanStem(s.stem), cleanStem(c.stem))
    if (sc > bestScore) { bestScore = sc; best = c }
  }
  return { best, bestScore }
}

/* ── 对齐 ──────────────────────────────────────────────────────── */
const CJK = /[\u3400-\u9fff]/
function diffChunks(a, b) {
  let p = 0
  while (p < a.length && p < b.length && a[p] === b[p]) p++
  let q = 0
  while (q < a.length - p && q < b.length - p && a[a.length - 1 - q] === b[b.length - 1 - q]) q++
  const A = a.slice(p, a.length - q), B = b.slice(p, b.length - q)
  const n = A.length, mm = B.length
  if (!n && !mm) return []
  if (n * mm > 6_000_000) return [{ i: 0, a: '', b: '', ctx: `区间过大 ${n}×${mm}` }]
  const W = mm + 1
  const dp = new Int32Array((n + 1) * W)
  for (let i = n - 1; i >= 0; i--)
    for (let j = mm - 1; j >= 0; j--)
      dp[i * W + j] = A[i] === B[j] ? dp[(i + 1) * W + j + 1] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1])
  const out = []
  let i = 0, j = 0, cur = null
  while (i < n || j < mm) {
    if (i < n && j < mm && A[i] === B[j]) { i++; j++; cur = null; continue }
    if (!cur) { cur = { i, a: '', b: '' }; out.push(cur) }
    if (j < mm && (i >= n || dp[i * W + j + 1] >= dp[(i + 1) * W + j])) { cur.b += B[j]; j++ }
    else { cur.a += A[i]; i++ }
  }
  return out
    .filter((c) => CJK.test(c.a) || CJK.test(c.b))
    .map((c) => ({ ...c, ctx: A.slice(Math.max(0, c.i - 12), c.i) + '⟨' + c.a + '⟩' + A.slice(c.i + c.a.length, c.i + c.a.length + 12) }))
}

/* ── 主 ────────────────────────────────────────────────────────── */
const SHOW_ALL = process.argv.includes('--all')
const only = (process.argv.find((x) => x.startsWith('--only=')) || '').slice(7)
let nStar = 0, nAll = 0, nSkip = 0, nLow = 0

for (const s of srcQ) {
  if (only && s.id !== only) continue
  if (!s.obj) { nSkip++; continue }
  const pb = pairUp(s, ocrBank), pf = pairUp(s, ocrFull)
  if (!pb.best || !pf.best || pb.bestScore < 30 || pf.bestScore < 30) { nLow++; if (SHOW_ALL) console.log(`\n⚠️ ${s.id} 配对不可靠（bank ${pb.bestScore} / full ${pf.bestScore}）`); continue }
  const st = bodyOf(s.obj), bt = bodyOf(pb.best.q), ft = bodyOf(pf.best.q)
  const d1 = diffChunks(st, bt), d2 = diffChunks(st, ft)
  const lines = []
  for (const c of d1) {
    const other = d2.find((x) => Math.abs(x.i - c.i) <= 3 && x.b === c.b)
    const star = Boolean(other) && c.b !== c.a
    if (star) nStar++
    nAll++
    if (!star && !SHOW_ALL) continue
    lines.push(`  ${star ? '★' : ' '} 源⟨${c.a}⟩ → bank⟨${c.b}⟩ full⟨${other ? other.b : '（不一致）'}⟩   ${c.ctx}`)
  }
  if (lines.length) console.log(`\n═══ ${s.id}（第${s.set}套 ${s.kind} ↔ x4-${pb.best.set}-${pb.best.no}）\n${lines.join('\n')}`)
}
console.log(`\n差异块合计 ${nAll}，其中「两次 OCR 一致而源不同」${nStar}；配对不可靠跳过 ${nLow}，解析失败 ${nSkip}`)
