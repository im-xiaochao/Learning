/**
 * 政治题库 **schema 硬约束**检查（只读，不改数据）。
 *
 * 与 `_audit-politics.ts`（字段像不像）和 `_consistency.ts`（跨字段打不打架）互补：
 * 这里只查**结构性不变量**——违反了不会让构建失败，但会让运行时静默出错。
 *
 * 用法：
 *   cd tools && npx tsx _schema-check.ts              # 扫真实题库
 *   cd tools && npx tsx _schema-check.ts --selftest    # 跑负例，验证规则真的会触发
 */
import { POLITICS_QUESTIONS, POLITICS_MODULES } from '../data'

type Q = any

const ID_RE = /^[a-z0-9-]+$/
const bookOf = (tags: string[]) =>
  tags?.includes('肖八') ? '肖八' : tags?.includes('肖四') ? '肖四' : '?'

/**
 * 样例题是自编的 6 道示范题（肖四/肖八都不含），其余 456 道必须带分卷标记。
 *
 * 这条**不是**在查「样例题没标记」——那是它们的定义。查的是反向风险：
 * 万一某道真题丢了「肖四」/「肖八」tag，`_audit-politics.ts` 的 `bookOf()` 会把它
 * 归成 `sample`，于是「材料题小问缺失」「解析张冠李戴」等规则会因为
 * `book !== 'sample'` 的豁免**静默跳过它**。标记丢失是无声的，必须显式兜住。
 */
const SAMPLE_IDS = new Set([
  'q-maozhongte-1', 'q-maozhongte-2',
  'q-mayuan-1', 'q-mayuan-2',
  'q-sixiu-1', 'q-sixiu-2',
])

/** 跑一遍全部不变量，返回违反列表。抽成函数是为了能在 `--selftest` 里喂负例。 */
export function checkSchema(QS: Q[], MODS: string[]): string[] {
  const problems: string[] = []
  const add = (cat: string, id: string, detail: string) =>
    problems.push(`[${cat}] ${id} — ${detail}`)

  const seen = new Map<string, number>()

  for (const q of QS) {
    const id = String(q.id ?? '')
    seen.set(id, (seen.get(id) ?? 0) + 1)

    // ① id：答题记录的主键，格式错会导致存储/回放对不上
    if (!ID_RE.test(id)) add('id 格式', id, `只允许 [a-z0-9-]，实际 "${id}"`)

    // ② module：必须落在白名单里（`build-content.ts` 用它分组，写错会静默丢模块）
    if (typeof q.module !== 'string' || !q.module) add('module 缺失', id, String(q.module))
    else if (!MODS.includes(q.module)) add('module 非白名单', id, `"${q.module}" 不在 POLITICS_MODULES`)

    // ③ difficulty ∈ {1,2,3}
    if (![1, 2, 3].includes(q.difficulty)) add('difficulty 越界', id, String(q.difficulty))

    // ④ tags：必填数组；非样例题必须能认出分卷（否则审计会把它当样例题豁免）
    if (!Array.isArray(q.tags) || !q.tags.length) add('tags 缺失', id, JSON.stringify(q.tags))
    else if (bookOf(q.tags) === '?' && !SAMPLE_IDS.has(id))
      add('真题丢分卷标记', id, `${JSON.stringify(q.tags)} —— 会被审计当样例题豁免`)
    if (bookOf(q.tags) !== '?' && SAMPLE_IDS.has(id))
      add('样例题误带分卷标记', id, JSON.stringify(q.tags))

    // ⑤ 题型与答案字段的**互斥**：写错校验器不报错，但多选会全判错（静默）
    const hasKey = q.answerKey !== undefined && q.answerKey !== null && q.answerKey !== ''
    const hasKeys = Array.isArray(q.answerKeys) && q.answerKeys.length > 0
    if (q.type === 'choice') {
      if (!hasKey) add('choice 缺 answerKey', id, '')
      if (hasKeys) add('choice 误带 answerKeys', id, JSON.stringify(q.answerKeys))
    } else if (q.type === 'multi') {
      if (!hasKeys) add('multi 缺 answerKeys', id, '')
      if (hasKey) add('multi 误带 answerKey', id, String(q.answerKey))
      if (hasKeys && new Set(q.answerKeys).size !== q.answerKeys.length)
        add('answerKeys 有重复', id, JSON.stringify(q.answerKeys))
    } else if (q.type === 'material') {
      if (hasKey) add('material 误带 answerKey', id, String(q.answerKey))
      if (hasKeys) add('material 误带 answerKeys', id, JSON.stringify(q.answerKeys))
      if (!Array.isArray(q.answerPoints) || !q.answerPoints.length)
        add('material 缺 answerPoints', id, '')
    } else {
      add('type 未知', id, String(q.type))
    }

    // ⑥ TS 源码里的 `\\n` 字面量（两字符 `\` + `n`）——真换行应写成 `\n`。
    //    运行时表现为界面上出现一个反斜杠加 n，且会切断分词。
    for (const [f, v] of [['stem', q.stem], ['explanation', q.explanation]] as const) {
      if (typeof v === 'string' && v.includes('\\n')) add('字面量 \\\\n', id, `${f} 含 "\\\\n"`)
    }
    for (const o of q.options ?? []) {
      if (typeof o.text === 'string' && o.text.includes('\\n'))
        add('字面量 \\\\n', id, `选项 ${o.key} 含 "\\\\n"`)
    }
    for (const p of q.material?.paragraphs ?? []) {
      if (typeof p === 'string' && p.includes('\\n'))
        add('字面量 \\\\n', id, '材料段落含 "\\\\n"')
    }
  }

  for (const [id, n] of seen) if (n > 1) add('id 重复', id, `${n} 次`)
  return problems
}

function report(problems: string[], n: number, nmods: number) {
  const byCat = new Map<string, string[]>()
  for (const p of problems) {
    const c = p.slice(1, p.indexOf(']'))
    byCat.set(c, [...(byCat.get(c) ?? []), p])
  }
  console.log(`题库 ${n} 题 | 模块白名单 ${nmods} 个`)
  console.log(`schema 违反 ${problems.length} 处\n`)
  if (!problems.length) console.log('✅ 全部通过')
  for (const [c, list] of [...byCat].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`· ${c}（${list.length}）`)
    for (const x of list.slice(0, 8)) console.log(`    ${x}`)
    if (list.length > 8) console.log(`    …另有 ${list.length - 8} 处`)
  }
}

// ---------------------------------------------------------------- 自检
/** 一条合规的基准题，负例在它上面改一个字段。 */
const OK: Q = {
  id: 'q-x8-s1-01', type: 'choice', module: '中国近现代史纲要', difficulty: 2,
  tags: ['肖八', '第1套'], stem: '示例题干', options: [{ key: 'A', text: 'x' }],
  answerKey: 'A', explanation: '示例解析',
}

const CASES: [string, Q][] = [
  ['id 格式', { ...OK, id: 'q_x8_1' }],
  ['module 非白名单', { ...OK, module: '不存在的模块' }],
  ['difficulty 越界', { ...OK, difficulty: 5 }],
  ['真题丢分卷标记', { ...OK, tags: ['单选题'] }],
  ['choice 误带 answerKeys', { ...OK, answerKeys: ['A', 'B'] }],
  ['multi 缺 answerKeys', { ...OK, type: 'multi', answerKey: undefined }],
  ['answerKeys 有重复', { ...OK, type: 'multi', answerKey: undefined, answerKeys: ['A', 'A'] }],
  ['material 误带 answerKey', { ...OK, type: 'material', answerPoints: ['p'] }],
  ['material 缺 answerPoints', { ...OK, type: 'material', answerKey: undefined }],
  ['type 未知', { ...OK, type: 'fill' }],
  ['字面量 \\\\n', { ...OK, stem: 'a\\\\nb' }],
  ['tags 缺失', { ...OK, tags: [] }],
]

function selftest() {
  let pass = 0
  console.log('负例自检：每条负例必须恰好触发它对应的那一类\n')
  for (const [cat, q] of CASES) {
    const got = checkSchema([q], MODS)
    const cats = new Set(got.map((p) => p.slice(1, p.indexOf(']'))))
    const ok = cats.has(cat)
    console.log(`${ok ? '✅' : '❌'} ${cat}  →  实际触发 ${cats.size ? [...cats].join(' / ') : '（无）'}`)
    if (ok) pass++
  }
  // 正例：合规题必须一条都不触发
  const clean = checkSchema([OK], MODS)
  const okClean = clean.length === 0
  console.log(`${okClean ? '✅' : '❌'} 合规题不误报  →  ${clean.length ? clean.join(' | ') : '（无）'}`)
  console.log(`\n${pass}/${CASES.length} 条负例通过${okClean ? '，正例通过' : '，正例失败'}`)
  process.exit(pass === CASES.length && okClean ? 0 : 1)
}

const MODS = POLITICS_MODULES as string[]

if (process.argv.includes('--selftest')) {
  selftest()
} else {
  const QS = POLITICS_QUESTIONS as Q[]
  report(checkSchema(QS, MODS), QS.length, MODS.length)
}
