/**
 * 内容数据访问层：页面只从这里读内容，不直接碰生成物。
 *
 * 数据来自 data/content（规范数据）→ tools/build-content.ts 投影 → data/generated/app（运行数据）。
 * 页面依赖这一层的导出与查询函数，将来换存储（接口 / 分包 / 数据库）只需改本文件。
 */
import { appCourses, appSubjects, appChapters } from '../data/generated/app/catalog'
import { appKnowledge } from '../data/generated/app/knowledge'
import { appWords } from '../data/generated/app/words'

import type { AppCourse, AppSubject, AppChapter } from '../data/generated/app/catalog'
import type { AppKnowledgeChapter, AppKnowledgeSection, AppKnowledgePoint } from '../data/generated/app/knowledge'
import type { AppWord } from '../data/generated/app/words'

export type { AppCourse, AppSubject, AppChapter, AppKnowledgeChapter, AppKnowledgeSection, AppKnowledgePoint, AppWord }

export { appCourses, appSubjects, appChapters, appKnowledge, appWords }

/** 学科：只保留有内容的（政治暂无数据） */
export const subjects: AppSubject[] = [...appSubjects].sort((a, b) => a.sortOrder - b.sortOrder)

/** 课程 */
export const courses: AppCourse[] = [...appCourses].sort((a, b) => a.sortOrder - b.sortOrder)

/** 章节：按 sortOrder 稳定排序 */
export const chapters: AppChapter[] = [...appChapters].sort((a, b) => a.sortOrder - b.sortOrder)

/** 词库 */
export const words: AppWord[] = appWords

const chapterById = new Map(appChapters.map((c) => [c.id, c]))
const knowledgeByChapter = new Map(appKnowledge.map((k) => [k.id, k]))
const wordById = new Map(appWords.map((w) => [w.id, w]))
const wordByText = new Map(appWords.map((w) => [w.word, w]))

export function getChapter(id: string): AppChapter | undefined {
  return chapterById.get(id)
}

export function getKnowledgeChapter(id: string): AppKnowledgeChapter | undefined {
  return knowledgeByChapter.get(id)
}

export function getWord(id: string): AppWord | undefined {
  return wordById.get(id) || wordByText.get(id)
}

/** 某学科下的章节 */
export function chaptersOfSubject(subjectId: string): AppChapter[] {
  return chapters.filter((c) => c.subjectId === subjectId)
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
