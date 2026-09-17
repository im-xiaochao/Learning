/**
 * 学科切换器专项台。
 *
 * 1) 资料库页选中政治时，学科 tab 必须仍在 —— 用户报过的 bug：政治分支整页提前
 *    return，把切换器吞掉了，资料库「只剩政治」、切不到四门计算机课。
 * 2) 数学页的学科切换必须是胶囊 tab（.src-switch/.src-chip），与政治卷的
 *    「4套卷 / 8套卷」同一套控件；资料库仍用下划线 tab（.subject-tabs）。
 *
 * 用法：node tools/_library-tabs-harness.mjs <.tmp-od/xxx.js>
 */
import fs from 'node:fs'
import vm from 'node:vm'

const src = fs.readFileSync(process.argv[2], 'utf8')

const elements = new Map()
function makeEl(id) {
  return {
    id, innerHTML: '', className: '', textContent: '', hidden: false, scrollTop: 0,
    scrollHeight: 0, clientHeight: 0, dataset: {}, style: {}, disabled: false,
    setAttribute() {}, getAttribute() { return null }, hasAttribute() { return false },
    querySelectorAll() { return [] }, querySelector() { return null },
    focus() {}, addEventListener() {}, removeEventListener() {}, closest() { return null },
    classList: { add() {}, remove() {}, contains() { return false }, toggle() {} },
  }
}
function getEl(id) {
  if (!elements.has(id)) elements.set(id, makeEl(id))
  return elements.get(id)
}
;['content', 'overlay', 'goal-save-status'].forEach(getEl)

const store = {}
const sandbox = {
  console, Math, JSON, Date, String, Number, Boolean, Array, Object, Map, Set,
  setTimeout, clearTimeout, setInterval, clearInterval,
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
  },
  document: {
    getElementById: getEl,
    querySelector: (sel) => makeEl(sel),
    querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    createElement: () => makeEl('x'),
    body: makeEl('body'), documentElement: makeEl('html'), activeElement: null,
  },
  window: { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) },
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  FormData: class { constructor() {} get() { return '' } },
  requestAnimationFrame: (f) => setTimeout(f, 0),
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  RegExp, Error, isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
}
sandbox.globalThis = sandbox
vm.createContext(sandbox)
vm.runInContext(src, sandbox, { filename: 'design.js' })

const T = sandbox.__T__
if (!T) throw new Error('没有 __T__ 导出层')
const G = T
const main = getEl('content')

let pass = 0, fail = 0
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

function findSubjectIndex(id) {
  return G.subjects.findIndex((s) => s.id === id)
}
function goLibrary(subjectId) {
  G.navigate('library', false)
  const i = findSubjectIndex(subjectId)
  if (i < 0) throw new Error(`找不到学科 ${subjectId}`)
  G.subjectIndex = i
  G.render()
  return main.innerHTML
}
function goMath(subjectId) {
  G.navigate('math', false)
  const i = findSubjectIndex(subjectId)
  if (i < 0) throw new Error(`找不到学科 ${subjectId}`)
  G.subjectIndex = i
  G.render()
  return main.innerHTML
}
/** 从渲染结果里抽出学科切换按钮：id → 按钮文字 */
function switchButtons(h) {
  return [...h.matchAll(/data-od-id="subject-([a-z-]+)" class="([^"]*)">([^<]*)</g)]
    .map((m) => ({ id: m[1], cls: m[2], label: m[3] }))
}

console.log('\n=== 资料库：选政治时学科 tab 必须还在（用户报的 bug） ===')
check('选中政治 → 学科 tab 容器仍渲染', () => {
  const h = goLibrary('politics')
  if (!h.includes('subject-tabs')) throw new Error('学科 tab 容器没了（政治分支把整页吞掉了）')
  return true
})
check('选中政治 → 五个学科按钮都在', () => {
  const h = goLibrary('politics')
  const ids = ['politics', 'cs-coa', 'cs-os', 'cs-ds', 'cs-net']
  const missing = ids.filter((id) => !h.includes(`data-od-id="subject-${id}"`))
  if (missing.length) throw new Error(`缺学科按钮: ${missing.join(', ')}`)
  return true
})
check('选中政治 → 政治按钮是选中态', () => {
  const h = goLibrary('politics')
  const m = h.match(/data-od-id="subject-politics"[^>]*/)
  if (!m) throw new Error('找不到政治按钮')
  // aria-selected / class active 任一体现选中即可
  const tag = h.slice(Math.max(0, h.indexOf('data-od-id="subject-politics"') - 260), h.indexOf('data-od-id="subject-politics"') + 40)
  if (!/active|aria-selected="true"/.test(tag)) throw new Error('政治按钮没有选中态')
  return true
})
check('选中政治 → 同时渲染刷题内容', () => {
  const h = goLibrary('politics')
  if (!h.includes('politics-quiz-home')) throw new Error('刷题内容没渲染')
  if (!h.includes('选择一套卷')) throw new Error('缺「选择一套卷」标题')
  if (!h.includes('paper-grid')) throw new Error('套卷卡片没渲染')
  // 反向：资料库里不该出现题干行 —— 题干属于独立详情页（quiz-paper）
  if (h.includes('data-qid=')) throw new Error('资料库里出现了题干行，题干会被迫进主包')
  return true
})

console.log('\n=== 能切走：四门计算机课可达 ===')
for (const id of ['cs-coa', 'cs-os', 'cs-ds', 'cs-net']) {
  check(`政治页里能点到 ${id} 的按钮（真的可点，不是靠改 state）`, () => {
    // 注意：不能只测「设了 subjectIndex 后能渲染」——那绕过了 UI。
    // 旧版有 bug 时这几条也会通过（直接改 state 当然渲染得出来）。
    // 必须断言：停在政治页时，目标学科的**按钮真的在 DOM 里**。
    const h = goLibrary('politics')
    if (!h.includes(`data-od-id="subject-${id}"`)) {
      throw new Error(`政治页里没有 ${id} 的学科按钮 → 用户点不到，切不走`)
    }
    return true
  })
}
check('停在政治页时，切到组成原理能正常渲染', () => {
  goLibrary('politics')
  const h = goLibrary('cs-coa')
  if (h.includes('按考纲模块练习')) throw new Error('还停在政治刷题页')
  return true
})

console.log('\n=== 政治页不该有搜索框（没有知识点可搜），其它学科要有 ===')
check('政治 → 无搜索框', () => {
  const h = goLibrary('politics')
  if (h.includes('knowledge-search')) throw new Error('政治页出现了搜索框')
  return true
})
check('组成原理 → 有搜索框', () => {
  const h = goLibrary('cs-coa')
  if (!h.includes('knowledge-search')) throw new Error('缺搜索框')
  return true
})

console.log('\n=== 不回归：数学 tab 不受影响 ===')
check('数学 tab 高数 → 有学科 tab，无刷题内容', () => {
  G.navigate('math', false)
  G.subjectIndex = findSubjectIndex('calculus')
  G.render()
  const h = main.innerHTML
  if (h.includes('按考纲模块练习')) throw new Error('数学页混进了刷题内容')
  return true
})

console.log('\n=== 数学学科切换：胶囊 tab（与政治 4套卷/8套卷 同款） ===')
check('数学页用 .src-switch 容器，不再是 .subject-tabs 下划线', () => {
  const h = goMath('calculus')
  if (!/<div class="src-switch"[^>]*data-od-id="subject-switch"/.test(h)) {
    throw new Error('缺胶囊 tab 容器（subject-switch）')
  }
  if (h.includes('subject-tabs')) throw new Error('数学页还在用下划线 tab')
  return true
})
check('三个 tab 依次是 高等数学 / 线性代数 / 概率论', () => {
  const h = goMath('calculus')
  const got = switchButtons(h).map((b) => `${b.id}:${b.label}`)
  const want = ['calculus:高等数学', 'algebra:线性代数', 'probability:概率论']
  if (got.join(' | ') !== want.join(' | ')) throw new Error(`实际 ${got.join(' | ')}`)
  return true
})
check('胶囊按钮只有学科名，不带题量小字（题量是政治来源切换的语义）', () => {
  const h = goMath('calculus')
  const chips = h.match(/<button[^>]*class="src-chip[^"]*"[^>]*>[^<]*<\/button>/g) || []
  if (chips.length !== 3) throw new Error(`应有 3 个胶囊按钮，实际 ${chips.length}`)
  for (const c of chips) if (c.includes('<small')) throw new Error(`胶囊里出现了 <small>：${c}`)
  return true
})
check('选中态跟着当前学科走（切到概率论 → 第三个 active）', () => {
  const h = goMath('probability')
  const on = switchButtons(h).filter((b) => /(^|\s)active(\s|$)/.test(b.cls))
  if (on.length !== 1) throw new Error(`应有且仅有一个选中项，实际 ${on.length}`)
  if (on[0].id !== 'probability') throw new Error(`选中项是 ${on[0].id}`)
  return true
})
check('点胶囊真的能切学科（走 handleAction，不是改 state）', () => {
  goMath('calculus')
  sandbox.handleAction('subject', { dataset: { value: '1' } })
  if (G.subjectIndex !== findSubjectIndex('algebra')) throw new Error('subjectIndex 没切到线性代数')
  const h = main.innerHTML
  const on = switchButtons(h).filter((b) => /(^|\s)active(\s|$)/.test(b.cls))
  if (on.length !== 1 || on[0].id !== 'algebra') throw new Error('渲染后选中态不是线性代数')
  if (!h.includes('矩阵与线性方程组')) throw new Error('没渲染线性代数的章节内容')
  return true
})
check('数学页不会混进政治的来源切换 / 套卷卡', () => {
  const h = goMath('calculus')
  if (h.includes('data-action="quiz-source"')) throw new Error('数学页出现了 4套卷/8套卷 来源切换')
  if (h.includes('paper-grid')) throw new Error('数学页出现了套卷卡')
  if (h.includes('politics-quiz-home')) throw new Error('数学页出现了刷题首页')
  return true
})
check('资料库不受影响：学科切换仍是 5 个下划线 tab', () => {
  const h = goLibrary('politics')
  // 注意：政治页里本来就有 .src-switch —— 那是题库的「4套卷/8套卷」来源切换，
  // 不是学科切换。所以这里锚定 subject-switch 这个 id，而不是按 class 找。
  if (!/<div class="subject-tabs[^"]*"[^>]*data-od-id="subject-switch"/.test(h)) {
    throw new Error('资料库的学科切换不是下划线 tab')
  }
  if (/<div class="src-switch"[^>]*data-od-id="subject-switch"/.test(h)) {
    throw new Error('资料库的学科切换被换成了胶囊 tab')
  }
  const got = switchButtons(h).map((b) => `${b.id}:${b.label}`)
  const want = ['politics:政治', 'cs-coa:计组', 'cs-os:系统', 'cs-ds:数据结构', 'cs-net:计网']
  if (got.join(' | ') !== want.join(' | ')) throw new Error(`实际 ${got.join(' | ')}`)
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
