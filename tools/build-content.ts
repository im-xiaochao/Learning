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
 * 数据来源（均为只读，脚本不改动它们；统一从 `data/index.ts` 导入）：
 *   data/math/tree.ts        知识树结构（模块 → 部分 → 章 → 节 → 主题）
 *   data/math/lectures.ts    每个主题的讲义（解释 / 要点 / 步骤 / 公式 / 例题 / 易错点）
 *   data/english/words.ts    考研英语词汇（自动生成的纯词表）
 *   data/english/word-content.ts  单词深度内容（人工撰写）
 *   data/politics/questions.ts    政治题库（手工编写，政治模块现在的主内容）
 *   data/politics/chapters.ts     政治知识点（**当前为空**：改刷题了）
 *   data/cs/subjects.ts           计算机专业课（只有学科骨架）
 */

import fs from 'node:fs'
import path from 'node:path'
import { pinyin } from 'pinyin-pro'
import {
  MATH_MODULES,
  getMathLecture,
  RAW_WORDS,
  WORD_CONTENT,
  BATCHES,
  POLITICS_COURSE,
  POLITICS_SUBJECT,
  POLITICS_CHAPTERS,
  POLITICS_QUESTIONS,
  POLITICS_MODULES,
  MAJOR_COURSE,
  MAJOR_SUBJECTS,
} from '../data'

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

/** 字符串数组序列化：每行若干个，避免出现一条 100 KB 的长行 */
function serializeStrings(items: string[], perLine = 12, indent = '  '): string {
  if (items.length === 0) return '[]'
  const lines: string[] = []
  for (let i = 0; i < items.length; i += perLine) {
    lines.push(indent + items.slice(i, i + perLine).map((s) => JSON.stringify(s)).join(', '))
  }
  return `[\n${lines.join(',\n')}\n]`
}

/** 对象字典序列化：每个键独占一行 */
function serializeMap(entries: [string, unknown][], indent = '  '): string {
  if (entries.length === 0) return '{}'
  return `{\n${entries.map(([k, v]) => `${indent}${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}\n}`
}

/**
 * pages-words/words.ts 里 AppWord 的接口声明。
 * 深度内容字段全部可选——绝大多数词条还没有，构建时会整键省略。
 */
const WORD_INTERFACE = [
  'export interface AppWordExample { sentence: string; translation: string }',
  'export interface AppWordRoot { display: string; explanation: string }',
  'export interface AppWordCollocation { phrase: string; meaning: string }',
  'export interface AppWord {',
  '  id: string',
  '  word: string',
  '  ipa: string',
  '  pos: string',
  '  meaning: string',
  '  examples?: AppWordExample[]',
  '  root?: AppWordRoot',
  '  mnemonic?: string',
  '  collocations?: AppWordCollocation[]',
  '}',
].join('\n')

// ---------------------------------------------------------------- 学科映射

interface SubjectDef {
  id: string
  name: string
  shortName: string
  sortOrder: number
  courseId: string
  /** 学科类型：决定详情页的抓手标题与章节插图（格式文档 v1.1 第 4 节） */
  kind: 'math' | 'politics' | 'cs'
  /** 只有数学学科需要它来匹配「第一部分 高等数学」这类标题 */
  match?: RegExp
}

const MATH_SUBJECTS: SubjectDef[] = [
  { id: 'calculus', name: '高等数学', shortName: '高数', sortOrder: 10, courseId: 'math', kind: 'math', match: /高等数学/ },
  { id: 'algebra', name: '线性代数', shortName: '线代', sortOrder: 20, courseId: 'math', kind: 'math', match: /线性代数/ },
  { id: 'probability', name: '概率统计', shortName: '概率', sortOrder: 30, courseId: 'math', kind: 'math', match: /概率/ },
]

/** 政治不从 math-data 派生，来自手工编写的 data/politics/chapters.ts */
const POLITICS_SUBJECT_DEF: SubjectDef = { ...POLITICS_SUBJECT }

/**
 * 全部学科。用于目录与运行数据输出。
 * 顺序：数学 3 个 → 政治 → 计算机专业课 4 个。
 * 资料库 tab 展示 courseId !== 'math' 的那些（见 composables/useContent.ts）。
 */
const SUBJECTS: SubjectDef[] = [...MATH_SUBJECTS, POLITICS_SUBJECT_DEF, ...MAJOR_SUBJECTS]

const COURSES = [
  { id: 'english', name: '考研英语', sortOrder: 10 },
  { id: 'math', name: '考研数学', sortOrder: 20 },
  POLITICS_COURSE,
  MAJOR_COURSE,
]

function subjectOf(partTitle: string): SubjectDef {
  const hit = MATH_SUBJECTS.find((s) => s.match?.test(partTitle))
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
  /** 章节主要归属的考试模块（数学一 / 数学二 / 思想政治理论） */
  module: string
  /**
   * 本章适用的全部考试模块。数学一、数学二共用章节时会有两个值，
   * 前端据此做「我考数学几」筛选。非数学章节只有一个值。
   */
  modules?: string[]
}

interface ChapterBundle {
  schemaVersion: string
  chapterId: string
  subjectId: string
  module: string
  /** 本章适用的考试模块（数学一 / 数学二），用于前端的「我考数学几」筛选 */
  modules?: string[]
  title: string
  sortOrder: number
  knowledge: ReturnType<typeof toKnowledgePoint>[]
}

function buildCatalog() {
  const knowledgeUpdatedAt = [fileUpdatedAt('math/tree.ts'), fileUpdatedAt('math/lectures.ts')].sort().pop()!
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

        const chapterModules = (chapter as { modules?: string[] }).modules
        chapters.push({
          id: chapterId,
          subjectId: subject.id,
          title: chapterTitle,
          summary,
          sortOrder,
          module: mod.name,
          ...(chapterModules && chapterModules.length ? { modules: chapterModules } : {}),
        })

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
          ...(chapterModules && chapterModules.length ? { modules: chapterModules } : {}),
          title: chapterTitle,
          sortOrder,
          knowledge,
        })
      }
    }
  }

  // ── 政治知识点：当前 POLITICS_CHAPTERS 为空数组 ──
  //
  // 政治现在改成**刷题**模块（题目见 data/politics/questions.ts，走 buildPoliticsQuestions()），
  // 没有可发布的知识点讲解，所以这里是空循环、不产出任何章节。
  // 保留这段是为了将来有真实讲解稿时能直接填回来，不必重写投影逻辑。
  //
  // 历史：原先跟随设计稿做成「1 章（政治基础框架）× 3 个平铺知识点」。
  for (const ch of POLITICS_CHAPTERS) {
    const subject = POLITICS_SUBJECT_DEF
    const chapterId = ch.id
    const sectionId = `${chapterId}-s1`
    usedChapterIds.add(chapterId)

    const knowledge = ch.points.map((p, i) => {
      const kpUsed = new Set<string>()
      const exampleUsed = new Set<string>()
      const body = [
        plain(p.summary),
        `### 理解要点\n\n${p.keyPoints.map((k, n) => `${n + 1}. ${plain(k)}`).join('\n')}`,
        `### 放进例子里理解\n\n${plain(p.example)}`,
      ].join('\n\n')
      return {
        schemaVersion: SCHEMA_VERSION,
        id: uniquify(`kp-${chapterId}-${slug(p.title, 40)}`, usedKeyPointIds),
        contentVersion: 1,
        subjectId: subject.id,
        chapterId,
        sectionId,
        sectionTitle: ch.title,
        title: p.title,
        summary: p.summary,
        tags: p.tags,
        sortOrder: (i + 1) * 10,
        estimatedMinutes: Math.max(3, Math.min(10, Math.round(body.length / 60))),
        anchor: p.anchor,
        keyPoints: p.keyPoints.map((k) => ({
          id: uniquify(slug(k, 40), kpUsed),
          title: shortTitle(k),
          bodyMarkdown: plain(k),
        })),
        examples: [
          { id: uniquify(slug(p.example, 24), exampleUsed), title: '讲解例子', bodyMarkdown: plain(p.example) },
        ],
        relatedKnowledgeIds: [],
        sources: [],
        status: 'published',
        updatedAt: knowledgeUpdatedAt,
        bodyMarkdown: body,
      }
    })

    totalKnowledge += knowledge.length
    stats.structuredPoints += knowledge.length
    for (const kp of knowledge) stats.keyPointCounts.set(kp.keyPoints.length, (stats.keyPointCounts.get(kp.keyPoints.length) || 0) + 1)

    chapters.push({
      id: chapterId,
      subjectId: subject.id,
      title: ch.title,
      summary: ch.summary,
      sortOrder: ch.sortOrder,
      module: POLITICS_SUBJECT.name,
    })
    bundles.push({
      schemaVersion: SCHEMA_VERSION,
      chapterId,
      subjectId: subject.id,
      module: POLITICS_SUBJECT.name,
      title: ch.title,
      sortOrder: ch.sortOrder,
      knowledge,
    })
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
  const updatedAt = fileUpdatedAt('english/words.ts')
  const usedIds = new Set<string>()
  const posTagCount = new Map<string, number>()
  const noPos: string[] = []
  const renamed: string[] = []
  const emptyMeaning: string[] = []

  // 深度内容（例句 / 词根 / 助记 / 搭配）按小写词形索引，构建时并入词条。
  // 词表里没有的词 = 写了不会生效，直接报出来，避免静默漏掉。
  const orphanContent = Object.keys(WORD_CONTENT).filter(
    (key) => !RAW_WORDS.some((w) => w.word.toLowerCase() === key),
  )
  if (orphanContent.length > 0) {
    throw new Error(
      `data/english/word-content.ts 里有 ${orphanContent.length} 个词不在词库中：${orphanContent.join(', ')}`,
    )
  }

  const withContent = { examples: 0, root: 0, mnemonic: 0, collocations: 0 }

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
    const extra = WORD_CONTENT[w.word.toLowerCase()]
    if (extra) {
      if (extra.examples.length > 0) withContent.examples++
      if (extra.root) withContent.root++
      if (extra.mnemonic) withContent.mnemonic++
      if (extra.collocations.length > 0) withContent.collocations++
    }

    return {
      schemaVersion: SCHEMA_VERSION,
      id,
      contentVersion: 1,
      courseId: 'english',
      word: w.word,
      pronunciations: ipa ? [{ accent: 'uk', ipa }] : [],
      senses,
      examples: (extra?.examples || []).map((e) => ({
        id: e.id,
        sentence: e.sentence,
        translationZh: e.translationZh,
      })),
      collocations: (extra?.collocations || []).map((c) => ({ phrase: c.phrase, meaningZh: c.meaningZh })),
      // root / mnemonicMarkdown 可选：没有就不写这个键，保持产出干净
      ...(extra?.root
        ? { root: { display: extra.root.display, explanationMarkdown: extra.root.explanation } }
        : {}),
      ...(extra?.mnemonic ? { mnemonicMarkdown: extra.mnemonic } : {}),
      tags,
      sources: [],
      status: 'published',
      updatedAt,
    }
  })

  return { items, updatedAt, noPos, renamed, posTagCount, emptyMeaning, withContent, orphanContent }
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
 * 运行数据。关键约束：**分包里的数据文件必须物理放在分包目录内**，
 * 否则 uni-app 会把它当公共模块丢回主包（实测踩过）。
 *
 *   data/generated/app/catalog.ts            课程 · 学科 · 章节        主包
 *   data/generated/app/knowledge.ts          知识点列表（标题+摘要）   主包
 *   data/generated/app/words.ts              词库                      主包
 *   pages-knowledge/content.ts               公式 · 要点 · 例题        分包 ← 必须放这里
 */
function buildAppBundle(bundles: ChapterBundle[], vocab: ReturnType<typeof buildVocabulary>) {
  const chapters = bundles.map((b) => ({
    id: b.chapterId,
    subjectId: b.subjectId,
    module: b.module,
    ...(b.modules && b.modules.length ? { modules: b.modules } : {}),
    title: b.title,
    summary: b.summary,
    sortOrder: b.sortOrder,
    sections: groupBySection(b.knowledge),
  }))

  // 只保留详情页真正渲染的字段：
  //   anchor.type / format 全库恒定（formula|concept / text）→ 前端可判定，不必存
  //   keyPoints[].title 页面不渲染 → 只留 body，退化成字符串数组
  // anchor.caption 必须保留：它与 summary 首句并不总是一致（960 条里有 61 条不同），
  // 早先试图「从 summary 派生 caption」的裁剪是错的，会显示成别的内容。
  const content: Record<string, unknown> = {}
  for (const b of bundles) {
    for (const kp of b.knowledge) {
      content[kp.id] = {
        anchor: kp.anchor.content,
        caption: kp.anchor.caption,
        keyPoints: kp.keyPoints.map((k) => k.bodyMarkdown),
        example: kp.examples[0]?.bodyMarkdown || '',
      }
    }
  }

  // 单词详情页渲染的深度内容。字段名与 data/english/word-content.ts 一致，只是展平（去掉 id 包装）。
  //
  // 关键：**空字段整键省略**，不写 `"examples":[]` / `"root":null` 这类占位。
  // 全库 5493 个词里绝大多数还没有深度内容，逐条写空数组会白白多出约 300 KB
  // （实测 643 KB → 968 KB，而实际只多了 18 个词的正文）。前端按 undefined 处理空态即可。
  const words = vocab.items.map((w) => {
    const deep: Record<string, unknown> = {}
    if (w.examples.length > 0) {
      deep.examples = w.examples.map((e) => ({ sentence: e.sentence, translation: e.translationZh }))
    }
    if (w.root) deep.root = { display: w.root.display, explanation: w.root.explanationMarkdown }
    if (w.mnemonicMarkdown) deep.mnemonic = w.mnemonicMarkdown
    if (w.collocations.length > 0) {
      deep.collocations = w.collocations.map((c) => ({ phrase: c.phrase, meaning: c.meaningZh }))
    }

    return {
      id: w.id,
      word: w.word,
      ipa: w.pronunciations[0]?.ipa || '',
      pos: w.senses.map((s) => s.partOfSpeech).filter(Boolean).join(' / '),
      meaning: w.senses.map((s) => s.meaningZh).join('；'),
      ...deep,
    }
  })

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

// ---------------------------------------------------------------- 政治题库

/**
 * 政治题库的运行数据投影。
 *
 * 政治没有知识点讲解，只有题目，所以主包里的 catalog 不会有 politics 章节，
 * 内容全在这里。字段全部是刷题页真正要渲染的：题干 / 选项 / 答案 / 解析 /
 * 材料段落 / 采分点。扁平化后逐条记录，不做嵌套包装。
 *
 * **空题库是合法状态**（`POLITICS_QUESTIONS = []`）→ 产出 `[]`，
 * 刷题页显示空态，不伪造数量。
 */
function buildPoliticsQuestions() {
  /** 来源：tags 里的「肖四 / 肖八」→ book；「第N套」→ set */
  const bookOf = (tags: string[]): 'x4' | 'x8' | undefined => (tags.includes('肖八') ? 'x8' : tags.includes('肖四') ? 'x4' : undefined)
  const setOf = (tags: string[]): number | undefined => {
    const t = tags.find((x) => /^第\d+套$/.test(x))
    return t ? Number(t.replace(/[^\d]/g, '')) : undefined
  }
  const srcOf = (tags: string[]) => {
    const book = bookOf(tags)
    return book ? { book, set: setOf(tags) } : {}
  }
  const questions = POLITICS_QUESTIONS.map((q) => {
    if (q.type === 'choice') {
      return {
        id: q.id,
        type: 'choice' as const,
        module: q.module,
        difficulty: q.difficulty,
        stem: q.stem,
        options: q.options.map((o) => ({ key: o.key, text: o.text })),
        answerKey: q.answerKey,
        explanation: q.explanation,
        tags: q.tags,
        ...srcOf(q.tags),
      }
    }
    if (q.type === 'multi') {
      return {
        id: q.id,
        type: 'multi' as const,
        module: q.module,
        difficulty: q.difficulty,
        stem: q.stem,
        options: q.options.map((o) => ({ key: o.key, text: o.text })),
        answerKeys: [...q.answerKeys],
        explanation: q.explanation,
        tags: q.tags,
        ...srcOf(q.tags),
      }
    }
    return {
      id: q.id,
      type: 'material' as const,
      module: q.module,
      difficulty: q.difficulty,
      stem: q.stem,
      material: { title: q.material.title, paragraphs: q.material.paragraphs },
      answerPoints: q.answerPoints,
      explanation: q.explanation,
      tags: q.tags,
      ...srcOf(q.tags),
    }
  })

  // 模块分组：只列**题库里真的有题**的模块，顺序沿用 POLITICS_MODULES 的考纲顺序。
  // 空模块不出现，避免刷题页出现「点了没题」的筛选按钮。
  const modules = POLITICS_MODULES.filter((m) => questions.some((q) => q.module === m)).map((m) => ({
    name: m,
    count: questions.filter((q) => q.module === m).length,
  }))

  // 「套卷投影」：资料库要把政治**直接渲染在政治学科下面**（对齐设计稿
  // knowledgePage 的 `isQuiz ? politicsQuizBody() : knowledgeResults()`），
  // 而资料库在**主包**里，主包不能 import 分包题库（见 check-bundles.mjs 的落位断言）。
  //
  // 资料库那一屏只画「来源切换 + 每套卷的进度卡」，卡片上只有两个数字：
  // 「已练 M / 共 N 题」。N 是这一套的题数（= ids.length），M 靠 ids 逐条查同学的作答记录。
  // 所以主包需要的**只有每套卷的题目 id**：
  //   - 不投影题干：卡片上不显示题干，题干只在卷详情页（分包）出现；
  //   - 不投影 type / module / difficulty：这三个字段曾是「考纲模块筛选 + 行副标题」用的，
  //     那套视图已经按设计稿去掉（只剩 4套卷 / 8套卷）。
  // 只带 id 之后主包这份文件从 202 KB 降到约 11 KB，且不随题库正文长度增长。
  const paperSets = (['x4', 'x8'] as const).flatMap((book) => {
    const setNos = [...new Set(questions.filter((q) => q.book === book).map((q) => q.set!))].sort((a, b) => a - b)
    return setNos.map((set) => ({
      book,
      set,
      ids: questions.filter((q) => q.book === book && q.set === set).map((q) => q.id),
    }))
  })

  return {
    questions,
    paperSets,
    modules,
    choiceCount: questions.filter((q) => q.type === 'choice').length,
    multiCount: questions.filter((q) => q.type === 'multi').length,
    materialCount: questions.filter((q) => q.type === 'material').length,
  }
}

/** pages-politics/questions.ts 里 AppPoliticsQuestion 的接口声明 */
const POLITICS_INTERFACE = [
  'export interface AppPoliticsOption { key: string; text: string }',
  'export interface AppPoliticsMaterial { title: string; paragraphs: string[] }',
  '',
  '/** 单选 / 多选 / 材料题共用一个契约，靠 type 区分；未用到的字段整键省略。 */',
  'export interface AppPoliticsQuestion {',
  '  id: string',
  "  type: 'choice' | 'multi' | 'material'",
  '  module: string',
  '  difficulty: number',
  '  stem: string',
  '  tags: string[]',
  '  /** type === "choice" | "multi" */',
  '  options?: AppPoliticsOption[]',
  '  /** type === "choice"：单选答案（单个 key） */',
  '  answerKey?: string',
  '  /** type === "multi"：多选答案（key 列表，至少 2 项） */',
  '  answerKeys?: string[]',
  '  /** type === "material" */',
  '  material?: AppPoliticsMaterial',
  '  answerPoints?: string[]',
  '  /** 来源：x4 = 2026 肖秀荣《4套卷》，x8 = 《8套卷》；示意题缺省（属「考纲模块」来源） */',
  "  book?: 'x4' | 'x8'",
  '  /** 卷号（book 存在时）：4套卷 1~4，8套卷 1~8 */',
  '  set?: number',
  '  /** 三种题型都有：答案解析 / 答题思路 */',
  '  explanation: string',
  '}',
  '',
  'export interface AppPoliticsModule { name: string; count: number }',
].join('\n')

/** data/generated/app/politics-index.ts 里 AppPoliticsPaperSet 的接口声明 */
const POLITICS_INDEX_INTERFACE = [
  '/**',
  ' * 政治套卷投影：**主包**的资料库渲染政治学科时要画的东西——只有每套卷的题目 id。',
  ' * 题干 / 选项 / 答案 / 解析 / 材料段落全部不在这里，它们在 pages-politics 分包内。',
  ' *',
  ' * 为什么连题干都不给：那一屏只画「来源切换 + 每套卷的进度卡」，卡上的两个数字是',
  ' * 「已练 M / 共 N 题」——N = ids.length，M = 逐条查同学作答记录。题干在主包里没有任何',
  ' * 用处，留着只是让主包白涨（题干一度进过主包，光这一项就是 202 KB）。',
  ' */',
  'export interface AppPoliticsPaperSet {',
  "  book: 'x4' | 'x8'",
  '  /** 卷内第几套：4套卷 1~4，8套卷 1~8 */',
  '  set: number',
  '  /** 这一套的题目 id，按卷面顺序 */',
  '  ids: string[]',
  '}',
  '',
].join('\n')

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
  const politics = buildPoliticsQuestions()

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
  const totalWords = vocab.items.length
  const pct = (n: number) => `${n} (${((n / totalWords) * 100).toFixed(1)}%)`
  console.log(`  深度内容覆盖  : 例句 ${pct(vocab.withContent.examples)} / 词根 ${pct(vocab.withContent.root)} / 助记 ${pct(vocab.withContent.mnemonic)} / 搭配 ${pct(vocab.withContent.collocations)}`)
  console.log(`  深度内容批次  : ${BATCHES.map((b) => `${b.label}(${b.words.length})`).join(' ')}`)
  console.log(`索引            : knowledge ${knowledgeIndex.length} / vocabulary ${vocabularyIndex.length}`)
  console.log(`政治题库        : ${politics.questions.length} 题（单选 ${politics.choiceCount} / 多选 ${politics.multiCount} / 材料 ${politics.materialCount}）`)
  console.log(`  模块分布      : ${politics.modules.map((m) => `${m.name}=${m.count}`).join(' ') || '(空)'}`)
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
        subjects: SUBJECTS.map(({ id, name, shortName, sortOrder, courseId, kind }) => ({ id, courseId, kind, name, shortName, sortOrder })),
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
    `${banner}export interface AppCourse { id: string; name: string; sortOrder: number }\nexport interface AppSubject { id: string; courseId: string; kind: 'math' | 'politics' | 'cs'; name: string; shortName: string; sortOrder: number }\nexport interface AppChapter { id: string; subjectId: string; module: string; modules?: string[]; title: string; summary: string; sortOrder: number }\n\nexport const appCourses: AppCourse[] = ${serializeRecords(COURSES)}\n\nexport const appSubjects: AppSubject[] = ${serializeRecords(
      SUBJECTS.map(({ id, name, shortName, sortOrder, courseId, kind }) => ({ id, courseId, kind, name, shortName, sortOrder })),
    )}\n\nexport const appChapters: AppChapter[] = ${serializeRecords(chapters)}\n\n/**\n * 政治题库总题数（**只是个数字**）。\n * 题库正文在 pages-politics 分包内，主包不能 import 它；但首页的「政治刷题」卡片\n * 要显示「已练 M / 共 T 题」，所以这里只把总数投影到主包。\n */\nexport const appPoliticsQuestionTotal = ${politics.questions.length}\n`,
  )

  write(
    path.join(appDir, 'knowledge.ts'),
    `${banner}export interface AppKnowledgePoint { id: string; title: string; summary: string; minutes: number }\nexport interface AppKnowledgeSection { id: string; title: string; points: AppKnowledgePoint[] }\nexport interface AppKnowledgeChapter { id: string; subjectId: string; module: string; modules?: string[]; title: string; summary: string; sortOrder: number; sections: AppKnowledgeSection[] }\n\nexport const appKnowledge: AppKnowledgeChapter[] = ${serializeRecords(app.chapters)}\n`,
  )

  // 词库全量只被分包页面用到（复习 / 结果 / 单词详情 / 收藏），放进 pages-words 分包内部。
  // 主包只需要一份「id 清单」来选取复习队列——约 100 KB，远小于全量 687 KB。
  const wordsPackageDir = path.join(ROOT, 'pages-words')
  fs.mkdirSync(wordsPackageDir, { recursive: true })
  write(
    path.join(wordsPackageDir, 'words.ts'),
    `${banner}${WORD_INTERFACE}\n\nexport const appWords: AppWord[] = ${serializeRecords(app.words)}\n`,
  )
  write(
    path.join(appDir, 'word-ids.ts'),
    `${banner}/** 只含 id，供主包选取复习队列用；词条正文在 pages-words/words.ts */\nexport const appWordIds: string[] = ${serializeStrings(app.words.map((w) => w.id))}\n`,
  )

  // 政治套卷投影：资料库要在**主包**里把政治渲染在学科下面（设计稿 knowledgePage 就是这么做的），
  // 但题库正文 868 KB 在分包内、主包不能 import。所以这里只投影「每套卷的题目 id」——
  // 和 word-ids 是同一个套路（id 清单在数据层仍然算轻，题干才是重的那部分）。
  write(
    path.join(appDir, 'politics-index.ts'),
    `${banner}${POLITICS_INDEX_INTERFACE}\n\nexport const appPoliticsPaperSets: AppPoliticsPaperSet[] = ${serializeRecords(politics.paperSets)}\n`,
  )

  // 知识点正文必须写进分包目录【内部】。
  // 实测：放在 data/generated/app/ 下时，uni-app 把它当公共模块打回了主包，
  // 分包里只剩一个光秃秃的页面，主包因此涨到 2 MB 以上。
  const subPackageDir = path.join(ROOT, 'pages-knowledge')
  fs.mkdirSync(subPackageDir, { recursive: true })
  write(
    path.join(subPackageDir, 'content.ts'),
    `${banner}export interface AppKnowledgeContent { anchor: string; caption: string; keyPoints: string[]; example: string }\n\nexport const appKnowledgeContent: Record<string, AppKnowledgeContent> = ${serializeMap(Object.entries(app.content))}\n`,
  )

  // 6) 政治题库：规范数据 + 运行数据。
  // 题库正文只被答题 / 结果页用到，主包不需要它，所以运行数据写进分包目录【内部】，
  // 否则 uni-app 会把题库整个拉回主包（和知识点正文一个道理）。
  // 主包的资料库要渲染刷题清单，走的是上面第 5 步投影的 politics-index.ts（轻量清单）。
  const politicsDir = path.join(CONTENT_DIR, 'politics')
  resetDir(politicsDir)
  const politicsUpdatedAt = fileUpdatedAt('politics/questions.ts')
  write(
    path.join(politicsDir, 'questions.json'),
    `{\n  "schemaVersion": ${JSON.stringify(SCHEMA_VERSION)},\n  "courseId": "politics",\n  "subjectId": "politics",\n  "generatedAt": ${JSON.stringify(generatedAt)},\n  "updatedAt": ${JSON.stringify(politicsUpdatedAt)},\n  "count": ${politics.questions.length},\n  "modules": ${serializeRecords(politics.modules)},\n  "questions": ${serializeRecords(politics.questions)}\n}\n`,
  )

  const politicsPackageDir = path.join(ROOT, 'pages-politics')
  fs.mkdirSync(politicsPackageDir, { recursive: true })
  write(
    path.join(politicsPackageDir, 'questions.ts'),
    `${banner}${POLITICS_INTERFACE}\n\nexport const appPoliticsQuestions: AppPoliticsQuestion[] = ${serializeRecords(politics.questions)}\n\nexport const appPoliticsModules: AppPoliticsModule[] = ${serializeRecords(politics.modules)}\n`,
  )

  console.log(`\n已写入 ${knowledgeFiles + 12} 个文件：`)
  console.log(`  data/content/catalog.json`)
  console.log(`  data/content/knowledge/<subject>/*.json   (${knowledgeFiles})`)
  console.log(`  data/content/vocabulary/words.json`)
  console.log(`  data/content/politics/questions.json`)
  console.log(`  data/generated/knowledge-index.json`)
  console.log(`  data/generated/vocabulary-index.json`)
  console.log(`  data/generated/app/catalog.ts | knowledge.ts | word-ids.ts | politics-index.ts   (主包)`)
  console.log(`  pages-knowledge/content.ts                                   (分包内)`)
  console.log(`  pages-words/words.ts                                         (分包内)`)
  console.log(`  pages-politics/questions.ts                                  (分包内，题库正文)`)
}

main()
