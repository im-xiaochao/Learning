/**
 * 样式不变量检查。
 *
 * 为什么单独一个脚本：`check-syntax.mjs` 只看 `<script>`，`check-template.mjs` 只看标签栈，
 * **两个都管不到 CSS** —— 样式写错（比如顶栏忘了吸顶）没有任何自动化能发现。
 * 这里只放「回归过一次、代价明显」的几条，不做通用 CSS linter。
 *
 * 用法：node tools/check-style.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

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

function styleOf(file) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8')
  const m = src.match(/<style[^>]*>([\s\S]*?)<\/style>/)
  if (!m) throw new Error(`${file} 里找不到 <style> 块`)
  return m[1]
}

/** 取某个选择器的声明体（只支持单层、无嵌套的规则） */
function ruleOf(css, selector) {
  const re = new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`)
  const m = css.match(re)
  if (!m) throw new Error(`找不到规则 ${selector}`)
  return m[1]
}

const appCss = styleOf('App.vue')

console.log('\n=== 样式不变量 ===')

check('App.vue 的 CSS 花括号配平', () => {
  const open = (appCss.match(/\{/g) || []).length
  const close = (appCss.match(/\}/g) || []).length
  if (open !== close) throw new Error(`{ ${open} 个，} ${close} 个`)
})

// 用户报过：政治刷题页往下滑，顶部的返回键跟着滚走了。
// 设计稿里 app-bar 是固定栅格行（在滚动容器之外），本来就不会滚走。
check('顶栏吸顶：.appbar 是 position: sticky 且 top: 0', () => {
  const r = ruleOf(appCss, '.appbar')
  if (!/position:\s*sticky/.test(r)) throw new Error('顶栏不是 sticky —— 页面滚动时返回键会跟着滚走')
  if (!/top:\s*0\b/.test(r)) throw new Error('顶栏缺 top: 0，吸不到顶')
})

check('顶栏背景不透明（否则内容会从顶栏下面透出来）', () => {
  const r = ruleOf(appCss, '.appbar')
  if (/background:\s*(transparent|none)/.test(r)) throw new Error('顶栏背景是透明的')
  if (!/background:\s*var\(--bg\)/.test(r)) throw new Error('顶栏背景应为不透明的 var(--bg)')
})

check('顶栏层级高于正文（z-index ≥ 10）', () => {
  const r = ruleOf(appCss, '.appbar')
  const m = r.match(/z-index:\s*(\d+)/)
  if (!m) throw new Error('顶栏没有 z-index')
  if (Number(m[1]) < 10) throw new Error(`z-index ${m[1]} 偏低，会被正文盖住`)
})

console.log(`\n通过 ${pass} / 失败 ${fail}`)
process.exit(fail ? 1 : 0)
