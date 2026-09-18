import { POLITICS_QUESTIONS } from '../data'

const isX4 = (t: string[]) => t.includes('肖四')
const PAT: [string, RegExp][] = [
  ['深人', /深人/], ['收人', /收人/], ['融人', /融人/], ['化人', /化人/], ['千部', /千部/], ['苹命', /苹命/],
  ['磅磷', /磅磷/], ['仔务', /仔务/], ['福证', /福证/], ['选代', /选代/], ['顽痒', /顽痒/], ['平买', /平买/],
  ['身全球', /身全球/], ['安安全', /安安全/], ['取润', /取润/], ['垒断', /垒断/], ['谷案', /谷案/],
  ['驱待', /驱待/], ['驱须', /驱须/], ['边睡', /边睡/], ['捉高', /捉高/], ['惊涛浪', /惊涛浪/], ['中流柱', /中流柱/],
  ['不解探索', /不解探索/], ['不努力', /不努力/], ['揽下', /揽下/], ['衷衣足食', /衷衣足食/], ['家家仓实', /家家仓实/],
  ['断高价', /断高价/], ['断价格', /断价格/],
  ['数字连接号', /\d一\d/], ['卷眉残留', /考研政治|冲刺\s*[48]?套卷|试题分册|答案及解析/],
  ['乱码', /[@桁�□]/], ['反斜杠', /\\[a-z"]/],
  ['自已', /自已/], ['时侯', /时侯/], ['想象', /想象/], ['帐', /帐/], ['冶理', /冶理/], ['洪观', /洪观/],
  ['供献', /供献/], ['根原', /根原/], ['末来', /末来/], ['战土', /战土/], ['节曰', /节曰/], ['即然', /即然/],
  ['胃险', /胃险/], ['兔费', /兔费/], ['武样', /武样/], ['太量', /太量/], ['度江', /度江/],
]

const seen = new Set<string>()
for (const q of POLITICS_QUESTIONS as any[]) {
  if (!isX4(q.tags)) continue
  const fields: [string, string][] = [
    ['stem', q.stem],
    ['expl', q.explanation],
    ['opts', (q.options ?? []).map((o: any) => o.key + '.' + o.text).join(' | ')],
    ['pts', (q.answerPoints ?? []).join(' | ')],
    ['mat', (q.material?.paragraphs ?? []).join(' | ')],
  ]
  for (const [f, t] of fields) {
    if (!t) continue
    for (const [name, re] of PAT) {
      const m = t.match(re)
      if (!m) continue
      const key = q.id + '|' + f + '|' + name + '|' + m[0]
      if (seen.has(key)) continue
      seen.add(key)
      const i = m.index ?? 0
      console.log(name.padEnd(10) + ' ' + q.id.padEnd(18) + ' ' + f.padEnd(5) + ' …' + t.slice(Math.max(0, i - 14), i + 16).replace(/\n/g, '⏎') + '…')
    }
  }
}
