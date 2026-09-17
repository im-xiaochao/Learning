/**
 * 设计稿 harness：在桩 DOM 里跑一遍所有路由 + 政治刷题交互。
 *
 * 用法：node tools/_od-harness.mjs <抽出的 script.js>
 *
 * 为什么不用浏览器：这个 harness 一次能覆盖所有路由、所有学科、搜索、空态和
 * 完整的答题流程，比截图快得多，也更容易断言。
 */
import fs from 'node:fs'
import vm from 'node:vm'

const src = fs.readFileSync(process.argv[2], 'utf8')

/* ── 桩 DOM ───────────────────────────────────────────────────────── */
// getElementById 必须按 id 缓存同一个元素对象，否则读不到 render() 写进去的 innerHTML
const elements = new Map()
function makeEl(id) {
  return {
    id,
    innerHTML: '',
    className: '',
    textContent: '',
    hidden: false,
    scrollTop: 0,
    dataset: {},
    style: {},
    setAttribute() {},
    getAttribute() { return null },
    hasAttribute() { return false },
    querySelectorAll() { return [] },
    querySelector() { return null },
    appendChild() {},
    addEventListener() {},
    classList: { add() {}, remove() {}, contains() { return false } },
  }
}
function getEl(id) {
  if (!elements.has(id)) elements.set(id, makeEl(id))
  return elements.get(id)
}

const store = new Map()
const document = {
  getElementById: getEl,
  querySelectorAll: () => [],
  // 设计稿启动时会写 document.querySelector('[data-action="menu"]').innerHTML，
  // 返回一个桩元素而不是 null，否则初始化就抛
  querySelector: () => makeEl('stub-query'),
  addEventListener() {},
  activeElement: null,
  body: makeEl('body'),
}
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}

const sandbox = {
  document,
  localStorage,
  window: { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) },
  console,
  setTimeout: (fn) => fn && 0,
  clearTimeout() {},
  Date,
  Math,
  JSON,
  Number,
  String,
  Array,
  Object,
  Boolean,
  RegExp,
  Error,
  isNaN,
  parseInt,
  parseFloat,
  encodeURIComponent,
  decodeURIComponent,
}
sandbox.globalThis = sandbox
vm.createContext(sandbox)
vm.runInContext(src, sandbox, { filename: 'design.js' })

/** 设计稿脚本末尾挂上来的顶层绑定集合（const 不挂 global） */
const T = sandbox.__T__
if (!T) throw new Error('设计稿脚本没有导出 __T__，检查 harness 注入的导出层')

/**
 * 样式表：脚本文件里没有 CSS，但层级改动（.sub-group 的竖线）必须验。
 * 约定：如果同目录存在同名 .html（sub-check.js → sub-check.html），就读它的 <style>。
 * 读不到就跳过那条断言，而不是误报失败。
 */
let CSS = ''
{
  const htmlPath = process.argv[2].replace(/\.js$/, '.html')
  if (fs.existsSync(htmlPath)) {
    const m = fs.readFileSync(htmlPath, 'utf8').match(/<style>([\s\S]*?)<\/style>/)
    if (m) CSS = m[1]
  }
}
sandbox.__CSS__ = CSS
console.log(`（样式表：${CSS ? `已加载 ${CSS.length} 字符` : '未找到同名 .html，CSS 断言将跳过'}）`)

/* ── 断言工具 ─────────────────────────────────────────────────────── */
let pass = 0
let fail = 0
const failures = []

function check(label, fn) {
  try {
    const r = fn()
    if (r === false) throw new Error('返回 false')
    pass++
    console.log(`  ✅ ${label}`)
  } catch (e) {
    fail++
    failures.push(`${label} → ${e.message}`)
    console.log(`  ❌ ${label} → ${e.message}`)
  }
}

const G = T
const main = getEl('content')

/** 切到某 tab + 学科下标，再渲染 */
function go(tab, subjectIdx) {
  G.navigate(tab, false)
  if (typeof subjectIdx === 'number') {
    G.subjectIndex = subjectIdx
    G.render()
  }
}

function html() {
  return main.innerHTML
}

function findSubjectIndex(id) {
  return G.subjects.findIndex((s) => s.id === id)
}

/* ── 用例 ─────────────────────────────────────────────────────────── */
console.log('\n=== 1. 所有 tab 能渲染 ===')
for (const tab of ['home', 'words', 'math', 'library', 'my']) {
  check(`tab=${tab} 渲染非空`, () => {
    G.navigate(tab, false)
    const h = html()
    if (!h || h.length < 100) throw new Error(`内容过短 ${h.length}`)
    return true
  })
}

console.log('\n=== 2. 资料库：政治走刷题，其余走知识点 ===')
check('政治学科被标记 quiz', () => {
  const i = findSubjectIndex('politics')
  if (i < 0) throw new Error('找不到 politics 学科')
  if (!G.subjects[i].quiz) throw new Error('politics.quiz 不为真')
  return true
})
check('政治 topics 已清空', () => {
  const i = findSubjectIndex('politics')
  if (G.subjects[i].topics.length !== 0) throw new Error(`topics 还有 ${G.subjects[i].topics.length} 项`)
  return true
})
check('资料库选中政治 → 渲染题库页', () => {
  const i = findSubjectIndex('politics')
  G.navigate('library', false)
  G.subjectIndex = i
  G.render()
  const h = html()
  if (!h.includes('politics-quiz-home')) throw new Error('没走到 politics-quiz-home')
  if (!h.includes('先刷题')) throw new Error('缺少刷题标题文案')
  return true
})
check('政治题库页列出全部题目', () => {
  const h = html()
  for (const q of G.politicsQuestions) {
    if (!h.includes(`data-qid="${q.id}"`)) throw new Error(`列表缺 ${q.id}`)
  }
  return true
})
for (const cid of ['cs-coa', 'cs-os', 'cs-ds', 'cs-net']) {
  check(`资料库 ${cid} 仍是知识点空态`, () => {
    const i = findSubjectIndex(cid)
    if (i < 0) throw new Error('找不到学科')
    G.navigate('library', false)
    G.subjectIndex = i
    G.render()
    const h = html()
    if (h.includes('politics-quiz-home')) throw new Error('错误地渲染成题库页')
    if (!h.includes('knowledge-empty')) throw new Error('没有渲染空态')
    return true
  })
}

console.log('\n=== 3. 数学不受影响 ===')
for (const mid of ['calculus', 'algebra', 'probability']) {
  check(`数学 ${mid} 仍是知识点列表`, () => {
    const i = findSubjectIndex(mid)
    G.navigate('math', false)
    G.subjectIndex = i
    G.render()
    const h = html()
    if (h.includes('politics-quiz-home')) throw new Error('错误地渲染成题库页')
    if (!h.includes('knowledge-list')) throw new Error('没有渲染知识点列表')
    return true
  })
}

console.log('\n=== 4. 选择题作答流程 ===')
check('打开选择题渲染选项与提交按钮', () => {
  const q = G.politicsQuestions.find((x) => x.type === 'choice')
  G.quizModule = 'all'
  G.quizCursor = G.quizPool().findIndex((x) => x.id === q.id)
  G.quizRevealed = false
  G.quizPicked = ''
  G.navigate('quiz-question', false)
  G.render()
  const h = html()
  if (!h.includes('politics-question')) throw new Error('没渲染答题页')
  for (const o of q.options) if (!h.includes(`data-key="${o.key}"`)) throw new Error(`缺选项 ${o.key}`)
  if (!h.includes('quiz-submit')) throw new Error('缺提交按钮')
  return true
})
check('未选选项时提交按钮 disabled', () => {
  const h = html()
  if (!/data-action="quiz-submit"[^>]*disabled/.test(h)) throw new Error('提交按钮没禁用')
  return true
})
check('选错 → 判错并显示正确答案与解析', () => {
  const q = G.politicsQuestions.find((x) => x.type === 'choice')
  const wrong = q.options.find((o) => o.key !== q.answerKey).key
  G.quizPicked = wrong
  G.render()
  sandbox.handleAction('quiz-submit', { dataset: { qid: q.id } })
  const h = html()
  const ans = G.state.quizAnswers[q.id]
  if (!ans) throw new Error('没写入答题记录')
  if (ans.correct) throw new Error('错答被记成正确')
  if (!h.includes(`正确答案是 ${q.answerKey}`)) throw new Error('没显示正确答案')
  if (!h.includes(q.explanation.slice(0, 12))) throw new Error('没显示解析')
  return true
})
check('选对 → 判对', () => {
  const q = G.politicsQuestions.filter((x) => x.type === 'choice')[1]
  G.quizPicked = q.answerKey
  G.quizRevealed = false
  G.navigate('quiz-question', false)
  G.render()
  // 直接把游标对到该题
  const pool = G.quizPool()
  G.quizCursor = pool.findIndex((x) => x.id === q.id)
  G.quizPicked = q.answerKey
  G.render()
  sandbox.handleAction('quiz-submit', { dataset: { qid: q.id } })
  const ans = G.state.quizAnswers[q.id]
  if (!ans || !ans.correct) throw new Error('对答没记成正确')
  return true
})

console.log('\n=== 5. 材料题流程 ===')
check('材料题渲染材料段落', () => {
  const q = G.politicsQuestions.find((x) => x.type === 'material')
  const pool = G.quizPool()
  G.quizCursor = pool.findIndex((x) => x.id === q.id)
  G.quizRevealed = false
  G.navigate('quiz-question', false)
  G.render()
  const h = html()
  if (!h.includes('quiz-material')) throw new Error('缺材料区块')
  if (!h.includes(q.material.paragraphs[0].slice(0, 10))) throw new Error('缺材料正文')
  if (h.includes('quiz-options')) throw new Error('材料题不该有选项')
  return true
})
check('材料题有查看参考答案按钮，且没揭示时不显示答案', () => {
  const h = html()
  if (!h.includes('data-action="quiz-show"')) throw new Error('缺查看答案按钮')
  if (h.includes('采分点')) throw new Error('未点击就显示了答案')
  return true
})
check('点击查看 → 显示全部采分点', () => {
  const q = G.politicsQuestions.find((x) => x.type === 'material')
  sandbox.handleAction('quiz-show', { dataset: {} })
  const h = html()
  if (!h.includes('quiz-answer-points')) throw new Error('缺答案区块')
  for (const p of q.answerPoints) {
    if (!h.includes(p.slice(0, 12))) throw new Error(`缺采分点: ${p.slice(0, 20)}`)
  }
  return true
})

console.log('\n=== 6. 模块筛选 ===')
check('按模块筛选后题目数正确', () => {
  const m = '思想道德与法治'
  G.quizModule = m
  const pool = G.quizPool()
  const expect = G.politicsQuestions.filter((q) => q.module === m).length
  if (pool.length !== expect) throw new Error(`期望 ${expect}，实际 ${pool.length}`)
  return true
})
check('筛选后列表只含该模块', () => {
  G.navigate('quiz', false)
  G.render()
  const h = html()
  for (const q of G.politicsQuestions) {
    const should = q.module === G.quizModule
    const has = h.includes(`data-qid="${q.id}"`)
    if (should && !has) throw new Error(`缺 ${q.id}`)
    if (!should && has) throw new Error(`不该出现 ${q.id}`)
  }
  return true
})
check('恢复全部', () => {
  G.quizModule = 'all'
  if (G.quizPool().length !== G.politicsQuestions.length) throw new Error('全部筛选数量不对')
  return true
})

console.log('\n=== 7. 结果页 ===')
check('渲染结果页并统计正确率', () => {
  G.navigate('quiz-result', false)
  G.render()
  const h = html()
  if (!h.includes('politics-quiz-result')) throw new Error('没渲染结果页')
  const done = G.quizDoneCount()
  const correct = G.quizCorrectCount()
  if (!h.includes(`${correct}`)) throw new Error('缺答对数')
  if (!h.includes(`已练习 ${done} / ${G.politicsQuestions.length} 题`)) throw new Error('缺练习进度文案')
  return true
})
check('错题出现在「值得再看一遍」', () => {
  G.navigate('quiz-result', false)
  G.render()
  const h = html()
  const wrong = G.politicsQuestions.filter((q) => G.state.quizAnswers[q.id] && !G.state.quizAnswers[q.id].correct)
  for (const q of wrong) {
    if (!h.includes(`data-qid="${q.id}"`)) throw new Error(`错题 ${q.id} 没出现`)
  }
  return true
})

console.log('\n=== 8. 路由与标题 ===')
for (const [route, title] of [['quiz', '政治题库'], ['quiz-question', '答题'], ['quiz-result', '练习结果']]) {
  check(`路由 ${route} 有标题「${title}」`, () => {
    G.navigate(route, false)
    const brand = getEl('app-brand')
    if (!brand.innerHTML.includes(title)) throw new Error(`标题里没有「${title}」`)
    return true
  })
}
check('刷题路由高亮资料库 tab', () => {
  G.navigate('quiz', false)
  const bar = getEl('tabbar').innerHTML
  if (!/class="tab active"[^>]*data-route="library"/.test(bar) && !/data-route="library"[^>]*active/.test(bar)) {
    throw new Error('library tab 未高亮')
  }
  return true
})

console.log('\n=== 9. 首页「接着上次学」政治分支 ===')
check('政治 lastTopic 时卡片指向题库', () => {
  G.state.lastTopic = 'politics-0'
  G.navigate('home', false)
  G.render()
  const h = html()
  if (!h.includes('data-action="quiz"')) throw new Error('recent-card 没指向 quiz')
  return true
})

console.log('\n=== 10. 政治考纲模块的层级（二级分组，不能与学科平级） ===')
check('模块区被包在 .sub-group 里（表示从属于政治）', () => {
  G.navigate('quiz', false)
  const h = html()
  if (!h.includes('politics-module-group')) throw new Error('缺 sub-group 容器')
  // chip-row 必须在 sub-group 内部
  const g = h.indexOf('politics-module-group')
  const chips = h.indexOf('${', g) // 渲染后不存在模板串，退回找 class
  const chipRow = h.indexOf('chip-row', g)
  if (chipRow < 0) throw new Error('sub-group 里没有 chip-row')
  if (chipRow - g > 600) throw new Error('chip-row 离 sub-group 太远，可能不在内部')
  void chips
  return true
})
check('模块区有父级标签「政治 · 考纲模块」', () => {
  const h = html()
  if (!h.includes('sub-group-label')) throw new Error('缺 sub-group-label')
  if (!h.includes('考纲模块')) throw new Error('标签里没有「考纲模块」')
  return true
})
check('模块 chip 用二级样式 sub-chips（比学科 tab 轻）', () => {
  const h = html()
  if (!h.includes('sub-chips')) throw new Error('chip-row 没有 sub-chips 类')
  return true
})
check('页面有「上方切换学科，下面按模块筛题」的层级说明', () => {
  const h = html()
  if (!h.includes('politics-module-hint')) throw new Error('缺 hint-note')
  if (!h.includes('上方切换学科')) throw new Error('说明文案不对')
  return true
})
check('CSS 里 .sub-group 有左侧竖线（视觉层级）', () => {
  if (!CSS) return true // 没读到 html 就跳过，不误报
  if (!CSS.includes('.sub-group')) throw new Error('样式表里没有 .sub-group')
  if (!/\.sub-group\s*\{[^}]*border-left/s.test(CSS)) throw new Error('.sub-group 没有左边框')
  return true
})
check('政治模块的 chip 是二级样式，比学科 tab 字号小', () => {
  if (!CSS) return true
  const sub = CSS.match(/\.sub-chips\s+\.chip\s*\{[^}]*font-size:\s*([\d.]+)px/)
  const tab = CSS.match(/\.subject-tabs\s+button\s*\{[^}]*font-size:\s*([\d.]+)px/)
  if (!sub) throw new Error('没有 .sub-chips .chip 的字号规则')
  if (tab && Number(sub[1]) >= Number(tab[1])) {
    throw new Error(`二级 chip 字号(${sub[1]}) 应小于学科 tab(${tab[1]})`)
  }
  return true
})
check('学科清单是「政治 + 四门计算机课」5 项，考纲模块不在其中', () => {
  // 注意：刷题页会替换掉知识点列表，所以页面上没有 subject-tabs；
  // 学科 tab 由资料库路由外壳渲染。这里直接校验数据分层，比看 HTML 更本质。
  const library = G.LIBRARY_SUBJECT_IDS || G.librarySubjectIds
  if (!library) throw new Error('拿不到资料库学科清单')
  if (library.length !== 5) throw new Error(`资料库学科应为 5 个，实际 ${library.length}`)
  if (library[0] !== 'politics') throw new Error('政治应是资料库第一个学科')
  for (const m of G.POLITICS_MODULES) {
    if (library.includes(m)) throw new Error(`考纲模块 ${m} 混进了学科清单`)
  }
  return true
})
check('考纲模块清单是 5 项，且全部挂在政治下（不进学科层）', () => {
  if (G.POLITICS_MODULES.length !== 5) throw new Error(`考纲模块应为 5 项，实际 ${G.POLITICS_MODULES.length}`)
  // 刷题页里每个模块 chip 的 data-module 都应是政治模块之一
  G.navigate('quiz', false)
  const h = html()
  const mods = (h.match(/data-module="([^"]+)"/g) || []).map((s) => s.slice(13, -1))
  if (!mods.length) throw new Error('刷题页没有模块 chip')
  for (const m of mods) {
    if (m !== 'all' && !G.POLITICS_MODULES.includes(m)) throw new Error(`chip 里的 ${m} 不是政治考纲模块`)
  }
  return true
})
check('学科 tab 数量不受考纲模块影响（切到政治仍能定位到它）', () => {
  G.navigate('library', false)
  // 用 subjects 数组定位，设计稿里没有 getSubjectIndex 这个函数（早先写错了）
  const i = findSubjectIndex('politics')
  if (i < 0) throw new Error('学科清单里找不到 politics')
  G.subjectIndex = i
  G.render()
  // 政治走刷题页，页面里不应出现任何把考纲模块当学科的 data-od-id
  const h = html()
  for (const m of G.POLITICS_MODULES) {
    if (h.includes(`data-od-id="subject-${m}"`)) throw new Error(`考纲模块 ${m} 被当成了学科`)
  }
  return true
})

console.log('\n=== 11. 考纲模块名不能被截断 ===')
check('模块 chip 显示完整模块名，不做 slice 截断', () => {
  const i = findSubjectIndex('politics')
  G.subjectIndex = i
  G.navigate('quiz', false)
  G.render()
  // 只能在 **chip 那一小段** 里找模块名：模块名在题目行（${q.module}）里也会出现，
  // 全页 includes 会被题目行"洗白"，测不出 chip 被截断（这里踩过坑）。
  const chipRegion = html().match(/sub-chips[\s\S]{0,2400}/)
  if (!chipRegion) throw new Error('页面里找不到 .sub-chips 模块区')
  const longest = '毛泽东思想和中国特色社会主义理论体系'
  if (!chipRegion[0].includes(longest)) {
    throw new Error(`chip 区里没有完整的「${longest}」（可能被截断了）`)
  }
  // 反向：截断后的形态不应出现在 chip 区
  if (chipRegion[0].includes('毛泽东思想和…')) throw new Error('chip 区出现被截断的模块名')
  return true
})
check('源码里不再有 slice(0,6) 截断写法', () => {
  if (/\$\{m\.length>6\?m\.slice/.test(src)) throw new Error('仍然存在按长度截断模块名的写法')
  return true
})

console.log('\n=== 12. 刷题统计进首页 / 我的（与口径约定一致） ===')
check('首页有整行的「政治刷题」卡片', () => {
  G.navigate('home', false)
  const h = html()
  if (!h.includes('data-od-id="home-politics-card"')) throw new Error('缺 home-politics-card')
  if (!h.includes('政治刷题')) throw new Error('缺「政治刷题」标题')
  return true
})
check('首页刷题卡显示「已练 / 题库总量」并带进度条', () => {
  const h = html()
  const total = G.politicsQuestions.length
  if (!h.includes(`/ ${total} 题`)) throw new Error(`卡片没显示 / ${total} 题`)
  const card = h.match(/data-od-id="home-politics-card"[\s\S]{0,700}/)
  if (!card) throw new Error('取不到卡片片段')
  if (!card[0].includes('small-progress')) throw new Error('卡片里没有进度条')
  return true
})
check('刷题卡是整行（.study-card.wide 有 grid-column: 1 / -1）', () => {
  const rule = CSS.match(/\.study-card\.wide\s*\{[^}]*\}/)
  if (!rule) throw new Error('CSS 里没有 .study-card.wide')
  if (!/grid-column:\s*1\s*\/\s*-1/.test(rule[0])) throw new Error('没有 grid-column: 1 / -1')
  return true
})
check('刷题不算进今日目标：进度环与待办仍是两项', () => {
  // 反向断言：pct 仍除以 2、pending 仍只有两个来源，刷题不参与
  if (!/pct=Math\.round\(\(wc\/50\*100\+knowledgePct\)\/2\)/.test(src)) {
    throw new Error('今日进度环口径被改动（应仍为单词 + 知识点两项）')
  }
  if (!/pending=\(wc<50\?1:0\)\+\(state\.planned\.length\?1:0\)/.test(src)) {
    throw new Error('今日待办口径被改动（应仍为两项）')
  }
  return true
})
check('我的页统计格有「已练题目」', () => {
  G.navigate('my', false)
  const h = html()
  if (!h.includes('已练题目')) throw new Error('缺「已练题目」统计')
  if (!h.includes('已学习单词') || !h.includes('已阅读知识点')) throw new Error('原有两项统计被破坏')
  return true
})
check('我的页统计格改成三列', () => {
  const rule = CSS.match(/\.stats-grid\s*\{[^}]*\}/)
  if (!rule) throw new Error('CSS 里没有 .stats-grid')
  if (!/repeat\(3,/.test(rule[0])) throw new Error('stats-grid 不是三列')
  return true
})
check('我的页图表开关有「刷题」', () => {
  const h = html()
  if (!h.includes('data-od-id="chart-quiz"')) throw new Error('缺 chart-quiz 按钮')
  if (!h.includes('data-od-id="chart-words"') || !h.includes('data-od-id="chart-knowledge"')) {
    throw new Error('原有两个开关被破坏')
  }
  return true
})
check('切到刷题图表：渲染正常且文案是「道题」', () => {
  G.chartMode = 'quiz'
  G.render()
  const h = html()
  if (!h.includes('aria-label="最近七天刷题量')) throw new Error('图表 aria-label 没切到刷题')
  if (!/近 7 天共练习 \d+ 道题/.test(h)) throw new Error('图表文案没切到「练习 N 道题」')
  const bars = (h.match(/class="bar"/g) || []).length
  if (bars !== 7) throw new Error(`柱状图应有 7 根，实际 ${bars}`)
  return true
})
check('图表切回单词仍然正常（没被刷题分支弄坏）', () => {
  G.chartMode = 'words'
  G.render()
  const h = html()
  if (!h.includes('aria-label="最近七天单词学习量')) throw new Error('单词图表坏了')
  if (!/近 7 天共学习 \d+ 个单词/.test(h)) throw new Error('单词文案坏了')
  return true
})

console.log('\n=== 13. 材料题参考答案可以收起 ===')
/** 把光标移到指定题型的某一题并渲染 */
function gotoQuestion(type) {
  const q = G.politicsQuestions.find((x) => x.type === type)
  G.quizModule = 'all'
  const pool = G.quizPool()
  G.quizCursor = pool.findIndex((x) => x.id === q.id)
  G.quizRevealed = false
  G.quizPicked = ''
  G.navigate('quiz-question', false)
  G.render()
  return q
}

check('材料题未揭示：文案是「查看参考答案」，且不显示采分点', () => {
  gotoQuestion('material')
  const h = html()
  if (!h.includes('查看参考答案')) throw new Error('按钮文案不是「查看参考答案」')
  if (h.includes('隐藏参考答案')) throw new Error('未揭示就出现「隐藏参考答案」')
  if (h.includes('采分点')) throw new Error('未点击就显示了答案')
  return true
})
check('点一次 → 展开采分点，按钮变「隐藏参考答案」', () => {
  sandbox.handleAction('quiz-show', { dataset: {} })
  const h = html()
  if (!h.includes('quiz-answer-points')) throw new Error('没有展开答案区块')
  if (!h.includes('隐藏参考答案')) throw new Error('按钮没变成「隐藏参考答案」')
  return true
})
check('再点一次 → 收起答案，按钮变回「查看参考答案」', () => {
  sandbox.handleAction('quiz-show', { dataset: {} })
  const h = html()
  if (h.includes('quiz-answer-points')) throw new Error('答案没有收起')
  if (h.includes('采分点')) throw new Error('收起后仍显示采分点标题')
  if (!h.includes('查看参考答案')) throw new Error('按钮没变回「查看参考答案」')
  return true
})
check('收起不撤销「已读参考答案」记录（列表页标记仍在）', () => {
  const q = G.politicsQuestions.find((x) => x.type === 'material')
  if (!G.state.quizAnswers[q.id]) throw new Error('作答记录被清掉了')
  return true
})
check('可反复切换：第二次展开仍然正常', () => {
  sandbox.handleAction('quiz-show', { dataset: {} })
  if (!html().includes('quiz-answer-points')) throw new Error('第二次展开失败')
  sandbox.handleAction('quiz-show', { dataset: {} })
  if (html().includes('quiz-answer-points')) throw new Error('第二次收起失败')
  return true
})
check('选择题不受影响：展示结果，且没有收起按钮', () => {
  const q = gotoQuestion('choice')
  if (!G.state.quizAnswers[q.id]) G.state.quizAnswers[q.id] = { picked: q.answerKey, correct: true }
  G.render()
  const h = html()
  if (!h.includes('quiz-explanation')) throw new Error('选择题没展示解析')
  if (h.includes('data-action="quiz-show"')) throw new Error('选择题不该有收起按钮')
  if (h.includes('隐藏参考答案')) throw new Error('选择题不该出现「隐藏参考答案」')
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
