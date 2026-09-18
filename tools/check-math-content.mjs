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
  ['随机变量的数字特征', '线性相关意义', '相关系数', '概率里的线性相关指 |ρ|=1，不是线代向量组'],
  ['行列式', '二阶、三阶、n 阶行列式', '面积', '行列式应给几何意义或展开定义，不能是高阶导数公式'],
  ['矩阵', '矩阵概念', 'ᵀ', '转置是矩阵运算的基础'],
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
      const text = `${p.kp.summary} ${p.kp.anchor?.content || ''}`
      return !text.includes(need)
    })
    if (bad.length) throw new Error(`${bad.length} 条不含「${need}」——${why}`)
    return true
  })
}

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
