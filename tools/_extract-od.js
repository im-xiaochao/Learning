/**
 * 从设计稿 HTML 抽出主 <script>，并在末尾追加 __T__ 导出层，供 _od-harness.mjs 使用。
 *
 * 用法：node tools/_extract-od.js <.tmp-od/od-xxx.html> [<out.js>]
 *
 * 为什么需要导出层：设计稿脚本是浏览器里的普通 <script>，顶层 const/let 不会挂到
 * globalThis 上，vm 里就取不到。这里在末尾补一段 getter 集合把它们暴露出去。
 * 新增断言的符号记得往 SHIM 里加。
 */
const fs = require('node:fs')
const path = require('node:path')

const src = process.argv[2]
if (!src) {
  console.error('用法：node tools/_extract-od.js <.tmp-od/od-xxx.html> [<out.js>]')
  process.exit(1)
}

const html = fs.readFileSync(src, 'utf8')
const blocks = html.match(/<script>[\s\S]*?<\/script>/g)
if (!blocks || !blocks.length) {
  console.error(`❌ ${src} 里没有 <script> 块`)
  process.exit(1)
}

// 主逻辑在最后一个 <script> 块
const code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '')

/**
 * harness 需要的顶层绑定。
 * 用 getter/setter 成对暴露：harness 会直接给 quizCursor / subjectIndex 这类
 * 可变状态赋值，只给 getter 会报 "has only a getter"。
 */
const SHIM_NAMES = [
  'subjects',
  'LIBRARY_SUBJECT_IDS',
  'politicsQuestions',
  'PAPER_BOOKS',
  'X4_QUESTIONS',
  'X8_QUESTIONS',
  'ALL_PAPER_QUESTIONS',
  'navigate',
  'goBack',
  'render',
  'route',
  'historyStack',
  'state',
  'subjectIndex',
  'quizSource',
  'quizModule',
  'quizCursor',
  'quizPicked',
  'quizRevealed',
  'quizPool',
  'paperSelected',
  'paperSetQuestions',
  'paperStats',
  'politicsQuizBody',
  'quizPaperSetPage',
  'chartMode',
]

const shim = [
  '\n/* ── harness 导出层（由 tools/_extract-od.js 注入，不是设计稿内容） ── */',
  'globalThis.__T__ = {',
  ...SHIM_NAMES.flatMap((n) => [
    `  get ${n}() { return ${n} },`,
    `  set ${n}(v) { ${n} = v },`,
  ]),
  '};',
].join('\n')

// 顺手检查缺失的符号，别等到 harness 里报 "is not defined"
// 坑：设计稿大量使用 `let a=1, b=2, c=3` 这种一行多声明，名字不在行首，
// 所以要在「声明关键字开头的那一行」里逐个找名字，而不是要求名字紧跟关键字。
const declared = new Set()
for (const n of SHIM_NAMES) {
  const fnRe = new RegExp(`^\\s*(?:async\\s+)?function\\s+${n}\\b`, 'm')
  if (fnRe.test(code)) {
    declared.add(n)
    continue
  }
  // 逐个声明语句检查：从 const/let/var 起到行尾（或分号），名字出现即算声明
  const declRe = /(?:^|[;{}\n])\s*(?:const|let|var)\s+([^;\n]+)/g
  let m
  while ((m = declRe.exec(code))) {
    const part = m[1]
    if (new RegExp(`(?:^|,)\\s*${n}\\s*(?==|,|;|$)`).test(part)) {
      declared.add(n)
      break
    }
  }
}
const missing = SHIM_NAMES.filter((n) => !declared.has(n))

const out = process.argv[3] || src.replace(/\.html$/, '.js')
fs.writeFileSync(out, code + shim, 'utf8')

// harness 会读同名 .html 拿 CSS
const cssSibling = out.replace(/\.js$/, '.html')
if (path.resolve(cssSibling) !== path.resolve(src)) fs.copyFileSync(src, cssSibling)

console.log(`✅ ${src} → ${out}（脚本 ${code.length} 字符，导出 ${SHIM_NAMES.length - missing.length}/${SHIM_NAMES.length} 个符号）`)
if (missing.length) console.log(`⚠️  设计稿里没找到：${missing.join(', ')}`)
