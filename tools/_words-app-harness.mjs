/**
 * 单词模块（小程序侧）harness：源码级断言，不需要渲染 Vue（本机没装 vue）。
 *
 * 用法：node tools/_words-app-harness.mjs
 *
 * 覆盖用户 2026-09-18 的口径在**代码**里的落地情况：
 *   1. 单词页一进来是「开始学习」，不是「继续复习」；
 *   2. 上方两张卡：今日新词 x/总数、今日复习 x/总数；
 *   3. 音标保留、读音入口（喇叭 + pronounce）全部去掉；
 *   4. 单词本 / 计划设定两个新页面，且路由真的注册进 pages.json；
 *   5. 数学（资料库）模块没有「我的计划」。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')

let pass = 0
let fail = 0
const failures = []

function check(label, fn) {
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

/**
 * 去掉注释再断言。
 * 坑：字面量断言会把「为什么这么改」的注释也算成残留（注释里提到旧文案是常事），
 * 所以负向断言（「还留着 X」）必须看**真实代码**，不能看注释。
 */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*\/\/.*$/gm, '')
}

const words = read('pages/words/words.vue')
const wordbook = read('pages-words/wordbook/wordbook.vue')
const wordPlan = read('pages-words/word-plan/word-plan.vue')
const review = read('pages-words/review/review.vue')
const detail = read('pages-words/word-detail/word-detail.vue')
const library = stripComments(read('components/KnowledgeLibrary.vue'))
const store = read('stores/learning.ts')
const wordsCode = stripComments(words)

console.log('【单词页：默认「开始学习」】')
check('主按钮默认文案是「开始学习」', () => {
  if (!wordsCode.includes("'开始学习'")) throw new Error('没有「开始学习」分支')
  if (wordsCode.includes('继续复习')) throw new Error('还留着「继续复习」')
  return true
})
check('进行中/已完成的两种文案都在', () => {
  if (!words.includes('继续学习 · 还剩')) throw new Error('缺「继续学习 · 还剩 N 个」')
  if (!words.includes('今日已完成 · 再练一轮')) throw new Error('缺「今日已完成 · 再练一轮」')
  return true
})

console.log('\n【单词页：今日新词 / 今日复习两张卡】')
check('两张卡都有「已完成 / 总数」', () => {
  if (!words.includes('今日新词')) throw new Error('缺「今日新词」卡')
  if (!words.includes('今日复习')) throw new Error('缺「今日复习」卡')
  if (!/targets\.newWords/.test(words) || !/targets\.review/.test(words)) throw new Error('卡片分母不是 wordTargets')
  return true
})
check('进度取自 todayNewWords / todayReviewWords', () => {
  if (!words.includes('todayNewWords')) throw new Error('没用 todayNewWords')
  if (!words.includes('todayReviewWords')) throw new Error('没用 todayReviewWords')
  return true
})
check('底部不再有「我的收藏」', () => {
  if (wordsCode.includes('我的收藏')) throw new Error('还留着「我的收藏」')
  if (wordsCode.includes('favoriteWordIds')) throw new Error('还在读收藏列表')
  return true
})

console.log('\n【音标保留 + 去掉读音】')
check('复习页 / 详情页：音标还在', () => {
  for (const [name, src] of [['复习页', review], ['详情页', detail]]) {
    if (!src.includes('word.ipa')) throw new Error(`${name}没有音标`)
  }
  return true
})
check('复习页 / 详情页：没有发音按钮与 pronounc 方法', () => {
  for (const [name, src] of [['复习页', review], ['详情页', detail]]) {
    if (/function pronounce/.test(src)) throw new Error(`${name}还有 pronounce()`)
    if (src.includes('sound-primary')) throw new Error(`${name}还有喇叭图标`)
    if (src.includes('class="pronunciation"')) throw new Error(`${name}还是可点的发音按钮`)
  }
  return true
})
check('音标改成纯展示的 .word-ipa，且 App.vue 定义了它', () => {
  if (!review.includes('class="word-ipa"') || !detail.includes('class="word-ipa"')) throw new Error('没用 .word-ipa')
  if (!read('App.vue').includes('.word-ipa {')) throw new Error('App.vue 里没有 .word-ipa 样式')
  return true
})

console.log('\n【单词本 / 计划设定】')
check('单词本列出全部单词并带学习状态', () => {
  if (!wordbook.includes('appWords')) throw new Error('没有读全量词库')
  if (!wordbook.includes('未学习') || !wordbook.includes('熟悉')) throw new Error('没有学习状态')
  if (!wordbook.includes('limit')) throw new Error('5493 个词没做分批渲染')
  return true
})
check('计划设定可以改每天学多少个单词', () => {
  if (!wordPlan.includes('setDailyWords')) throw new Error('没有调用 setDailyWords')
  if (!wordPlan.includes('DAILY_WORD_OPTIONS')) throw new Error('选项不是来自 DAILY_WORD_OPTIONS')
  return true
})
check('store 提供 wordTargets / setDailyWords 并已导出', () => {
  for (const name of ['wordTargets', 'setDailyWords', 'todayNewWords', 'todayReviewWords']) {
    if (!store.includes(`export const ${name}`) && !store.includes(`export function ${name}`)) throw new Error(`缺 ${name}`)
    if (!new RegExp(`\\n\\s+${name},`).test(store) && !new RegExp(`\\n\\s+${name},?\\n`).test(store)) throw new Error(`${name} 没进 useLearning()`)
  }
  return true
})

console.log('\n【路由】')
const pages = JSON.parse(read('pages.json'))
const allPages = [
  ...pages.pages.map((p) => p.path),
  ...pages.subPackages.flatMap((sp) => sp.pages.map((p) => `${sp.root}/${p.path}`)),
]
check('两个新页面都注册进 pages-words 分包', () => {
  if (!allPages.includes('pages-words/wordbook/wordbook')) throw new Error('缺 wordbook 路由')
  if (!allPages.includes('pages-words/word-plan/word-plan')) throw new Error('缺 word-plan 路由')
  return true
})
check('所有 navigateTo 的目标都已注册（防手滑写错路径）', () => {
  const files = [...allPages.map((p) => `${p}.vue`), 'App.vue']
  const bad = []
  for (const f of files) {
    if (!fs.existsSync(path.join(ROOT, f))) continue
    const src = read(f)
    for (const m of src.matchAll(/uni\.navigateTo\(\{\s*url:\s*[`'"]([^`'"]+)/g)) {
      const target = m[1].split('?')[0].replace(/^\//, '')
      if (!allPages.includes(target)) bad.push(`${f} → ${target}`)
    }
  }
  if (bad.length) throw new Error(bad.join('; '))
  return true
})

console.log('\n【数学 / 资料库：删掉「我的计划」】')
check('KnowledgeLibrary 里没有「我的计划」', () => {
  if (library.includes('我的计划')) throw new Error('还留着「我的计划」')
  if (/function goPlan/.test(library)) throw new Error('goPlan 还在（没人调了）')
  return true
})
check('学习计划页本身还在（我的页仍可进）', () => {
  if (!allPages.includes('pages/plan/plan')) throw new Error('pages/plan 被删了')
  if (!read('pages/my/my.vue').includes('/pages/plan/plan')) throw new Error('我的页进不去学习计划')
  return true
})

console.log('\n' + '='.repeat(48))
console.log(`通过 ${pass} / 失败 ${fail}`)
if (failures.length) {
  console.log('\n失败明细：')
  for (const f of failures) console.log('  · ' + f)
  process.exit(1)
}
console.log('🎉 全部通过')
