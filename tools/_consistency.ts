/**
 * 政治题库「一致性」全量体检（只读，不改数据）。
 *
 * 与 `_audit-politics.ts` 的 21 类**互补**：那边查的是「字段有没有 / 像不像」，
 * 这里查的是**跨字段自相矛盾**——答案、选项、解析三者互相打架的那类问题。
 * 这类问题不会让构建失败，用户却会看到「答对了但解析说你错了」。
 *
 * 用法：cd tools && npx tsx _consistency.ts
 */
import { POLITICS_QUESTIONS } from '../data'

type Q = any
const QS = POLITICS_QUESTIONS as Q[]

const bookOf = (tags: string[]) =>
  tags.includes('肖八') ? '肖八' : tags.includes('肖四') ? '肖四' : '样例题'

interface Issue {
  cat: string
  id: string
  book: string
  detail: string
}
const issues: Issue[] = []
const add = (cat: string, q: Q, detail: string) =>
  issues.push({ cat, id: q.id, book: bookOf(q.tags ?? []), detail })

/** 归一化：只留汉字数字字母，用于长度与包含判断 */
const norm = (s: string) => (s ?? '').replace(/[^\u4e00-\u9fff0-9A-Za-z]/g, '')

/** 客观题 = choice | multi */
const isObj = (q: Q) => q.type !== 'material'

const optionKeys = (q: Q): string[] => (q.options ?? []).map((o: any) => String(o.key).trim())

// ────────────────────────────────────────────────
// A. 解析引用了「不存在的选项」
//    例：题目只有 A/B/C 三个选项，解析却写「D 正确」。
//    只用高精度模式匹配，避免把「A股」「维生素A」这类误判进来。
// ────────────────────────────────────────────────
const REF_PATTERNS: [RegExp, string][] = [
  [/([A-H])正确/g, '正确'],
  [/([A-H])错误/g, '错误'],
  [/([A-H])符合/g, '符合'],
  [/([A-H])不符/g, '不符'],
  [/([A-H])当选/g, '当选'],
  [/([A-H])不选/g, '不选'],
  [/([A-H])项/g, '项'],
  [/([A-H])、([A-H])/g, '并列'],
  [/([A-H])和([A-H])/g, '和'],
]

function checkExplanationRefs(q: Q) {
  if (!q.explanation) return
  const keys = optionKeys(q)
  if (!keys.length) return
  const set = new Set(keys)
  const bad = new Set<string>()
  for (const [re, kind] of REF_PATTERNS) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(q.explanation))) {
      for (let g = 1; g < m.length; g++) {
        const L = m[g]
        if (L && /^[A-H]$/.test(L) && !set.has(L)) bad.add(`${L}(${kind})`)
      }
    }
  }
  if (bad.size) add('解析引用不存在的选项', q, `${[...bad].join(' ')} ｜ 选项=${keys.join('')}`)
}

// ────────────────────────────────────────────────
// B. 同题内选项文本重复
//    例：A 和 C 的文本一模一样 —— 转档串行或排版复用导致。
// ────────────────────────────────────────────────
function checkDupOptions(q: Q) {
  const opts = q.options ?? []
  if (opts.length < 2) return
  const seen = new Map<string, string[]>()
  for (const o of opts) {
    const k = norm(o.text)
    if (k.length < 4) continue // 太短的（「①②」之类）不算
    seen.set(k, [...(seen.get(k) ?? []), String(o.key)])
  }
  for (const [k, ks] of seen) {
    if (ks.length > 1) add('选项文本重复', q, `${ks.join('/')} 文本相同：${k.slice(0, 40)}`)
  }
}

// ────────────────────────────────────────────────
// C. 材料题：小问数 > 采分点数
//    小问写在 stem 里（（1）（2）…），采分点在 answerPoints。
//    少一个采分点，用户就会看到「问了但没答」。
// ────────────────────────────────────────────────
function checkSubQuestionCoverage(q: Q) {
  if (q.type !== 'material') return
  const stem = q.stem ?? ''
  const subs = [...stem.matchAll(/[（(]\s*([1-9])\s*[)）]/g)].map((m) => Number(m[1]))
  const uniq = [...new Set(subs)].sort((a, b) => a - b)
  if (!uniq.length) return
  const pts = q.answerPoints ?? []
  // 采分点里的小问标记**不一定在行首**：肖四常把 `（2）` 接在上一条的段尾
  // （例：`…达到真理尺度和价值尺度的统一。（2）真理与谬误…`），所以全文扫描。
  const ptSubs = new Set<number>()
  for (const p of pts) {
    for (const m of p.matchAll(/[（(]\s*([1-9])\s*[)）]/g)) ptSubs.add(Number(m[1]))
  }
  // 采分点里完全没有小问标记时，退化成「按条数估」——多条一般就是逐问作答
  const covered = ptSubs.size || Math.min(pts.length, uniq.length)
  const missing = uniq.filter((v) => !ptSubs.has(v) && ptSubs.size > 0)
  if (missing.length)
    add('材料题采分点少于小问数', q, `小问 ${uniq.length} 个（${uniq.join(',')}）缺 ${missing.join(',')}`)
  else if (!ptSubs.size && uniq.length > pts.length)
    add('材料题采分点少于小问数', q, `小问 ${uniq.length} 个但采分点仅 ${pts.length} 条`)
  // 小问编号应从 1 开始连续
  if (uniq[0] !== 1 || uniq.some((v, i) => v !== i + 1))
    add('材料题小问编号不连续', q, `编号 ${uniq.join(',')}`)
}

// ────────────────────────────────────────────────
// D. 结构混淆：客观题带 material 字段 / 材料题带 options
// ────────────────────────────────────────────────
function checkShape(q: Q) {
  if (isObj(q)) {
    if (q.material) add('结构混淆', q, '客观题带 material 字段')
    if (q.answerPoints?.length) add('结构混淆', q, '客观题带 answerPoints')
    const keys = optionKeys(q)
    if (keys.length !== 4) add('选项数不为 4', q, `实为 ${keys.length} 个`)
    if (new Set(keys).size !== keys.length) add('选项键重复', q, keys.join(''))
  } else {
    if (q.options?.length) add('结构混淆', q, '材料题带 options')
    if (!q.material?.paragraphs?.length) add('材料题无材料段落', q, 'material.paragraphs 为空')
  }
}

// ────────────────────────────────────────────────
// E. 答案键与题型匹配
// ────────────────────────────────────────────────
function checkAnswerShape(q: Q) {
  if (q.type === 'choice') {
    if (!q.answerKey) add('答案形态错', q, 'choice 缺 answerKey')
    if (q.answerKeys?.length) add('答案形态错', q, 'choice 却带 answerKeys（应互斥）')
    if (q.answerKey && !/^[A-H]$/.test(q.answerKey)) add('答案形态错', q, `answerKey=${q.answerKey}`)
    if (q.answerKey && !optionKeys(q).includes(q.answerKey))
      add('答案不在选项里', q, `answerKey=${q.answerKey} 选项=${optionKeys(q).join('')}`)
  } else if (q.type === 'multi') {
    if (q.answerKey) add('答案形态错', q, 'multi 却带 answerKey（应互斥）')
    const ks = q.answerKeys ?? []
    if (ks.length < 2) add('答案形态错', q, `multi answerKeys=${ks.length} 个（应 ≥2）`)
    const keys = optionKeys(q)
    for (const k of ks) if (!keys.includes(k)) add('答案不在选项里', q, `${k} 不在 ${keys.join('')}`)
  }
}

// ────────────────────────────────────────────────
// F. 解析过短 / 题干过短
// ────────────────────────────────────────────────
function checkLength(q: Q) {
  const e = norm(q.explanation ?? '')
  if (q.type !== 'material') {
    if (e.length > 0 && e.length < 8) add('解析过短', q, `仅 ${e.length} 字：${q.explanation}`)
  } else if (e.length > 0 && e.length < 10) {
    add('解析过短', q, `仅 ${e.length} 字`)
  }
  if (norm(q.stem ?? '').length < 6) add('题干过短', q, `${norm(q.stem ?? '').length} 字`)
}

// ────────────────────────────────────────────────
// 主流程
// ────────────────────────────────────────────────
for (const q of QS) {
  checkShape(q)
  checkAnswerShape(q)
  checkExplanationRefs(q)
  checkDupOptions(q)
  checkSubQuestionCoverage(q)
  checkLength(q)
}

// ── 答案分布（只报，不判错）──
const dist: Record<string, Record<string, number>> = {}
for (const q of QS) {
  if (!isObj(q)) continue
  const b = bookOf(q.tags ?? [])
  dist[b] = dist[b] ?? {}
  const a = q.type === 'choice' ? q.answerKey : (q.answerKeys ?? []).join('')
  dist[b][a] = (dist[b][a] ?? 0) + 1
}

console.log(`总题数 ${QS.length}\n`)

console.log('【一致性检查】')
if (!issues.length) {
  console.log('  全部通过，0 处问题')
} else {
  const byCat = new Map<string, Issue[]>()
  for (const it of issues) byCat.set(it.cat, [...(byCat.get(it.cat) ?? []), it])
  for (const [cat, list] of [...byCat].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  ● ${cat}：${list.length} 处`)
    for (const it of list.slice(0, 12)) console.log(`      [${it.book}] ${it.id}  ${it.detail}`)
    if (list.length > 12) console.log(`      … 另有 ${list.length - 12} 处`)
  }
}

console.log('\n【答案分布（客观题，仅参考）】')
for (const [b, m] of Object.entries(dist)) {
  const total = Object.values(m).reduce((a, c) => a + c, 0)
  const top = Object.entries(m)
    .sort((a, c) => c[1] - a[1])
    .slice(0, 6)
    .map(([k, v]) => `${k}:${v}`)
    .join('  ')
  console.log(`  ${b}  共 ${total} 题   ${top}`)
}

console.log(`\n合计一致性问题 ${issues.length} 处`)
