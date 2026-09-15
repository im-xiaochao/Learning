// 统计知识点总数与已有专属讲义的覆盖情况
const fs = require('fs')

const data = fs.readFileSync('d:/Code/Learning/data/math-data.ts', 'utf8')
const lectures = fs.readFileSync('d:/Code/Learning/data/math-lectures.ts', 'utf8')

// 提取 math-data 中所有 point 标题（形如 title: "1.1 xxx"）
const pointTitles = [...data.matchAll(/title: "(\d+\.\d+ [^"]+)"/g)].map((m) => m[1])
// 提取 math-lectures DIRECT 的 key
const directBlock = lectures.slice(lectures.indexOf('const DIRECT'))
const directKeys = new Set([...directBlock.matchAll(/^  ([^\s:][^\n:]*?): body\(/gm)].map((m) => m[1].trim()))

function clean(t) {
  return t
    .replace(/`/g, '')
    .replace(/^\d+(?:\.\d+)+\s*/, '')
    .replace(/^\d+[.、]\s*/, '')
    .trim()
}

let covered = 0
const uncovered = []
for (const t of pointTitles) {
  const c = clean(t)
  if (directKeys.has(c)) covered++
  else uncovered.push(c)
}
console.log('总知识点:', pointTitles.length)
console.log('DIRECT 条目数:', directKeys.size)
console.log('已被 DIRECT 覆盖:', covered)
console.log('未覆盖(走 scoped/通用兜底):', uncovered.length)
console.log('--- 未覆盖清单 ---')
uncovered.forEach((t) => console.log(' ·', t))
