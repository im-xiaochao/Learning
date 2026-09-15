/**
 * 内容构建脚本：data/*.ts  →  data/content/**.json + data/generated/**.json
 *
 * 目标格式：《词数同行：知识点数据存放格式与实例》v1.0
 *   - data/content/catalog.json                        课程 / 学科 / 章节
 *   - data/content/knowledge/<subjectId>/<chapterId>.json   知识点（按章节打包）
 *   - data/content/vocabulary/words.json               词库（整体打包）
 *   - data/generated/knowledge-index.json              知识点搜索索引
 *   - data/generated/vocabulary-index.json             词库搜索索引
 *
 * 用法：
 *   tsx build-content.ts            正式生成
 *   tsx build-content.ts --dry-run  只做统计与体检，不写文件
 *
 * 数据来源（均为只读，脚本不改动它们）：
 *   data/math-data.ts       知识树结构（模块 → 部分 → 章 → 节 → 主题）
 *   data/math-lectures.ts   每个主题的讲义（解释 / 要点 / 步骤 / 公式 / 例题 / 易错点）
 *   data/words.ts           考研英语词汇
 */

import fs from 'node:fs'
import path from 'node:path'
import { pinyin } from 'pinyin-pro'
import { MATH_MODULES } from '../data/math-data'
import { getMathLecture } from '../data/math-lectures'
import { words as RAW_WORDS } from '../data/words'

const DRY_RUN = process.argv.includes('--dry-run')
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'data')
const CONTENT_DIR = path.join(DATA_DIR, 'content')
const GENERATED_DIR = path.join(DATA_DIR, 'generated')

const SCHEMA_VERSION = '1.0'

// ---------------------------------------------------------------- 工具函数

/** 文件 mtime → 文档要求的秒级 ISO 8601 UTC */
function fileUpdatedAt(file: string): string {
  const ms = fs.statSync(path.join(DATA_DIR, file)).mtimeMs
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/** FNV-1a → base36，用于超长 slug 的稳定后缀 */
function hash6(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36).padStart(7, '0').slice(0, 6)
}

/**
 * 生成符合文档约定的实体 ID 片段：小写英文 + 数字 + 连字符。
 * 中文走拼音；超过 max 字符时截断到完整音节并追加内容哈希，
 * 保证「同一内容 → 同一 ID」，不依赖数组下标。
 */
function slug(text: string, max = 40): string {
  const chunks = pinyin(String(text), {
    toneType: 'none',
    type: 'array',
    nonZh: 'consecutive',
  }) as string[]
  const parts: string[] = []
  for (const chunk of chunks) {
    for (const seg of chunk.toLowerCase().split(/[^a-z0-9]+/)) {
      if (seg) parts.push(seg)
    }
  }
  let out = parts.join('-')
  if (!out) out = `x-${hash6(String(text))}`
  if (out.length > max) {
    const head = out.slice(0, max).replace(/-[^-]*$/, '')
    out = `${head}-${hash6(String(text))}`
  }
  return out
}

/** 全局唯一化：冲突时追加 -2 / -3 …（保证 ID 稳定且不重复） */
function uniquify(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base)
    return base
  }
  let i = 2
  while (used.has(`${base}-${i}`)) i++
  const id = `${base}-${i}`
  used.add(id)
  return id
}

/** 去掉 Markdown 行内代码标记，得到纯文本（summary / title / tags 用） */
function plain(text: string): string {
  return String(text).replace(/`/g, '').replace(/\s+/g, ' ').trim()
}

function sentences(text: string): string[] {
  return String(text)
    .split(/(?<=[。！？!?])/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 截断到完整句子；找不到句号时退到逗号，最后才硬切 */
function truncateSentence(text: string, max: number): string {
  const cut = text.slice(0, max)
  const lastSentenceEnd = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('；'))
  if (lastSentenceEnd >= max * 0.5) return cut.slice(0, lastSentenceEnd + 1)
  const lastComma = Math.max(cut.lastIndexOf('，'), cut.lastIndexOf('、'))
  if (lastComma >= max * 0.6) return cut.slice(0, lastComma)
  return cut
}

/**
 * 取完整句子拼到 min 字为止，尽量不超 max（允许上浮 25% 以保住整句）。
 * 宁可短一点也不要出现「…遇到分段或参数问题，」这种断在半句的摘要。
 */
function brief(text: string, min = 30, max = 80): string {
  const src = plain(text)
  if (!src) return ''
  const all = sentences(src)
  const ceiling = Math.round(max * 1.25)
  let out = ''
  for (const s of all) {
    const next = out + s
    if (next.length > ceiling) {
      return out.length >= min ? out : truncateSentence(next, max)
    }
    out = next
    if (out.length >= min) return out
  }
  return out || src
}

/** 要点标题：优先取第一个逗号前的短句，否则用全文 */
function shortTitle(text: string): string {
  const src = plain(text)
  const cut = src.search(/[，；：,;]/)
  if (cut >= 4 && cut <= 24) return src.slice(0, cut)
  return src.length > 24 ? src.slice(0, 24) : src
}

/** 章节 / 小节 / 知识点标题：去掉「第一章 」「1.1 」「1. 」这类编号前缀 */
function stripNumbering(title: string): string {
  return String(title)
    .replace(/^第[一二三四五六七八九十百零〇\d]+[章节讲部分]\s*/, '')
    .replace(/^\d+(?:\.\d+)+[\s.、]*/, '')
    .replace(/^\d+\s*[.、]\s*/, '')
    .trim()
}

/** 数组序列化：每个元素独占一行，便于 diff 与阅读 */
function serializeRecords(records: unknown[], indent = '  '): string {
  if (records.length === 0) return '[]'
  return `[\n${records.map((r) => indent + JSON.stringify(r)).join(',\n')}\n]`
}

/** 对象字典序列化：每个键独占一行 */
function serializeMap(entries: [string, unknown][], indent = '  '): string {
  if (entries.length === 0) return '{}'
  return `{\n${entries.map(([k, v]) => `${indent}${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}\n}`
}

// ---------------------------------------------------------------- 学科映射

interface SubjectDef {
  id: string
  name: string
  shortName: string
  sortOrder: number
  courseId: string
  match: RegExp
}

const SUBJECTS: SubjectDef[] = [
  { id: 'calculus', name: '高等数学', shortName: '高数', sortOrder: 10, courseId: 'math', match: /高等数学/ },
  { id: 'algebra', name: '线性代数', shortName: '线代', sortOrder: 20, courseId: 'math', match: /线性代数/ },
  { id: 'probability', name: '概率统计', shortName: '概率', sortOrder: 30, courseId: 'math', match: /概率/ },
]

const COURSES = [
  { id: 'english', name: '考研英语', sortOrder: 10 },
  { id: 'math', name: '考研数学', sortOrder: 20 },
]

function subjectOf(partTitle: string): SubjectDef {
  const hit = SUBJECTS.find((s) => s.match.test(partTitle))
  if (!hit) throw new Error(`无法识别的部分标题：${partTitle}`)
  return hit
}

// ---------------------------------------------------------------- 讲义 → 知识点

interface LectureLike {
  tag: string
  explanation: string
  keyPoints: string[]
  steps: string[]
  formula?: string
  example?: string
  trap?: string
  source?: string
}

/** 判断公式该按 latex 还是 text 存放（源数据里两种混用） */
function formulaFormat(formula: string): 'latex' | 'text' {
  return /\\[a-zA-Z]|[\^_]\{/.test(formula) ? 'latex' : 'text'
}

/** 把讲义装配成完整讲解正文，承载模板里没有独立字段的 steps / trap / source */
function buildBodyMarkdown(lec: LectureLike): string {
  const blocks: string[] = [plain(lec.explanation)]
  const steps = (lec.steps || []).filter(Boolean)
  if (steps.length > 0) {
    blocks.push(`### 解题步骤\n\n${steps.map((s, i) => `${i + 1}. ${plain(s)}`).join('\n')}`)
  }
  if (lec.trap) blocks.push(`### 易错点\n\n${plain(lec.trap)}`)
  if (lec.source) blocks.push(`> 来源：${plain(lec.source)}`)
  return blocks.filter(Boolean).join('\n\n')
}

function estimateMinutes(lec: LectureLike): number {
  const len =
    (lec.explanation || '').length +
    (lec.keyPoints || []).join('').length +
    (lec.steps || []).join('').length +
    (lec.example || '').length +
    (lec.trap || '').length
  return Math.max(3, Math.min(10, Math.round(len / 60)))
}

/** 去掉标题末尾的句号等标点：源数据里的主题标签常写作「定义。」 */
function trimTitlePunctuation(text: string): string {
  return plain(text).replace(/[。．.；;，,、]+$/, '').trim()
}

function toKnowledgePoint(opts: {
  title: string
  lec: LectureLike
  subjectId: string
  chapterId: string
  sectionId: string
  sectionTitle: string
  sortOrder: number
  updatedAt: string
  usedIds: Set<string>
}) {
  const { title, lec, subjectId, chapterId, sectionId, sectionTitle, sortOrder, updatedAt, usedIds } = opts
  const cleanTitle = trimTitlePunctuation(stripNumbering(title))
  // 知识点 ID 带上章节前缀：唯一性由构造保证，跨章节同名知识点（数学一 / 数学二）不会互相顶掉
  const id = uniquify(`kp-${chapterId}-${slug(cleanTitle, 40)}`, usedIds)

  const kpUsed = new Set<string>()
  const keyPoints = (lec.keyPoints || []).filter(Boolean).map((kp) => ({
    id: uniquify(slug(kp, 40), kpUsed),
    title: shortTitle(kp),
    bodyMarkdown: plain(kp),
  }))

  const exUsed = new Set<string>()
  const examples = (lec.example || '').trim()
    ? [
        {
          id: uniquify(slug(lec.example!, 24), exUsed),
          title: '讲解例子',
          bodyMarkdown: plain(lec.example!),
        },
      ]
    : []

  const formula = plain(lec.formula || '')
  const anchor = formula
    ? {
        type: 'formula',
        format: formulaFormat(formula),
        content: formula,
        caption: brief(lec.explanation, 12, 60),
      }
    : {
        type: 'concept',
        format: 'text',
        content: keyPoints[0]?.title || cleanTitle,
        caption: brief(lec.explanation, 12, 60),
      }

  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    contentVersion: 1,
    subjectId,
    chapterId,
    sectionId,
    sectionTitle,
    title: cleanTitle,
    summary: brief(lec.explanation, 30, 80),
    tags: lec.tag ? [plain(lec.tag)] : [],
    sortOrder,
    estimatedMinutes: estimateMinutes(lec),
    anchor,
    keyPoints,
    examples,
    relatedKnowledgeIds: [],
    sources: lec.source ? [{ title: plain(lec.source) }] : [],
    status: 'published',
    updatedAt,
    bodyMarkdown: buildBodyMarkdown(lec),
  }
}

// ---------------------------------------------------------------- 构建 catalog

interface CatalogChapter {
  id: string
  subjectId: string
  title: string
  summary: string
  sortOrder: number
  module: string
}

interface ChapterBundle {
  schemaVersion: string
  chapterId: string
  subjectId: string
  module: string
  title: string
  sortOrder: number
  knowledge: ReturnType<typeof toKnowledgePoint>[]
}

function buildCatalog() {
  const knowledgeUpdatedAt = [fileUpdatedAt('math-data.ts'), fileUpdatedAt('math-lectures.ts')].sort().pop()!
  const usedIds = new Set<string>()
  const usedChapterIds = new Set<string>()
  const usedKeyPointIds = new Set<string>()

  const chapters: CatalogChapter[] = []
  const bundles: ChapterBundle[] = []
  const subjectOrderCounter = new Map<string, number>()
  let totalKnowledge = 0
  const stats = {
    introTopics: 0,
    structuredPoints: 0,
    withFormula: 0,
    withExample: 0,
    withSource: 0,
    keyPointCounts: new Map<number, number>(),
  }

  for (const mod of MATH_MODULES) {
    for (const part of mod.parts) {
      const subject = subjectOf(part.title)
      for (const chapter of part.chapters) {
        // 源数据的 chapter.id（m1-c1）只在「部分」内唯一，跨部分会重复。
        // 用 part.id 组合成全局唯一且稳定的 id：m1-p1-c1。
        const num = chapter.id.match(/^m\d+-c(\d+)$/)?.[1]
        const chapterId = num ? `${part.id}-c${num}` : uniquify(chapter.id, usedChapterIds)
        usedChapterIds.add(chapterId)
        const chapterTitle = stripNumbering(chapter.title)

        // 章节摘要由真实小节标题派生，不编造
        const sectionTitles = chapter.sections.map((s) => stripNumbering(s.title))
        let listed = ''
        let listedCount = 0
        for (const t of sectionTitles) {
          if (listed.length >= 34) break
          listed += `${t}、`
          listedCount++
        }
        listed = listed.replace(/、$/, '')
        let summary = `本章共 ${sectionTitles.length} 节：${listed}`
        if (listedCount < sectionTitles.length) summary += ' 等'
        summary += '。'

        const sortOrder = (subjectOrderCounter.get(subject.id) || 0) + 10
        subjectOrderCounter.set(subject.id, sortOrder)

        chapters.push({ id: chapterId, subjectId: subject.id, title: chapterTitle, summary, sortOrder, module: mod.name })

        const knowledge: ReturnType<typeof toKnowledgePoint>[] = []
        let kpSortOrder = 0
        for (const section of chapter.sections) {
          // 小节 id 同样只在「部分」内唯一，用 chapterId 组合；小节标题保留原文
          const secNum = section.id.match(/-s(\d+)$/)?.[1]
          const sectionId = secNum ? `${chapterId}-s${secNum}` : `${chapterId}-s-${slug(section.title, 24)}`
          const sectionTitle = stripNumbering(section.title)
          const items: { title: string; lec: LectureLike }[] = []
          for (const topic of section.intro || []) {
            items.push({ title: topic, lec: getMathLecture(topic, section.title) })
            stats.introTopics++
          }
          for (const point of section.points || []) {
            items.push({ title: point.title, lec: getMathLecture(point.title, section.title) })
            stats.structuredPoints++
          }
          for (const item of items) {
            kpSortOrder += 10
            const kp = toKnowledgePoint({
              title: item.title,
              lec: item.lec,
              subjectId: subject.id,
              chapterId,
              sectionId,
              sectionTitle,
              sortOrder: kpSortOrder,
              updatedAt: knowledgeUpdatedAt,
              usedIds: usedKeyPointIds,
            })
            knowledge.push(kp)
            totalKnowledge++
            if (item.lec.formula) stats.withFormula++
            if (item.lec.example) stats.withExample++
            if (item.lec.source) stats.withSource++
            const n = kp.keyPoints.length
            stats.keyPointCounts.set(n, (stats.keyPointCounts.get(n) || 0) + 1)
          }
        }

        bundles.push({
          schemaVersion: SCHEMA_VERSION,
          chapterId,
          subjectId: subject.id,
          module: mod.name,
          title: chapterTitle,
          sortOrder,
          knowledge,
        })
      }
    }
  }

  return { chapters, bundles, totalKnowledge, stats, knowledgeUpdatedAt }
}

// ---------------------------------------------------------------- 构建词库

const POS_ALIASES: Array<[RegExp, string]> = [
  [/([a-z]+)\/([a-z]+)\.\./gi, '$1./$2.'],
  [/([a-z])．/gi, '$1.'],
  [/([a-z])。/gi, '$1.'],
  [/([a-z])。/gi, '$1.'],
]

const CN_POS: Record<string, string> = {
  名: 'n.', 动: 'v.', 形: 'a.', 副: 'ad.', 介: 'prep.', 连: 'conj.',
  代: 'pron.', 数: 'num.', 感: 'int.', 叹: 'int.', 冠: 'art.', 助: 'aux.',
}

const POS_LIST = ['abbr', 'interj', 'prep', 'conj', 'pron', 'adj', 'adv', 'aux', 'art', 'num', 'int', 'vt', 'vi', 'ad', 'n', 'v', 'a']
const POS_ALT = POS_LIST.join('|')
// 分隔符不含「/」：n./v. 表示「同义的多个词性」，应整体作为一个词性保留。
// 注意每个词性后面都带点（n. / v.），所以点是重复单元的一部分，不是末尾才有。
const SPLIT_RE = new RegExp(`(?<=^|[\\s;,，;；])(?=(?:${POS_ALT})\\.)`, 'g')
const HEAD_RE = new RegExp(`^((?:${POS_ALT})\\.(?:/(?:${POS_ALT})\\.)*)\\s*([\\s\\S]*)$`)

const POS_TAG: Record<string, string> = {
  'n.': '名词', 'v.': '动词', 'vt.': '动词', 'vi.': '动词', 'adj.': '形容词', 'a.': '形容词',
  'adv.': '副词', 'ad.': '副词', 'prep.': '介词', 'conj.': '连词', 'pron.': '代词',
  'num.': '数词', 'int.': '感叹词', 'interj.': '感叹词', 'art.': '冠词', 'aux.': '助动词', 'abbr.': '缩写',
}

function normalizeMeaning(raw: string): string {
  let out = String(raw).replace(/[（(]([名动形副介连代数感叹冠助])[）)]/g, (m, c: string) => CN_POS[c] ?? m)
  // aux.v. / v.aux. 是「助动词 + 动词」的连写，拆成斜杠形式，避免把 v. 留在释义里
  out = out.replace(/aux\.\s*v\./gi, 'aux./v.').replace(/v\.\s*aux\./gi, 'aux./v.')
  for (const [re, to] of POS_ALIASES) out = out.replace(re, to)
  return out.replace(/\s+/g, ' ').trim()
}

/** n./v./v. 这类重复词性收敛为 n./v. */
function dedupePos(pos: string): string {
  const parts = pos.split('/').filter(Boolean)
  return [...new Set(parts)].join('/')
}

function parseSenses(raw: string) {
  const normalized = normalizeMeaning(raw)
  const tokens = normalized.split(SPLIT_RE).map((t) => t.trim()).filter(Boolean)
  const senses: { partOfSpeech: string; meaningZh: string }[] = []
  for (const token of tokens) {
    const m = token.match(HEAD_RE)
    if (m) {
      senses.push({ partOfSpeech: dedupePos(m[1]), meaningZh: m[2].replace(/^[\s;,，;；]+/, '').trim() })
    } else if (senses.length > 0) {
      const last = senses[senses.length - 1]
      last.meaningZh = `${last.meaningZh} ${token}`.trim()
    } else {
      senses.push({ partOfSpeech: '', meaningZh: token })
    }
  }
  if (senses.length === 0) senses.push({ partOfSpeech: '', meaningZh: normalized })
  // 源数据里 aux.v. 这类词性有时不带释义，丢掉空条目，但至少保留一条
  const withMeaning = senses.filter((s) => s.meaningZh)
  return withMeaning.length > 0 ? withMeaning : senses
}

function buildVocabulary() {
  const updatedAt = fileUpdatedAt('words.ts')
  const usedIds = new Set<string>()
  const posTagCount = new Map<string, number>()
  const noPos: string[] = []
  const renamed: string[] = []
  const emptyMeaning: string[] = []

  const items = RAW_WORDS.map((w) => {
    const id = uniquify(`word-${slug(w.word, 40)}`, usedIds)
    if (id !== `word-${slug(w.word, 40)}`) renamed.push(`${w.word} → ${id}`)

    const senses = parseSenses(w.meaning)
    if (senses.every((s) => !s.partOfSpeech)) noPos.push(w.word)

    const tags = ['考研英语']
    for (const s of senses) {
      // n./v. 这类同义多词性要拆成两个标签
      for (const part of s.partOfSpeech.split('/')) {
        const tag = POS_TAG[part]
        if (tag && !tags.includes(tag)) tags.push(tag)
        if (tag) posTagCount.set(tag, (posTagCount.get(tag) || 0) + 1)
      }
    }
    if (senses.some((s) => !s.meaningZh)) emptyMeaning.push(`${w.word} :: ${w.meaning}`)

    const ipa = String(w.phonetic || '').replace(/^\/+|\/+$/g, '').trim()
    return {
      schemaVersion: SCHEMA_VERSION,
      id,
      contentVersion: 1,
      courseId: 'english',
      word: w.word,
      pronunciations: ipa ? [{ accent: 'uk', ipa }] : [],
      senses,
      examples: [],
      collocations: [],
      tags,
      sources: [],
      status: 'published',
      updatedAt,
    }
  })

  return { items, updatedAt, noPos, renamed, posTagCount, emptyMeaning }
}

// ---------------------------------------------------------------- 索引

function buildKnowledgeIndex(bundles: ChapterBundle[], subjectName: Map<string, string>) {
  const items: unknown[] = []
  for (const bundle of bundles) {
    const subjectShort = subjectName.get(bundle.subjectId) || ''
    const subjectFull = SUBJECTS.find((s) => s.id === bundle.subjectId)?.name || ''
    for (const kp of bundle.knowledge) {
      items.push({
        id: kp.id,
        contentVersion: kp.contentVersion,
        subjectId: kp.subjectId,
        chapterId: kp.chapterId,
        sectionId: kp.sectionId,
        title: kp.title,
        summary: kp.summary,
        tags: kp.tags,
        sortOrder: kp.sortOrder,
        estimatedMinutes: kp.estimatedMinutes,
        contentPath: `knowledge/${kp.subjectId}/${kp.chapterId}.json`,
        searchText: [
          subjectFull, subjectShort, bundle.module, bundle.title, kp.sectionTitle,
          kp.title, kp.summary, kp.tags.join(' '), kp.bodyMarkdown.replace(/[#>`*\-]/g, ' '),
        ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
      })
    }
  }
  return items
}

function buildVocabularyIndex(items: ReturnType<typeof buildVocabulary>['items']) {
  return items.map((w) => ({
    id: w.id,
    contentVersion: w.contentVersion,
    word: w.word,
    ipa: w.pronunciations[0]?.ipa || '',
    partOfSpeech: w.senses[0]?.partOfSpeech || '',
    meaningZh: w.senses.map((s) => s.meaningZh).join('；'),
    tags: w.tags,
    searchText: [w.word, w.pronunciations[0]?.ipa || '', ...w.senses.map((s) => `${s.partOfSpeech}${s.meaningZh}`), w.tags.join(' ')]
      .join(' ').replace(/\s+/g, ' ').trim(),
  }))
}

// ---------------------------------------------------------------- 小程序端精简数据

/**
 * data/content 是给人看、给脚本维护的规范数据（3.4 MB）。
 * 微信小程序主包上限 2 MB，装不下全量，因此再投影一份「只含界面实际渲染字段」的
 * 运行数据到 data/generated/app/，并按「列表 / 详情」拆开：
 *
 *   catalog.json            课程 · 学科 · 章节            主包
 *   knowledge.json          知识点列表（标题 + 摘要）      主包  ← 资料库、计划页只需这些
 *   words.json              词库                          主包
 *   knowledge-content.json  公式 · 要点 · 例题            分包  ← 只有知识点详情页需要
 *
 * 拆分的目的是把大块正文挪出主包；两者都以知识点 id 关联，同源同版本。
 */
function buildAppBundle(bundles: ChapterBundle[], vocab: ReturnType<typeof buildVocabulary>) {
  const chapters = bundles.map((b) => ({
    id: b.chapterId,
    subjectId: b.subjectId,
    module: b.module,
    title: b.title,
    summary: b.summary,
    sortOrder: b.sortOrder,
    sections: groupBySection(b.knowledge),
  }))

  const content: Record<string, unknown> = {}
  for (const b of bundles) {
    for (const kp of b.knowledge) {
      content[kp.id] = {
        anchor: kp.anchor,
        keyPoints: kp.keyPoints.map((k) => ({ title: k.title, body: k.bodyMarkdown })),
        example: kp.examples[0]?.bodyMarkdown || '',
      }
    }
  }

  const words = vocab.items.map((w) => ({
    id: w.id,
    word: w.word,
    ipa: w.pronunciations[0]?.ipa || '',
    pos: w.senses.map((s) => s.partOfSpeech).filter(Boolean).join(' / '),
    meaning: w.senses.map((s) => s.meaningZh).join('；'),
  }))

  return { chapters, content, words }
}

function groupBySection(knowledge: ReturnType<typeof toKnowledgePoint>[]) {
  const sections: { id: string; title: string; points: unknown[] }[] = []
  for (const kp of knowledge) {
    let section = sections[sections.length - 1]
    if (!section || section.id !== kp.sectionId) {
      section = { id: kp.sectionId, title: kp.sectionTitle, points: [] }
      sections.push(section)
    }
    section.points.push({
      id: kp.id,
      title: kp.title,
      summary: kp.summary,
      minutes: kp.estimatedMinutes,
    })
  }
  return sections
}

/** 清空并重建目录；删不掉时退化为直接覆盖写，不让构建中断 */
function resetDir(dir: string) {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch {
      /* 忽略：某些环境会拦截删除，直接覆盖写即可 */
    }
  }
  fs.mkdirSync(dir, { recursive: true })
}

// ---------------------------------------------------------------- 主流程

function main() {
  const { chapters, bundles, totalKnowledge, stats, knowledgeUpdatedAt } = buildCatalog()
  const vocab = buildVocabulary()

  const subjectNameMap = new Map<string, string>()
  for (const s of SUBJECTS) subjectNameMap.set(s.id, s.shortName)

  const knowledgeIndex = buildKnowledgeIndex(bundles, subjectNameMap)
  const vocabularyIndex = buildVocabularyIndex(vocab.items)

  console.log('================ 构建统计 ================')
  console.log(`章节            : ${chapters.length}`)
  console.log(`知识点          : ${totalKnowledge}  (intro 主题 ${stats.introTopics} + 结构化 ${stats.structuredPoints})`)
  console.log(`  带公式        : ${stats.withFormula}`)
  console.log(`  带例题        : ${stats.withExample}`)
  console.log(`  带出处        : ${stats.withSource}`)
  console.log(`  keyPoints 分布: ${JSON.stringify([...stats.keyPointCounts.entries()].sort((a, b) => a[0] - b[0]))}`)
  console.log(`单词            : ${vocab.items.length}`)
  console.log(`  无词性标记    : ${vocab.noPos.length} ${vocab.noPos.slice(0, 12).join(', ')}`)
  console.log(`  释义为空      : ${vocab.emptyMeaning.length} ${vocab.emptyMeaning.slice(0, 6).join(' | ')}`)
  console.log(`  ID 去重改名   : ${vocab.renamed.length} ${vocab.renamed.slice(0, 6).join(' | ')}`)
  console.log(`  词性标签分布  : ${[...vocab.posTagCount.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' ')}`)
  console.log(`索引            : knowledge ${knowledgeIndex.length} / vocabulary ${vocabularyIndex.length}`)
  console.log(`updatedAt       : knowledge ${knowledgeUpdatedAt} / words ${vocab.updatedAt}`)

  if (DRY_RUN) {
    console.log('\n(--dry-run：未写入任何文件)')
    return
  }

  // 清理旧产出，避免残留过期文件
  resetDir(path.join(CONTENT_DIR, 'knowledge'))
  resetDir(path.join(CONTENT_DIR, 'vocabulary'))
  fs.mkdirSync(GENERATED_DIR, { recursive: true })

  const write = (file: string, content: string) => {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, content, 'utf8')
  }

  // generatedAt 由源数据时间派生（而非当前时间），保证「源不变 → 产出不变」，diff 干净
  const generatedAt = [knowledgeUpdatedAt, vocab.updatedAt].sort().pop()!

  // 1) catalog.json
  write(
    path.join(CONTENT_DIR, 'catalog.json'),
    `${JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        courses: COURSES,
        subjects: SUBJECTS.map(({ id, name, shortName, sortOrder, courseId }) => ({ id, courseId, name, shortName, sortOrder })),
        chapters,
      },
      null,
      2,
    )}\n`,
  )

  // 2) 知识点：按章节打包
  let knowledgeFiles = 0
  for (const bundle of bundles) {
    write(path.join(CONTENT_DIR, 'knowledge', bundle.subjectId, `${bundle.chapterId}.json`), `${JSON.stringify(bundle, null, 2)}\n`)
    knowledgeFiles++
  }

  // 3) 词库：整体打包，每个单词独占一行
  const wordsFile = path.join(CONTENT_DIR, 'vocabulary', 'words.json')
  write(
    wordsFile,
    `{\n  "schemaVersion": ${JSON.stringify(SCHEMA_VERSION)},\n  "courseId": "english",\n  "generatedAt": ${JSON.stringify(generatedAt)},\n  "count": ${vocab.items.length},\n  "words": ${serializeRecords(vocab.items)}\n}\n`,
  )

  // 4) 索引
  write(
    path.join(GENERATED_DIR, 'knowledge-index.json'),
    `{\n  "schemaVersion": ${JSON.stringify(SCHEMA_VERSION)},\n  "generatedAt": ${JSON.stringify(generatedAt)},\n  "items": ${serializeRecords(knowledgeIndex)}\n}\n`,
  )
  write(
    path.join(GENERATED_DIR, 'vocabulary-index.json'),
    `{\n  "schemaVersion": ${JSON.stringify(SCHEMA_VERSION)},\n  "generatedAt": ${JSON.stringify(generatedAt)},\n  "contentPath": "vocabulary/words.json",\n  "count": ${vocabularyIndex.length},\n  "items": ${serializeRecords(vocabularyIndex)}\n}\n`,
  )

  // 5) 小程序端运行数据（同源投影，供应用直接 import）
  const app = buildAppBundle(bundles, vocab)
  const appDir = path.join(GENERATED_DIR, 'app')
  resetDir(appDir)
  const banner = `/**\n * 由 tools/build-content.ts 从 data/content 生成，请勿手改。\n * 重新生成：cd tools && npm run build:content\n * 数据来源时间：${generatedAt}\n */\n\n`

  write(
    path.join(appDir, 'catalog.ts'),
    `${banner}export interface AppCourse { id: string; name: string; sortOrder: number }\nexport interface AppSubject { id: string; courseId: string; name: string; shortName: string; sortOrder: number }\nexport interface AppChapter { id: string; subjectId: string; module: string; title: string; summary: string; sortOrder: number }\n\nexport const appCourses: AppCourse[] = ${serializeRecords(COURSES)}\n\nexport const appSubjects: AppSubject[] = ${serializeRecords(
      SUBJECTS.map(({ id, name, shortName, sortOrder, courseId }) => ({ id, courseId, name, shortName, sortOrder })),
    )}\n\nexport const appChapters: AppChapter[] = ${serializeRecords(chapters)}\n`,
  )

  write(
    path.join(appDir, 'knowledge.ts'),
    `${banner}export interface AppKnowledgePoint { id: string; title: string; summary: string; minutes: number }\nexport interface AppKnowledgeSection { id: string; title: string; points: AppKnowledgePoint[] }\nexport interface AppKnowledgeChapter { id: string; subjectId: string; module: string; title: string; summary: string; sortOrder: number; sections: AppKnowledgeSection[] }\n\nexport const appKnowledge: AppKnowledgeChapter[] = ${serializeRecords(app.chapters)}\n`,
  )

  write(
    path.join(appDir, 'knowledge-content.ts'),
    `${banner}export interface AppAnchor { type: string; format: string; content: string; caption: string }\nexport interface AppKeyPoint { title: string; body: string }\nexport interface AppKnowledgeContent { anchor: AppAnchor; keyPoints: AppKeyPoint[]; example: string }\n\nexport const appKnowledgeContent: Record<string, AppKnowledgeContent> = ${serializeMap(Object.entries(app.content))}\n`,
  )

  write(
    path.join(appDir, 'words.ts'),
    `${banner}export interface AppWord { id: string; word: string; ipa: string; pos: string; meaning: string }\n\nexport const appWords: AppWord[] = ${serializeRecords(app.words)}\n`,
  )

  console.log(`\n已写入 ${knowledgeFiles + 8} 个文件：`)
  console.log(`  data/content/catalog.json`)
  console.log(`  data/content/knowledge/<subject>/*.json   (${knowledgeFiles})`)
  console.log(`  data/content/vocabulary/words.json`)
  console.log(`  data/generated/knowledge-index.json`)
  console.log(`  data/generated/vocabulary-index.json`)
  console.log(`  data/generated/app/catalog.ts | knowledge.ts | knowledge-content.ts | words.ts`)
}

main()
