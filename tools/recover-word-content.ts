/**
 * 一次性恢复脚本：从构建产物 pages-words/words.ts 反向重建 data/english/word-content.ts。
 *
 * **已经跑过了**（2026-09-16），产出 95 词、batch-1 18 / batch-2 77。
 * 留着是为了：万一 `word-content.ts` 再被误删，只要 `pages-words/words.ts` 还在就能重建。
 * 正常流程**不要**跑它 —— 它会整文件覆盖 `data/english/word-content.ts`，
 * 如果那之后你又手写了新词条，会被冲掉。
 *
 * 背景：word-content.ts 是人工撰写的深度内容（例句/词根/助记/搭配），
 * 但它当时还没入库，被误删了。所幸构建产物 pages-words/words.ts 里
 * 已经把深度内容按词条存了下来，字段一一对应，可以完整还原。
 *
 * 字段映射（产物 → 源）：
 *   examples[].sentence / translation  → WordExample.sentence / translationZh
 *   root.display / explanation         → WordRoot.display / explanation
 *   mnemonic                           → mnemonic
 *   collocations[].phrase / meaning    → collocations[].phrase / meaningZh
 *
 * 批次（BATCHES）在产物里没有留痕，改为**从设计稿源码直接抽取**：
 *   batch-1 = 设计稿 `const vocabulary = [...]` 里的那 18 词（按原型顺序）；
 *   batch-2 = 其余全部。
 * 注意：不要硬编码批次词表 —— 之前硬编码过一版，词全错，导致批次划分变成 17/78。
 * 设计稿路径可用环境变量 `OD_DESIGN_FILE` 覆盖。
 *
 * 用法：cd tools && npx tsx recover-word-content.ts
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'pages-words', 'words.ts')
const OUT = path.join(ROOT, 'data', 'english', 'word-content.ts')

/** 设计稿文件：batch-1 的词表以它为准（原型里 `const vocabulary = [...]` 那一段）。 */
const DESIGN_FILE =
  process.env.OD_DESIGN_FILE ||
  'C:/Users/imxia/AppData/Roaming/Open Design/namespaces/release-stable-win/data/projects/ci-shu-tong-xing-mini-program/ci-shu-tong-xing.html'

function readPrototypeWords(): string[] {
  if (!fs.existsSync(DESIGN_FILE)) {
    throw new Error(`找不到设计稿，无法确定 batch-1 词表：${DESIGN_FILE}`)
  }
  const html = fs.readFileSync(DESIGN_FILE, 'utf8')
  const start = html.indexOf('const vocabulary = [')
  if (start < 0) throw new Error('设计稿里找不到 `const vocabulary = [`')
  const end = html.indexOf('\n]', start)
  if (end < 0) throw new Error('设计稿里找不到 vocabulary 数组结尾')
  const seg = html.slice(start, end)
  const words = [...seg.matchAll(/\{word:'([^']+)'/g)].map((m) => m[1].toLowerCase())
  if (!words.length) throw new Error('设计稿 vocabulary 里没解析到任何词')
  return words
}

const raw = fs.readFileSync(SRC, 'utf8')
// 数组声明式：export const appWords: AppWord[] = [ ... ]
// 注意类型里也有 []，要锚定 "= [" 之后的那一个
const decl = raw.indexOf('export const appWords')
if (decl < 0) throw new Error('找不到 appWords 声明')
const eq = raw.indexOf('= [', decl)
if (eq < 0) throw new Error('找不到数组字面量起点')
const start = eq + 2
const end = raw.lastIndexOf(']')
const items = JSON.parse(raw.slice(start, end + 1)) as Array<Record<string, any>>

interface Entry {
  word: string
  examples: { sentence: string; translation: string }[]
  root?: { display: string; explanation: string }
  mnemonic?: string
  collocations?: { phrase: string; meaning: string }[]
}

const enriched = items.filter((w) => Array.isArray(w.examples) && w.examples.length > 0) as unknown as Entry[]
console.log(`构建产物里含深度内容的词条：${enriched.length}`)

// 数字典序，保证生成稳定
enriched.sort((a, b) => a.word.localeCompare(b.word))

const lines: string[] = []
lines.push(`/**
 * 单词深度内容（**人工撰写，不是生成物**）。
 *
 * 为什么单独放一个文件：\`words.ts\` 是自动生成的纯词表（word / ipa / pos / meaning），
 * 没有例句、词根、助记和搭配。这四类内容需要逐条撰写，因此按**小写词形**单独索引，
 * 由 \`tools/build-content.ts\` 在构建时并入词库。
 *
 * 约定：
 *   - 键必须是小写词形，且必须能在 words.ts 里找到；找不到构建会直接报错（不静默忽略）。
 *   - 四个字段（examples / root / mnemonic / collocations）都要写全，
 *     缺一项在详情页就是空态（已有自检脚本会断言）。
 *   - 每次扩充一批，把词清单登记到 \`BATCHES\`，构建和校验都会打印覆盖率。
 *
 * 本文件由恢复脚本从构建产物重建，字段与原文一一对应。
 */`)

lines.push('')
lines.push('export interface WordExample {')
lines.push('  sentence: string')
lines.push('  translationZh: string')
lines.push('}')
lines.push('')
lines.push('export interface WordRoot {')
lines.push('  display: string')
lines.push('  explanation: string')
lines.push('}')
lines.push('')
lines.push('export interface WordCollocation {')
lines.push('  phrase: string')
lines.push('  meaningZh: string')
lines.push('}')
lines.push('')
lines.push('export interface WordContent {')
lines.push('  root?: WordRoot')
lines.push('  mnemonic?: string')
lines.push('  examples: WordExample[]')
lines.push('  collocations: WordCollocation[]')
lines.push('}')
lines.push('')

// BATCHES：batch-1 = 设计稿原型那 18 词（按原型顺序，含原型有但词表里没有的会被报错拦下），
// 其余归 batch-2（按字典序）
const PROTOTYPE_WORDS = readPrototypeWords()
console.log(`设计稿原型词表：${PROTOTYPE_WORDS.length} 词`)

const enrichedSet = new Set(enriched.map((e) => e.word))
const missingInWordList = PROTOTYPE_WORDS.filter((w) => !enrichedSet.has(w))
if (missingInWordList.length) {
  throw new Error(`原型词表里有 ${missingInWordList.length} 个词在构建产物里找不到深度内容：${missingInWordList.join(', ')}`)
}

const batch1 = PROTOTYPE_WORDS.filter((w) => enrichedSet.has(w))
const batch1Set = new Set(batch1)
const batch2 = enriched.filter((e) => !batch1Set.has(e.word)).map((e) => e.word)
if (batch1.length + batch2.length !== enriched.length) {
  throw new Error(`批次划分不守恒：${batch1.length} + ${batch2.length} ≠ ${enriched.length}`)
}

const fmtList = (arr: string[], perLine = 6, indent = '    ') => {
  const rows: string[] = []
  for (let i = 0; i < arr.length; i += perLine) {
    rows.push(indent + arr.slice(i, i + perLine).map((w) => `'${w}'`).join(', ') + ',')
  }
  return rows.join('\n').replace(/,$/, '')
}

lines.push('/** 已完成的批次。构建与校验会读取它打印覆盖率。 */')
lines.push('export const BATCHES: { id: string; label: string; words: string[] }[] = [')
lines.push('  {')
lines.push("    id: 'batch-1',")
lines.push(`    label: '设计稿原型 ${PROTOTYPE_WORDS.length} 词（transcribed from 设计稿）',`)
lines.push('    words: [')
lines.push(fmtList(batch1))
lines.push('    ],')
lines.push('  },')
lines.push('  {')
lines.push("    id: 'batch-2',")
lines.push("    label: '高频核心词（阅读/写作最常遇到）',")
lines.push('    words: [')
lines.push(fmtList(batch2))
lines.push('    ],')
lines.push('  },')
lines.push(']')
lines.push('')

lines.push('export const WORD_CONTENT: Record<string, WordContent> = {')
for (const e of enriched) {
  const key = e.word.toLowerCase()
  const parts: string[] = []
  if (e.root) {
    parts.push(`    root: { display: ${JSON.stringify(e.root.display)}, explanation: ${JSON.stringify(e.root.explanation)} },`)
  }
  if (e.mnemonic) parts.push(`    mnemonic: ${JSON.stringify(e.mnemonic)},`)
  parts.push('    examples: [')
  for (const ex of e.examples) {
    parts.push(`      { sentence: ${JSON.stringify(ex.sentence)}, translationZh: ${JSON.stringify(ex.translation)} },`)
  }
  parts.push('    ],')
  parts.push('    collocations: [')
  for (const c of e.collocations || []) {
    parts.push(`      { phrase: ${JSON.stringify(c.phrase)}, meaningZh: ${JSON.stringify(c.meaning)} },`)
  }
  parts.push('    ],')
  lines.push(`  ${key}: {`)
  lines.push(...parts)
  lines.push('  },')
}
lines.push('}')
lines.push('')

fs.writeFileSync(OUT, lines.join('\n'), 'utf8')
console.log(`已重建 → ${path.relative(ROOT, OUT)}`)
console.log(`  batch-1: ${batch1.length} 词`)
console.log(`  batch-2: ${batch2.length} 词`)
console.log(`  合计:   ${enriched.length} 词`)
