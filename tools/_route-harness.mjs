/**
 * 资料库入口路由测试台（临时脚本）。
 *
 * 验证两条最容易写错的规则：
 *   1. 在资料库里选中政治时，**刷题内容必须直接内嵌渲染在学科 tab 下面**，而不是先给一张
 *      「进入刷题」的入口卡片；四门计算机专业课仍走原来的「空状态」——【3】【5】。
 *   2. 政治是**两级**：学科 tab 下只画套卷卡，一套卷里的题目在分包详情页
 *      `pages-politics/paper/paper.vue`。题干一旦画在主包那一屏，就会被拉回主包把体积顶爆——【6】。
 *   3. 学科切换器有**两套外观**：数学走胶囊 tab（全称标签）、资料库走下划线 tab（简称标签）。
 *      两套外观互斥挂 class，共用的样式只放在 App.vue 里一份——【7】。
 *
 * 所以拿真实的生成数据与真实源码跑一遍，而不是只看代码。
 *
 * 【3】管数据层的判据（isQuizSubject），【5】管界面层的落地方式（源码断言）。
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
check('政治 → 判为刷题学科（内容内嵌渲染）', () => {
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

console.log('\n【5】界面层：政治内容内嵌在学科 tab 下，但套卷内题目在分包详情页')
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
/** 去掉注释再断言：注释里为了讲道理会复述旧文案，不该被当成残留。 */
const stripComments = (src) =>
  src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .join('\n')
check('KnowledgeLibrary 渲染 PoliticsQuiz', () => {
  const src = stripComments(readSrc('components/KnowledgeLibrary.vue'))
  ok(/import\s+PoliticsQuiz\s+from/.test(src), '没 import PoliticsQuiz')
  ok(/<PoliticsQuiz[^>]*v-if="quiz"/.test(src), '没有内嵌渲染 <PoliticsQuiz v-if="quiz">')
})
check('KnowledgeLibrary 已删掉刷题入口卡机制', () => {
  const src = stripComments(readSrc('components/KnowledgeLibrary.vue'))
  ok(!/openQuiz/.test(src), 'openQuiz 仍在')
  ok(!/quiz-feature|quiz-title/.test(src), '入口卡样式残留')
  ok(!/进入政治刷题/.test(src), '入口卡文案残留')
})
check('政治走资料库时不显示知识点搜索框', () => {
  const src = stripComments(readSrc('components/KnowledgeLibrary.vue'))
  ok(/search[\s\S]{0,300}v-if="!quiz"/i.test(src) || /v-if="!quiz"[\s\S]{0,300}search/i.test(src), '搜索框没按 quiz 隐藏')
})
check('pages-politics/list 退化为薄壳，复用同一组件', () => {
  const src = stripComments(readSrc('pages-politics/list/list.vue'))
  ok(/<PoliticsQuiz\s*\/>/.test(src), '没用 PoliticsQuiz')
  ok(!/appPoliticsIndex/.test(src), '清单逻辑没搬走')
  ok(!/function\s+goQuestion/.test(src), '跳转逻辑没搬走')
})
check('两个入口用的是同一个组件（不会各写一份）', () => {
  const a = stripComments(readSrc('components/KnowledgeLibrary.vue'))
  const b = stripComments(readSrc('pages-politics/list/list.vue'))
  ok(/from\s+'\.\/PoliticsQuiz\.vue'/.test(a), 'KnowledgeLibrary 引入的不是 ./PoliticsQuiz.vue')
  ok(/from\s+'\.\.\/\.\.\/components\/PoliticsQuiz\.vue'/.test(b), 'list.vue 引入的不是 ../../components/PoliticsQuiz.vue')
})

console.log('\n【6】两级结构：资料库画卡、分包详情页画题（题干不许进主包）')
check('资料库那屏只画套卷卡，点卡片跳分包详情页', () => {
  const src = stripComments(readSrc('components/PoliticsQuiz.vue'))
  ok(/pages-politics\/paper\/paper\?set=/.test(src), '套卷卡没有跳到 /pages-politics/paper/paper')
  ok(!/\.stem\b/.test(src), '又把题干画进主包那一屏了——题干会因此被拉回主包')
  ok(!/quiz-row/.test(src), '题目行样式还留在主包组件里')
  ok(!/考纲模块/.test(src), '「考纲模块」来源没删干净')
})
check('主包的政治数据投影不带题干', () => {
  const src = readSrc('data/generated/app/politics-index.ts')
  ok(!/"stem"/.test(src), '投影里又夹带题干了——主包体积会跟着题库涨')
  ok(!/appPoliticsIndexModuleOrder/.test(src), '考纲模块顺序又回来了（界面上已经没有模块筛选）')
  ok(/appPoliticsPaperSets/.test(src), '找不到套卷投影 appPoliticsPaperSets')
})
check('卷详情页在分包里取题库并渲染题干，且已注册路由', () => {
  const src = stripComments(readSrc('pages-politics/paper/paper.vue'))
  ok(/appPoliticsQuestions/.test(src), '详情页没取分包题库')
  ok(/\.stem\b/.test(src), '详情页没渲染题干')
  const routes = JSON.parse(readSrc('pages.json'))
  const pkg = (routes.subPackages || []).find((p) => p.root === 'pages-politics')
  ok(pkg && pkg.pages.some((p) => p.path === 'paper/paper'), 'pages.json 没注册 paper/paper')
})

console.log('\n【7】学科切换器：数学走胶囊 tab、资料库走下划线 tab')
check('数学页显式声明胶囊外观，资料库页用默认值', () => {
  const math = stripComments(readSrc('pages/math/math.vue'))
  ok(/switch-style="pill"/.test(math), '数学页没传 switch-style="pill"')
  const library = stripComments(readSrc('pages/library/library.vue'))
  ok(!/switch-style/.test(library), '资料库页不该传 switch-style——下划线本来就是默认值')
})
check('两套外观由 switchStyle 二选一，标签随外观换（全称 / 简称）', () => {
  const src = stripComments(readSrc('components/KnowledgeLibrary.vue'))
  ok(/\? 'src-switch' : `subject-tabs/.test(src), "容器 class 不是按 switchStyle 二选一（胶囊 'src-switch' / 下划线 'subject-tabs'）")
  ok(/\? 'src-chip' : 'subject-tab'/.test(src), "按钮 class 不是按 switchStyle 二选一")
  ok(/\? s\.name : s\.shortName/.test(src), '标签没按外观取 name / shortName')
  // uni-app 侧没有渲染测试（tools/ 里没有 vue 运行时），所以模板只允许**纯字符串** class 绑定：
  // 数组 / 嵌套三元在 mp 编译器上真出岔子的话，这些静态断言一个都发现不了。
  ok(/:class="switchClass"/.test(src), '模板没用 switchClass（容器 class 应该先算好）')
  ok(/:class="tabClass\(i\)"/.test(src), '模板没用 tabClass(i)（按钮 class 应该先算好）')
  ok(!/:class="\[/.test(src), '模板里又出现数组式 class 绑定')
  // 静态 class 必须让位：.subject-tab 与 .src-chip 都设了 min-height / border-radius /
  // font-size，同时挂上就靠源码顺序决胜——改个声明顺序外观就变了。
  ok(!/class="subject-tabs"/.test(src) && !/class="subject-tab"/.test(src), '还留着静态的 .subject-tab* class')
})
check('胶囊控件样式只定义一次（App.vue 全局），组件里不许再抄一份', () => {
  const app = readSrc('App.vue')
  for (const sel of ['.src-switch', '.src-chip', '.src-chip.active']) {
    ok(new RegExp(`^\\${sel}\\s*\\{`, 'm').test(app), `App.vue 缺 ${sel}`)
  }
  for (const f of ['components/PoliticsQuiz.vue', 'components/KnowledgeLibrary.vue']) {
    ok(!/^\.src-(switch|chip)\s*\{/m.test(stripComments(readSrc(f))), `${f} 里又抄了一份胶囊样式`)
  }
})
check('数学三科的学科名与设计稿一字不差，简称不动', () => {
  eq(C.MATH_SUBJECT_IDS.length, 3, '数学学科数（多于 3 个就该重新想外观了）')
  const names = C.MATH_SUBJECT_IDS.map((id) => C.getSubject(id)?.name)
  ok(names.join('|') === '高等数学|线性代数|概率论', `学科全称实际是 ${names.join('|')}`)
  eq(C.getSubject('probability')?.shortName, '概率', 'shortName 不该跟着改名')
})

console.log(`\n────────────────────────────`)
console.log(`通过 ${pass} / 失败 ${fail}`)
process.exit(fail > 0 ? 1 : 0)
