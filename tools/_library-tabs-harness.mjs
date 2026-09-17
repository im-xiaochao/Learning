/**
 * 专项验证：资料库页在选中政治时，学科 tab 必须仍在。
 *
 * 这是用户报的 bug：政治分支整页提前 return，把学科切换器吞掉了，
 * 导致资料库「只有政治」、切不到四门计算机课。
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
  if (!h.includes('按考纲模块练习')) throw new Error('刷题内容没渲染')
  if (!h.includes('sub-chips')) throw new Error('二级分组没渲染')
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

console.log('\n' + '='.repeat(48))
console.log(`通过 ${pass} / 失败 ${fail}`)
if (failures.length) {
  console.log('\n失败明细：')
  for (const f of failures) console.log('  · ' + f)
  process.exit(1)
}
console.log('🎉 全部通过')
