const s = require('fs').readFileSync('d:/Code/Learning/data/math-data.ts', 'utf8')
const mods = [...s.matchAll(/name: "(数学.)"/g)].map((m) => m[1])
console.log('modules:', mods.join(', '))
const parts = [...s.matchAll(/title: "(第.部分 [^"]+)"/g)].map((m) => m[1])
console.log('parts:', parts.join(' | '))
// 章节标题
const chapters = [...s.matchAll(/title: "(第[一二三四五六七八九十]+章 [^"]+)"/g)].map((m) => m[1])
console.log('chapters(' + chapters.length + '):')
chapters.forEach((c) => console.log('  ', c))
