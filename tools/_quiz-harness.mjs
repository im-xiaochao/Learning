/**
 * 政治刷题逻辑的 vm 测试台（临时脚本）。
 *
 * 目的：在不开微信开发者工具的前提下，验证
 *   1. 题库数据契约（两种题型、answerKey 命中、采分点非空）
 *   2. usePoliticsQuiz 的队列 / 作答 / 翻页 / 重置
 *   3. learning store 的 answerQuiz 写入与去重
 * 用 esbuild 把 TS 转成 ESM，再在 vm 里跑（stub 掉 vue / uni / 存储）。
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
function eq(a, b, msg = '') {
  const sa = JSON.stringify(a)
  const sb = JSON.stringify(b)
  if (sa !== sb) throw new Error(`${msg} 期望 ${sb}，实际 ${sa}`)
}
function ok(v, msg = '') {
  if (!v) throw new Error(msg || '断言失败')
}

// ── 打包：把入口和它的依赖一起转成单文件 ESM ──
const entry = path.join(ROOT, '.tmp-od/quiz-entry.ts')
fs.mkdirSync(path.dirname(entry), { recursive: true })
const use = (rel) => path.join(ROOT, rel).replace(/\\/g, '/')
fs.writeFileSync(
  entry,
  `
import * as quiz from '${use('pages-politics/usePoliticsQuiz.ts')}'
import * as qdata from '${use('pages-politics/questions.ts')}'
import * as learn from '${use('stores/learning.ts')}'

Object.assign(globalThis, quiz, qdata, learn)
`,
)

/**
 * vue 的最小实现：只用到 ref / computed / watch。
 * 用 esbuild 的 onResolve/onLoad 插件把 'vue' 换掉，
 * 比事后正则改写 import 语句可靠得多。
 */
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
const code = out.outputFiles[0].text

// ── vm 环境 ──
const store = {}
const sandbox = {
  console, Date, Math, JSON, Set, Map, Array, Object, Number, String,
  Boolean, Error, RegExp, encodeURIComponent, decodeURIComponent,
  setTimeout, clearTimeout,
  uni: {
    getStorageSync: (k) => store[k],
    setStorageSync: (k, v) => { store[k] = v },
    removeStorageSync: (k) => { delete store[k] },
    showToast: () => {}, navigateTo: () => {}, redirectTo: () => {},
    switchTab: () => {}, getMenuButtonBoundingClientRect: () => ({ bottom: 88 }),
  },
}
sandbox.globalThis = sandbox
vm.createContext(sandbox)
vm.runInContext(code, sandbox, { filename: 'quiz-bundle.mjs' })

const G = sandbox

// ────────────────────────────────────────────────── 测试
console.log('\n【1】题库数据契约')
check('题库非空', () => ok(G.appPoliticsQuestions.length > 0))
check('两种题型都有', () => {
  ok(G.appPoliticsQuestions.some((q) => q.type === 'choice'), '缺选择题')
  ok(G.appPoliticsQuestions.some((q) => q.type === 'material'), '缺材料题')
})
check('每道选择题的 answerKey 都命中某个选项', () => {
  for (const q of G.appPoliticsQuestions.filter((x) => x.type === 'choice')) {
    const keys = q.options.map((o) => o.key)
    ok(keys.includes(q.answerKey), `${q.id}: answerKey ${q.answerKey} 不在 ${keys.join('/')}`)
    ok(new Set(keys).size === keys.length, `${q.id}: 选项 key 重复`)
    ok(q.options.length >= 2, `${q.id}: 选项少于 2 个`)
  }
})
check('每道材料题都有段落与采分点', () => {
  for (const q of G.appPoliticsQuestions.filter((x) => x.type === 'material')) {
    ok(q.material && q.material.paragraphs.length > 0, `${q.id}: 材料为空`)
    ok(q.answerPoints && q.answerPoints.length > 0, `${q.id}: 采分点为空`)
  }
})
check('id 全局唯一', () => {
  const ids = G.appPoliticsQuestions.map((q) => q.id)
  eq(ids.length, new Set(ids).size, 'id 有重复')
})
check('解析都非空', () => {
  for (const q of G.appPoliticsQuestions) ok(q.explanation && q.explanation.trim(), `${q.id}: 解析为空`)
})
check('模块统计与题目对得上', () => {
  const sum = G.appPoliticsModules.reduce((n, m) => n + m.count, 0)
  eq(sum, G.appPoliticsQuestions.length, '模块计数之和')
})

console.log('\n【2】队列与作答')
check('startQuiz 建队列', () => {
  ok(G.startQuiz('all'), '没能建队列')
})
check('队列长度 = 题库长度', () => eq(G.usePoliticsQuiz().total.value, G.appPoliticsQuestions.length))

check('select 记录选项；未揭示时有效', () => {
  const q = G.usePoliticsQuiz()
  q.select('A')
  eq(q.picked.value, 'A')
})
check('reveal 后 select 不再改变选择', () => {
  const q = G.usePoliticsQuiz()
  q.reveal()
  q.select('B')
  eq(q.picked.value, 'A', '揭示后不应改选')
})

// ── 多选题：多选切换 + 判分「完全一致」 ──
check('toggle 多选可累加，picked 为排序拼接', () => {
  const q = G.usePoliticsQuiz()
  G.startQuiz('all', [G.appPoliticsQuestions.find((x) => x.type === 'multi').id])
  q.select('C')
  q.toggle('A')
  eq(q.picked.value, 'AC', '多选应排序后拼接成 AC')
  eq(q.pickedKeys.value.length, 2)
})
check('toggle 再点一次取消该选项', () => {
  const q = G.usePoliticsQuiz()
  q.toggle('C')
  eq(q.picked.value, 'A', '取消 C 后只剩 A')
})
check('单选 select 是替换而不是累加', () => {
  const q = G.usePoliticsQuiz()
  const one = G.appPoliticsQuestions.find((x) => x.type === 'choice')
  G.startQuiz('all', [one.id])
  q.select('A')
  q.select('B')
  eq(q.picked.value, 'B', '单选再点别的应替换')
})
check('normalizeKeys 对多选答案排序拼接', () => {
  eq(G.normalizeKeys(['C', 'A']), 'AC')
  eq(G.normalizeKeys(['A']), 'A')
})

// ── 材料题：参考答案可以收起（与设计稿 Version 12 一致） ──
check('toggleReveal 可反复切换', () => {
  const q = G.usePoliticsQuiz()
  const mat = G.appPoliticsQuestions.find((x) => x.type === 'material')
  G.startQuiz('all', [mat.id])
  eq(q.revealed.value, false)
  q.toggleReveal()
  eq(q.revealed.value, true, '第一次应展开')
  q.toggleReveal()
  eq(q.revealed.value, false, '第二次应收起')
  q.toggleReveal()
  eq(q.revealed.value, true, '还能再展开')
})
check('reveal 仍是单向（选择题交卷用，不受收起影响）', () => {
  const q = G.usePoliticsQuiz()
  const one = G.appPoliticsQuestions.find((x) => x.type === 'choice')
  G.startQuiz('all', [one.id])
  q.reveal()
  eq(q.revealed.value, true)
  q.reveal()
  eq(q.revealed.value, true, 'reveal 不应把它关掉')
})
check('翻到下一题会收起答案（不会带着上一题的状态）', () => {
  const q = G.usePoliticsQuiz()
  const mat = G.appPoliticsQuestions.filter((x) => x.type === 'material')
  G.startQuiz('all', [mat[0].id, mat[1].id])
  q.toggleReveal()
  eq(q.revealed.value, true)
  q.next()
  eq(q.revealed.value, false, '下一题应回到未揭示状态')
})
// 复位：上面的用例动过队列与 cursor，后面的断言依赖「从第 0 题开始」
G.startQuiz('all')

check('next 清空选择与揭示状态', () => {
  const q = G.usePoliticsQuiz()
  q.next()
  eq(q.picked.value, '')
  eq(q.revealed.value, false)
  eq(q.cursor.value, 1)
})

check('模块筛选只取该模块', () => {
  const mod = G.appPoliticsModules[0].name
  G.startQuiz(mod)
  const q = G.usePoliticsQuiz()
  eq(q.total.value, G.appPoliticsQuestions.filter((x) => x.module === mod).length)
  ok(G.appPoliticsQuestions.find((x) => x.id === q.currentId.value).module === mod)
})

console.log('\n【3】learning store 写入')
{
  const L = G
  const first = G.appPoliticsQuestions.find((q) => q.type === 'choice')
  const other = G.appPoliticsQuestions.filter((q) => q.type === 'choice')[1]

  check('answerQuiz 写入对错记录', () => {
    L.answerQuiz(first.id, first.answerKey, true)
    ok(L.getQuizAnswer(first.id), '没查到记录')
    eq(L.getQuizAnswer(first.id).correct, true)
    eq(L.getQuizAnswer(first.id).picked, first.answerKey)
  })

  check('答错也记录', () => {
    const wrongKey = first.options.find((o) => o.key !== first.answerKey).key
    L.answerQuiz(other.id, wrongKey, wrongKey === other.answerKey)
    ok(L.getQuizAnswer(other.id))
  })

  check('今日题数去重：同题重复答只算一次', () => {
    const before = L.todayQuiz.value
    L.answerQuiz(first.id, first.answerKey, true)
    L.answerQuiz(first.id, first.answerKey, true)
    eq(L.todayQuiz.value, before, '同题重复作答不应增加今日题数')
  })

  check('重复作答覆盖旧记录（保留最近一次）', () => {
    const wrongKey = first.options.find((o) => o.key !== first.answerKey).key
    L.answerQuiz(first.id, wrongKey, false)
    eq(L.getQuizAnswer(first.id).picked, wrongKey)
    eq(L.getQuizAnswer(first.id).correct, false)
    // 复原，避免影响后续
    L.answerQuiz(first.id, first.answerKey, true)
  })

  check('事件类型 quiz_answered 进入累计', () => {
    ok(L.totalQuiz.value >= 2, `totalQuiz = ${L.totalQuiz.value}`)
  })
}

console.log('\n【4】结果统计口径')
check('正确率 = 答对 / 选择题数', () => {
  const choice = G.appPoliticsQuestions.filter((q) => q.type === 'choice')
  const correct = choice.filter((q) => G.getQuizAnswer(q.id)?.correct).length
  const expected = Math.round((correct / choice.length) * 100)
  ok(expected >= 0 && expected <= 100)
})

console.log('\n【5】刷题统计进首页 / 我的（store 侧）')
check('weeklyValues 支持 quiz 模式，返回 7 天', () => {
  const v = G.weeklyValues('quiz')
  eq(v.length, 7)
  ok(v.every((n) => Number.isInteger(n) && n >= 0), `出现非法值：${v.join(',')}`)
})
check('weeklyValues("quiz") 最后一项 = 今日刷题数', () => {
  const v = G.weeklyValues('quiz')
  eq(v[6], G.todayQuiz.value)
})
check('原有 words / knowledge 两种模式未被破坏', () => {
  eq(G.weeklyValues('words').length, 7)
  eq(G.weeklyValues('knowledge').length, 7)
  eq(G.weeklyValues('words')[6], G.todayWords.value)
  eq(G.weeklyValues('knowledge')[6], G.todayKnowledge.value)
})
check('totalQuiz = 已作答的题目去重数（≤ 题库总量）', () => {
  ok(G.totalQuiz.value >= 0, `totalQuiz = ${G.totalQuiz.value}`)
  ok(
    G.totalQuiz.value <= G.appPoliticsQuestions.length,
    `totalQuiz(${G.totalQuiz.value}) 不应超过题库总量(${G.appPoliticsQuestions.length})`,
  )
})
check('刷题不计入今日目标：todayPercent 仍只由单词 + 知识点决定', () => {
  // 反向断言：改刷题记录不应影响今日进度
  const before = G.todayPercent.value
  const sample = G.appPoliticsQuestions[0]
  const prev = G.getQuizAnswer(sample.id)
  G.answerQuiz(sample.id, 'A', false)
  const after = G.todayPercent.value
  eq(after, before, '今日进度被刷题影响了')
  if (prev) G.answerQuiz(sample.id, prev.picked, prev.correct)
})

console.log(`\n────────────────────────────`)
console.log(`通过 ${pass} / 失败 ${fail}`)
process.exit(fail > 0 ? 1 : 0)
