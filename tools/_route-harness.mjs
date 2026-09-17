/**
 * 资料库入口路由测试台（临时脚本）。
 *
 * 验证最重要的一条：在资料库里选中政治时，**必须落到刷题入口**而不是知识点列表；
 * 四门计算机专业课仍走原来的「空状态」。这条规则写错了整个功能就白做，
 * 所以拿真实的生成数据跑一遍，而不是只看代码。
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
let fail = 0
function check(label, fn) {
  try {
    fn()
    pass++
    console.log(`  ✓ ${label}`)
  } catch (e) {
    fail++
    console.log(`  ✗ ${label}\n      ${e.message}`)
  }
}
const ok = (v, m) => {
  if (!v) throw new Error(m || '断言失败')
}
const eq = (a, b, m = '') => {
  if (a !== b) throw new Error(`${m} 期望 ${b}，实际 ${a}`)
}

const entry = path.join(ROOT, '.tmp-od/route-entry.ts')
fs.mkdirSync(path.dirname(entry), { recursive: true })
const use = (rel) => path.join(ROOT, rel).replace(/\\/g, '/')
fs.writeFileSync(
  entry,
  `
import * as content from '${use('composables/useContent.ts')}'
Object.assign(globalThis, content)
`,
)

const VUE_STUB = `
export function ref(v) { return { value: v } }
export function computed(fn) { return { get value() { return fn() } } }
export function watch() { return () => {} }
`

const out = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  write: false,
  platform: 'neutral',
  logLevel: 'silent',
  plugins: [
    {
      name: 'vue-stub',
      setup(b) {
        b.onResolve({ filter: /^vue$/ }, () => ({ path: 'vue-stub', namespace: 'stub' }))
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: VUE_STUB, loader: 'js' }))
      },
    },
  ],
})

const sandbox = { console, Date, Math, JSON, Set, Map, Array, Object, Number, String, Boolean, Error, RegExp }
sandbox.globalThis = sandbox
vm.createContext(sandbox)
vm.runInContext(out.outputFiles[0].text, sandbox, { filename: 'route-bundle.js' })
const C = sandbox

console.log('\n【1】学科 kind 齐备（缺失会导致刷题入口不出现）')
check('每个学科都有 kind', () => {
  for (const s of C.subjects) ok(s.kind, `${s.id} 缺 kind`)
})
check('政治 kind === politics', () => {
  eq(C.kindOfSubject('politics'), 'politics')
})
check('四门计算机专业课 kind === cs', () => {
  for (const id of ['cs-coa', 'cs-os', 'cs-ds', 'cs-net']) eq(C.kindOfSubject(id), 'cs', id)
})
check('数学三门 kind === math', () => {
  for (const id of ['calculus', 'algebra', 'probability']) eq(C.kindOfSubject(id), 'math', id)
})

console.log('\n【2】资料库学科清单')
check('资料库清单包含政治 + 四门计算机课', () => {
  eq(C.LIBRARY_SUBJECT_IDS.length, 5, '数量')
  ok(C.LIBRARY_SUBJECT_IDS.includes('politics'))
})
check('数学清单只有三门', () => {
  eq(C.MATH_SUBJECT_IDS.length, 3)
  ok(!C.MATH_SUBJECT_IDS.includes('politics'), '政治不该在数学 tab')
})

console.log('\n【3】入口路由（核心）')
check('政治 → 刷题入口', () => {
  eq(C.isQuizSubject('politics'), true, '政治必须落到刷题')
})
check('计算机专业课 → 仍是知识点列表（空状态）', () => {
  for (const id of ['cs-coa', 'cs-os', 'cs-ds', 'cs-net']) eq(C.isQuizSubject(id), false, id)
})
check('数学 → 仍是知识点列表', () => {
  for (const id of ['calculus', 'algebra', 'probability']) eq(C.isQuizSubject(id), false, id)
})
check('政治没有知识点章节（所以走刷题）', () => {
  eq(C.chaptersOfSubject('politics').length, 0)
})
check('数学章节没被影响', () => {
  ok(C.chaptersOfSubject('calculus').length > 0)
})

console.log('\n【4】不回归：数学内容完好')
check('知识点总数 > 900', () => ok(C.knowledgeTotal > 900, `实际 ${C.knowledgeTotal}`))
check('政治知识点数为 0（不再是知识点学科）', () => eq(C.knowledgeCountOfSubject('politics'), 0))

console.log(`\n────────────────────────────`)
console.log(`通过 ${pass} / 失败 ${fail}`)
process.exit(fail > 0 ? 1 : 0)
