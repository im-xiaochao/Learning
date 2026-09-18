import { POLITICS_QUESTIONS } from '../data'
const isX4 = (t: string[]) => t.includes('肖四')
const OCR: [RegExp, string][] = [
  [/深人/g, '深入'], [/收人/g, '收入'], [/融人/g, '融入'], [/千部/g, '干部'], [/苹命/g, '革命'],
  [/磅磷/g, '磅礴'], [/仔务/g, '任务'], [/福证/g, '福祉'], [/选代/g, '迭代'], [/顽痒/g, '顽瘴'],
  [/平买/g, '赎买'], [/身全球/g, '跻身全球'], [/安安全/g, '安全'], [/揽下的家底/g, '攒下的家底'],
  [/不努力、接续/g, '不懈努力、接续'], [/惊涛浪/g, '惊涛骇浪'], [/中流柱/g, '中流砥柱'],
  [/取润/g, '取消'], [/垒断/g, '垄断'], [/谷案/g, '答案'],
]
const IDS = process.argv.slice(2)
for (const q of POLITICS_QUESTIONS as any[]) {
  if (!isX4(q.tags)) continue
  if (IDS.length && !IDS.includes(q.id)) continue
  const probs: string[] = []
  for (const [f, t] of [['stem', q.stem], ['expl', q.explanation], ['opts', (q.options ?? []).map((o: any) => o.key + '.' + o.text).join(' | ')], ['pts', (q.answerPoints ?? []).join(' | ')], ['mat', (q.material?.paragraphs ?? []).join(' | ')]] as [string, string][]) {
    for (const [re, fix] of OCR) if (re.test(t ?? '')) probs.push(`${f}:${re.source}→${fix}`)
  }
  if (/[\u4e00-\u9fa5][,;:][\u4e00-\u9fa5]/.test([q.stem, q.explanation, (q.options ?? []).map((o: any) => o.text).join('')].join(''))) probs.push('半角标点')
  if (q.explanation && !/[。！？…）】”"']$/.test(q.explanation.trim())) probs.push('解析尾截断')
  if (q.type === 'material') {
    const all = (q.answerPoints ?? []).join('') + q.explanation
    if (/[（(]\s*2\s*[)）]/.test(all) && !/[（(]\s*1\s*[)）]/.test(all)) probs.push('材料(1)丢头')
  }
  if (!probs.length) continue
  console.log('='.repeat(80))
  console.log(q.id, '|', q.tags.join('/'), '|', q.type, '| 答案', q.answerKey ?? JSON.stringify(q.answerKeys))
  console.log('问题:', [...new Set(probs)].join(' '))
  console.log('STEM:', (q.stem ?? '').slice(0, 200))
  if (q.options) console.log('OPTS:', q.options.map((o: any) => o.key + '.' + o.text).join('  ||  '))
  console.log('EXP-LAST:', JSON.stringify((q.explanation ?? '').slice(-120)))
}
