/**
 * 背单词模块 harness：在桩 DOM 里跑一遍「背单词 / 单词本 / 计划设定」+ 数学页。
 *
 * 用法：node tools/_words-harness.mjs <.tmp-od/od-xxx.js>
 *
 * 覆盖用户 2026-09-18 的四条口径：
 *   1. 一进背单词页就是「开始学习」，不是「继续复习」；
 *   2. 上方两张卡：今日新词 x/20、今日复习 x/30；
 *   3. 单词里不再出现任何读音入口；
 *   4. 开始学习下方有「单词本」「计划设定」两张卡；数学页没有「我的计划」。
 */
import fs from 'node:fs'
import vm from 'node:vm'

const src = fs.readFileSync(process.argv[2], 'utf8')

/* ── 桩 DOM ───────────────────────────────────────────────────────── */
const elements = new Map()
function makeEl(id) {
  return {
    id,
    innerHTML: '',
    className: '',
    textContent: '',
    hidden: false,
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    dataset: {},
    style: {},
    disabled: false,
    setAttribute() {},
    getAttribute() { return null },
    hasAttribute() { return false },
    querySelectorAll() { return [] },
    querySelector() { return null },
    appendChild() {},
    focus() {},
    addEventListener() {},
    removeEventListener() {},
    closest() { return null },
    classList: { add() {}, remove() {}, contains() { return false }, toggle() {} },
  }
}
function getEl(id) {
  if (!elements.has(id)) elements.set(id, makeEl(id))
  return elements.get(id)
}
;['content', 'app-brand', 'tabbar', 'overlay', 'toast', 'goal-save-status'].forEach(getEl)

const store = new Map()
const sandbox = {
  document: {
    getElementById: getEl,
    querySelectorAll: () => [],
    querySelector: () => makeEl('stub-query'),
    addEventListener() {},
    activeElement: null,
    body: makeEl('body'),
  },
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  },
  window: { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) },
  console,
  setTimeout: (fn) => fn && 0,
  clearTimeout() {},
  Date, Math, JSON, Number, String, Array, Object, Boolean, Map, Set,
  RegExp, Error, isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
  FormData: class { constructor() {} get() { return '' } },
}
sandbox.globalThis = sandbox
vm.createContext(sandbox)
vm.runInContext(src, sandbox, { filename: 'design.js' })

const T = sandbox.__T__
if (!T) throw new Error('脚本没有 __T__ 导出层，先跑 tools/_extract-od.js')
const G = T
const main = getEl('content')

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
 * 样式表：脚本里没有 CSS，但「整体往下移」这种改动只能从 CSS 验。
 * 约定：同目录同名 .html（od-words3.js → od-words3.html）里读 <style>；读不到就跳过。
 */
let CSS = ''
{
  const htmlPath = process.argv[2].replace(/\.js$/, '.html')
  if (fs.existsSync(htmlPath)) {
    const m = fs.readFileSync(htmlPath, 'utf8').match(/<style>([\s\S]*?)<\/style>/)
    if (m) CSS = m[1]
  }
}
console.log(`（样式表：${CSS ? `已加载 ${CSS.length} 字符` : '未找到同名 .html，CSS 断言会失败'}）`)

const html = () => main.innerHTML
const go = (route) => { G.navigate(route, false) }
/** 模拟点击：直接调 handleAction，dataset 传按钮上的值 */
const click = (action, dataset = {}) => sandbox.handleAction(action, { dataset })

console.log('【背单词首页 · 初始状态】')
go('words')
check('主按钮是「开始学习」，不是「继续复习」', () => {
  const h = html()
  if (!h.includes('>开始学习<')) throw new Error('没有「开始学习」')
  if (h.includes('继续复习')) throw new Error('仍出现「继续复习」')
  return true
})
check('今日新词卡：0 / 20 个', () => {
  if (!html().includes('今日新词')) throw new Error('没有今日新词卡')
  if (!html().includes('<strong>0</strong> / 20 个')) throw new Error('新词计数不是 0 / 20')
  return true
})
check('今日复习卡：0 / 30 个', () => {
  if (!html().includes('今日复习')) throw new Error('没有今日复习卡')
  if (!html().includes('<strong>0</strong> / 30 个')) throw new Error('复习计数不是 0 / 30')
  return true
})
check('开始学习下方有「单词本」卡', () => {
  const h = html()
  if (!h.includes('data-route="wordbook"')) throw new Error('没有单词本入口')
  if (!h.includes('>单词本<')) throw new Error('卡片标题不是「单词本」')
  const btnAt = h.indexOf('data-route="wordbook"'), startAt = h.indexOf('>开始学习<')
  if (btnAt < startAt) throw new Error('单词本卡不在「开始学习」下方')
  return true
})
check('底部不再有「我的收藏」（单词本已覆盖）', () => {
  const h = html()
  if (h.includes('我的收藏')) throw new Error('还留着「我的收藏」')
  if (h.includes('vocabulary-favorites')) throw new Error('还留着收藏入口')
  return true
})
check('开始学习下方有「计划设定」卡', () => {
  const h = html()
  if (!h.includes('data-route="word-plan"')) throw new Error('没有计划设定入口')
  if (!h.includes('>计划设定<')) throw new Error('卡片标题不是「计划设定」')
  if (h.indexOf('data-route="word-plan"') < h.indexOf('>开始学习<')) throw new Error('计划设定卡不在下方')
  return true
})

check('单词页内容整体往下移（.words-page 顶部留白）', () => {
  if (!html().includes('class="page words-page"')) throw new Error('单词页没有 .words-page 钩子类')
  if (!/\.words-page\s*\{[^}]*padding-top/.test(CSS)) throw new Error('CSS 里没有 .words-page 的 padding-top')
  return true
})

console.log('\n【读音：全部取消】')
check('背单词页没有读音入口', () => {
  const h = html()
  if (h.includes('pronunciation')) throw new Error('还有 .pronunciation 按钮')
  if (h.includes('data-action="pronounce"')) throw new Error('还有 pronounce 动作')
  return true
})
check('复习页：音标保留，但不再是发音按钮', () => {
  G.startReview()
  const h = html()
  const w = G.vocabulary[G.reviewQueue[G.reviewIndex]]
  if (!h.includes('word-ipa')) throw new Error('音标没了（用户明确要求保留）')
  if (!h.includes(`/${w.ipa}/`)) throw new Error(`没显示 /${w.ipa}/`)
  if (h.includes('data-action="pronounce"')) throw new Error('还有发音动作')
  if (h.includes('class="pronunciation"')) throw new Error('还是原来那个可点的发音按钮')
  return true
})
check('单词详情页同样保留音标', () => {
  G.navigate('word-detail', false)
  const h = html()
  const w = G.vocabulary[0]
  if (!h.includes('word-ipa') || !h.includes(`/${w.ipa}/`)) throw new Error('详情页没有音标')
  if (h.includes('data-action="pronounce"')) throw new Error('详情页还有发音动作')
  return true
})
check('设计稿里已无 speakButton / pronounce 定义', () => {
  if (/function speakButton|function pronounce|icon\('sound'\)/.test(src)) throw new Error('还有残留定义')
  return true
})

console.log('\n【单词本】')
go('wordbook')
check('列出全部单词，并带学习状态', () => {
  const h = html()
  const rows = h.match(/data-od-id="wordbook-/g) || []
  if (rows.length !== G.vocabulary.length) throw new Error(`行数 ${rows.length} ≠ 词库 ${G.vocabulary.length}`)
  if (!h.includes('未学习')) throw new Error('没有「未学习」状态')
  return true
})
check('已学的词显示熟悉/模糊/不认识', () => {
  const w = G.vocabulary[0].word
  G.state.answered[w] = 'fuzzy'
  G.render()
  const h = html()
  if (!h.includes('模糊')) throw new Error('没显示「模糊」')
  G.state.answered[w] = 'familiar'
  G.render()
  if (!html().includes('熟悉')) throw new Error('没显示「熟悉」')
  return true
})
check('按状态筛选（未学习 / 已熟悉）', () => {
  G.wordFilter = 'familiar'
  G.render()
  const rows = (html().match(/data-od-id="wordbook-/g) || []).length
  if (rows !== 1) throw new Error(`「已熟悉」应有 1 行，实际 ${rows} 行`)
  G.wordFilter = 'new'
  G.render()
  const rest = (html().match(/data-od-id="wordbook-/g) || []).length
  if (rest !== G.vocabulary.length - 1) throw new Error(`「未学习」应有 ${G.vocabulary.length - 1} 行，实际 ${rest} 行`)
  G.wordFilter = 'all'
  return true
})

console.log('\n【计划设定】')
go('word-plan')
check('可以设定每天新学 / 复习多少个', () => {
  const h = html()
  if (!h.includes('每天新学多少个单词')) throw new Error('没有新词量设置')
  if (!h.includes('每天复习多少个单词')) throw new Error('没有复习量设置')
  if (!h.includes('data-action="word-plan"')) throw new Error('选项不可点')
  return true
})
check('改成每天 30 个后，背单词页同步为 / 30', () => {
  click('word-plan', { field: 'newTotal', value: '30' })
  if (G.state.goals.words !== 30) throw new Error(`goals.words=${G.state.goals.words}`)
  go('words')
  if (!html().includes('<strong>0</strong> / 30 个')) throw new Error('新词总数没跟着变')
  click('word-plan', { field: 'newTotal', value: '20' })
  return true
})

console.log('\n【计划设定：自定义数量 + 不弹轻提示】')
check('两张卡都带「自定义」入口', () => {
  go('word-plan')
  const h = html()
  const custom = h.match(/data-action="word-plan-custom"/g) || []
  if (custom.length !== 2) throw new Error(`自定义入口应有 2 个（新词 / 复习），实际 ${custom.length}`)
  if (!h.includes('每天复习多少个单词')) throw new Error('缺「每天复习多少个单词」卡')
  return true
})
check('点「自定义」展开输入框（带 5~200 范围提示）', () => {
  click('word-plan-custom', { field: 'newTotal' })
  const h = html()
  if (!h.includes('id="word-plan-newTotal-input"') && !h.includes('data-od-id="word-plan-newTotal-input"')) {
    throw new Error('没展开输入框')
  }
  if (!/min="5" max="200"/.test(h)) throw new Error('输入框没有 5~200 范围')
  if (!h.includes('确定')) throw new Error('没有「确定」按钮')
  return true
})
check('自定义值真的生效，且不被白名单打回默认', () => {
  G.setWordPlan('newTotal', 35)
  if (G.state.goals.words !== 35) throw new Error(`goals.words=${G.state.goals.words}`)
  go('words')
  if (!html().includes('<strong>0</strong> / 35 个')) throw new Error('背单词页没跟着变成 / 35')
  return true
})
check('超出范围会被夹到 5~200', () => {
  G.setWordPlan('reviewTotal', 999)
  if (G.state.goals.review !== 200) throw new Error(`上界没夹住：${G.state.goals.review}`)
  G.setWordPlan('reviewTotal', 1)
  if (G.state.goals.review !== 5) throw new Error(`下界没夹住：${G.state.goals.review}`)
  G.setWordPlan('reviewTotal', 30)
  return true
})
check('设置时不再弹轻提示', () => {
  const toast = getEl('toast')
  toast.hidden = true
  G.setWordPlan('newTotal', 40)
  if (!toast.hidden) throw new Error('又弹轻提示了')
  if (/setWordPlan[\s\S]{0,400}showToast/.test(src)) throw new Error('setWordPlan 里还留着 showToast')
  G.setWordPlan('newTotal', 20)
  return true
})
check('自定义数量走表单提交（回车也能确定）', () => {
  if (!/data-plan-field="\$\{field\}"/.test(src)) throw new Error('表单没有 data-plan-field')
  if (!/dataset\.planField/.test(src)) throw new Error('submit 监听没处理自定义表单')
  return true
})

console.log('\n【学习一个词之后的计数】')
check('新词计入「今日新词」，按钮变「继续学习」', () => {
  Object.keys(G.state.answered).forEach((k) => delete G.state.answered[k])
  G.state.wordToday = { ...G.wordToday(), learned: 0, reviewed: 0 }
  G.reviewQueue = []
  G.navigate('words', false)
  G.startReview()
  click('grade', { value: 'familiar' })
  go('words')
  const h = html()
  if (!h.includes('<strong>1</strong> / 20 个')) throw new Error('今日新词没变成 1 / 20')
  if (!h.includes('继续学习 · 还剩 49 个')) throw new Error('按钮文案不对：' + h.match(/data-od-id="start-word-review">([^<]*)</)?.[1])
  return true
})
check('复习已学过的词计入「今日复习」', () => {
  G.state.answered[G.vocabulary[0].word] = 'fuzzy'
  G.state.wordToday.learned = 20
  G.state.wordToday.reviewed = 0
  G.reviewQueue = []
  G.startReview()
  if (G.reviewMode !== 'review') throw new Error(`组类型应为 review，实际 ${G.reviewMode}`)
  click('grade', { value: 'familiar' })
  go('words')
  if (!html().includes('<strong>1</strong> / 30 个')) throw new Error('今日复习没变成 1 / 30')
  return true
})

console.log('\n【数学模块：删掉「我的计划」】')
check('数学页没有「我的计划」入口', () => {
  go('math')
  const h = html()
  if (h.includes('我的计划')) throw new Error('数学页还有「我的计划」')
  if (h.includes('open-knowledge-plan')) throw new Error('还有 open-knowledge-plan 按钮')
  if (!h.includes('知识点讲解')) throw new Error('知识点列表标题丢了')
  return true
})
check('资料库页同样没有「我的计划」', () => {
  go('library')
  const h = html()
  if (h.includes('我的计划')) throw new Error('资料库页还有「我的计划」')
  return true
})
check('学习计划页本身还在（菜单仍可进）', () => {
  go('plan')
  if (!html().includes('data-od-id="learning-plan"') && !html().includes('plan-empty')) throw new Error('学习计划页渲染不出来')
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
