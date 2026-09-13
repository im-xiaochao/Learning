/**
 * 知识关系图模型层。
 *
 * 知识点详情里的“关系图”过去对所有知识点都是同一张四宫格，只在文字上做替换，
 * 看起来千篇一律。这里按知识点的实际结构选择不同的图形骨架：
 *
 * - flow    纵向步骤流：适合有明确先后顺序的推导、解法、判定流程
 * - axis    数轴图：适合极限、收敛、无穷小/无穷大这类“趋近某个目标”的内容
 * - compare 左右对照图：适合两个对象比较、等价替换
 * - branch  分支判定图：适合“满足/不满足”导致不同结论的定理与判别
 * - radial  中心辐射图：适合一个对象带着若干性质或结论的结构
 *
 * 节点文字一律取自当前知识点自己的公式、步骤和要点，不套通用模板。
 */
import type { MathVisualKind } from './math-enhancements'

export type VisualTone = 'core' | 'accent' | 'soft' | 'muted'

export interface VisualNode {
  id: string
  label: string
  detail?: string
  x: number
  y: number
  width: number
  height: number
  tone: VisualTone
  /** line 用于绘制数轴一类的辅助线，不渲染文字。 */
  shape?: 'node' | 'line'
}

export interface VisualEdge {
  id: string
  from: string
  to: string
  tone: VisualTone
}

export interface VisualModel {
  caption: string
  relation: string
  evidence: string
  takeaway: string
  diagramHeight: number
  nodes: VisualNode[]
  edges: VisualEdge[]
}

export interface VisualInput {
  kind: MathVisualKind
  title?: string
  section?: string
  summary?: string
  formula?: string
  keyPoints?: readonly string[]
  steps?: readonly string[]
  example?: string
  content?: readonly string[]
  label?: string
}

type Layout = 'flow' | 'axis' | 'compare' | 'radial' | 'branch'

interface KindSpec {
  layout: Layout
  caption: string
  relation: string
  /** 语义标签：[主对象, 第二对象, 结论] */
  labels: [string, string, string]
  takeaway: string
}

/** 实际容器宽度约为画布逻辑宽度的 0.88 倍，用于估算一行能放下的字数。 */
const REAL_WIDTH_RATIO = 0.88
const CHAR_WIDTH = 11

const KIND_SPECS: Record<MathVisualKind, KindSpec> = {
  mapping: {
    layout: 'flow',
    caption: '输入到输出的对应',
    relation: '定义域 → 对应法则 f → 值域',
    labels: ['定义域 D', '对应法则 f', '值域 W'],
    takeaway: '先确定允许输入什么，再检查对应是否唯一。',
  },
  limit: {
    layout: 'axis',
    caption: '沿数轴靠近目标值',
    relation: '趋近过程 → 目标值 A → 判定条件',
    labels: ['趋近过程', '极限值 A', '判定条件'],
    takeaway: '极限看“最终稳定靠近”，不是代入的那一刻。',
  },
  sequence: {
    layout: 'axis',
    caption: '数列项逼近极限',
    relation: 'aₙ 沿数轴移动 → A → 收敛判定',
    labels: ['数列项 aₙ', '极限 A', '收敛判定'],
    takeaway: '从某一项起全部落入 ε 邻域，才叫收敛。',
  },
  infinitesimal: {
    layout: 'axis',
    caption: '沿数轴趋于零',
    relation: '改变量 → 0 → 阶数判定',
    labels: ['改变量', '0（无穷小）', '阶数判定'],
    takeaway: '无穷小不是“很小”，而是极限为 0。',
  },
  infinite: {
    layout: 'axis',
    caption: '沿数轴无限增长',
    relation: '增长过程 → ∞ → 比较判定',
    labels: ['增长过程', '∞（无穷大）', '比较判定'],
    takeaway: '无穷大描述趋势，不是某一个很大的数。',
  },
  comparison: {
    layout: 'compare',
    caption: '两个量比阶',
    relation: '比较对象 → 比值极限 → 阶数结论',
    labels: ['参考对象', '比较对象', '阶数结论'],
    takeaway: '阶数由比值极限决定，先写清相对谁比较。',
  },
  equivalent: {
    layout: 'compare',
    caption: '等价替换',
    relation: '原量 → 比值趋于 1 → 替换结果',
    labels: ['原表达式', '等价关系', '替换结果'],
    takeaway: '等价替换只在乘除结构里安全，加减结构要更高阶展开。',
  },
  continuity: {
    layout: 'flow',
    caption: '连续要看三件事',
    relation: '函数值存在 → 极限存在 → 两者相等',
    labels: ['函数值存在', '极限存在', '两者相等'],
    takeaway: '三个条件同时成立才连续，缺一不可。',
  },
  tangent: {
    layout: 'flow',
    caption: '从割线到切线',
    relation: '取邻近点 → 割线斜率 → 取极限得切线斜率',
    labels: ['取邻近点 Q', '割线斜率', '切线斜率'],
    takeaway: '割线斜率取极限，才是该点的切线斜率。',
  },
  theorem: {
    layout: 'branch',
    caption: '条件决定结论',
    relation: '逐条验证条件 → 满足得结论 / 不满足举反例',
    labels: ['定理条件', '满足 → 结论', '不满足 → 反例'],
    takeaway: '条件缺一不可，先逐条验证再套结论。',
  },
  taylor: {
    layout: 'flow',
    caption: '多项式逐阶逼近',
    relation: '展开点 → 逐阶多项式 → 余项估计',
    labels: ['展开点 x₀', '逐阶多项式', '余项估计'],
    takeaway: '阶数越高越贴近，误差由余项给出上界。',
  },
  series: {
    layout: 'branch',
    caption: '部分和是否稳定',
    relation: '部分和 Sₙ → 收敛得和 S / 发散无和',
    labels: ['部分和 Sₙ', '收敛 → 和 S', '发散 → 无和'],
    takeaway: '先判收敛再谈求和，边界点要单独检查。',
  },
  extremum: {
    layout: 'branch',
    caption: '导数符号决定形状',
    relation: '看导数符号 → 变号得极值 / 不变号不是极值',
    labels: ['导数符号', '变号 → 极值', '不变号 → 非极值'],
    takeaway: 'f′=0 只是驻点，要结合导数变号判断。',
  },
  ode: {
    layout: 'flow',
    caption: '先认类型再选解法',
    relation: '写出方程 → 判定类型 → 通解 + 特解',
    labels: ['写出方程', '判定类型', '选择解法'],
    takeaway: '先分类再套公式，通解别漏常数 C。',
  },
  integral: {
    layout: 'flow',
    caption: '分割、近似、取极限',
    relation: '分割区间 → 近似求和 → 取极限得积分',
    labels: ['分割区间', '近似求和', '取极限'],
    takeaway: '定积分是和的极限，先看分割形状。',
  },
  flow: {
    layout: 'flow',
    caption: '按顺序推进',
    relation: '第一步 → 逐步推导 → 得到结论',
    labels: ['研究对象', '核心关系', '应用结论'],
    takeaway: '按顺序走一遍，比硬记结论更可靠。',
  },
  matrix: {
    layout: 'radial',
    caption: '矩阵作用与特征方向',
    relation: '矩阵作用 → 特征方向保持不变 → 代数结论',
    labels: ['矩阵 A', '特征方向', '变换结论'],
    takeaway: '特征向量变换后只改长度，不改方向。',
  },
  'linear-system': {
    layout: 'branch',
    caption: '秩决定解的结构',
    relation: '比较秩 → 有解继续判定 / 无解立即停止',
    labels: ['增广矩阵的秩', '有解 → 继续判定', '无解 → 停止'],
    takeaway: '先比秩判有无解，再比未知数个数判解的多少。',
  },
  probability: {
    layout: 'radial',
    caption: '从样本空间到概率',
    relation: '样本空间 → 目标事件 → 概率公式',
    labels: ['样本空间 Ω', '目标事件', '概率结论'],
    takeaway: '先把题目条件翻译成事件，再套公式。',
  },
  distribution: {
    layout: 'radial',
    caption: '分布刻画随机变量',
    relation: '随机变量 → 分布 → 数字特征',
    labels: ['随机变量', '分布', '数字特征'],
    takeaway: '先写清取值与概率，再谈期望方差。',
  },
  gradient: {
    layout: 'flow',
    caption: '方向与最快的方向',
    relation: '指定方向 → 方向导数 → 梯度方向',
    labels: ['指定方向', '方向导数', '梯度方向'],
    takeaway: '梯度方向是函数增长最快的方向。',
  },
  plane: {
    layout: 'radial',
    caption: '方程与图形互相翻译',
    relation: '方程 → 图形 → 几何结论',
    labels: ['方程', '图形', '几何结论'],
    takeaway: '几何问题先写成方程，代数结果再翻译回图形。',
  },
  vector: {
    layout: 'radial',
    caption: '运算与几何意义',
    relation: '向量运算 → 数量积 / 向量积 → 几何结论',
    labels: ['向量 a、b', '运算', '几何结论'],
    takeaway: '数量积得标量，向量积得向量，几何含义不同。',
  },
}

function clean(text: string | undefined): string {
  return (text || '')
    .replace(/`/g, '')
    .replace(/^第[一二三四五六七八九十0-9]+章\s*/, '')
    .replace(/^\d+(?:\.\d+)+\s*/, '')
    .replace(/^\d+[.、]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 按节点实际宽度截断文字，保证永远只占一行、不会溢出节点。 */
function fit(text: string | undefined, width: number): string {
  const value = clean(text)
  if (!value) return ''
  const budget = Math.max(5, Math.floor((width * REAL_WIDTH_RATIO - 20) / CHAR_WIDTH))
  return value.length > budget ? `${value.slice(0, budget - 1)}…` : value
}

function brief(text: string | undefined, max: number): string {
  const value = clean(text)
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function makeNode(
  id: string,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  tone: VisualTone,
  detail?: string,
): VisualNode {
  return { id, label, detail: detail || undefined, x, y, width, height, tone, shape: 'node' }
}

function makeLine(id: string, x: number, y: number, width: number): VisualNode {
  return { id, label: '', x, y, width, height: 3, tone: 'muted', shape: 'line' }
}

function makeEdge(id: string, from: string, to: string, tone: VisualTone = 'accent'): VisualEdge {
  return { id, from, to, tone }
}

/** 从当前知识点的原始内容里取可用的句子片段，作为节点细节。 */
function sourcePieces(input: VisualInput): string[] {
  const source = [
    ...(input.content || []),
    ...(input.keyPoints || []),
    ...(input.steps || []),
    input.formula || '',
    input.example || '',
  ]
    .flatMap((item) => clean(item).split(/[。；;！!？?,，、|]+/))
    .map((item) => clean(item).replace(/^[-:：]+/, ''))
    .filter((item) => item.length > 1)
    .filter((item) => !/^(可视化|核心动画|App|动画|建议)$/.test(item))

  return [...new Set(source)]
}

const CIRCLED = ['①', '②', '③', '④']

interface LayoutResult {
  nodes: VisualNode[]
  edges: VisualEdge[]
  height: number
}

/** 纵向步骤流：每一步一个整宽节点，箭头向下。 */
function layoutFlow(spec: KindSpec, input: VisualInput): LayoutResult {
  const steps = (input.steps || []).map(clean).filter((item) => item.length > 1).slice(0, 4)
  const points = (input.keyPoints || []).map(clean).filter((item) => item.length > 1).slice(0, 4)
  const source = steps.length ? steps : points.length ? points : spec.labels
  const numbered = steps.length > 0 || points.length > 0

  const nodeWidth = 316
  const nodeHeight = 42
  const gapY = 22
  const nodes = source.map((text, index) =>
    makeNode(
      `n${index}`,
      fit(numbered ? `${CIRCLED[index] || ''} ${text}` : text, nodeWidth),
      180,
      30 + index * (nodeHeight + gapY),
      nodeWidth,
      nodeHeight,
      index === source.length - 1 ? 'core' : index === 0 ? 'soft' : 'accent',
    ),
  )
  const edges = nodes.slice(1).map((item, index) => makeEdge(`e${index}`, nodes[index]!.id, item.id))
  const last = nodes[nodes.length - 1]
  return { nodes, edges, height: last ? last.y + nodeHeight / 2 + 14 : 220 }
}

/** 数轴图：三个事件节点 + 一条数轴。 */
function layoutAxis(spec: KindSpec, input: VisualInput, pieces: string[]): LayoutResult {
  const nodeWidth = 108
  const nodeHeight = 52
  const y = 72
  const spots = [66, 180, 294]
  const details = [
    fit(pieces[0] || input.summary, nodeWidth),
    fit(input.formula || pieces[1], nodeWidth),
    fit((input.keyPoints || [])[0] || pieces[2], nodeWidth),
  ]

  const nodes = spec.labels.map((label, index) =>
    makeNode(`n${index}`, label, spots[index]!, y, nodeWidth, nodeHeight, index === 1 ? 'core' : 'soft', details[index]),
  )
  nodes.push(makeLine('axis', 180, y + 58, 320))

  return {
    nodes,
    edges: [makeEdge('e0', 'n0', 'n1'), makeEdge('e1', 'n1', 'n2')],
    height: y + 58 + 14,
  }
}

/** 左右对照图：两个对象各自指向结论。 */
function layoutCompare(spec: KindSpec, input: VisualInput, pieces: string[]): LayoutResult {
  const sideWidth = 164
  const sideHeight = 54
  const nodes = [
    makeNode('left', spec.labels[0], 98, 78, sideWidth, sideHeight, 'soft', fit(pieces[0] || input.summary, sideWidth)),
    makeNode('right', spec.labels[1], 262, 78, sideWidth, sideHeight, 'accent', fit(pieces[1] || input.keyPoints?.[0], sideWidth)),
    makeNode('result', spec.labels[2], 180, 176, 250, 48, 'core', fit(input.formula || pieces[2], 250)),
  ]
  return {
    nodes,
    edges: [makeEdge('e0', 'left', 'result'), makeEdge('e1', 'right', 'result')],
    height: 176 + 24 + 14,
  }
}

/** 分支判定图：一个前提分出两条结论。 */
function layoutBranch(spec: KindSpec, input: VisualInput, pieces: string[]): LayoutResult {
  const childWidth = 160
  const childHeight = 54
  const nodes = [
    makeNode('root', spec.labels[0], 180, 40, 250, 46, 'accent', fit(input.formula || pieces[0], 250)),
    makeNode('yes', spec.labels[1], 96, 140, childWidth, childHeight, 'core', fit((input.keyPoints || [])[0] || pieces[1], childWidth)),
    makeNode('no', spec.labels[2], 264, 140, childWidth, childHeight, 'soft', fit((input.keyPoints || [])[1] || pieces[2], childWidth)),
  ]
  return {
    nodes,
    edges: [makeEdge('e0', 'root', 'yes'), makeEdge('e1', 'root', 'no', 'soft')],
    height: 140 + childHeight / 2 + 14,
  }
}

/** 中心辐射图：中心对象 + 若干要点。 */
function layoutRadial(spec: KindSpec, input: VisualInput, pieces: string[]): LayoutResult {
  const centerWidth = 138
  const centerHeight = 52
  const satWidth = 128
  const satHeight = 46
  const centerX = 180
  const centerY = 112
  const radiusX = 116
  const radiusY = 76

  const satellites = [
    { angle: 90, label: spec.labels[1], detail: (input.keyPoints || [])[0] || pieces[0] },
    { angle: 210, label: spec.labels[2], detail: (input.keyPoints || [])[1] || pieces[1] },
    { angle: 330, label: '应用 / 检验', detail: (input.keyPoints || [])[2] || pieces[2] },
  ]

  const nodes: VisualNode[] = [
    makeNode('center', spec.labels[0], centerX, centerY, centerWidth, centerHeight, 'core', fit(input.formula || input.summary, centerWidth)),
  ]
  const edges: VisualEdge[] = []

  satellites.forEach((item, index) => {
    const rad = (Math.PI * item.angle) / 180
    const x = centerX + radiusX * Math.cos(rad)
    const y = centerY - radiusY * Math.sin(rad)
    const id = `sat${index}`
    nodes.push(makeNode(id, fit(item.label, satWidth), x, y, satWidth, satHeight, index === 0 ? 'accent' : 'soft', fit(item.detail, satWidth)))
    edges.push(makeEdge(`e${index}`, 'center', id))
  })

  return { nodes, edges, height: centerY + radiusY + satHeight / 2 + 14 }
}

function layoutOf(spec: KindSpec): Layout {
  return spec.layout
}

export function buildVisualModel(input: VisualInput): VisualModel {
  const spec = KIND_SPECS[input.kind] || KIND_SPECS.flow
  const pieces = sourcePieces(input)
  const layout = layoutOf(spec)

  const result =
    layout === 'axis'
      ? layoutAxis(spec, input, pieces)
      : layout === 'compare'
        ? layoutCompare(spec, input, pieces)
        : layout === 'branch'
          ? layoutBranch(spec, input, pieces)
          : layout === 'radial'
            ? layoutRadial(spec, input, pieces)
            : layoutFlow(spec, input)

  return {
    caption: brief(spec.caption, 22),
    relation: brief(spec.relation, 44),
    evidence: fit(input.formula || pieces[0] || input.summary || `围绕“${clean(input.title)}”整理本卡内容`, 250),
    takeaway: brief(spec.takeaway, 40),
    diagramHeight: result.height,
    nodes: result.nodes,
    edges: result.edges,
  }
}
