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

/* ── 政治刷题的测试夹具 ────────────────────────────────────────────────
 * 用 x4（肖四）第 1 套：38 题 = 16 单选 / 17 多选 / 5 材料。
 * 为什么不用 x8：那 8 套共 304 题里有 103 题选项/答案还没录完（源 PDF 待补），
 *   拿它做夹具会把「数据缺口」误报成「代码坏了」。
 * 为什么没有「考纲模块」：该来源已从 UI 移除（只留 4套卷 / 8套卷）。
 */
const PAPER_SOURCE = 'x4'
const PAPER_SET = 'x4-1'
const setQuestions = () => G.X4_QUESTIONS.filter((q) => q.paper === PAPER_SET)

/** 把刷题状态摆到指定路由并渲染。route='quiz' 时是「选卷那一屏」（quizModule 置空）。 */
function gotoSrc(route, { cursor = 0 } = {}) {
  G.quizSource = PAPER_SOURCE
  G.quizModule = route === 'quiz' ? '' : PAPER_SET
  G.quizCursor = cursor
  G.quizRevealed = false
  G.quizPicked = ''
  G.navigate(route, false)
  G.render()
}

/** 清空历史，让 goBack 的行为可预测 */
function resetHistory() {
  G.historyStack.length = 0
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
check('资料库选中政治 → 渲染题库首页', () => {
  const i = findSubjectIndex('politics')
  G.navigate('library', false)
  G.subjectIndex = i
  G.quizModule = ''
  G.render()
  const h = html()
  if (!h.includes('politics-quiz-home')) throw new Error('没走到 politics-quiz-home')
  if (!h.includes('先刷题')) throw new Error('缺少刷题标题文案')
  return true
})
// ↓ 这条是本次改动的核心约束：题干一旦出现在资料库，主包就必须带上全部题干
check('政治首页只画索引信息，一行题干都没有', () => {
  gotoSrc('quiz')
  const h = html()
  if (h.includes('data-qid=')) throw new Error('资料库政治里出现了题目行 → 题干会被迫进主包')
  if (h.includes('quiz-list')) throw new Error('出现了题目列表容器')
  if (!h.includes('paper-grid')) throw new Error('缺套卷卡片网格')
  return true
})
check('来源切换只有 4套卷 / 8套卷（考纲模块已移除）', () => {
  const h = html()
  if (!h.includes('data-od-id="src-x4"') || !h.includes('data-od-id="src-x8"')) {
    throw new Error('缺 4套卷 / 8套卷 来源切换')
  }
  if (h.includes('src-syllabus') || h.includes('考纲模块')) throw new Error('「考纲模块」来源还在')
  if (h.includes('data-action="quiz-module"')) throw new Error('模块筛选 chip 还在')
  return true
})
check('套卷卡片列出每一套，带进度文案', () => {
  const h = html()
  const n = (h.match(/data-action="quiz-paper"/g) || []).length
  if (n !== 4) throw new Error(`4套卷应有 4 张卡，实际 ${n}`)
  if (!h.includes('第 1 套') || !h.includes('第 4 套')) throw new Error('卡片文案缺「第 N 套」')
  if (!h.includes('2026 肖秀荣《4套卷》')) throw new Error('卡片缺书名')
  if (!h.includes('尚未开始')) throw new Error('卡片缺进度文案')
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

console.log('\n=== 3. 数学：仍是知识点列表 + 学科切换是胶囊 tab ===')
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
// 用户口径：数学的三个学科改用与政治「4套卷 / 8套卷」同款的胶囊 tab，标题用全称
check('数学学科切换是胶囊 tab，标题为 高等数学 / 线性代数 / 概率论', () => {
  G.navigate('math', false)
  G.subjectIndex = findSubjectIndex('calculus')
  G.render()
  const h = html()
  if (h.includes('subject-tabs')) throw new Error('数学页还在用下划线 tab')
  if (!/<div class="src-switch"[^>]*data-od-id="subject-switch"/.test(h)) throw new Error('缺胶囊 tab 容器')
  const labels = [...h.matchAll(/class="src-chip[^"]*">([^<]*)</g)].map((m) => m[1])
  if (labels.join('|') !== '高等数学|线性代数|概率论') throw new Error(`标签实际为 ${labels.join('|')}`)
  return true
})
check('资料库的学科切换没被换成胶囊（仍是下划线 tab）', () => {
  G.navigate('library', false)
  G.render()
  const h = html()
  if (!/<div class="subject-tabs[^"]*"[^>]*data-od-id="subject-switch"/.test(h)) {
    throw new Error('资料库学科切换不是下划线 tab')
  }
  return true
})
check('胶囊控件的样式在样式表里（数学与政治共用同一套）', () => {
  for (const sel of ['.src-switch', '.src-chip']) {
    if (!new RegExp(`\\${sel}\\s*\\{`).test(CSS)) throw new Error(`样式表缺 ${sel}`)
  }
  return true
})

console.log('\n=== 4. 选择题作答流程（夹具：肖四第 1 套）===')
check('打开选择题渲染选项与提交按钮', () => {
  const q = setQuestions().find((x) => x.type === 'choice')
  gotoSrc('quiz-question', { cursor: G.quizPool().findIndex((x) => x.id === q.id) })
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
  const q = setQuestions().find((x) => x.type === 'choice')
  // 必须走真实的点选：quizPicked 是**数组**，直接赋字符串会被 submit 里的
  // Array.isArray 守卫清空、静默 return（这个坑让旧断言假通过了一轮）
  const wrong = q.options.find((o) => o.key !== q.answerKey).key
  sandbox.handleAction('quiz-pick', { dataset: { key: wrong } })
  if (!Array.isArray(G.quizPicked) || G.quizPicked[0] !== wrong) {
    throw new Error(`点选后 quizPicked 应是 ["${wrong}"]，实际 ${JSON.stringify(G.quizPicked)}`)
  }
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
  const q = setQuestions().filter((x) => x.type === 'choice')[1]
  gotoSrc('quiz-question', { cursor: G.quizPool().findIndex((x) => x.id === q.id) })
  sandbox.handleAction('quiz-pick', { dataset: { key: q.answerKey } })
  sandbox.handleAction('quiz-submit', { dataset: { qid: q.id } })
  const ans = G.state.quizAnswers[q.id]
  if (!ans || !ans.correct) throw new Error('对答没记成正确')
  return true
})
check('多选题逐个点选后提交，全对判对', () => {
  const q = setQuestions().find((x) => x.type === 'multi')
  gotoSrc('quiz-question', { cursor: G.quizPool().findIndex((x) => x.id === q.id) })
  const keys = String(q.answerKey).split('')
  for (const k of keys) sandbox.handleAction('quiz-pick', { dataset: { key: k } })
  if (G.quizPicked.length !== keys.length) {
    throw new Error(`应选中 ${keys.length} 项，实际 ${G.quizPicked.length}`)
  }
  sandbox.handleAction('quiz-submit', { dataset: { qid: q.id } })
  const ans = G.state.quizAnswers[q.id]
  if (!ans || !ans.correct) throw new Error('多选全对没记成正确')
  if (ans.picked !== keys.sort().join('')) throw new Error(`picked 应为排序后的串，实际 ${ans.picked}`)
  return true
})
check('重复提交不会覆盖已有记录', () => {
  const q = setQuestions().find((x) => x.type === 'multi')
  const before = JSON.stringify(G.state.quizAnswers[q.id])
  sandbox.handleAction('quiz-submit', { dataset: { qid: q.id } })
  if (JSON.stringify(G.state.quizAnswers[q.id]) !== before) throw new Error('二次提交改动了记录')
  return true
})

console.log('\n=== 5. 材料题流程 ===')
check('材料题渲染材料段落', () => {
  const q = setQuestions().find((x) => x.type === 'material')
  gotoSrc('quiz-question', { cursor: G.quizPool().findIndex((x) => x.id === q.id) })
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
check('点击查看 → 展开采分点区块', () => {
  const q = setQuestions().find((x) => x.type === 'material')
  sandbox.handleAction('quiz-show', { dataset: {} })
  const h = html()
  if (!h.includes('quiz-answer-points')) throw new Error('缺答案区块')
  // 原型这套卷的材料题暂时没有 answerPoints（源数据缺口），此时应给出「转档缺失」说明，
  // 而不是留一片空白——两种形态都算通过，但不能既不显示采分点也不给说明。
  const hasPoints = (q.answerPoints || []).length > 0
  if (hasPoints) {
    for (const p of q.answerPoints) {
      if (!h.includes(p.slice(0, 12))) throw new Error(`缺采分点: ${p.slice(0, 20)}`)
    }
  } else if (!h.includes('参考答案转档缺失')) {
    throw new Error('没有采分点，也没给出「转档缺失」说明')
  }
  return true
})

console.log('\n=== 6. 来源切换（4套卷 / 8套卷）===')
check('切到 8套卷 → 8 张套卷卡', () => {
  gotoSrc('quiz')
  sandbox.handleAction('quiz-source', { dataset: { source: 'x8' } })
  const h = html()
  const n = (h.match(/data-action="quiz-paper"/g) || []).length
  if (n !== 8) throw new Error(`8套卷应有 8 张卡，实际 ${n}`)
  if (!h.includes('第 8 套')) throw new Error('缺「第 8 套」')
  return true
})
check('切来源会清掉已选套卷（不会带着上一来源的卷号）', () => {
  if (G.quizModule !== '') throw new Error(`换来源后 quizModule 应为空，实际 ${G.quizModule}`)
  return true
})
check('切回 4套卷 → 4 张卡，题池是 X4', () => {
  sandbox.handleAction('quiz-source', { dataset: { source: 'x4' } })
  const h = html()
  const n = (h.match(/data-action="quiz-paper"/g) || []).length
  if (n !== 4) throw new Error(`4套卷应有 4 张卡，实际 ${n}`)
  if (G.quizPool().length !== G.X4_QUESTIONS.length) throw new Error('题池不是 X4 全集')
  return true
})
check('未选卷时题池是整个来源（详情页兜底用）', () => {
  if (G.paperSelected()) throw new Error('没选卷却判为已选卷')
  if (G.quizPool().length !== G.X4_QUESTIONS.length) throw new Error('题池口径不对')
  return true
})

console.log('\n=== 7. 结果页 ===')
check('渲染结果页并统计正确率', () => {
  gotoSrc('quiz-result')
  const h = html()
  if (!h.includes('politics-quiz-result')) throw new Error('没渲染结果页')
  const pool = setQuestions()
  const done = pool.filter((q) => G.state.quizAnswers[q.id]).length
  const correct = pool.filter((q) => G.state.quizAnswers[q.id] && G.state.quizAnswers[q.id].correct).length
  if (!h.includes(`已练习 ${done} / ${pool.length} 题`)) throw new Error('缺练习进度文案')
  if (!h.includes(`${correct}`)) throw new Error('缺答对数')
  return true
})
check('结果页标题带套卷名（不再是「这一组」）', () => {
  const h = html()
  if (!h.includes('4套卷第1套')) throw new Error('结果页没标出是哪一套')
  if (h.includes('这一组')) throw new Error('还在用「这一组」这种旧口径文案')
  return true
})
check('错题出现在「值得再看一遍」', () => {
  gotoSrc('quiz-result')
  const h = html()
  const wrong = setQuestions().filter((q) => G.state.quizAnswers[q.id] && !G.state.quizAnswers[q.id].correct)
  if (!wrong.length) throw new Error('夹具里没有错题，这条断言失去意义')
  for (const q of wrong) {
    if (!h.includes(`data-qid="${q.id}"`)) throw new Error(`错题 ${q.id} 没出现`)
  }
  return true
})

console.log('\n=== 8. 路由与标题 ===')
for (const [route, title] of [
  ['quiz', '政治题库'],
  ['quiz-paper', '卷内题目'],
  ['quiz-question', '答题'],
  ['quiz-result', '练习结果'],
]) {
  check(`路由 ${route} 有标题「${title}」`, () => {
    gotoSrc(route)
    const brand = getEl('app-brand')
    if (!brand.innerHTML.includes(title)) throw new Error(`标题里没有「${title}」`)
    return true
  })
}
check('刷题路由高亮资料库 tab', () => {
  gotoSrc('quiz')
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

console.log('\n=== 10. 核心：点套卷卡 → 跳独立详情页（题干只在详情页）===')
check('点套卷卡 → 路由变成 quiz-paper', () => {
  resetHistory()
  gotoSrc('quiz')
  sandbox.handleAction('quiz-paper', { dataset: { paper: PAPER_SET } })
  if (G.route !== 'quiz-paper') throw new Error(`路由应变成 quiz-paper，实际 ${G.route}`)
  if (G.quizModule !== PAPER_SET) throw new Error(`quizModule 应为 ${PAPER_SET}，实际 ${G.quizModule}`)
  return true
})
check('详情页列出该套全部题目（含题干）', () => {
  const h = html()
  if (!h.includes('politics-paper-set')) throw new Error('没渲染卷详情页')
  for (const q of setQuestions()) {
    if (!h.includes(`data-qid="${q.id}"`)) throw new Error(`缺 ${q.id}`)
    if (!h.includes(q.stem.slice(0, 12))) throw new Error(`缺 ${q.id} 的题干`)
  }
  return true
})
check('详情页只有本套题目，不混入别套', () => {
  const h = html()
  for (const q of G.X4_QUESTIONS.filter((x) => x.paper !== PAPER_SET)) {
    if (h.includes(`data-qid="${q.id}"`)) throw new Error(`混入了别套的 ${q.id}`)
  }
  return true
})
check('详情页有进度卡与整卷开始按钮（文案跟进度一致）', () => {
  const h = html()
  if (!h.includes('paper-progress')) throw new Error('缺进度卡')
  if (!h.includes('data-action="quiz-start"')) throw new Error('缺整卷开始按钮')
  // 不写死文案：前面的用例已经答过几题，这里按真实进度取期望值
  const st = G.paperStats(PAPER_SET)
  const want = st.done ? '继续练习本套' : '从头开始本套'
  if (!h.includes(want)) throw new Error(`进度 ${st.done}/${st.total}，按钮应是「${want}」`)
  return true
})
check('详情页的行状态：材料题答过记「已读参考答案」，不会算成答错了', () => {
  const mat = setQuestions().find((x) => x.type === 'material')
  const choice = setQuestions().find((x) => x.type === 'choice')
  G.state.quizAnswers[mat.id] = { picked: '', correct: false }
  G.state.quizAnswers[choice.id] = { picked: 'Z', correct: false }
  const h = G.quizPaperSetPage()
  const rowOf = (id) => h.split('<button ').find((s) => s.includes(`data-qid="${id}"`)) || ''
  const mr = rowOf(mat.id)
  if (!mr.startsWith('class="quiz-row ok"')) throw new Error(`材料题应是 ok 底色，实际 ${mr.slice(0, 40)}`)
  if (!mr.includes('已读参考答案')) throw new Error('材料题没标「已读参考答案」')
  // 材料题没有对错：标成红描边「答错了」是原型曾经的缺陷，别改回来
  if (mr.includes('答错了')) throw new Error('材料题被标成答错了')
  const cr = rowOf(choice.id)
  if (!cr.startsWith('class="quiz-row bad"')) throw new Error(`答错的选择题应是 bad 描边，实际 ${cr.slice(0, 40)}`)
  if (!cr.includes('答错了')) throw new Error('答错的选择题没标「答错了」')
  delete G.state.quizAnswers[mat.id]
  delete G.state.quizAnswers[choice.id]
  return true
})
check('资料库那边仍然一行题都没有（独立页面才装题干）', () => {
  const i = findSubjectIndex('politics')
  G.navigate('library', false)
  G.subjectIndex = i
  G.render()
  if (html().includes('data-qid=')) throw new Error('资料库渲染出了题目行')
  return true
})

console.log('\n=== 11. 换一套卷 / 返回题库 ===')
check('「换一套卷」→ 回到选卷那一屏，且不再列题目', () => {
  resetHistory()
  gotoSrc('quiz')
  sandbox.handleAction('quiz-paper', { dataset: { paper: PAPER_SET } })
  sandbox.handleAction('quiz-paper-back', { dataset: {} })
  if (G.route !== 'quiz') throw new Error(`应回到 quiz，实际 ${G.route}`)
  if (G.quizModule !== '') throw new Error('换一套卷后 quizModule 应清空')
  const h = html()
  if (h.includes('data-qid=')) throw new Error('回到的页面仍在列题目')
  if (!h.includes('paper-grid')) throw new Error('没回到套卷卡片网格')
  return true
})
check('详情页点某题 → 进答题页，渲染的就是被点的那一题', () => {
  resetHistory()
  gotoSrc('quiz')
  sandbox.handleAction('quiz-paper', { dataset: { paper: PAPER_SET } })
  const q = setQuestions()[3]
  sandbox.handleAction('quiz-open', { dataset: { qid: q.id } })
  if (G.route !== 'quiz-question') throw new Error(`应进答题页，实际 ${G.route}`)
  if (!html().includes(q.stem.slice(0, 12))) throw new Error('答题页不是被点的那一题')
  return true
})
check('答题页「返回题库」→ 回到本套详情页', () => {
  sandbox.handleAction('quiz-back', { dataset: {} })
  if (G.route !== 'quiz-paper') throw new Error(`应回到 quiz-paper，实际 ${G.route}`)
  if (!html().includes('politics-paper-set')) throw new Error('没回到卷详情页')
  return true
})
check('详情页「整卷开始」→ 从第 1 题起答', () => {
  resetHistory()
  gotoSrc('quiz')
  sandbox.handleAction('quiz-paper', { dataset: { paper: PAPER_SET } })
  sandbox.handleAction('quiz-start', { dataset: {} })
  if (G.route !== 'quiz-question') throw new Error('没进答题页')
  if (G.quizCursor !== 0) throw new Error(`游标应从 0 起，实际 ${G.quizCursor}`)
  if (!html().includes(setQuestions()[0].stem.slice(0, 12))) throw new Error('不是从第 1 题开始')
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
  // 分母是套卷总量（456）——「考纲模块」那 6 道种子题已不在 UI 里，不计入
  const total = G.ALL_PAPER_QUESTIONS.length
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
/** 把光标移到本套里指定题型的某一题并渲染 */
function gotoQuestion(type) {
  const q = setQuestions().find((x) => x.type === type)
  gotoSrc('quiz-question', { cursor: G.quizPool().findIndex((x) => x.id === q.id) })
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
  const q = setQuestions().find((x) => x.type === 'material')
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
