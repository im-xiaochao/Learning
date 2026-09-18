/**
 * 政治题库内容审计 v3（只读，不改数据）。
 * 用法：cd tools && npx tsx _audit2.ts
 */
import { POLITICS_QUESTIONS } from '../data'

type Q = any
const QS = POLITICS_QUESTIONS as Q[]

const bookOf = (tags: string[]) => (tags.includes('肖八') ? 'x8' : tags.includes('肖四') ? 'x4' : 'sample')
const setOf = (tags: string[]) => {
  const t = (tags ?? []).find((x) => /^第\d+套$/.test(x))
  return t ? Number(t.slice(1, -1)) : 0
}
const clean = (s: string) => (s ?? '').replace(/[\s，。、；：（）“”‘’《》,.;:()"'?!！？①②③④\-—]/g, '')
function gramOverlap(a: string, b: string, n = 4): number {
  const A = clean(a)
  const B = clean(b)
  if (A.length < n) return -1
  const setB = new Set<string>()
  for (let i = 0; i + n <= B.length; i++) setB.add(B.slice(i, i + n))
  let hit = 0
  let total = 0
  for (let i = 0; i + n <= A.length; i++) {
    total++
    if (setB.has(A.slice(i, i + n))) hit++
  }
  return total ? hit / total : -1
}

const PLACEHOLDER = /转档缺失|待补充|待校正|TODO|待定/
const JUNK = /[@桁�□]|①[3?cC]|[0O0][①②③④]|[①②③④]\?|③c|①3/

/**
 * OCR 形近字 / 缺字 / 错字表。
 * 维护规则：每修一批就把「错 → 对」补进来，后续重跑审计即可防回归。
 * 注意别写出会命中正确写法的正则（例：「身全球」要排除「跻身全球」）。
 */
const OCR_WORDS: [RegExp, string][] = [
  // —— 形近字 ——
  [/深人/g, '深入'], [/收人/g, '收入'], [/融人/g, '融入'], [/千部/g, '干部'],
  [/苹命/g, '革命'], [/磅磷/g, '磅礴'], [/仔务/g, '任务'], [/福证/g, '福祉'],
  [/选代/g, '迭代'], [/顽痒/g, '顽瘴'], [/平买/g, '赎买'], [/安安全/g, '安全'],
  [/简桁/g, '（乱码）'], [/揽下的家底/g, '攒下的家底'], [/不努力、接续/g, '不懈努力、接续'],
  [/惊涛浪/g, '惊涛骇浪'], [/中流柱/g, '中流砥柱'], [/取润/g, '取消'], [/垒断/g, '垄断'],
  [/谷案/g, '答案'], [/(?<!跻)身全球/g, '跻身全球'], [/嬉变/g, '嬗变'], [/硚身/g, '跻身'],
  [/县花/g, '昙花'], [/天折/g, '夭折'], [/侣议/g, '倡议'], [/休成与共/g, '休戚与共'],
  [/猛烈秤击/g, '猛烈抨击'], [/公共秋秩序/g, '公共秩序'], [/广衰的宇宙/g, '广袤的宇宙'],
  [/合作共嬴/g, '合作共赢'], [/常抓不邂/g, '常抓不懈'], [/资源票赋/g, '资源禀赋'],
  [/踏厉奋发/g, '踔厉奋发'], [/(?<!砥)砺前行/g, '砥砺前行'], [/人列授旗/g, '入列授旗'],
  [/成边支教/g, '戍边支教'], [/禁思想进步的闸/g, '禁锢思想进步的闸'], [/惟幕/g, '帷幕'],
  [/剥\s*前程度/g, '剥削程度'], [/侮化/g, '僵化'], [/般切期盼/g, '殷切期盼'],
  [/炎热署期/g, '暑期'], [/盲目蛮千/g, '盲目蛮干'], [/跛方步/g, '踱方步'],
  [/廣续/g, '赓续'], [/薪新/g, '崭新'], [/博亚洲论坛/g, '博鳌亚洲论坛'],
  [/COP30O/g, 'COP30'], [/为博服球/g, '为博眼球'], [/百争流/g, '百舸争流'],
  [/奕近/g, '奕䜣'], [/官你习气/g, '官僚习气'], [/避守之上/g, '遵守之上'],
  [/推行权主义/g, '推行霸权主义'],
  [/中流磁柱/g, '中流砥柱'], [/快择/g, '抉择'], [/(?<!救)亡图存/g, '救亡图存'],
  [/学发出钟/g, '党发出警钟'],
  // —— 缺字 ——
  [/挺担当/g, '挺膺担当'], [/顽瘴疾/g, '顽瘴痼疾'], [/(?<!蓬)勃发展/g, '蓬勃发展'],
  [/磅力量/g, '磅礴力量'], [/大气磅、/g, '大气磅礴、'], [/露骨挑言论/g, '露骨挑衅言论'],
  [/公然挑(?![战衅])/g, '公然挑衅'], [/停止挑越线/g, '停止挑衅越线'],
  [/收\s*人水平/g, '收入水平'], [/侮化/g, '僵化'], [/惟幕/g, '帷幕'],
  // —— 题干/材料里扫出来的（第九轮） ——
  [/国绕/g, '围绕'], [/总千事/g, '总干事'], [/侣导/g, '倡导'], [/登加/g, '叠加'],
  [/宜言书/g, '宣言书'], [/封建思想人手/g, '封建思想入手'],
  [/资源赋/g, '资源禀赋'], [/恒星残(?!骸)/g, '恒星残骸'],
  [/一个(?!崭)新课题/g, '一个崭新课题'], [/、做先锋/g, '、敢做先锋'],
  [/(?<!防)止思想化/g, '防止思想僵化'],
  // —— 入 / 人 ——
  [/投人/g, '投入'], [/转人/g, '转入'], [/陷人/g, '陷入'], [/人侵/g, '入侵'],
  [/介人/g, '介入'], [/侵人/g, '侵入'], [/注人/g, '注入'], [/涌人/g, '涌入'],
  [/迈人/g, '迈入'],
  [/(?<!促)进人(?=社会主义建设|21世纪|空前密集|比较系统|了一个新的阶段|新阶段|了法治化)/g, '进入'],
]

type Row = { id: string; book: string; set: number; type: string; tags: string[]; probs: string[] }
const rows: Row[] = []
const push = (id: string, book: string, set: number, type: string, tags: string[], p: string) => {
  const r = rows.find((r) => r.id === id)
  if (r) r.probs.push(p)
  else rows.push({ id, book, set, type, tags, probs: [p] })
}

const idSeen = new Map<string, number>()
const stemSeen = new Map<string, string[]>()
const cnt: Record<string, number> = {}
const bump = (k: string, n = 1) => (cnt[k] = (cnt[k] ?? 0) + n)

for (const q of QS) {
  const book = bookOf(q.tags)
  const set = setOf(q.tags)
  const P = (s: string) => push(q.id, book, set, q.type, q.tags, s)
  idSeen.set(q.id, (idSeen.get(q.id) ?? 0) + 1)

  const stem: string = q.stem ?? ''
  const expl: string = q.explanation ?? ''
  const opts: any[] = q.options ?? []
  const pts: string[] = q.answerPoints ?? []
  const paras: string[] = q.material?.paragraphs ?? []
  const optText = opts.map((o) => o.text ?? '').join('\n')

  if (!stem.trim()) { bump('题干为空'); P('题干为空') }

  if (q.type === 'choice' || q.type === 'multi') {
    if (opts.length === 0) { bump('选项数组为空'); P('选项数组为空 → 无法作答，交卷按钮永远灰着') }
    else if (opts.length !== 4) { bump('选项数≠4'); P(`选项 ${opts.length} 个（卷面应为 4）`) }
    if (new Set(opts.map((o) => o.key)).size !== opts.length) P('选项 key 重复')
    if (opts.some((o) => !String(o.text ?? '').trim())) P('存在空选项文本')
  }
  if (q.type === 'choice') {
    if (!q.answerKey) { bump('answerKey 为空'); P('answerKey 为空') }
    else if (!opts.some((o) => o.key === q.answerKey)) { bump('答案不在选项里'); P(`answerKey="${q.answerKey}" 不在选项里`) }
  }
  if (q.type === 'multi') {
    const ks: string[] = q.answerKeys ?? []
    if (!ks.length) { bump('answerKeys 为空'); P('answerKeys 为空数组') }
    else {
      if (ks.length < 2) { bump('多选答案<2'); P(`answerKeys 只有 1 项：${ks.join(',')}`) }
      for (const k of ks) if (!opts.some((o) => o.key === k)) { bump('答案不在选项里'); P(`answerKeys 含不存在的 ${k}`) }
    }
  }
  if (q.type === 'material') {
    if (!paras.length) { bump('材料无段落'); P('材料段落为空') }
    const subN = (stem.match(/[（(]\s*[1-9]\s*[)）]/g) ?? []).length
    // 样例题是自编的单问示范（「结合材料，说明…」），题干本来就没有 (1)(2)，
    // 不能拿真题的「两小问」标准去卡它。
    if (subN < 2 && book !== 'sample') { bump('材料题小问缺失'); P(`题干只认出 ${subN} 个小问标记（应为 2）`) }
    if (!pts.length) { bump('材料缺参考答案'); P('answerPoints 缺失（结果页采分点为空）') }
    else {
      // 肖八的材料题只有 (1)(2) 两问，肖四是 4~7 个细采分点，所以下限按题干的小问数走，
      // 不能一律用 3（会给出 40 条假警报）。
      const wantPts = Math.max(2, subN)
      if (pts.length < wantPts) P(`采分点仅 ${pts.length} 条（题干 ${subN} 问）`)
      const all = pts.join('') + expl
      const has1 = /[（(]\s*1\s*[)）]/.test(all)
      const has2 = /[（(]\s*2\s*[)）]/.test(all)
      if (has2 && !has1) { bump('材料题(1)答案丢头'); P('有「(2)」却没有「(1)」→ 第(1)问答案开头整段丢失') }
      const apJ = pts.join('')
      if (apJ.length > 60 && expl.includes(apJ.slice(0, 60)) && Math.abs(apJ.length - expl.length) < 80) {
        // 不是缺陷：PDF 只给一份参考答案，转档时既存进 answerPoints 又存进 explanation。
        // pages-politics/question/question.vue 的 showExplanation 会在重合 ≥90% 时
        // 只渲染「采分点」，所以这里只计数、不算问题。
        bump('采分点=解析（页面已自动隐藏）')
      }
    }
  }
  if (!expl.trim()) { bump('解析为空'); P('解析为空') }
  else if (expl.trim().length < 20) { bump('解析过短'); P(`解析仅 ${expl.trim().length} 字：${expl.trim()}`) }

  if (PLACEHOLDER.test(stem)) { bump('题干占位'); P(`题干占位：${stem.match(PLACEHOLDER)?.[0]}`) }
  if (PLACEHOLDER.test(expl)) { bump('解析占位'); P(`解析占位：${expl.match(PLACEHOLDER)?.[0]}`) }
  if (paras.some((p) => PLACEHOLDER.test(p))) P('材料段落含占位符')
  if (PLACEHOLDER.test(optText)) P('选项含占位符')
  if (/2026考研政治|冲刺8套卷|8套卷（[一二三四五六七八]）/.test(stem)) P('题干里混入卷眉/页码')
  if (optText.length > 160 || /2026考研政治|冲刺8套卷/.test(optText)) { bump('选项混入下一题'); P('选项里混入下一题题干/卷眉') }
  if (JUNK.test(optText)) { bump('选项乱码'); P(`选项被 OCR 打坏：${optText.replace(/\n/g, ' ').slice(0, 40)}`) }

  // 解析里「哪些选项对」的三种写法：`A、B正确` / `A、B、C、D全选` / `本题选D`。
  // 只看第一种会把「全选」「本题选X」判成「解析与本题无关」（假警报）。
  const flatExpl = expl.replace(/\n/g, '')
  const correctPat = flatExpl.match(/[A-D](?:、[A-D])*正确/)
  const allSelPat = flatExpl.match(/[A-D](?:、[A-D])+全选/)
  const pickPat = flatExpl.match(/本题选\s*([A-D](?:\s*[A-D])*)/)
  const letters: string[] = [
    ...new Set(((correctPat?.[0] ?? allSelPat?.[0] ?? pickPat?.[1] ?? '').match(/[A-D]/g) ?? [])),
  ]
  const claimed: string[] = q.type === 'choice' ? [q.answerKey] : (q.answerKeys ?? [])
  if (q.type !== 'material' && book !== 'sample' && stem.length > 25 && expl.length > 40) {
    // 材料题的 stem 是「小问」、expl 是「参考答案」，两者本来就少有 4-gram 重合，不能这样判。
    // 样例题的解析是手写意译（「多数人的意见可能错（A 错）」），也天然与题干不重合，同样豁免。
    const ov = gramOverlap(stem, expl)
    const consistent = letters.length > 0 && letters.some((f) => claimed.includes(f))
    if (ov >= 0 && ov < 0.005 && !consistent) {
      bump('解析张冠李戴')
      P(`解析与本题无关（4-gram 重合 ${(ov * 100).toFixed(2)}%）`)
    }
  }
  if (letters.length) {
    const bad = letters.filter((l) => claimed.length && !claimed.includes(l))
    if (bad.length) { bump('答案/解析冲突'); P(`标准答案 ${claimed.join('')}，但解析称 ${letters.join('')}正确`) }
  }
  const sw = expl.match(/(?:^|\n)\s*\d{1,2}\s*[.．、]?\s*[答谷]\s*案\s*[:：]?\s*[A-D]{1,4}\s*(?:简析|解析|点拨)/)
  if (sw) { bump('解析混入下一题'); P(`解析尾部混入下一题答案/简析：${sw[0].replace(/\n/g, '⏎').slice(0, 22)}`) }

  for (const [field, text] of [['题干', stem], ['选项', optText], ['解析', expl], ['采分点', pts.join('\n')], ['材料', paras.join('\n')]] as [string, string][]) {
    if (!text) continue
    for (const [re, fix] of OCR_WORDS) {
      const m = text.match(re)
      if (m) {
        bump('OCR 错字')
        P(`${field}错字「${m[0]}」→ 应为「${fix}」`)
        break
      }
    }
  }

  if (/[\u4e00-\u9fa5][,;:][\u4e00-\u9fa5]/.test([stem, optText, expl, pts.join('\n'), paras.join('\n')].join('\n'))) bump('半角标点')
  if (expl.trim().length > 30 && !/[。！？…）】”"']$/.test(expl.trim())) { bump('解析截断'); P(`解析结尾疑似截断：「…${expl.trim().slice(-16)}」`) }

  // 题干重复要按**完整题干**比。只比前 30 字会把「同一段引文导语 + 不同设问」
  // 判成重复（肖四/肖八大量题目共用导语），实测全是假警报。
  const k = clean(stem)
  if (k.length >= 20) stemSeen.set(k, [...(stemSeen.get(k) ?? []), q.id])
}

const byId = new Map(QS.map((q) => [q.id, q]))
const bookOfIds = (ids: string[]) => {
  // 一条重复项可能横跨两本书（肖四 ↔ 肖八），按「非样例题优先」归卷，
  // 否则所有跨书重复都会被算进 sample，掩盖真实的归属。
  const bs = ids.map((i) => bookOf(byId.get(i)?.tags ?? [])).filter((b) => b !== 'sample')
  return bs[0] ?? 'sample'
}
const tagOfIds = (ids: string[]) => byId.get(ids[0])?.tags ?? []

for (const [id, n] of idSeen) if (n > 1) push(id, 'sample', 0, '?', [], `id 重复 ${n} 次`)
for (const [k, ids] of stemSeen) {
  if (ids.length <= 1) continue
  push(ids.join('+'), bookOfIds(ids), setOf(tagOfIds(ids)), '?', tagOfIds(ids), `题干重复：${ids.join(', ')}`)
}

const byBook: Record<string, Row[]> = { x4: [], x8: [], sample: [] }
for (const r of rows) (byBook[r.book] ??= []).push(r)

console.log(`总题数 ${QS.length}`)
console.log('\n【问题分类计数】')
for (const [k, v] of Object.entries(cnt).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(18)} ${v}`)

const KINDS: [string, RegExp][] = [
  ['选项数组为空', /选项数组为空/],
  ['选项数≠4', /选项 \d+ 个/],
  ['答案为空', /answerKey 为空|answerKeys 为空/],
  ['多选答案<2', /只有 1 项/],
  ['答案不在选项里', /不在选项里|不存在的/],
  ['材料缺参考答案', /answerPoints 缺失/],
  ['材料采分点过少', /采分点仅/],
  ['材料题小问缺失', /只认出 \d+ 个小问/],
  ['材料题(1)答案丢头', /没有「\(1\)」/],
  ['采分点=解析(重复)', /重复显示两遍/],
  ['题干占位/缺失', /题干占位|题干为空/],
  ['解析占位/缺失', /解析占位|解析为空|解析仅/],
  ['选项被 OCR 打坏', /OCR 打坏/],
  ['选项混入下一题', /选项里混入/],
  ['解析张冠李戴', /解析与本题无关/],
  ['答案/解析冲突', /但解析称/],
  ['解析混入下一题', /解析尾部混入/],
  ['OCR 错字', /错字「/],
  ['解析截断', /结尾疑似截断/],
  ['题干重复', /题干重复/],
]
console.log('\n【分卷 × 问题类型】')
console.log('  ' + ['问题'.padEnd(20), '肖四'.padStart(6), '肖八'.padStart(6), '样例题'.padStart(8)].join(''))
for (const [label, re] of KINDS) {
  const cells = ['x4', 'x8', 'sample'].map((b) => String((byBook[b] ?? []).filter((r) => r.probs.some((p) => re.test(p))).length).padStart(b === 'sample' ? 8 : 6))
  console.log('  ' + [label.padEnd(20), ...cells].join(''))
}

for (const book of ['x8', 'x4', 'sample'] as const) {
  const list = byBook[book] ?? []
  if (!list.length) continue
  console.log(`\n${'='.repeat(76)}\n${book} 有问题 ${list.length} 题\n${'='.repeat(76)}`)
  for (const r of [...list].sort((a, b) => a.set - b.set || a.id.localeCompare(b.id))) {
    const tag = r.tags.filter((t) => !['肖四', '肖八'].includes(t)).join('/')
    console.log(`  ${r.id.padEnd(20)} ${(tag || '重复项').padEnd(14)} ${r.probs.join(' | ')}`)
  }
}
