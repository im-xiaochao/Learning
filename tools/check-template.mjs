/**
 * 模板标签配平检查。
 *
 * 背景：`esbuild` 只能验证 <script> 的语法，管不到 <template>。
 * `<button>` 用 `</view>` 闭合这种错，只有 vue 编译器才会报，报出来也只有一个行号。
 * 这里自己做一遍标签栈校验，一次性把所有页面的问题都列出来。
 *
 * 用法： node check-template.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SKIP = new Set(['node_modules', 'unpackage', '_archive', 'tools', '.git', '.workbuddy-ai'])

/** uni-app / HTML 里的自闭合标签（没有结束标签） */
const VOID = new Set(['image', 'input', 'br', 'hr', 'img', 'area', 'base', 'col', 'embed', 'link', 'meta', 'source', 'track', 'wbr'])

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.vue')) out.push(full)
  }
  return out
}

function extractTemplate(code) {
  const start = code.indexOf('<template>')
  if (start === -1) return null
  const end = code.lastIndexOf('</template>')
  if (end === -1) return null
  // 行号偏移：模板内容起始处所在行
  const lineOffset = code.slice(0, start).split('\n').length - 1
  return { body: code.slice(start + '<template>'.length, end), lineOffset }
}

function checkTemplate(file, body, lineOffset) {
  const issues = []
  const stack = []
  // 逐个 token 扫描：注释、标签
  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
  let m
  while ((m = re.exec(body)) !== null) {
    const raw = m[0]
    if (raw.startsWith('<!--')) continue
    const name = m[1]
    const isClose = raw.startsWith('</')
    const selfClosed = m[3] === '/'
    const line = lineOffset + body.slice(0, m.index).split('\n').length

    if (isClose) {
      const top = stack.pop()
      if (!top) {
        issues.push(`第 ${line} 行：多余的 </${name}>，没有对应的开始标签`)
      } else if (top.name !== name) {
        issues.push(`第 ${top.line} 行 <${top.name}> 被第 ${line} 行的 </${name}> 闭合（应为 </${top.name}>）`)
      }
    } else if (!selfClosed && !VOID.has(name)) {
      stack.push({ name, line })
    }
  }
  for (const open of stack) {
    issues.push(`第 ${open.line} 行 <${open.name}> 没有结束标签`)
  }
  return issues
}

const files = walk(ROOT)
let checked = 0
let bad = 0

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8')
  const tpl = extractTemplate(code)
  if (!tpl) continue
  checked++
  const issues = checkTemplate(file, tpl.body, tpl.lineOffset)
  if (issues.length) {
    bad++
    console.log(`\n❌ ${path.relative(ROOT, file)}`)
    for (const i of issues) console.log(`   ${i}`)
  }
}

console.log(`\n模板检查：${checked} 个 .vue 文件`)
if (bad) {
  console.log(`❌ ${bad} 个文件标签不配平`)
  process.exit(1)
}
console.log('✅ 标签全部配平')
