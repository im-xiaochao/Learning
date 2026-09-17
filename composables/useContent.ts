/**
 * 内容数据访问层：页面只从这里读「课程 / 学科 / 章节 / 知识点」，不直接碰生成物。
 *
 * 数据来自 data/content（规范数据）→ tools/build-content.ts 投影 → data/generated/app（运行数据）。
 *
 * 注意：**这里不导出词库**。词库全量（687 KB）放在 pages-words 分包内部，
 * 只被该分包的页面引用；主包若在这里 import 它，就会把它拉回主包，分包就白拆了。
 * 主包需要词库 id 清单时用 data/generated/app/word-ids。
 */
import { appCourses, appSubjects, appChapters, appPoliticsQuestionTotal } from '../data/generated/app/catalog'
import { appKnowledge } from '../data/generated/app/knowledge'

import type { AppCourse, AppSubject, AppChapter } from '../data/generated/app/catalog'
import type { AppKnowledgeChapter, AppKnowledgeSection, AppKnowledgePoint } from '../data/generated/app/knowledge'

export type { AppCourse, AppSubject, AppChapter, AppKnowledgeChapter, AppKnowledgeSection, AppKnowledgePoint }

export { appCourses, appSubjects, appChapters, appKnowledge, appPoliticsQuestionTotal }

/** 学科：按 sortOrder 排序 */
export const subjects: AppSubject[] = [...appSubjects].sort((a, b) => a.sortOrder - b.sortOrder)

/** 课程 */
export const courses: AppCourse[] = [...appCourses].sort((a, b) => a.sortOrder - b.sortOrder)

/** 章节：按 sortOrder 稳定排序 */
export const chapters: AppChapter[] = [...appChapters].sort((a, b) => a.sortOrder - b.sortOrder)

/**
 * tab 分组的学科清单。按 courseId 派生而不是写死 id——
 * 以后往资料库加专业课，只要数据里有对应学科就会自动出现。
 *   数学 tab   ← courseId = math
 *   资料库 tab ← 其余（政治、计算机专业课…）
 */
export const MATH_SUBJECT_IDS: string[] = subjects.filter((s) => s.courseId === 'math').map((s) => s.id)
export const LIBRARY_SUBJECT_IDS: string[] = subjects.filter((s) => s.courseId !== 'math').map((s) => s.id)

const subjectById = new Map(subjects.map((s) => [s.id, s]))

export function getSubject(id: string): AppSubject | undefined {
  return subjectById.get(id)
}

/**
 * 学科的形态：`math` / `politics` / `cs`。
 *
 * 目前用来判定「这个学科是知识点讲解，还是刷题」——政治没有可发布的知识点讲解，
 * 落到刷题页。**不要按 subjectId === 'politics' 硬编码**：以后别的学科改刷题时，
 * 数据里改 kind 就行（格式文档 v1.1 第 4 节）。
 */
export type SubjectKind = 'math' | 'politics' | 'cs'

export function kindOfSubject(id: string): SubjectKind | undefined {
  return subjectById.get(id)?.kind
}

/**
 * 学科是否以「刷题」呈现。
 * 判据是 kind === 'politics' 且该学科**没有知识点章节**——
 * 等政治补上真实讲解稿（`data/politics/chapters.ts` 非空）时，
 * 它就会自动回到知识点列表，不需要改页面。
 */
export function isQuizSubject(id: string): boolean {
  return kindOfSubject(id) === 'politics' && chaptersOfSubject(id).length === 0
}

/**
 * 详情页的抓手标题与说明文案，由学科 `kind` 决定，**不要按 subjectId 硬编码**。
 * 新增学科时只改数据里的 kind，这里不用动（格式文档 v1.1 第 4 节）。
 */
export interface SubjectCopy {
  /** 公式 / 概念卡片的标题 */
  anchorLabel: string
  /** 讲解例子区块的标题 */
  exampleTitle: string
  /** 章节卡片插图：概念类用建筑图形，其余用函数曲线 */
  art: 'concept' | 'curve'
}

const SUBJECT_COPY: Record<string, SubjectCopy> = {
  math: { anchorLabel: '关键公式', exampleTitle: '放进例子里理解', art: 'curve' },
  politics: { anchorLabel: '概念抓手', exampleTitle: '放进生活里理解', art: 'concept' },
  // 计算机专业课暂时沿用数学的文案与插图；将来要专属文案时在这里加一项即可
  cs: { anchorLabel: '关键公式', exampleTitle: '放进例子里理解', art: 'curve' },
}

const FALLBACK_COPY: SubjectCopy = SUBJECT_COPY.math

export function copyOfSubject(subjectId: string): SubjectCopy {
  const kind = subjectById.get(subjectId)?.kind
  return (kind && SUBJECT_COPY[kind]) || FALLBACK_COPY
}

const chapterById = new Map(appChapters.map((c) => [c.id, c]))
const knowledgeByChapter = new Map(appKnowledge.map((k) => [k.id, k]))

export function getChapter(id: string): AppChapter | undefined {
  return chapterById.get(id)
}

export function getKnowledgeChapter(id: string): AppKnowledgeChapter | undefined {
  return knowledgeByChapter.get(id)
}

/** 某学科下的章节 */
export function chaptersOfSubject(subjectId: string): AppChapter[] {
  return chapters.filter((c) => c.subjectId === subjectId)
}

/**
 * 按考试模块筛选章节。数学一 / 数学二共用同一份章节数据，
 * 章节上的 modules 标注了它适用于哪些模块；传空或 'all' 表示不筛选。
 * 非数学章节没有 modules 字段，任何时候都保留。
 */
export function filterChaptersByModule(list: AppChapter[], module: string): AppChapter[] {
  if (!module || module === 'all') return list
  return list.filter((c) => !c.modules || c.modules.length === 0 || c.modules.includes(module))
}

/** 学科下出现过的考试模块清单（用于渲染筛选器），按出现顺序去重 */
export function modulesOfSubject(subjectId: string): string[] {
  const seen: string[] = []
  for (const c of chaptersOfSubject(subjectId)) {
    for (const m of c.modules || []) if (!seen.includes(m)) seen.push(m)
  }
  return seen
}

/** 某章节的小节 */
export function sectionsOfChapter(chapterId: string): AppKnowledgeSection[] {
  return knowledgeByChapter.get(chapterId)?.sections || []
}

/** 展平后的知识点条目（带所属章节 / 小节），列表页与搜索都用它 */
export interface KnowledgeEntry {
  point: AppKnowledgePoint
  section: AppKnowledgeSection
  chapter: AppKnowledgeChapter
  subjectId: string
  module: string
}

export const knowledgeEntries: KnowledgeEntry[] = appKnowledge.flatMap((chapter) =>
  chapter.sections.flatMap((section) =>
    section.points.map((point) => ({
      point,
      section,
      chapter,
      subjectId: chapter.subjectId,
      module: chapter.module,
    })),
  ),
)

const entryById = new Map(knowledgeEntries.map((e) => [e.point.id, e]))

export function getEntry(id: string): KnowledgeEntry | undefined {
  return entryById.get(id)
}

export function entriesOfChapter(chapterId: string): KnowledgeEntry[] {
  return knowledgeEntries.filter((e) => e.chapter.id === chapterId)
}

/** 知识点总数 */
export const knowledgeTotal = knowledgeEntries.length

/** 各学科知识点数 */
export function knowledgeCountOfSubject(subjectId: string): number {
  return knowledgeEntries.filter((e) => e.subjectId === subjectId).length
}

/** 搜索：标题 + 摘要 + 小节 + 章节（与 data/generated/knowledge-index.json 的口径一致） */
export function searchKnowledge(query: string, subjectId?: string): KnowledgeEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const pool = subjectId ? knowledgeEntries.filter((e) => e.subjectId === subjectId) : knowledgeEntries
  return pool.filter((e) =>
    `${e.point.title} ${e.point.summary} ${e.section.title} ${e.chapter.title}`.toLowerCase().includes(q),
  )
}
