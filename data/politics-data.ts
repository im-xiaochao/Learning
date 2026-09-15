/**
 * 政治知识点（**手工编写，不是生成物**）。
 *
 * 为什么单独放一个文件：数学的知识树来自 `math-data.ts`、讲义来自 `math-lectures.ts`，
 * 而政治没有对应的源数据。设计稿 `ci-shu-tong-xing.html` 里的政治模块只有 3 个知识点
 * （`subjects[3]` + `concepts[3]`），《知识点数据存放格式与实例》第 5 节实例 B 也给了
 * 「实践与认识的关系」的完整字段。这里把这两处的既有内容转录成结构化数据，
 * 由 `tools/build-content.ts` 一并投影到 data/content 与小程序运行数据里。
 *
 * 内容全部来自设计稿与格式文档，没有编造；要扩充政治题库直接在这里加章节和知识点即可。
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
}

/** 设计稿里政治只有「政治基础框架」一章；文档第 2 节建议拆成三个可独立阅读的章节 */
export const POLITICS_CHAPTERS: PoliticsChapter[] = [
  {
    id: 'ch-politics-marxism',
    title: '马克思主义基本原理',
    summary: '理解实践、认识及其相互关系。',
    sortOrder: 10,
    points: [
      {
        title: '实践与认识的关系',
        summary: '从实践出发形成认识，再用认识指导实践，在实践中检验和发展认识。',
        tags: ['马克思主义基本原理', '实践', '认识论'],
        anchor: {
          type: 'concept',
          format: 'text',
          content: '实践 → 认识 → 再实践 → 再认识',
          caption: '这一过程不是简单重复，而是在实践中不断深化和发展。',
        },
        keyPoints: [
          '实践是认识的来源、发展的动力和目的，也是检验认识真理性的唯一标准。',
          '认识能够指导实践。正确的认识有助于实践取得预期效果，错误的认识则可能使实践走弯路。',
          '面对复杂情况，需要在实践与认识的相互作用中检验判断、修正理解。',
        ],
        example:
          '先记录一周的学习情况，发现自己在晚间阅读时更容易分心；据此调整阅读时间，再观察下一周的实际效果。这个例子帮助理解从实践中形成认识、再通过实践检验认识的过程。',
      },
    ],
  },
  {
    id: 'ch-politics-theory',
    title: '毛泽东思想和中国特色社会主义理论体系',
    summary: '结合历史与实践理解理论的发展。',
    sortOrder: 20,
    points: [
      {
        title: '理论联系实际',
        summary: '从中国实践出发，理解理论如何回应道路与制度选择。理论来自实践，也要回应现实中的问题与需要。',
        tags: ['中国特色社会主义', '理论联系实际'],
        anchor: {
          type: 'concept',
          format: 'text',
          content: '理论联系实际',
          caption: '用中国具体实践理解中国特色社会主义理论体系',
        },
        keyPoints: [
          '理论来自实践，也要回应现实中的问题与需要。',
          '中国特色社会主义道路、理论、制度、文化相互联系、相互支撑。',
          '理解「为什么」，要把历史选择、现实条件与发展目标放在一起看。',
        ],
        example:
          '比如社区推进数字化服务，不只是换一套工具，还要结合居民需求、公共资源和治理目标持续调整。',
      },
    ],
  },
  {
    id: 'ch-politics-ethics-law',
    title: '思想道德与法治',
    summary: '理解理想信念、道德实践与法治意识。',
    sortOrder: 30,
    points: [
      {
        title: '理想信念、道德实践与法治意识',
        summary: '把理想信念、道德实践和法治意识落到日常行动。理想信念提供方向，道德与法治让选择落在具体行动上。',
        tags: ['思想道德', '法治意识'],
        anchor: {
          type: 'concept',
          format: 'text',
          content: '理想信念 + 道德实践 + 法治意识',
          caption: '思想道德与法治共同塑造日常选择',
        },
        keyPoints: [
          '理想信念提供方向，让个人选择与长期目标保持一致。',
          '道德要求落在诚实、责任、友善等具体行动中。',
          '法治意识提醒我们尊重规则、权利和程序，用合法方式解决分歧。',
        ],
        example:
          '在小组学习中按约定共享资料、如实标注来源、遇到分歧先沟通再按规则处理，就是把道德与法治落到日常。',
      },
    ],
  },
]
