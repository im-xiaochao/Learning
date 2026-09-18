/**
 * 探针：给定两个题号，打印它们之间最长公共子串在各自文本中的位置与上下文。
 * 用法：cd tools && npx tsx _probe-dup.ts <idA> <idB>
 */
import { POLITICS_QUESTIONS } from '../data'

const [, , idA, idB] = process.argv

const clean = (s: string) =>
  (s ?? '').replace(/[\s，。、；：（）“”‘’《》〈〉,.;:()"'?!！？①②③④⑤⑥\-—·…]/g, '')

function blobOf(id: string) {
  const q = (POLITICS_QUESTIONS as any[]).find((x) => x.id === id)
  if (!q) throw new Error(`no such id: ${id}`)
  const raw = [q.stem ?? '', ...(q.answerPoints ?? []), q.explanation ?? ''].join('\n')
  return { q, clean: clean(raw), raw }
}

/** 最长公共子串（滚动一维 DP），返回 [len, endA, endB] */
function lcs(a: string, b: string): [number, number, number] {
  const n = b.length
  let prev = new Int32Array(n + 1)
  let cur = new Int32Array(n + 1)
  let best = 0
  let ea = 0
  let eb = 0
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= n; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : 0
      if (cur[j] > best) {
        best = cur[j]
        ea = i
        eb = j
      }
    }
    const t = prev
    prev = cur
    cur = t
    cur.fill(0)
  }
  return [best, ea, eb]
}

const A = blobOf(idA)
const B = blobOf(idB)
const [len, ea, eb] = lcs(A.clean, B.clean)

console.log(`A ${idA}  清洗后长度 ${A.clean.length}`)
console.log(`B ${idB}  清洗后长度 ${B.clean.length}`)
console.log(`最长公共子串 ${len} 字\n`)

const sa = ea - len
const sb = eb - len
console.log(`在 A 中位于 ${sa} ~ ${ea}（占 A 的 ${((sa / A.clean.length) * 100).toFixed(0)}% 之后）`)
console.log(`  A 前缀: …${A.clean.slice(Math.max(0, sa - 40), sa)}`)
console.log(`  A 命中: ${A.clean.slice(sa, Math.min(ea, sa + 200))}`)
console.log(`  A 后缀: ${A.clean.slice(ea, ea + 60)}…`)
console.log()
console.log(`在 B 中位于 ${sb} ~ ${eb}（占 B 的 ${((sb / B.clean.length) * 100).toFixed(0)}% 之后）`)
console.log(`  B 前缀: …${B.clean.slice(Math.max(0, sb - 40), sb)}`)
console.log(`  B 命中: ${B.clean.slice(sb, Math.min(eb, sb + 200))}`)
console.log(`  B 后缀: ${B.clean.slice(eb, eb + 60)}…`)
console.log()
console.log(`A 命中是否贴到 A 末尾: ${ea === A.clean.length}`)
console.log(`B 命中是否从 B 开头起: ${sb === 0}`)
