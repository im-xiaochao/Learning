/**
 * 数据源的统一出口（**只做转发，不含内容**）。
 *
 * ## 目录约定：一个学科一个文件夹
 *
 * ```
 * data/
 *   index.ts               ← 本文件，唯一对外出口
 *   math/                  数学（高数 / 线代 / 概率）
 *     tree.ts                知识树：模块 → 部分 → 章 → 节 → 主题
 *     lectures.ts            讲义层：按主题生成解释 / 要点 / 步骤 / 公式 / 例题 / 易错点
 *     enhancements.ts        补充材料与段落导读
 *   english/               英语
 *     words.ts               词表（自动生成：word / phonetic / meaning）
 *     word-content.ts        深度内容（人工撰写：例句 / 词根 / 助记 / 搭配）
 *   politics/              政治
 *     chapters.ts            知识点章节（**当前为空**，无可发布讲解）
 *     questions.ts           题库（选择题 / 材料题，有答案与解析）← 政治模块现在的主内容
 *   cs/                    计算机专业课
 *     subjects.ts            四门课，**只有学科骨架**，尚无章节
 *   content/               （生成物）按格式模板产出的规范数据
 *   generated/             （生成物）搜索索引 + 小程序运行数据
 * ```
 *
 * ## 用法
 *
 * 工具脚本（`tools/*.ts`）一律从这里导入，不要直接写 `../data/math/tree`：
 *
 * ```ts
 * import { MATH_MODULES, getMathLecture, RAW_WORDS, WORD_CONTENT } from '../data'
 * ```
 *
 * ## 约定
 *
 * - 本文件**不许有副作用**，也不许派生新数据；只是 `export ... from` 的转发。
 * - `data/content/**` 与 `data/generated/**` 是生成物，不进这里（页面通过
 *   `composables/useContent.ts` 读它们）。
 * - 加新学科：建 `data/<subject>/`，在这里补一行转发，并在
 *   `tools/build-content.ts` 里接上构建逻辑。
 */

// ── 数学 ────────────────────────────────────────────────────────────────
export { MATH_MODULES } from './math/tree'
export type { MathModule, MathPart, MathChapter, MathSection, MathPoint, MathBlock } from './math/tree'
export { getMathLecture } from './math/lectures'
export type { MathLecture } from './math/lectures'
export { getMathEnhancement, getMathSectionGuide, hasMathContent } from './math/enhancements'
export type { MathEnhancement, MathSectionGuide } from './math/enhancements'

// ── 英语 ────────────────────────────────────────────────────────────────
export { words as RAW_WORDS } from './english/words'
export type { Word as RawWord } from './english/words'
export { WORD_CONTENT, BATCHES } from './english/word-content'
export type { WordContent, WordExample, WordRoot, WordCollocation } from './english/word-content'

// ── 政治 ────────────────────────────────────────────────────────────────
// 政治目前**没有可发布的知识点讲解**，只有题库，所以模块形态是「刷题」。
// POLITICS_CHAPTERS 暂时为空（等有真实讲解稿再恢复）；页面改读题库。
export { POLITICS_COURSE, POLITICS_SUBJECT, POLITICS_CHAPTERS } from './politics/chapters'
export type { PoliticsChapter, PoliticsPoint } from './politics/chapters'
export { POLITICS_QUESTIONS, POLITICS_MODULES, POLITICS_QUESTION_COURSE } from './politics/questions'
export type {
  PoliticsQuestion,
  PoliticsChoiceQuestion,
  PoliticsMaterialQuestion,
  PoliticsChoiceOption,
  PoliticsModule,
  PoliticsDifficulty,
} from './politics/questions'

// ── 计算机专业课 ────────────────────────────────────────────────────────
export { MAJOR_COURSE, MAJOR_SUBJECTS } from './cs/subjects'
export type { MajorSubject } from './cs/subjects'
