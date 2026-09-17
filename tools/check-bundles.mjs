/**
 * 分包边界检查。
 *
 * 为什么值得单独一个脚本：**主包引用分包数据是一个静默、代价极大的错误**——
 * uni-app 会把被引用到的分包数据当公共模块打回主包，分包里只剩空页面，
 * 主包一路涨到 2 MB 上限（犯过：主包 2103 KB 超限）。而这件事
 * `check-syntax.mjs`（只看语法）、`check-template.mjs`（只看标签栈）、
 * `check-style.mjs`（只看 CSS）**一个都管不到**，本地也没有 uni-app CLI 能真编译一次。
 *
 * 断言（按节）：
 *   1. 主包文件不得 import 任何分包路径（`pages-knowledge` / `pages-words` / `pages-politics`）。
 *   2. 政治套卷投影（主包）与分包题库逐条对齐：每套卷的 id 顺序都一致、不漏卷、不串卷；
 *      不属于任何卷的题（老考纲示意题）不得被静默塞进卷里。
 *   3. 投影里不得夹带题干与答题页才需要的重字段（stem / options / answerPoints / material …），
 *      主包组件也不得渲染题干，卷详情页必须在分包内并注册好路由。
 *
 * 用法： node tools/check-bundles.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SKIP_DIRS = new Set(['node_modules', 'unpackage', '_archive', 'tools', '.git', '.workbuddy', '.workbuddy-ai', '_od_tmp', '.tmp-od'])
const SUB_PACKAGES = ['pages-knowledge', 'pages-words', 'pages-politics']

let pass = 0
let fail = 0
function check(label, fn) {
  try {
    fn()
    pass++
    console.log(`  ✅ ${label}`)
  } catch (e) {
    fail++
    console.log(`  ❌ ${label} → ${e.message}`)
  }
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(ts|vue)$/.test(entry.name)) out.push(full)
  }
  return out
}

const files = walk(ROOT)
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/')

/** 文件属于哪个分包；主包文件返回 null */
function packageOf(relPath) {
  return SUB_PACKAGES.find((p) => relPath.startsWith(p + '/')) || null
}

/** 抽出 import / export ... from '...' 的模块说明符 */
function specifiersOf(source) {
  const out = []
  const re = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(source)) !== null) out.push(m[1])
  return out
}

console.log('\n=== 1. 主包不得引用分包 ===')
check('主包文件没有 import 分包路径', () => {
  const bad = []
  for (const file of files) {
    const relPath = rel(file)
    if (packageOf(relPath)) continue
    const dir = path.dirname(relPath)
    for (const spec of specifiersOf(fs.readFileSync(file, 'utf8'))) {
      if (!spec.startsWith('.')) continue
      const resolved = path.posix.normalize(path.posix.join(dir, spec))
      const pkg = packageOf(resolved)
      if (pkg) bad.push(`${relPath} → ${spec}（${pkg}）`)
    }
  }
  if (bad.length) throw new Error(`\n      ${bad.join('\n      ')}`)
})

console.log('\n=== 2. 政治套卷投影 与 分包题库 逐条对齐 ===')
const listPath = path.join(ROOT, 'data/generated/app/politics-index.ts')
const bankPath = path.join(ROOT, 'pages-politics/questions.ts')

/** 生成物是「一条记录一行」；题库那边取 id 与卷号，投影那边取每套卷的 ids */
function lines(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim().replace(/,$/, ''))
    .filter((l) => l.startsWith('{'))
    .map((l) => JSON.parse(l))
}

/** 主包投影：[{ book, set, ids }]，只含 id */
function paperSetsOf(file) {
  return lines(file)
}

/** 分包题库：按卷号分组的 id（保持文件顺序 = 卷面顺序），另外报一下不属于任何卷的题 */
function bankOf(file) {
  const bySet = new Map()
  const orphans = []
  for (const q of lines(file)) {
    if (q.book && q.set) {
      const key = `${q.book}-${q.set}`
      if (!bySet.has(key)) bySet.set(key, [])
      bySet.get(key).push(q.id)
    } else {
      orphans.push(q.id)
    }
  }
  return { bySet, orphans }
}

check('两边文件都存在', () => {
  for (const f of [listPath, bankPath]) if (!fs.existsSync(f)) throw new Error(`缺 ${rel(f)}`)
})

check('每套卷的 id 与题库逐条对齐（含卷面顺序）', () => {
  const sets = paperSetsOf(listPath)
  const { bySet: bank } = bankOf(bankPath)
  if (!sets.length) throw new Error('投影里一套卷都没有——题库或投影生成坏了')
  const seen = new Map()
  for (const s of sets) {
    const key = `${s.book}-${s.set}`
    if (seen.has(key)) throw new Error(`卷号重复：${key}`)
    seen.set(key, s.ids.length)
    const want = bank.get(key)
    if (!want) throw new Error(`投影有 ${key}，题库里没有这一套`)
    if (want.length !== s.ids.length) throw new Error(`${key}：投影 ${s.ids.length} 条，题库 ${want.length} 条`)
    for (let i = 0; i < want.length; i++) {
      if (want[i] !== s.ids[i]) throw new Error(`${key} 第 ${i + 1} 题：投影 ${s.ids[i]}，题库 ${want[i]}（卷面顺序或条目对不上）`)
    }
  }
  for (const key of bank.keys()) {
    if (!seen.has(key)) throw new Error(`题库有 ${key}，投影里却漏了——那一套在界面上会是空的`)
  }
})

check('不属于任何卷的题不会被静默塞进卷里', () => {
  const { orphans } = bankOf(bankPath)
  const projected = new Set(paperSetsOf(listPath).flatMap((s) => s.ids))
  const leaked = orphans.filter((id) => projected.has(id))
  if (leaked.length) throw new Error(`这些题没有 book/set 却进了卷投影：${leaked.slice(0, 3).join(',')}`)
})

console.log('\n=== 3. 投影不夹带重字段（题干只在分包）===')
check('投影里没有 stem / options / answerKey(s) / material / answerPoints / explanation', () => {
  const src = fs.readFileSync(listPath, 'utf8')
  const body = src.slice(src.indexOf('export const appPoliticsPaperSets'))
  const heavy = ['stem', 'options', 'answerKey', 'answerKeys', 'material', 'answerPoints', 'explanation']
  const hit = heavy.filter((k) => body.includes(`"${k}":`))
  if (hit.length) throw new Error(`投影里出现了 ${hit.join(' ')}——这些字段只该留在分包题库`)
})

check('主包组件 PoliticsQuiz 不渲染题干（渲染了题干就会被拉回主包）', () => {
  const f = path.join(ROOT, 'components/PoliticsQuiz.vue')
  if (!fs.existsSync(f)) throw new Error('缺 components/PoliticsQuiz.vue')
  if (/\.stem\b/.test(fs.readFileSync(f, 'utf8'))) {
    throw new Error('资料库那屏又渲染题干了——套卷卡只该带卷号跳详情页，题干留在分包')
  }
})

check('卷详情页落在分包内并已注册路由', () => {
  const page = path.join(ROOT, 'pages-politics/paper/paper.vue')
  if (!fs.existsSync(page)) throw new Error('缺 pages-politics/paper/paper.vue')
  const routes = JSON.parse(fs.readFileSync(path.join(ROOT, 'pages.json'), 'utf8'))
  const pkg = (routes.subPackages || []).find((p) => p.root === 'pages-politics')
  if (!pkg) throw new Error('pages.json 里没有 pages-politics 分包')
  if (!pkg.pages.some((p) => p.path === 'paper/paper')) throw new Error('pages.json 没注册 paper/paper')
})

check('主包组件 PoliticsQuiz 只 import 主包模块', () => {
  const f = path.join(ROOT, 'components/PoliticsQuiz.vue')
  const dir = 'components'
  for (const spec of specifiersOf(fs.readFileSync(f, 'utf8'))) {
    if (!spec.startsWith('.')) continue
    const pkg = packageOf(path.posix.normalize(path.posix.join(dir, spec)))
    if (pkg) throw new Error(`它 import 了 ${spec}（${pkg}）`)
  }
})

console.log(`\n通过 ${pass} / 失败 ${fail}`)
process.exit(fail ? 1 : 0)
