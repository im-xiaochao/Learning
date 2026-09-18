/**
 * 跨题重复检测（只读）：找出「不同题目之间」共享的长文本片段。
 *
 * 用法：cd tools && npx tsx _cross-dup.ts [窗口长度] [最少命中题数]
 *
 * 为什么需要它
 * ------------
 * 源 PDF 的 OCR 文本层漏行时，下一题的答案会被并进上一题尾部（「串档」）。
 * 这种缺陷在单题内部看是通顺的，_audit-politics.ts 的「张冠李戴」判据
 * （题干 vs 解析 4-gram 重合）也测不出来 —— 只能靠「两题答案大面积雷同」发现。
 *
 * 窗口默认 50 字，命中题数默认 2。
 */
import { POLITICS_QUESTIONS } from '../data'

const WIN = Number(process.argv[2] ?? 50)
const MINQ = Number(process.argv[3] ?? 2)

/** 归一化：去掉空白与标点，只留汉字/字母/数字 */
const clean = (s: string) =>
  (s ?? '').replace(/[\s，。、；：（）“”‘’《》〈〉,.;:()"'?!！？①②③④⑤⑥\-—·…]/g, '')

interface Item {
  id: string
  book: string
  set: string
  type: string
  stem: string
  blob: string
}

const items: Item[] = []
for (const q of POLITICS_QUESTIONS as any[]) {
  const tags: string[] = q.tags ?? []
  const blob = clean([q.stem ?? '', ...(q.answerPoints ?? []), q.explanation ?? ''].join('\n'))
  items.push({
    id: q.id,
    book: tags.includes('肖八') ? '肖八' : tags.includes('肖四') ? '肖四' : '样例',
    set: tags.find((t) => /第\d套/.test(t)) ?? '',
    type: q.type,
    stem: (q.stem ?? '').slice(0, 46),
    blob,
  })
}

// 窗口 → 命中该窗口的题目下标集合
const map = new Map<string, number[]>()
items.forEach((it, i) => {
  for (let p = 0; p + WIN <= it.blob.length; p++) {
    const g = it.blob.slice(p, p + WIN)
    let arr = map.get(g)
    if (!arr) map.set(g, (arr = []))
    if (arr[arr.length - 1] !== i) arr.push(i)
  }
})

// 按题对聚合：pair → { hits, samples }
interface PairInfo {
  a: number
  b: number
  hits: number
  sample: string
}
const pairs = new Map<string, PairInfo>()
for (const [g, idxs] of map) {
  if (idxs.length < MINQ) continue
  for (let i = 0; i < idxs.length; i++) {
    for (let j = i + 1; j < idxs.length; j++) {
      const a = idxs[i]
      const b = idxs[j]
      const key = `${a}|${b}`
      let info = pairs.get(key)
      if (!info) pairs.set(key, (info = { a, b, hits: 0, sample: g }))
      info.hits++
      if (g.length > info.sample.length) info.sample = g
    }
  }
}

const list = [...pairs.values()].sort((x, y) => y.hits - x.hits)

console.log(`题目总数 ${items.length}，窗口 ${WIN} 字，命中 ${list.length} 对\n`)
let flagged = 0
for (const p of list) {
  const A = items[p.a]
  const B = items[p.b]
  // 同一考点在不同套卷重复出现是正常的；只有「答案整段雷同」才可疑
  if (p.hits < 3) continue
  flagged++
  console.log(`重合 ${p.hits} 窗口（约 ${p.hits + WIN - 1} 字）`)
  console.log(`  A ${A.id}  [${A.book}${A.set}/${A.type}] ${A.stem}`)
  console.log(`  B ${B.id}  [${B.book}${B.set}/${B.type}] ${B.stem}`)
  console.log(`  片段 ${JSON.stringify(p.sample.slice(0, 70))}`)
  console.log()
}
console.log(`其中重合 ≥3 窗口的 ${flagged} 对（这些是「整段雷同」，优先人工看）`)
