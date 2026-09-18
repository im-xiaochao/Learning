/**
 * 肖四题库修复 · 第五轮：补回 20 道材料分析题「第 (1) 问答案开头」整段丢失的内容。
 *
 *   node tools/_fix-x4e.mjs            # dry-run
 *   node tools/_fix-x4e.mjs --apply    # 写回
 *
 * 依据：tools/_x4-answerocr.out（《4套卷》答案解析 PDF 1-60 页整页 150dpi OCR，
 * 由 tools/_x4_answerocr.py 生成）。每道题的 (1) 答案开头在 OCR 里都在，
 * 只是当初转档时被截掉了。
 *
 * 做法：定位每道题的块 → 在 answerPoints 的第一项 / explanation 的字符串起点
 * 插入缺失的开头（并要求插入点后紧跟的文本与预期锚点一致，不一致就中止）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FILE = path.join(ROOT, 'data/politics/questions.ts')
const APPLY = process.argv.includes('--apply')

/** [id, 插入点后应当紧跟的文本（锚点）, 要补回的开头] */
const HEADS = [
  ['q-maozhongte-14', '思路、发展方式、发展着力点的集中体现',
    '（1）发展理念是发展行动的先导，是管全局、管根本、管方向、管长远的东西，是发展'],
  ['q-maozhongte-26', '发展阶段、发展环境、条件变化作出',
    '（1）构建以国内大循环为主体、国内国际双循环相互促进的新发展格局，是根据我国'],
  ['q-maozhongte-27', '人民的历史，彻底结束了旧中国一盘散沙',
    '（1）毛泽东等老一辈革命家打下了江山，成立中华人民共和国，实现民族独立、人民解放，彻底结束了旧中国半殖民地半封建社会的历史，彻底结束了极少数剥削者统治广大劳动'],
  ['q-maozhongte-39', '代化的显著标志。中国式现代化坚持',
    '（1）中国式现代化是全体人民共同富裕的现代化。这是中国式现代化区别于西方现'],
  ['q-maozhongte-51', '族复兴的战略基石，是应对风险挑战',
    '（1）科技兴则民族兴，科技强则国家强。实现高水平科技自立自强是国家强盛和民'],
  ['q-mayuan-12', '起生产方式、生活方式和思维方式的深刻',
    '（1）科学技术是推动社会文明进步的重要力量。每一次科技革命，都不同程度地引'],
  ['q-mayuan-21', '事物的矛盾、每一个矛盾的各个方面在发',
    '（1）矛盾具有普遍性，即矛盾无处不在、无时不有。矛盾又具有特殊性，即各个具体'],
  ['q-mayuan-29', '体事物存在，又作为联系中的事物存在。',
    '（1）联系的观点是唯物辩证法的总观点和总特征之一。世界上的万事万物既作为个'],
  ['q-mayuan-38', '一切从实际出发是马克思主义认识论的根',
    '（1）“不唯上、不唯书、只唯实”就是反对盲从权威，反对本本主义，一切从实际出发。'],
  ['q-mayuan-39', '发展水平不尽相同，但和平发展是共同事',
    '（1）全人类共同价值是全人类关于价值的最大公约数。尽管各国历史、文化、制度、'],
  ['q-shigang-8', '地，日本法西斯侵略者既是中国人民的敌',
    '（1）法西斯侵略同盟的野心在于征服世界，日本是法西斯发动侵略战争的东方策源'],
  ['q-shigang-23', '上确立了毛泽东同志在党中央和红军的领',
    '（1）遵义会议前后中国革命事业发生天翻地覆历史巨变的原因在于：遵义会议事实'],
  ['q-shigang-30', '设、组织建设，而且十分重视党的作风建',
    '（1）抗战时期，毛泽东把党的建设作为“伟大的工程”来实施，不仅重视党的思想建'],
  ['q-shizheng-4', '浩劫痛定思痛、摆脱丛林法则的历史',
    '（1）联合国是世界反法西斯战争胜利重要成果，它的建立是人类对两次世界大战'],
  ['q-shizheng-8', '机等）超越国界，单一国家无法独自',
    '（1）经济全球化深入发展，各国相互依存加深，全球性问题（如气候变化、公共卫生危'],
  ['q-shizheng-14', '家。近些年来，我国站在对人类文明',
    '（1）中国是首批缔约《联合国气候变化框架公约》、最早签署和批准《巴黎协定》的国'],
  ['q-sixiu-6', '文明的积累，更需要精神文明的升华。',
    '（1）崇尚英雄才会产生英雄，争做英雄才能英雄辈出。国家强盛、民族复兴需要物质'],
  ['q-sixiu-11', '族在生死存亡关头用鲜血和生命铸就',
    '（1）第一，伟大抗战精神是中国人民弥足珍贵的精神财富。伟大抗战精神，是中华民'],
  ['q-sixiu-15', '值，是个体的人生活动对自己的生存',
    '（1）人生价值内在地包含了人生的自我价值和社会价值两个方面。人生的自我价'],
  ['q-sixiu-19', '社会成员生活质量的基本保障，更是社会',
    '（1）公共生活需要公共秩序。有序的公共生活是社会生产活动的重要基础，是提高'],
]

const src = fs.readFileSync(FILE, 'utf8')
const START = 'export const POLITICS_QUESTIONS'
const END = '...POLITICS_QUESTIONS_X8'
const gI = src.indexOf(START)
const gJ = src.indexOf(END)
if (gI < 0 || gJ < 0 || gJ < gI) throw new Error('找不到肖四区间标记')
let mid = src.slice(gI, gJ)

const report = []
let failed = false
let inserted = 0

for (const [id, anchor, head] of HEADS) {
  const at = mid.indexOf(`id: "${id}"`)
  if (at < 0) { report.push(`✗ ${id} 找不到该题`); failed = true; continue }
  const next = mid.indexOf('id: "', at + 10)
  const blockEnd = next < 0 ? mid.length : next
  let block = mid.slice(at, blockEnd)
  const before = block.length

  // 两个插入点：answerPoints 第一项的字符串起点、explanation 的字符串起点。
  // 坑：'explanation: "' 这个字面量本身就以引号收尾，插入点就在字面量之后，
  // 不能再往后 indexOf('"')——那会落到该字符串的结束引号、甚至下一道题里。
  const TARGETS = [
    {
      name: 'answerPoints',
      literal: 'answerPoints: [',
      at: (b, fi) => { const q = b.indexOf('"', fi + 'answerPoints: ['.length); return q < 0 ? -1 : q + 1 },
      required: true,
    },
    {
      name: 'explanation',
      literal: 'explanation: "',
      at: (_b, fi) => fi + 'explanation: "'.length,
      required: true,
    },
  ]

  for (const t of TARGETS) {
    const fi = block.indexOf(t.literal)
    if (fi < 0) {
      if (t.required) { report.push(`✗ ${id} 没有 ${t.name}`); failed = true }
      continue
    }
    const qi = t.at(block, fi)
    if (qi < 0) { report.push(`✗ ${id} ${t.name} 定位失败`); failed = true; continue }
    const after = block.slice(qi, qi + anchor.length)
    if (after !== anchor) {
      report.push(`✗ ${id} ${t.name} 锚点不符：期望「${anchor}」，实际「${after}」`)
      failed = true
      continue
    }
    block = block.slice(0, qi) + head + block.slice(qi)
    inserted++
  }
  report.push(`  ${id}  块 +${block.length - before} 字`)
  mid = mid.slice(0, at) + block + mid.slice(blockEnd)
}

console.log(report.join('\n'))
console.log(`\n共插入 ${inserted} 处（期望 40 = 20 题 × 2 个字段）`)

if (failed) { console.log('\n❌ 有问题，未写文件。'); process.exit(1) }
if (!APPLY) { console.log('\n（dry-run；加 --apply 写回）'); process.exit(0) }
fs.writeFileSync(FILE, src.slice(0, gI) + mid + src.slice(gJ), 'utf8')
console.log('\n✅ 已写回', FILE)
