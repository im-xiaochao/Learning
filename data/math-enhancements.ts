import type { MathPoint } from './math-data'

export type MathVisualKind =
  | 'mapping'
  | 'limit'
  | 'sequence'
  | 'infinitesimal'
  | 'infinite'
  | 'comparison'
  | 'equivalent'
  | 'continuity'
  | 'tangent'
  | 'theorem'
  | 'taylor'
  | 'series'
  | 'extremum'
  | 'ode'
  | 'integral'
  | 'flow'
  | 'matrix'
  | 'linear-system'
  | 'probability'
  | 'distribution'
  | 'gradient'
  | 'plane'
  | 'vector'

export interface MathEnhancement {
  tag: string
  summary: string
  /** 面向学习者的完整讲解，避免只有一句摘要。 */
  explanation?: string
  /** 读完后应该真正掌握的判断点。 */
  keyPoints?: string[]
  formula?: string
  example?: string
  trap?: string
  visual: MathVisualKind
  steps?: string[]
  /**
   * 本卡是否值得展示知识关系图。
   * 只有拿到专属讲解（而不是通用兜底模板）时才为 true，避免为凑版面硬画一张图。
   */
  visualUseful?: boolean
}

export interface MathSectionGuide {
  summary: string
  formula?: string
  visual: MathVisualKind
  steps: string[]
}

const ENHANCEMENTS: Array<[string, MathEnhancement]> = [
  [
    '函数的概念',
    {
      tag: '核心定义',
      summary: '函数把定义域中的每一个输入 x，按照唯一的对应法则送到值域中的一个输出 y。先找清楚“允许输入什么”，再讨论解析式、图像和性质。',
      formula: 'x ∈ D  →  f(x) ∈ W',
      example: 'f(x)=2x+1，若 D={0,1,2}，则对应输出为 W={1,3,5}。',
      trap: '解析式相同不代表函数相同；定义域不同，函数就可能不同。',
      visual: 'mapping',
      steps: ['确定定义域 D', '写出对应法则 f', '检查每个输入是否只有一个输出'],
    },
  ],
  [
    '数列与极限',
    {
      tag: 'ε-N 语言',
      summary: '数列极限描述的是“从某一项开始，所有项都能稳定地靠近 A”，不是只看前几项是否接近。',
      formula: '∀ε>0，∃N，使 n>N ⇒ |aₙ−A|<ε',
      example: 'aₙ=1/n：给定 ε=0.01，取 N>100 后，所有 aₙ 都落在 A=0 的 ε 邻域内。',
      trap: 'aₙ→A 要求最终全部进入邻域；出现少量异常前项不影响极限。',
      visual: 'limit',
      steps: ['先猜极限 A', '给定任意 ε', '寻找从哪一项 N 开始稳定进入'],
    },
  ],
  [
    '极限存在准则',
    {
      tag: '判定工具',
      summary: '当极限很难直接算时，先判断它是否存在。单调有界抓“趋势 + 边界”，夹逼准则抓“上下界一起收缩”。',
      formula: 'aₙ 单调且有界  ⇒  aₙ 收敛；  gₙ≤aₙ≤hₙ 且 gₙ,hₙ→A  ⇒  aₙ→A',
      example: '0≤sin n/n≤1/n，右端趋于 0，因此 sin n/n→0。',
      trap: '单调但无界可以发散；有界但不单调也不一定收敛。',
      visual: 'limit',
      steps: ['观察单调方向或构造上下界', '确认边界/夹逼对象收敛', '写出结论与适用条件'],
    },
  ],
  [
    '常用等价无穷小',
    {
      tag: '极限替换',
      summary: '等价无穷小的本质是比值趋于 1：在乘除结构中可以替换，从而把复杂表达式换成更熟悉的主部。',
      formula: 'sin x∼x，tan x∼x，eˣ−1∼x，ln(1+x)∼x，1−cos x∼x²/2（x→0）',
      example: 'limₓ→₀ sin(3x)/(5x)=3/5；先把 sin(3x) 替换成 3x。',
      trap: '加减结构不能机械替换，例如 sin x−x 需要更高阶展开，不能直接当作 x−x。',
      visual: 'limit',
      steps: ['确认趋近点是 0', '识别乘除结构', '替换后再检查是否出现 0/0'],
    },
  ],
  [
    '导数定义',
    {
      tag: '变化率',
      summary: '导数是增量比值在步长趋于 0 时的极限：它把一段平均变化率，收缩成某一点的瞬时变化率。',
      formula: "f′(x₀)=limₕ→₀ [f(x₀+h)−f(x₀)]/h",
      example: 'f(x)=x²，在 x₀=1：[(1+h)²−1]/h=2+h，令 h→0 得 f′(1)=2。',
      trap: '差商是割线斜率，只有取极限后才是切线斜率；左右极限不相等时不可导。',
      visual: 'tangent',
      steps: ['取邻近点 Q', '计算割线斜率', '让 Q 沿曲线逼近 P'],
    },
  ],
  [
    '导数几何意义',
    {
      tag: '图像理解',
      summary: '在曲线上取点 P，另一点 Q 越靠近 P，PQ 割线就越接近 P 点的切线；切线斜率就是该点导数。',
      formula: '切线：y−f(x₀)=f′(x₀)(x−x₀)',
      example: 'y=x² 在 (1,1) 处斜率为 2，切线是 y−1=2(x−1)。',
      trap: '切线存在不等于函数在附近单调；导数只描述局部变化率。',
      visual: 'tangent',
    },
  ],
  [
    '几何意义',
    {
      tag: '图像理解',
      summary: '导数的几何意义是切线斜率。把 Q 向 P 移动，割线从一条普通连线连续转成切线。',
      formula: 'k切=f′(x₀)=limₓ→x₀ [f(x)−f(x₀)]/(x−x₀)',
      example: '若 f′(x₀)>0，曲线在 P 附近倾向上升；若 f′(x₀)<0，倾向下降。',
      trap: '导数为 0 只表示切线水平，不直接保证是极大值或极小值。',
      visual: 'tangent',
    },
  ],
  [
    '可导与连续',
    {
      tag: '关系辨析',
      summary: '可导要求曲线在该点有确定的切线，因此一定先连续；但连续只保证不断裂，可能仍有尖点或竖直切线。',
      formula: '可导 ⇒ 连续；连续 ⇏ 可导',
      example: 'f(x)=|x| 在 0 连续，但左导数 −1、右导数 1，所以在 0 不可导。',
      trap: '检查连续要看函数值、极限和值是否相等；检查可导还要比较左右导数。',
      visual: 'tangent',
      steps: ['先判连续', '再求左右导数', '最后判断导数是否相等'],
    },
  ],
  [
    '反函数求导',
    {
      tag: '公式桥梁',
      summary: '原函数把 x 送到 y，反函数把 y 送回 x；同一对对应点的两条切线斜率互为倒数，前提是原函数在该点导数不为 0。',
      formula: '(f⁻¹)′(y)=1/f′(x)，其中 x=f⁻¹(y)',
      example: '由 (sin x)′=cos x 得 (arcsin x)′=1/√(1−x²)。',
      trap: '求值时要先对应回同一个点；不要把分母中的 x、y 当成可随意替换的变量。',
      visual: 'mapping',
      steps: ['写出 y=f(x)', '找到对应点 (x,y)', '用倒数关系求反函数斜率'],
    },
  ],
  [
    '隐函数求导',
    {
      tag: '链式法则',
      summary: '不必先把 y 解成显函数。把 y 看成 y(x)，直接对方程两边关于 x 求导，再整理出 y′。',
      formula: 'F(x,y)=0  ⇒  Fx+Fy·y′=0  ⇒  y′=−Fx/Fy（Fy≠0）',
      example: 'x²+y²=1：2x+2yy′=0，所以 y′=−x/y；在上半圆取 y>0。',
      trap: '含 y 的项求导一定要乘 y′，且最终结果中保留 y 是正常的。',
      visual: 'plane',
      steps: ['把 y 视作 y(x)', '逐项对 x 求导', '整理 y′ 并代入指定点'],
    },
  ],
  [
    '对数求导',
    {
      tag: '复杂幂指',
      summary: '遇到底数、指数都含 x，或多项乘除幂结构时，先取自然对数，把乘法变加法、幂变乘法。',
      formula: 'y=uᵛ  ⇒  y′=y[v′lnu+v·u′/u]',
      example: 'y=xˣ：ln y=x ln x，故 y′=xˣ(ln x+1)（x>0）。',
      trap: '取对数通常要求 y>0；最后别漏乘原来的 y。',
      visual: 'flow',
      steps: ['两边取 ln', '利用对数法则展开', '求导后乘回 y'],
    },
  ],
  [
    '费马定理',
    {
      tag: '极值必要条件',
      summary: '可导函数在内点取得局部极值时，切线必须水平，因此导数为 0。它是必要条件，不是充分条件。',
      formula: 'x₀ 为内点极值且可导  ⇒  f′(x₀)=0',
      example: 'f(x)=x³ 在 0 处 f′(0)=0，但左右都递增，所以 0 不是极值点。',
      trap: '驻点要结合导数变号、二阶导数或定义判断，不能见到 f′=0 就下结论。',
      visual: 'theorem',
    },
  ],
  [
    '罗尔定理',
    {
      tag: '中值定理',
      summary: '一条连续且可导、两端等高的曲线，中间至少有一点切线水平。三项条件是使用定理的门槛。',
      formula: 'f(a)=f(b)，连续于[a,b]且可导于(a,b)  ⇒  ∃ξ：f′(ξ)=0',
      example: '对 F(x)=x²−1 在 [−1,1] 上应用，ξ=0 处 F′(ξ)=0。',
      trap: '端点等高但区间内有断点/尖点时不能直接套用。',
      visual: 'theorem',
      steps: ['逐条验证三个条件', '写出定理结论', '根据 f′(ξ)=0 求 ξ'],
    },
  ],
  [
    '拉格朗日中值定理',
    {
      tag: '平均变化率',
      summary: '曲线两端点的平均变化率，必等于某个内部点的瞬时变化率；几何上是“弦与切线平行”。',
      formula: 'f(b)−f(a)=f′(ξ)(b−a)，ξ∈(a,b)',
      example: 'f(x)=x² 在 [1,3] 上平均斜率为 4，所以存在 ξ=2 使 f′(ξ)=4。',
      trap: '连续只要求到闭区间，导数条件只要求在开区间；不要把端点纳入求 ξ 的范围。',
      visual: 'theorem',
      steps: ['验证连续与可导', '先算端点弦斜率', '令 f′(ξ) 等于该斜率'],
    },
  ],
  [
    '泰勒定理',
    {
      tag: '局部逼近',
      summary: '在展开点附近，函数可以用多项式逐阶逼近；阶数越高，通常保留的信息越多，余项负责描述误差。',
      formula: 'f(x)=Σₖ₌₀ⁿ f⁽ᵏ⁾(a)/k!·(x−a)ᵏ + Rₙ(x)',
      example: 'eˣ≈1+x+x²/2（x 接近 0 时）；增加 x³/6 后精度进一步提高。',
      trap: '展开式的有效性与余项、展开点有关；不要把局部近似当作全域恒等式。',
      visual: 'taylor',
      steps: ['确定展开点 a', '计算各阶导数在 a 的值', '按题目精度保留阶数'],
    },
  ],
  [
    '麦克劳林公式',
    {
      tag: '常用展开',
      summary: '麦克劳林公式就是在 a=0 处的泰勒展开，极限、等价无穷小和近似计算中经常用到。',
      formula: 'eˣ=1+x+x²/2!+…；sin x=x−x³/3!+…；cos x=1−x²/2!+…',
      example: '1−cos x∼x²/2 来自 cos x=1−x²/2+o(x²)。',
      trap: '注意展开的首个非零项；奇函数只有奇次项，偶函数只有偶次项。',
      visual: 'taylor',
    },
  ],
  [
    '定积分定义',
    {
      tag: '面积极限',
      summary: '定积分把曲边区域切成许多小条，用小矩形面积和逼近真实面积；分割越来越细时，和的极限就是积分。',
      formula: '∫ₐᵇf(x)dx=lim Σ f(ξᵢ)Δxᵢ',
      example: '曲线 y=x² 在 [0,1] 下方的面积为 ∫₀¹x²dx=1/3。',
      trap: '积分是带方向的累积量；函数在 x 轴下方时，面积贡献为负。',
      visual: 'integral',
      steps: ['分割区间', '用矩形近似', '让最大小区间长度趋于 0'],
    },
  ],
  [
    '定义与几何意义',
    {
      tag: '面积极限',
      summary: '二重积分把平面区域切成许多小块，累加“函数值 × 面积元”，得到曲顶柱体的体积或总量。',
      formula: '∬ᴰ f(x,y)dA = lim Σ f(ξᵢ,ηᵢ)ΔAᵢ',
      example: 'f(x,y)=1 时，∬ᴰ1dA 就是区域 D 的面积。',
      trap: '先辨认积分区域，再决定直角坐标或极坐标以及积分次序。',
      visual: 'integral',
    },
  ],
  [
    '定积分中值定理',
    {
      tag: '平均值',
      summary: '连续函数在区间上的平均值，一定等于某个区间内点的函数值；因此积分可以理解为“平均高度 × 底长”。',
      formula: '∫ₐᵇf(x)dx=f(ξ)(b−a)，ξ∈[a,b]',
      example: '∫₀¹x²dx=1/3，所以存在 ξ∈[0,1] 使 ξ²=1/3。',
      trap: '连续性是关键条件；含参数的题目还要先判断 ξ 是否依赖参数。',
      visual: 'integral',
      steps: ['确认 f 在闭区间连续', '把积分除以区间长度', '把平均值写成 f(ξ)'],
    },
  ],
  [
    '牛顿—莱布尼茨公式',
    {
      tag: '积分计算',
      summary: '它把“累积面积”与“原函数的增量”连接起来，是从积分定义走向实际计算的桥梁。',
      formula: '若 F′=f，则 ∫ₐᵇf(x)dx=F(b)−F(a)',
      example: '∫₀¹2x dx=[x²]₀¹=1；面积被转化为原函数在端点的差。',
      trap: '分段函数、无界函数或反常积分需先检查连续性与收敛性，再分段使用。',
      visual: 'flow',
      steps: ['找被积函数的原函数 F', '代入上限', '减去代入下限的值'],
    },
  ],
  [
    '极坐标计算',
    {
      tag: '坐标变换',
      summary: '当区域由圆、扇形或 r=φ(θ) 描述时，用“距离原点 r + 方向 θ”比用 x、y 更自然。',
      formula: 'x=r cosθ，y=r sinθ，dA=r dr dθ',
      example: '半径 R 的圆面积：∫₀²π∫₀ᴿ r dr dθ=πR²。',
      trap: '面积元多出一个 r；先画区域，确定 r、θ 的上下限。',
      visual: 'plane',
      steps: ['画出区域与原点', '写 x、y 与 r、θ 的关系', '补上面积元 r dr dθ'],
    },
  ],
  [
    '线性相关与线性无关',
    {
      tag: '向量结构',
      summary: '线性相关意味着向量组中存在“冗余方向”；线性无关意味着只有全零系数才能组合出零向量。',
      formula: 'k₁α₁+…+kₘαₘ=0 只有全零解  ⇔  线性无关',
      example: '平面中三条向量必线性相关；两条不共线向量线性无关。',
      trap: '“向量个数超过维数”只能直接判断相关；少于或等于维数还要继续计算。',
      visual: 'matrix',
    },
  ],
  [
    '非齐次线性方程组',
    {
      tag: '秩与解',
      summary: '方程组是否有解，取决于系数矩阵与增广矩阵的秩是否一致；自由未知量的数量决定解的自由度。',
      formula: '有解 ⇔ r(A)=r(A|b)；唯一解 ⇔ r(A)=r(A|b)=n',
      example: '若未知数 n=3 且秩为 2，有解时通常有 1 个自由未知量，解集是一条直线。',
      trap: '先比较两个秩判定有无解，再根据秩与未知数个数判断唯一/无穷多解。',
      visual: 'linear-system',
      steps: ['写增广矩阵', '初等行变换化阶梯形', '比较秩与未知数个数'],
    },
  ],
  [
    '特征值、特征向量',
    {
      tag: '线性变换',
      summary: '一般向量经过矩阵变换会改变方向，但特征向量沿着自己的方向只被拉伸或压缩，比例因子就是特征值。',
      formula: 'Aα=λα，α≠0；det(λE−A)=0',
      example: 'A=diag(2,3) 时，(1,0) 的特征值为 2，(0,1) 的特征值为 3。',
      trap: '特征向量不能取零向量；重特征值还要比较线性无关特征向量的个数。',
      visual: 'matrix',
      steps: ['解特征方程求 λ', '对每个 λ 解齐次方程', '检查特征向量是否足够独立'],
    },
  ],
  [
    '条件概率',
    {
      tag: '信息更新',
      summary: '已知 B 发生后，样本空间被缩小到 B；条件概率就是在新空间里 A 占据的比例。',
      formula: 'P(A|B)=P(AB)/P(B)，P(B)>0',
      example: '抽到的牌是红牌后，再求它是方块的概率，分母应改成“红牌总数”。',
      trap: 'P(A|B) 与 P(B|A) 通常不相等；不要把条件顺序颠倒。',
      visual: 'probability',
      steps: ['明确已知事件 B', '把样本空间缩到 B', '在新空间中统计 A∩B'],
    },
  ],
  [
    '全概率公式',
    {
      tag: '分类汇总',
      summary: '把目标事件按互斥且完备的原因拆开：每条路径的概率 = 原因概率 × 条件概率，最后把所有路径相加。',
      formula: 'P(A)=ΣᵢP(Bᵢ)P(A|Bᵢ)，{Bᵢ} 为完备事件组',
      example: '产品来自不同工厂时，先按工厂分类，再把各工厂产出次品的概率加权相加。',
      trap: '分解事件必须互斥且覆盖全集；漏掉一类原因会导致总和不完整。',
      visual: 'probability',
      steps: ['找完备事件组', '画分支并写路径概率', '按目标事件汇总'],
    },
  ],
  [
    '贝叶斯公式',
    {
      tag: '反向推断',
      summary: '贝叶斯公式把“观察到结果后，原因来自哪一类”的问题反过来计算，是条件概率与全概率的组合。',
      formula: 'P(Bⱼ|A)=P(Bⱼ)P(A|Bⱼ)/ΣᵢP(Bᵢ)P(A|Bᵢ)',
      example: '已知检测阳性，求真正患病的概率：分子是“患病且阳性”，分母是“所有阳性”。',
      trap: '阳性率不等于患病率；必须把假阳性、基准比例等所有路径放进分母。',
      visual: 'probability',
      steps: ['确定观察结果 A', '计算目标路径 Bⱼ∩A', '用所有产生 A 的路径归一化'],
    },
  ],
  [
    '数学期望',
    {
      tag: '平均位置',
      summary: '数学期望是随机变量长期重复试验的加权平均，不一定是某一次实际能取到的值。',
      formula: 'E(X)=Σxᵢpᵢ（离散）；E(X)=∫x f(x)dx（连续）',
      example: '公平骰子 E(X)=(1+2+…+6)/6=3.5，3.5 不是骰子的实际点数。',
      trap: '先检查期望是否存在；线性性质 E(aX+bY)=aE(X)+bE(Y) 不要求独立。',
      visual: 'distribution',
    },
  ],
  [
    '常见连续分布',
    {
      tag: '分布图像',
      summary: '连续型随机变量用密度曲线描述概率：区间概率是曲线下方面积，单点概率通常为 0。',
      formula: 'P(a<X<b)=∫ₐᵇf(x)dx；∫₋∞⁺∞f(x)dx=1',
      example: '正态分布的均值决定中心位置，标准差决定曲线的宽窄。',
      trap: '密度 f(x) 本身不是概率；概率要对区间积分。',
      visual: 'distribution',
    },
  ],
  [
    '正定二次型与正定矩阵',
    {
      tag: '二次型',
      summary: '正定表示除零向量外，二次型始终为正；几何上像一个向上开口、只有一个最低点的碗。',
      formula: 'xᵀAx>0（∀x≠0）；对称 A 正定 ⇔ 全部特征值>0',
      example: 'x²+2y² 对任意非零 (x,y) 都大于 0，因此对应矩阵正定。',
      trap: '矩阵判定通常先取对称矩阵；只看主对角线元素正不能充分证明正定。',
      visual: 'plane',
    },
  ],
]

const SECTION_GUIDES: Array<[string, MathSectionGuide]> = [
  [
    '洛必达法则',
    {
      summary: '洛必达法则处理的是导数比值的极限，不是所有看起来复杂的极限。先确认是不定式，再确认分子分母满足可导与分母导数不为零等条件。',
      formula: 'lim f/g = lim f′/g′（适用于 0/0 或 ∞/∞ 型且条件满足）',
      visual: 'flow',
      steps: ['代入判断型别', '转成 0/0 或 ∞/∞', '求导后重新判断是否需要继续'],
    },
  ],
  [
    '高阶导数',
    {
      summary: '高阶导数描述变化率的变化率。做题时优先寻找周期、递推和乘积结构，避免逐次展开造成计算量膨胀。',
      formula: '莱布尼茨公式：(uv)⁽ⁿ⁾=Σ Cₙᵏu⁽ᵏ⁾v⁽ⁿ⁻ᵏ⁾',
      visual: 'flow',
      steps: ['识别函数结构', '找导数循环或递推', '用公式一次性整理'],
    },
  ],
  [
    '换元积分法',
    {
      summary: '换元的目标是把复杂的“外层函数 × 内层导数”变成熟悉的积分；定积分还要同步替换上下限。',
      formula: '∫f(g(x))g′(x)dx=∫f(u)du，u=g(x)',
      visual: 'flow',
      steps: ['找内层 g(x)', '令 u=g(x) 并换 dx', '定积分同步换限'],
    },
  ],
  [
    '分部积分法',
    {
      summary: '分部积分把一个积分拆成“容易求导的 u”和“容易积分的 dv”，核心是转移导数而不是盲目套公式。',
      formula: '∫u dv=uv−∫v du',
      visual: 'flow',
      steps: ['选择 u 与 dv', '分别求 du、v', '检查新积分是否更简单'],
    },
  ],
  [
    '一阶线性微分方程',
    {
      summary: '一阶线性方程的关键是积分因子：把左侧整理成一个乘积的导数，再直接积分。',
      formula: 'y′+P(x)y=Q(x)，μ(x)=e^{∫Pdx}',
      visual: 'flow',
      steps: ['化为标准形', '乘积分因子 μ', '识别 (μy)′ 并积分'],
    },
  ],
  [
    '二阶常系数齐次线性方程',
    {
      summary: '用指数试探解 y=e^{rx}，把微分方程降为特征方程；根的类型决定通解的形式。',
      formula: 'y″+py′+qy=0  ⇒  r²+pr+q=0',
      visual: 'flow',
      steps: ['写特征方程', '分类讨论实根/重根/复根', '组合出线性无关解'],
    },
  ],
  [
    '行列式概念',
    {
      summary: '行列式是方阵对应的一个数，既能判断可逆性，也可理解为线性变换对有向面积/体积的缩放因子。',
      formula: '|A|≠0 ⇔ A 可逆；|AB|=|A||B|',
      visual: 'matrix',
      steps: ['识别方阵阶数', '按性质化简或展开', '用结果判断可逆与秩'],
    },
  ],
  [
    '逆矩阵',
    {
      summary: '逆矩阵是把线性变换撤销的矩阵；只有行列式不为 0 时才存在。',
      formula: 'AA⁻¹=A⁻¹A=E；A⁻¹= A* / |A|（|A|≠0）',
      visual: 'matrix',
      steps: ['先判 |A| 是否为 0', '用伴随矩阵或初等变换求逆', '用乘积验证'],
    },
  ],
  [
    '特征值与特征向量',
    {
      summary: '特征方向在变换后保持不变，只发生倍乘；这是理解相似对角化、矩阵幂和微分方程的入口。',
      formula: 'Aα=λα，α≠0',
      visual: 'matrix',
      steps: ['求特征值', '解对应齐次方程', '比较特征向量数量'],
    },
  ],
  [
    '随机事件与样本空间',
    {
      summary: '概率题先定义样本空间 Ω，再把题目中的条件翻译成事件；事件之间的包含、互斥和对立关系决定后续公式。',
      formula: 'A⊂Ω；Aᶜ=Ω\\A；P(Ω)=1',
      visual: 'probability',
      steps: ['列出基本结果', '定义目标事件', '画集合关系或概率树'],
    },
  ],
  [
    '二维随机变量',
    {
      summary: '二维随机变量把两个随机量放在同一个样本点上，联合分布描述它们一起出现的概率结构。',
      formula: 'F(x,y)=P(X≤x，Y≤y)',
      visual: 'distribution',
      steps: ['写联合分布', '求边缘/条件分布', '检查独立与相关关系'],
    },
  ],
]

export function getMathEnhancement(title: string): MathEnhancement | null {
  const hit = ENHANCEMENTS.find(([keyword]) => title.includes(keyword))
  return hit?.[1] ?? null
}

export function getMathSectionGuide(title: string): MathSectionGuide | null {
  const hit = SECTION_GUIDES.find(([keyword]) => title.includes(keyword))
  return hit?.[1] ?? null
}

export function hasMathContent(point: MathPoint): boolean {
  return point.blocks.some((block) => block.lines.length > 0)
}


