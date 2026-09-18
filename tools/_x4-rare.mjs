/**
 * 肖四「生僻字」扫描：找出含极低频汉字的二字窗口，用来暴露 OCR 形近字误识。
 *
 *   node tools/_x4-rare.mjs [阈值]      # 默认阈值 3（全区间出现次数 ≤3 的汉字才算生僻）
 *
 * 思路：OCR 误识通常是把常用字换成一个不常用的形近字（昙→县、跻→硚、夭→天）。
 * 所以「一个只出现 1~3 次的字」出现在正常词语里，就值得人工看一眼。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = fs.readFileSync(path.join(ROOT, 'data/politics/questions.ts'), 'utf8')
const mid = src.slice(src.indexOf('export const POLITICS_QUESTIONS'), src.indexOf('...POLITICS_QUESTIONS_X8'))

const THRESH = Number(process.argv[2] || 3)

// 只统计汉字
const chars = [...mid].filter((c) => /[\u4e00-\u9fff]/.test(c))
const freq = new Map()
for (const c of chars) freq.set(c, (freq.get(c) || 0) + 1)

// 常见字白名单（这些即使低频也不是错字嫌疑）
const SAFE = new Set([...'的了是在有和就不人都一个上也很到说要去你会着没有看好自己这他她它们么什为对与及其所之所以可可能被把从向对于关于一二三四五六七八九十百千万亿第年月日时分秒国共产党中国人民社会'])

const hits = []
const re = /[\u4e00-\u9fff]{2,6}/g
let m
while ((m = re.exec(mid))) {
  const w = m[0]
  let worst = null
  for (const c of w) {
    const f = freq.get(c)
    if (f <= THRESH && !SAFE.has(c)) { if (!worst || f < worst.f) worst = { c, f } }
  }
  if (!worst) continue
  const ctx = mid.slice(Math.max(0, m.index - 14), m.index + w.length + 14).replace(/\n/g, '⏎')
  hits.push({ w, c: worst.c, f: worst.f, ctx })
}
console.log(`含低频字（≤${THRESH} 次）的汉字串：${hits.length} 条\n`)
const byChar = new Map()
for (const h of hits) { if (!byChar.has(h.c)) byChar.set(h.c, []); byChar.get(h.c).push(h) }
for (const [c, list] of [...byChar].sort((a, b) => a[1][0].f - b[1][0].f || a[0].localeCompare(b[0]))) {
  console.log(`── ${c}（全区间 ${list[0].f} 次）`)
  for (const h of list) console.log(`   ${h.w.padEnd(6)} | ${h.ctx}`)
}
