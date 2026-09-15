/**
 * 轻量语法检查：把 .vue 的 <script setup> 抽出来，连同 .ts 一起交给 esbuild 转译，
 * 只验证「能否解析」，不做类型检查。用来在没有 HBuilderX 的环境下兜住低级语法错误。
 *
 * 用法： node check-syntax.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { transform } from 'esbuild'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SKIP = new Set(['node_modules', 'unpackage', '_archive', 'tools', '.git', '.workbuddy-ai'])

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(ts|vue)$/.test(entry.name)) out.push(full)
  }
  return out
}

const files = walk(ROOT)
let ok = 0
const failures = []

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8')
  let loader = 'ts'

  if (file.endsWith('.vue')) {
    const m = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)
    if (!m) continue
    code = m[1]
  }

  try {
    await transform(code, { loader, target: 'es2019', format: 'esm' })
    ok++
  } catch (e) {
    failures.push(`${path.relative(ROOT, file)}\n    ${String(e.message).split('\n')[0]}`)
  }
}

console.log(`语法检查：${ok} 个文件通过`)
if (failures.length) {
  console.log(`\n❌ ${failures.length} 个文件有语法问题：`)
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
console.log('✅ 全部可解析')
