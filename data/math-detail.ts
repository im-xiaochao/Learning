import type { MathPoint, MathSection } from './math-data'
import {
  getMathEnhancement,
  getMathSectionGuide,
  hasMathContent,
  type MathEnhancement,
  type MathSectionGuide,
  type MathVisualKind,
} from './math-enhancements'
import { getMathLecture, type MathLecture } from './math-lectures'

export function cleanTitle(title: string): string {
  return title
    .replace(/^第[一二三四五六七八九十0-9]+章\s*/, '')
    .replace(/^\d+(?:\.\d+)+\s*/, '')
    .replace(/^\d+[.、]\s*/, '')
}

export function cleanLine(line: string): string {
  return line.replace(/`/g, '').trim()
}

/**
 * Infer a visual from the actual concept instead of falling back to one
 * generic curve. The order matters: specific concepts must win over broad
 * words such as “导数”, “积分” or “随机”.
 */
export function inferVisualKind(text: string): MathVisualKind {
  const value = cleanLine(text)

  if (/函数的概念|函数的表示法|映射|反函数/.test(value)) return 'mapping'
  if (/数列|数列极限/.test(value)) return 'sequence'
  if (/等价无穷小/.test(value)) return 'equivalent'
  if (/无穷小比较/.test(value)) return 'comparison'
  if (/无穷大/.test(value)) return 'infinite'
  if (/无穷小|未定式/.test(value)) return 'infinitesimal'
  if (/间断|连续性|连续定义|介值|零点定理/.test(value)) return 'continuity'
  if (/极限|ε|\bN\b|收敛|发散/.test(value)) return 'limit'
  if (/中值定理|费马定理|罗尔|拉格朗日|柯西/.test(value)) return 'theorem'
  if (/泰勒|麦克劳林|幂级数|傅里叶/.test(value)) return 'taylor'
  if (/级数|收敛半径|收敛区间/.test(value)) return 'series'
  if (/极值|最值|最大值|最小值|单调性|凹凸|拐点|渐近线|曲率/.test(value)) return 'extremum'
  if (/微分方程|常微分|齐次线性|非齐次线性|积分因子/.test(value)) return 'ode'
  if (/概率|贝叶斯|全概率|随机事件|样本空间|条件概率/.test(value)) return 'probability'
  if (/分布|随机变量|期望|方差|协方差|正态/.test(value)) return 'distribution'
  if (/梯度|方向导数/.test(value)) return 'gradient'
  if (/线性方程组|方程组|秩/.test(value)) return 'linear-system'
  if (/向量|内积|数量积|向量积/.test(value)) return 'vector'
  if (/矩阵|行列式|特征值|特征向量|二次型/.test(value)) return 'matrix'
  if (/平面|曲面|空间|极坐标/.test(value)) return 'plane'
  if (/积分|面积|体积|原函数|弧长/.test(value)) return 'integral'
  if (/导数|微分/.test(value)) return 'tangent'
  return 'flow'
}
export const VISUAL_LABELS: Record<MathVisualKind, string> = {
  mapping: '函数映射',
  limit: '函数极限',
  sequence: '数列收敛',
  infinitesimal: '无穷小比较',
  infinite: '无穷大趋势',
  comparison: '无穷小阶数',
  equivalent: '等价替换',
  continuity: '连续性',
  tangent: '导数与切线',
  theorem: '中值定理',
  taylor: '泰勒逼近',
  series: '级数收敛',
  extremum: '单调与极值',
  ode: '微分方程',
  integral: '积分面积',
  flow: '解题流程',
  matrix: '矩阵变换',
  'linear-system': '方程组几何',
  probability: '概率路径',
  distribution: '分布曲线',
  gradient: '梯度方向',
  plane: '空间几何',
  vector: '向量关系',
}

function pointVisualKind(point: MathPoint, section: MathSection, fallback: MathVisualKind): MathVisualKind {
  const pointValue = point.title
  if (/等价无穷小/.test(pointValue)) return 'equivalent'
  if (/无穷小比较/.test(pointValue)) return 'comparison'
  if (/无穷大/.test(pointValue)) return 'infinite'
  if (/无穷小/.test(pointValue)) return 'infinitesimal'
  const value = section.title + ' ' + pointValue
  if (/数列/.test(value)) return 'sequence'
  if (/等价无穷小/.test(value)) return 'equivalent'
  if (/无穷小比较/.test(value)) return 'comparison'
  if (/无穷大/.test(value)) return 'infinite'
  if (/无穷小/.test(value)) return 'infinitesimal'
  if (/间断|连续定义|连续性/.test(value)) return 'continuity'
  if (/级数|收敛半径|收敛区间|幂级数|傅里叶/.test(value)) return 'series'
  if (/微分方程|常微分|积分因子|齐次线性|非齐次线性/.test(value)) return 'ode'
  if (/极值|最值|最大值|最小值|单调性|凹凸|拐点|渐近线|曲率/.test(value)) return 'extremum'
  return fallback
}
/** @deprecated Kept as a compatibility helper while the rich detail layer is used by the page. */
export function legacyPointDetail(point: MathPoint, section: MathSection): MathEnhancement {
  const enhanced = getMathEnhancement(point.title)
  if (enhanced) return { ...enhanced, visual: pointVisualKind(point, section, enhanced.visual) }

  const firstLine = point.blocks.find((block) => block.lines.length)?.lines[0]
  return {
    tag: hasMathContent(point) ? '重点梳理' : '提纲补充',
    summary: firstLine
      ? `${cleanLine(firstLine)} 先把定义、判定条件和典型题型串起来，再结合下方图示建立整体关系。`
      : `本卡围绕“${cleanTitle(point.title)}”建立基础框架，建议先看模块清单，再补充自己的例题与错因。`,
    visual: pointVisualKind(point, section, inferVisualKind(section.title + ' ' + point.title + ' ' + (firstLine || ''))),
    steps: ['先说清对象与条件', '再记住核心关系', '最后用题型检验理解'],
  }
}

export function pointDetail(point: MathPoint, section: MathSection): MathEnhancement {
  const enhanced = getMathEnhancement(point.title)
  const lecture = getMathLecture(point.title, section.title)
  const visual = pointVisualKind(point, section, enhanced?.visual || lecture.visual)
  /** 专属强化内容，或本节讲义命中了专属讲解时，关系图才有真实结构可画。 */
  const visualUseful = Boolean(enhanced) || !lecture.generic

  if (enhanced) {
    return {
      ...enhanced,
      visual,
      visualUseful,
      explanation: lecture.explanation,
      keyPoints: lecture.keyPoints,
      formula: enhanced.formula || lecture.formula,
      example: enhanced.example || lecture.example,
      trap: enhanced.trap || lecture.trap,
      steps: enhanced.steps?.length ? enhanced.steps : lecture.steps,
      source: lecture.source,
    }
  }

  const firstLine = point.blocks.find((block) => block.lines.length)?.lines[0]
  return {
    tag: lecture.tag || (hasMathContent(point) ? '重点梳理' : '提纲补充'),
    summary: lecture.explanation || (firstLine
      ? cleanLine(firstLine) + ' 先把定义、判定条件和典型题型串起来，再结合下方图示建立整体关系。'
      : '本卡围绕“' + cleanTitle(point.title) + '”建立基础框架，建议先看模块清单，再补充自己的例题与错因。'),
    explanation: lecture.explanation,
    keyPoints: lecture.keyPoints,
    formula: lecture.formula,
    example: lecture.example,
    trap: lecture.trap,
    visual,
    visualUseful,
    steps: lecture.steps,
    source: lecture.source,
  }
}

/** 空模块的 intro 原本只是标签；现在每个标签都可以展开成一张小讲义。 */
export function sectionLessons(section: MathSection): MathLecture[] {
  return (section.intro || []).map((topic) => getMathLecture(topic, section.title))
}

export function sectionGuide(section: MathSection): MathSectionGuide {
  const guide = getMathSectionGuide(section.title)
  if (guide) return guide
  return {
    summary: `本模块先建立“${cleanTitle(section.title)}”的知识框架，再把每个概念放回题目语境中判断。`,
    visual: inferVisualKind(section.title),
    steps: section.intro?.slice(0, 3).map(cleanLine) || ['认识基本对象', '整理常用关系', '用典型题型巩固'],
  }
}

export function isVisualBlock(label: string): boolean {
  return /可视化|动画|核心动画|App 交互建议/.test(label)
}

export function contentBlocks(point: MathPoint) {
  return point.blocks.filter((block) => block.lines.length > 0 && !isVisualBlock(block.label))
}

export function visualHints(point: MathPoint): string[] {
  return point.blocks.filter((block) => isVisualBlock(block.label)).flatMap((block) => block.lines.map(cleanLine))
}

export function hasFormula(detail: MathEnhancement): boolean {
  return Boolean(detail.formula)
}

export function pointSteps(point: MathPoint, section: MathSection): string[] {
  return pointDetail(point, section).steps || []
}


