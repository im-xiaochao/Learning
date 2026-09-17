/**
 * 计算机专业课的学科定义（**手工编写，不是生成物**）。
 *
 * 目前只有学科骨架，没有章节与知识点——资料库页会显示「内容还在整理」的空状态，
 * 不伪造内容数量（格式文档第 4 节的要求）。
 *
 * 补内容时：给下面某个学科加 `chapters`，字段结构与 `data/politics/chapters.ts` 的
 * `POLITICS_CHAPTERS` 一致，`tools/build-content.ts` 会自动接上。
 */

export interface MajorSubject {
  id: string
  courseId: string
  name: string
  shortName: string
  sortOrder: number
  /**
   * 学科类型（格式文档 v1.1 第 4 节）。前端按它决定详情页文案与插图，
   * **不要在前端按 subjectId 硬编码**。计算机专业课目前沿用数学的文案与插图。
   */
  kind: 'cs'
}

export const MAJOR_COURSE = { id: 'cs', name: '计算机专业课', sortOrder: 40 }

export const MAJOR_SUBJECTS: MajorSubject[] = [
  { id: 'cs-coa', courseId: 'cs', kind: 'cs', name: '计算机组成原理', shortName: '组成原理', sortOrder: 50 },
  { id: 'cs-os', courseId: 'cs', kind: 'cs', name: '操作系统', shortName: '操作系统', sortOrder: 60 },
  { id: 'cs-ds', courseId: 'cs', kind: 'cs', name: '数据结构', shortName: '数据结构', sortOrder: 70 },
  { id: 'cs-net', courseId: 'cs', kind: 'cs', name: '计算机网络', shortName: '计算机网络', sortOrder: 80 },
]
