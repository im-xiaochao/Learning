/**
 * 政治知识点（**手工编写，不是生成物**）。
 *
 * 为什么单独放一个文件：数学的知识树来自 `data/math/tree.ts`、讲义来自
 * `data/math/lectures.ts`，而政治没有对应的源数据。本文件是全库唯一的政治来源，
 * 由 `tools/build-content.ts` 投影到 `data/content` 与小程序运行数据。
 *
 * ## 结构：跟着设计稿（2026-09-16 定）
 *
 * 设计稿 `ci-shu-tong-xing.html` 里政治是**一个学科、一章、三个知识点**：
 *
 *   {id:'politics', name:'思想政治理论', short:'政治',
 *    chapter:'政治基础框架', total:3,
 *    topics:['马克思主义基本原理', '毛泽东思想和中国特色社会主义理论体系', '思想道德与法治'],
 *    notes:[...]}
 *
 * 即 `chapter` 是一个**描述性字符串**，`topics` 是**平铺的知识点列表**，
 * 不体现「章 → 节 → 知识点」三级。所以这里按 **1 章 × 3 知识点** 落地：
 *
 *   章 `政治基础框架`（sortOrder 10）
 *     └─ 三个知识点，sortOrder 10 / 20 / 30，与设计稿 topics 顺序一致
 *
 * ⚠️ 历史偏差：《知识点数据存放格式与实例》第 2 节曾建议把原型那 3 项**拆成 3 个章节**、
 * 每章再分知识点；早期数据也确实做成了 3 章 × 1 知识点 —— 既不满足文档、也不满足原型。
 * 2026-09-16 起统一为跟随原型（1 章 3 知识点）。
 *
 * 内容全部来自设计稿与格式文档第 5 节实例，没有编造；要扩充政治题库直接加章节即可。
 */

export interface PoliticsPoint {
  /** 知识点标题；ID 由 build-content.ts 按「kp-<章节id>-<标题拼音>」生成 */
  title: string
  summary: string
  tags: string[]
  anchor: {
    type: 'formula' | 'concept'
    format: 'latex' | 'text'
    content: string
    caption: string
  }
  /** 理解要点，固定 3 条 */
  keyPoints: string[]
  example: string
}

export interface PoliticsChapter {
  id: string
  title: string
  summary: string
  sortOrder: number
  points: PoliticsPoint[]
}

export const POLITICS_COURSE = { id: 'politics', name: '考研政治', sortOrder: 30 }

export const POLITICS_SUBJECT = {
  id: 'politics',
  courseId: 'politics',
  name: '思想政治理论',
  shortName: '政治',
  sortOrder: 40,
  /**
   * 学科类型（格式文档 v1.1 第 4 节）。前端据此判断「概念抓手 vs 关键公式」，
   * 也据此决定政治落到**刷题页**而不是知识点列表。**不要在前端硬编码 subjectId**。
   */
  kind: 'politics' as const,
}

/**
 * 知识点章节。
 *
 * ⚠️ **当前为空数组**：政治暂时没有可发布的知识点讲解，手上只有题目，
 * 所以政治模块改成刷题（见 `data/politics/questions.ts`）。
 * 等有真实讲解稿时，按原来的「1 章 × N 知识点」结构填回来即可
 * （设计稿里的政治也同步改成了刷题，恢复时要一起改）。
 *
 * 空数组是**合法状态**：资料库页对政治会显示空态，不伪造内容数量。
 */
export const POLITICS_CHAPTERS: PoliticsChapter[] = []
