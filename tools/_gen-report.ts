/**
 * 生成《政治题库问题清单》markdown。
 * 用法：cd tools && npx tsx _gen-report.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { POLITICS_QUESTIONS } from '../data'

type Q = any
const QS = POLITICS_QUESTIONS as Q[]
const bookOf = (t: string[]) => (t.includes('肖八') ? 'x8' : t.includes('肖四') ? 'x4' : 'sample')
const setOf = (t: string[]) => {
  const x = (t ?? []).find((s) => /^第\d+套$/.test(s))
  return x ? Number(x.slice(1, -1)) : 0
}
const where = (q: Q) => {
  const b = bookOf(q.tags)
  const s = setOf(q.tags)
  const label = b === 'x4' ? '肖四' : b === 'x8' ? '肖八' : '样例题'
  const t = q.type === 'choice' ? '单选' : q.type === 'multi' ? '多选' : '材料'
  return `${label} 第${s}套 · ${t}`
}
const short = (s: string, n = 40) => (s ?? '').replace(/\s+/g, ' ').slice(0, n)

const PLACEHOLDER = /转档缺失|待补充/
const JUNK = /[@桁�□]|①[3?cC]|[0O0][①②③④]|[①②③④]\?/
const OCR_WORDS: [RegExp, string][] = [
  [/深人/g, '深入'], [/收人/g, '收入'], [/融人/g, '融入'], [/千部/g, '干部'], [/苹命/g, '革命'],
  [/磅磷/g, '磅礴'], [/仔务/g, '任务'], [/福证/g, '福祉'], [/选代/g, '迭代'], [/顽痒/g, '顽瘴'],
  [/平买/g, '赎买'], [/身全球/g, '跻身全球'], [/安安全/g, '安全'], [/揽下的家底/g, '攒下的家底'],
  [/不努力、接续/g, '不懈努力、接续'], [/惊涛浪/g, '惊涛骇浪'], [/中流柱/g, '中流砥柱'],
  [/取润/g, '取消'], [/垒断/g, '垄断'], [/谷案/g, '答案'],
]

type F = { cat: string; q: Q; note: string }
const found: F[] = []
const add = (cat: string, q: Q, note: string) => found.push({ cat, q, note })
const cnt = (cat: string) => found.filter((f) => f.cat === cat)

for (const q of QS) {
  const opts: any[] = q.options ?? []
  const pts: string[] = q.answerPoints ?? []
  const stem: string = q.stem ?? ''
  const expl: string = q.explanation ?? ''
  const optText = opts.map((o) => o.text ?? '').join('\n')

  if ((q.type === 'choice' || q.type === 'multi') && opts.length === 0) add('无选项', q, '选项数组为空 → 选项区一片空白，「交卷」按钮永远灰着，只能点「先退出，稍后继续」')
  if (q.type === 'choice' && !q.answerKey) add('无答案', q, 'answerKey 为空字符串')
  if (q.type === 'multi' && !(q.answerKeys ?? []).length) add('无答案', q, 'answerKeys 为空数组 → 无论怎么选都判错')
  if (q.type === 'multi' && (q.answerKeys ?? []).length === 1) add('多选答案只 1 项', q, `answerKeys=[${(q.answerKeys ?? []).join(',')}]，与「至少选两项」的界面提示矛盾`)
  if (q.type === 'material' && !pts.length) add('材料题无参考答案', q, 'answerPoints 缺失，结果页「采分点」为空')
  if (PLACEHOLDER.test(stem)) add('题干缺失', q, `题干是占位符：${stem}`)
  if (PLACEHOLDER.test(expl)) add('解析缺失', q, `解析是占位符：${expl}`)
  if (JUNK.test(optText)) add('选项被 OCR 打坏', q, `选项：${opts.map((o) => o.key + '.' + o.text).join(' / ').replace(/\n/g, ' ')}`)
  const brow = optText.match(/2026\s*考研政治|冲刺\s*[48]?\s*套卷|试题分册|答案及解析分册/)
  if (brow) add('选项混入卷眉/下一题', q, `选项里粘进了卷眉或下一题内容（命中「${brow[0]}」）：…${short(optText.replace(/\n/g, ' ⏎ '), 60)}`)
  else if (optText.length > 160) add('选项过长（疑似未切干净）', q, `选项合计 ${optText.length} 字：…${short(optText.replace(/\n/g, ' ⏎ '), 60)}`)
  if (q.type === 'material' && pts.length) {
    const all = pts.join('') + expl
    if (/[（(]\s*2\s*[)）]/.test(all) && !/[（(]\s*1\s*[)）]/.test(all)) add('材料题(1)答案丢头', q, '有「(2)」却没有「(1)」→ 第(1)问答案的开头整段被 OCR 吃掉')
  }
  if (expl.trim().length > 30 && !/[。！？…）】”"']$/.test(expl.trim())) add('解析被截断', q, `解析结尾：…${short(expl.trim().slice(-30), 30)}`)

  const fc = expl.replace(/\n/g, '').match(/[A-D](?:、[A-D])*正确/)
  if (fc) {
    const letters = [...new Set(fc[0].match(/[A-D]/g) ?? [])]
    const claimed: string[] = q.type === 'choice' ? [q.answerKey] : (q.answerKeys ?? [])
    if (claimed.length && letters.some((l) => !claimed.includes(l))) add('答案与解析矛盾', q, `标准答案 ${claimed.join('')}，解析却说 ${letters.join('')}正确`)
  }
  const sw = expl.match(/(?:^|\n)\s*\d{1,2}\s*[.．、]?\s*[答谷]\s*案\s*[:：]?\s*[A-D]{1,4}\s*(?:简析|解析|点拨)/)
  if (sw) add('解析混入下一题', q, `解析尾部粘上了下一题的答案与简析：${sw[0].replace(/\n/g, ' ⏎ ')}`)

  const hits: string[] = []
  for (const [field, text] of [['题干', stem], ['选项', optText], ['解析', expl], ['采分点', pts.join('\n')], ['材料', (q.material?.paragraphs ?? []).join('\n')]] as [string, string][]) {
    if (!text) continue
    for (const [re, fix] of OCR_WORDS) {
      const m = text.match(re)
      if (m) hits.push(`${field}「${m[0]}」→「${fix}」`)
    }
  }
  if (hits.length) add('OCR 错字', q, [...new Set(hits)].join('；'))
  if (/[\u4e00-\u9fa5][,;:][\u4e00-\u9fa5]/.test([stem, optText, expl, pts.join('\n')].join('\n'))) add('半角标点混排', q, '中文之间夹着半角逗号/冒号（原书是全角）')
}

const CATS = ['无选项', '无答案', '多选答案只 1 项', '材料题无参考答案', '题干缺失', '解析缺失', '答案与解析矛盾', '选项被 OCR 打坏', '选项混入卷眉/下一题', '选项过长（疑似未切干净）', '材料题(1)答案丢头', '解析被截断', '解析混入下一题', 'OCR 错字', '半角标点混排']

const perBook = (cat: string, b: string) => cnt(cat).filter((f) => bookOf(f.q.tags) === b).length

let md = ''
md += `# 政治题库问题清单\n\n`
md += `> 由 \`tools/_gen-report.ts\` 扫描 \`data/politics/questions.ts\` + \`questions-x8.ts\` 生成（**只读扫描，未改动任何数据**）。\n`
md += `> 生成时间：${new Date().toISOString().slice(0, 10)}　题库总计 ${QS.length} 题 = 肖四 152 + 肖八 304 + 样例题 6。\n\n`

md += `## 一、总体结论\n\n`
md += `| 卷 | 题数 | 有问题的题 | 占比 | 状态 |\n|---|---|---|---|---|\n`
const COSMETIC = '半角标点混排'
for (const [b, name] of [['x4', '肖四'], ['x8', '肖八'], ['sample', '样例题']] as const) {
  const ids = new Set(found.filter((f) => bookOf(f.q.tags) === b && f.cat !== COSMETIC).map((f) => f.q.id))
  const idsAll = new Set(found.filter((f) => bookOf(f.q.tags) === b).map((f) => f.q.id))
  const total = QS.filter((q) => bookOf(q.tags) === b).length
  const state = b === 'x4'
    ? '**能用**：无结构性问题，主要是 20 道材料题答案缺开头 + 25 处错字'
    : b === 'x8'
      ? '**基本不可用**：8 套里没有一套是完整的'
      : '无内容问题'
  md += `| ${name} | ${total} | ${ids.size}（+${idsAll.size - ids.size} 题仅排版） | ${Math.round((ids.size / total) * 100)}% | ${state} |\n`
}
md += `\n`

md += `## 二、问题分类计数\n\n`
md += `| 问题 | 肖四 | 肖八 | 样例题 | 说明 |\n|---|---|---|---|---|\n`
const DESC: Record<string, string> = {
  '无选项': '选项数组为空 → 选项区一片空白，「交卷」永远灰着，只能点「先退出」',
  '无答案': 'answerKey / answerKeys 为空 → 多选永远判错；单选无法交卷',
  '多选答案只 1 项': '与界面「至少选两项」提示矛盾',
  '材料题无参考答案': '结果页「采分点」区块为空，材料题失去意义',
  '题干缺失': '题干是「【OCR 转档缺失 · 题干待补充】」占位符，直接显示给用户',
  '解析缺失': '解析是「（解析转档缺失，请对照纸质版答案解析）」占位符',
  '答案与解析矛盾': '**标准答案和解析指向不同的选项**，至少有一个是错的',
  '选项被 OCR 打坏': '①②③④ 组合选项被识别成 @ / 0 / ?',
  '选项混入卷眉/下一题': '选项里粘进了「2026考研政治冲刺8套卷」卷眉或下一题内容',
  '选项过长（疑似未切干净）': '四个选项加起来 160 字以上，通常意味着切分时把别的内容也吞进来了（低优先）',
  '材料题(1)答案丢头': '答案里只剩「(2)」，第(1)问的开头整段丢失',
  '解析被截断': '解析结尾断在半句话上',
  '解析混入下一题': '解析尾部粘上了下一题的「答案 + 简析」',
  'OCR 错字': '形近字误识（深人/垒断/融人…）',
  '半角标点混排': '中文之间夹半角逗号冒号，排版不一致',
}
for (const c of CATS) {
  md += `| ${c} | ${perBook(c, 'x4')} | ${perBook(c, 'x8')} | ${perBook(c, 'sample')} | ${DESC[c]} |\n`
}
md += `\n`

md += `## 三、按套看肖八（问题最集中）\n\n`
md += `| 卷 | 单选 | 多选 | 材料 | 有硬伤 | 最严重的情况 |\n|---|---|---|---|---|---|\n`
for (let s = 1; s <= 8; s++) {
  const qs = QS.filter((q) => bookOf(q.tags) === 'x8' && setOf(q.tags) === s)
  const bad = new Set(found.filter((f) => bookOf(f.q.tags) === 'x8' && setOf(f.q.tags) === s && f.cat !== '半角标点混排').map((f) => f.q.id))
  const noStem = qs.filter((q) => PLACEHOLDER.test(q.stem)).length
  const noExpl = qs.filter((q) => PLACEHOLDER.test(q.explanation)).length
  const worst = s === 6 ? '第 1~16 题（单选）题干/选项/答案/解析**全部缺失**' : noExpl >= 5 ? `${noExpl} 题解析缺失、${noStem} 题题干缺失` : `${noExpl} 题解析缺失`
  md += `| 第${s}套 | 16 | 17 | 5 | ${bad.size}/38 | ${worst} |\n`
}
md += `\n`

/* 逐类明细 */
md += `## 四、逐类明细\n\n`
const LIST_CATS = ['无选项', '无答案', '多选答案只 1 项', '材料题无参考答案', '题干缺失', '解析缺失', '答案与解析矛盾', '选项被 OCR 打坏', '选项混入卷眉/下一题', '选项过长（疑似未切干净）', '材料题(1)答案丢头', '解析被截断', '解析混入下一题', 'OCR 错字']
/** 同一类里「说明」逐题不同的，才逐条列；说明同质的按「套」归并成一行 id 清单 */
const UNIFORM = new Set(['无选项', '无答案', '多选答案只 1 项', '材料题无参考答案', '题干缺失', '解析缺失', '半角标点混排'])
for (const c of LIST_CATS) {
  const list = cnt(c)
  if (!list.length) continue
  md += `### ${c}（${list.length} 题）\n\n`
  if (UNIFORM.has(c)) {
    md += `${list[0].note}\n\n`
    const groups = new Map<string, string[]>()
    for (const f of list) {
      const k = where(f.q).replace(/ · .*/, '')
      groups.set(k, [...(groups.get(k) ?? []), f.q.id])
    }
    for (const [k, ids] of groups) md += `- **${k}**（${ids.length}）：\`${ids.join('\`, \`')}\`\n`
  } else {
    for (const f of list) md += `- \`${f.q.id}\`　${where(f.q)}　${f.note}\n`
  }
  md += `\n`
}

md += `### 半角标点混排（${cnt('半角标点混排').length} 题，仅影响排版）\n\n`
md += `涉及 ${cnt('半角标点混排').length} 题，逐条见 \`tools/_audit-politics.out\`。抽样：\n\n`
for (const f of cnt('半角标点混排').slice(0, 5)) {
  const t = [f.q.stem, f.q.explanation].join(' ')
  const m = t.match(/[\u4e00-\u9fa5][,;:][\u4e00-\u9fa5]/)
  md += `- \`${f.q.id}\`　例：…${t.slice(Math.max(0, (m?.index ?? 0) - 8), (m?.index ?? 0) + 10)}…\n`
}
md += `\n`

const badOf = (b: string) => new Set(found.filter((f) => bookOf(f.q.tags) === b && f.cat !== '半角标点混排').map((f) => f.q.id)).size
md += `## 五、建议的处理顺序\n\n`
md += `1. **先决定肖八去留**。肖八 304 题里 **${badOf('x8')} 题**有硬伤：40 道材料题**全部**没有参考答案、163 题没有解析、47 题没有题干、49 题没有选项。\n`
md += `   与其在 App 里放一半残缺的题，不如先把肖八整体下架（或只保留完好的单选/多选），等重新转档后再上。\n`
md += `   注意：题库总量现在是 **462 题**（肖四 152 + 肖八 304 + 样例题 6），首页卡片和「我的」里的进度百分比都按这个数算——\n`
md += `   如果下架肖八，记得同步改 \`data/generated/app/catalog.ts\` 里的 \`appPoliticsQuestionTotal\`，否则进度环永远填不满。\n`
md += `2. **肖四的 20 道材料题补答案开头**。采分点都只剩「(2)」以后的内容，第(1)问的开头整段丢了，必须对照纸质版补。\n`
md += `3. **逐条复核「答案与解析矛盾」的 ${cnt('答案与解析矛盾').length} 题**（全在肖八）。这类题解析和标准答案指向不同选项，用户会看到「答对了但解析说你错了」。\n`
md += `4. **修 OCR 错字**（肖四 ${perBook('OCR 错字', 'x4')} 处、肖八 ${perBook('OCR 错字', 'x8')} 处），多数是形近字：深人→深入、垒断→垄断、融人→融入、收人→收入、千部→干部。\n`
md += `5. **补全 \`q-maozhongte-31\`（肖四 第3套）的选项**：①②③④ 被识别成了 @。\n`
md += `6. **改 \`q-shigang-21\`（肖四 第3套）的解析**：尾部粘上了第 9 题的答案与简析。\n`
md += `7. **最后统一半角标点**（${cnt('半角标点混排').length} 题）。纯排版问题，可以脚本批量替换。\n\n`
md += `## 六、附：本次扫描的复现方式\n\n`
md += '```bash\n'
md += `cd tools && npx tsx _audit-politics.ts > _audit-politics.out   # 全量扫描，逐题明细\n`
md += `cd tools && npx tsx _byset.ts                 # 按套统计硬伤\n`
md += `cd tools && npx tsx _dist.ts                  # 答案分布（查是否整体串位）\n`
md += `cd tools && npx tsx _show-q.ts <id> ...        # 打印某几题的完整记录\n`
md += '```\n\n'
md += `> 说明：「解析与题干无关（张冠李戴）」的判断基于题干与解析的 4-gram 重合率，\n`
md += `> 对「解析不引用题干原文」的题会有误报，所以本清单**没有**把它单独列为一类，\n`
md += `> 只把与「答案与解析矛盾」重合的那部分计入。完整判定见 \`tools/_audit-politics.out\`。\n`

const out = path.resolve(process.cwd(), '..', '政治题库问题清单.md')
fs.writeFileSync(out, md, 'utf8')
console.log('written:', out, md.length, 'chars')
