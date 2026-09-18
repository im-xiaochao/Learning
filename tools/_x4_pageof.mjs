/**
 * 打印若干词在带 @@@PAGE 标记的 OCR 文件里首次出现的页码。
 * 用法： node tools/_x4_pageof.mjs <ocr 文件> <词...>
 */
import fs from 'node:fs'

const [, , file, ...terms] = process.argv
const lines = fs.readFileSync(file, 'utf8').split('\n')

for (const t of terms) {
  let page = '?'
  let hit = -1
  for (let i = 0; i < lines.length; i++) {
    const m = /^@@@PAGE (\d+)/.exec(lines[i])
    if (m) page = m[1]
    if (hit < 0 && lines[i].includes(t)) { hit = i + 1; console.log(`${t}  → 第 ${page} 页（行 ${hit}）`); break }
  }
  if (hit < 0) console.log(`${t}  → 没找到`)
}
