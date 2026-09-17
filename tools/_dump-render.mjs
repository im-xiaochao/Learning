/**
 * 把资料库页（政治 / 计算机 / 数学）实际渲染的 HTML 打出来，便于肉眼核对。
 * 用法：node tools/_dump-render.mjs <.tmp-od/od-u9.js>
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
    getElementById: getEl, querySelector: (s) => makeEl(s), querySelectorAll: () => [],
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

const G = sandbox.__T__
const main = getEl('content')

function show(subjectId, label) {
  G.navigate('library', false)
  const i = G.subjects.findIndex((s) => s.id === subjectId)
  G.subjectIndex = i
  G.render()
  const h = main.innerHTML
  console.log(`\n${'='.repeat(60)}`)
  console.log(`\n【${label}】（subject=${subjectId}）\n`)
  // 提取可读的关键元素
  const eyebrow = h.match(/<p class="eyebrow">([^<]*)</)
  const title = h.match(/data-od-id="knowledge-title">([^<]*)</)
  console.log('  eyebrow :', eyebrow ? eyebrow[1] : '(无)')
  console.log('  title   :', title ? title[1] : '(无)')
  console.log('  搜索框  :', h.includes('knowledge-search') ? '有' : '无')
  const tabs = [...h.matchAll(/data-od-id="subject-([a-z-]+)"[^>]*>([^<]*)</g)]
  console.log('  学科tab :', tabs.length ? tabs.map((m) => m[2]).join(' / ') : '❌ 没有学科 tab')
  const chips = [...h.matchAll(/data-od-id="quiz-module-[^"]*"[^>]*>([^<]*)</g)]
  if (chips.length) console.log('  模块chip:', chips.map((m) => m[1]).join(' / '))
  console.log('  二级分组:', h.includes('sub-group') ? '有（左竖线）' : '无')
}

show('politics', '资料库 · 政治（刷题页）')
show('cs-coa', '资料库 · 计算机组成原理（空态）')
