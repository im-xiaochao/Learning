/**
 * 数学知识点内容回归检查。
 *
 * 背景：`data/math/lectures.ts` 是一套「按标题正则分派」的规则生成器，宽泛规则写在前面时
 * 会遮蔽专用规则，导致知识点挂错内容（如「二重极限」拿到一元左右极限、
 * 「莱布尼茨公式」拿到牛顿—莱布尼茨公式）。这类错配**不会报错**，只会静默错一片，
 * 所以把已经修对的映射固化成断言，谁再改规则先过这里。
 *
 * 用法：node tools/check-math-content.mjs
 * 前置：先 `cd tools && npm run build:content`
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const KNOW = path.join(ROOT, 'data', 'content', 'knowledge')

/** 关键知识点 → 锚点/摘要里必须出现（或禁止出现）的关键词 */
const GOLDEN = [
  // [章节关键词, 知识点标题, 必须包含, 说明]
  ['多元函数微分学', '二重极限', '路径无关', '二元极限必须讲「沿任意路径」；讲左右极限是错的'],
  ['多元函数微积分学', '二重极限', '路径无关', '数二同一知识点'],
  ['一元函数微分学', '莱布尼茨公式', 'Cₙᵏ', '乘积的高阶导数公式，不是牛顿—莱布尼茨公式'],
  ['一元函数微分学', '弧微分', 'ds=√(1+y′²)dx', '弧微分是长度元素，不是曲率'],
  ['一元函数微分学', '复合函数求导', "f′(g(x))g′(x)", '要的是链式法则，不是复合函数的定义'],
  ['一元函数微分学', '分段函数求导', '导数定义', '分界点必须回到导数定义'],
  ['多元函数微分学', '方向导数定义', '∇f', '方向导数 = 梯度点乘单位方向'],
  ['随机变量的数字特征', '线性相关意义', '|ρ|=1', '概率里的线性相关指 |ρ|=1，不是线代向量组'],
  ['行列式', '二阶、三阶、n 阶行列式', '面积', '行列式应给几何意义或展开定义，不能是高阶导数公式'],
  ['矩阵', '矩阵概念', 'ᵀ', '转置是矩阵运算的基础'],
  // ── 精编内容（data/math/curated.ts）抽查：确保精编层优先于规则层 ──
  ['随机事件与概率', '德摩根律', 'ᶜ', '取非要交换并交，公式必须写对'],
  ['随机事件与概率', '独立与互斥的区别', '互斥与独立', '两个概念不能混用'],
  ['随机事件与概率', '全概率公式 P(B)=ΣP(Aᵢ)P(B|Aᵢ)', 'Σ', '按原因分类求和'],
  ['随机事件与概率', '贝叶斯公式 P(Aⱼ|B)=P(Aⱼ)P(B|Aⱼ)/P(B)', '先验', '由结果反推原因'],
  ['随机事件与概率', '对立事件', '1−P(A)', '正难则反的根据'],
  ['随机事件与概率', '长度、面积、体积比', '测度', '几何概型看测度之比'],
  // 概率第 2 讲（一维随机变量）与第 5 讲（大数定律）
  ['一维随机变量及其分布', '二项分布', 'Cₙᵏ', '二项分布的通项'],
  ['一维随机变量及其分布', '密度与分布函数关系', 'F′(x)=f(x)', '密度与分布函数互逆'],
  // 注意：两个「标准化」内容不同——一维随机变量那处是正态标准化 Z=(X−μ)/σ，
  // 大数定律那处是中心极限定理里对「和」的标准化 (ΣXᵢ−nμ)/(σ√n)。
  ['一维随机变量及其分布', '标准化', 'Z=(X−μ)/σ', '正态标准化要除标准差 σ'],
  ['大数定律与中心极限定理', '标准化', 'σ√n', '中心极限定理是对「和」标准化'],
  ['大数定律与中心极限定理', '用方差控制偏离均值的概率', 'ε²', '切比雪夫不等式'],
  ['大数定律与中心极限定理', '辛钦大数定律', '独立同分布', '辛钦的条件最宽松'],
]

/** 展示内容里不允许出现的人名 / 课程名（合规红线） */
const FORBIDDEN = ['张宇', '武忠祥', '汤家凤', '李永乐', '基础30讲']

const points = []
for (const dir of fs.readdirSync(KNOW)) {
  const full = path.join(KNOW, dir)
  if (!fs.statSync(full).isDirectory()) continue
  for (const file of fs.readdirSync(full)) {
    if (!file.endsWith('.json')) continue
    const chapter = JSON.parse(fs.readFileSync(path.join(full, file), 'utf8'))
    for (const kp of chapter.knowledge) points.push({ chapter, kp })
  }
}

let pass = 0
let fail = 0
const failures = []
const check = (label, fn) => {
  try {
    if (fn() === false) throw new Error('返回 false')
    pass++
    console.log(`  ✅ ${label}`)
  } catch (e) {
    fail++
    failures.push(`${label} → ${e.message}`)
    console.log(`  ❌ ${label} → ${e.message}`)
  }
}

console.log(`数学知识点 ${points.length} 个\n`)
console.log('【关键映射：宽泛规则不得遮蔽专用规则】')
for (const [chapterKey, title, need, why] of GOLDEN) {
  check(`${chapterKey} / ${title} 必须含「${need}」`, () => {
    const hit = points.filter((p) => p.chapter.title.includes(chapterKey) && p.kp.title === title)
    if (!hit.length) throw new Error(`找不到这个知识点（章节关键词「${chapterKey}」）`)
    const bad = hit.filter((p) => {
      // 查「展示给用户的全部内容」，不只是 summary + 锚点：
      // 有些关键信息写在要点或正文里（例如「先验」出现在要点的解释句中）。
      const text = [
        p.kp.summary,
        p.kp.anchor?.content,
        p.kp.bodyMarkdown,
        ...(p.kp.keyPoints || []).flatMap((k) => [k.title, k.bodyMarkdown]),
        ...(p.kp.examples || []).map((e) => e.bodyMarkdown),
      ]
        .filter(Boolean)
        .join(' ')
      return !text.includes(need)
    })
    if (bad.length) throw new Error(`${bad.length} 条不含「${need}」——${why}`)
    return true
  })
}

console.log('\n【精编内容的键必须唯一命中】')
/** 从 curated.ts 里解析出所有精编键（注意：标题本身可能含「/」，如 P(A|B)=P(AB)/P(B)） */
function curatedKeys() {
  const src = fs.readFileSync(path.join(ROOT, 'data', 'math', 'curated.ts'), 'utf8')
  const body = src.slice(src.indexOf('const PROBABILITY_EVENTS'), src.indexOf('export const CURATED'))
  // 负向字符类必须排除换行：写成 [^:] 会跨行吞掉下一条目（踩过）
  const keys = [...body.matchAll(/^  (?:'([^']+)'|([^':\n][^:\n]*)): \{$/gm)].map((m) => (m[1] ?? m[2]).trim())
  if (!keys.length) throw new Error('没解析出任何精编键，检查正则')
  return keys
}

check('每个精编键都能命中知识点（键写错会静默不生效）', () => {
  const byTitle = new Set()
  const byChapterTitle = new Set()
  const byChapterSectionTitle = new Set()
  for (const { chapter, kp } of points) {
    byTitle.add(kp.title)
    byChapterTitle.add(`${chapter.title}/${kp.title}`)
    byChapterSectionTitle.add(`${chapter.title}/${kp.sectionTitle}/${kp.title}`)
  }
  // 标题里可能自带「/」，所以三种解释任一命中就算合法
  const dead = curatedKeys().filter(
    (k) => !byTitle.has(k) && !byChapterTitle.has(k) && !byChapterSectionTitle.has(k),
  )
  if (dead.length) throw new Error(`这些键不命中任何知识点，等于白写：${dead.join('、')}`)
  return true
})

check('只按标题索引的键在全库唯一（重名必须写成「章节/标题」）', () => {
  const count = new Map()
  for (const { kp } of points) count.set(kp.title, (count.get(kp.title) || 0) + 1)
  const byChapterTitle = new Set(points.map((p) => `${p.chapter.title}/${p.kp.title}`))
  const bad = curatedKeys()
    .filter((k) => !byChapterTitle.has(k)) // 没写成「章节/标题」的，就是只按标题索引
    .filter((k) => (count.get(k) || 0) > 1)
    .map((k) => `${k}（全库 ${count.get(k)} 处）`)
  if (bad.length) throw new Error(`这些键重名，必须写成「章节/标题」：${bad.join('、')}`)
  return true
})
check('精编内容确实生效（抽查的摘要不再与他人重复）', () => {
  // 按「章节 + 标题」抽样：像「标准化」这种标题有两处，只有被精编的那一处才该是独有摘要
  const sample = [
    ['随机事件与概率', '德摩根律'],
    ['一维随机变量及其分布', '二项分布'],
    ['一维随机变量及其分布', '标准化'],
    ['一维随机变量及其分布', '分布函数法'],
    ['一维随机变量及其分布', '定义'],
  ]
  const dup = new Map()
  for (const { kp } of points) dup.set(kp.summary, (dup.get(kp.summary) || 0) + 1)
  const missing = []
  const shared = []
  for (const [chapterKey, title] of sample) {
    const hit = points.filter((p) => p.chapter.title.includes(chapterKey) && p.kp.title === title)
    if (!hit.length) missing.push(`${chapterKey}/${title}`)
    else if (hit.some((p) => dup.get(p.kp.summary) > 1)) shared.push(`${chapterKey}/${title}`)
  }
  if (missing.length) throw new Error(`抽查的知识点没找到：${missing.join('、')}`)
  if (shared.length) throw new Error(`${shared.join('、')} 的摘要仍与他人重复，精编内容没生效`)
  return true
})

console.log('\n【整册收口：概率论 148 个知识点全部精编】')
check('概率册每个知识点的摘要都互不重复（说明全部来自精编内容）', () => {
  const prob = points.filter((p) => p.chapter.subjectId === 'probability')
  const seen = new Map()
  for (const { kp } of prob) seen.set(kp.summary, (seen.get(kp.summary) || 0) + 1)
  const dup = [...seen.entries()].filter(([, n]) => n > 1)
  if (dup.length) {
    throw new Error(
      `${prob.length} 个点里还有 ${dup.reduce((a, [, n]) => a + n, 0)} 条的摘要与他人重复：` +
        dup.slice(0, 3).map(([s]) => s.slice(0, 18)).join(' / '),
    )
  }
  return true
})

console.log('\n【合规：展示内容不得出现课程名 / 人名】')
check(`展示字段不含 ${FORBIDDEN.join('、')}`, () => {
  const bad = []
  for (const { chapter, kp } of points) {
    const shown = JSON.stringify({ ...kp, sources: undefined }) // sources 是内部溯源，不算展示内容
    if (FORBIDDEN.some((name) => shown.includes(name))) bad.push(`${chapter.title}/${kp.title}`)
  }
  if (bad.length) throw new Error(`${bad.length} 条仍在展示内容里带课程名，例如 ${bad.slice(0, 3).join('、')}`)
  return true
})

console.log('\n【体例（当前状态，仅提示不判失败）】')
{
  const dup = new Map()
  let bodyEqTitle = 0
  let totalPoints = 0
  for (const { kp } of points) {
    dup.set(kp.summary, (dup.get(kp.summary) || 0) + 1)
    for (const p of kp.keyPoints || []) {
      totalPoints++
      if ((p.bodyMarkdown || '').trim() === (p.title || '').trim()) bodyEqTitle++
    }
  }
  const dupCount = points.length - dup.size
  console.log(`  唯一摘要 ${dup.size} / ${points.length}，模板重复 ${dupCount} 条（${((dupCount / points.length) * 100).toFixed(1)}%）`)
  console.log(`  要点正文 == 标题：${bodyEqTitle} / ${totalPoints}（${((bodyEqTitle / totalPoints) * 100).toFixed(1)}%）`)
  console.log('  ↑ 这两项是「内容要重写」的量化目标，不是断言（改动量大，单独排期）')
}

console.log('\n' + '='.repeat(48))
console.log(`通过 ${pass} / 失败 ${fail}`)
if (failures.length) {
  console.log('\n失败明细：')
  for (const f of failures) console.log('  · ' + f)
  process.exit(1)
}
console.log('🎉 全部通过')
