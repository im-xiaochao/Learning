/**
 * 由 tools/build-content.ts 从 data/content 生成，请勿手改。
 * 重新生成：cd tools && npm run build:content
 * 数据来源时间：2026-09-16T04:02:20Z
 */

export interface AppCourse { id: string; name: string; sortOrder: number }
export interface AppSubject { id: string; courseId: string; kind: 'math' | 'politics' | 'cs'; name: string; shortName: string; sortOrder: number }
export interface AppChapter { id: string; subjectId: string; module: string; modules?: string[]; title: string; summary: string; sortOrder: number }

export const appCourses: AppCourse[] = [
  {"id":"english","name":"考研英语","sortOrder":10},
  {"id":"math","name":"考研数学","sortOrder":20},
  {"id":"politics","name":"考研政治","sortOrder":30},
  {"id":"cs","name":"计算机专业课","sortOrder":40}
]

export const appSubjects: AppSubject[] = [
  {"id":"calculus","courseId":"math","kind":"math","name":"高等数学","shortName":"高数","sortOrder":10},
  {"id":"algebra","courseId":"math","kind":"math","name":"线性代数","shortName":"线代","sortOrder":20},
  {"id":"probability","courseId":"math","kind":"math","name":"概率论","shortName":"概率","sortOrder":30},
  {"id":"politics","courseId":"politics","kind":"politics","name":"思想政治理论","shortName":"政治","sortOrder":40},
  {"id":"cs-coa","courseId":"cs","kind":"cs","name":"计算机组成原理","shortName":"组成原理","sortOrder":50},
  {"id":"cs-os","courseId":"cs","kind":"cs","name":"操作系统","shortName":"操作系统","sortOrder":60},
  {"id":"cs-ds","courseId":"cs","kind":"cs","name":"数据结构","shortName":"数据结构","sortOrder":70},
  {"id":"cs-net","courseId":"cs","kind":"cs","name":"计算机网络","shortName":"计算机网络","sortOrder":80}
]

export const appChapters: AppChapter[] = [
  {"id":"m1-p1-c1","subjectId":"calculus","title":"函数、极限与连续","summary":"本章共 6 节：函数、数列极限、函数极限、无穷小与无穷大、两个重要极限与常见求极限方法 等。","sortOrder":10,"module":"数学一"},
  {"id":"m1-p1-c2","subjectId":"calculus","title":"一元函数微分学","summary":"本章共 8 节：导数与微分、求导法则、高阶导数、微分中值定理、泰勒公式、洛必达法则 等。","sortOrder":20,"module":"数学一"},
  {"id":"m1-p1-c3","subjectId":"calculus","title":"一元函数积分学","summary":"本章共 8 节：原函数与不定积分、基本积分公式、换元积分法、分部积分法、特殊积分、定积分 等。","sortOrder":30,"module":"数学一"},
  {"id":"m1-p1-c4","subjectId":"calculus","title":"向量代数与空间解析几何","summary":"本章共 7 节：空间向量、数量积、向量积、平面方程、空间直线、位置关系、曲面与空间曲线。","sortOrder":40,"module":"数学一"},
  {"id":"m1-p1-c5","subjectId":"calculus","title":"多元函数微分学","summary":"本章共 10 节：多元函数基本概念、二元函数极限与连续、偏导数、全微分、多元复合函数求导 等。","sortOrder":50,"module":"数学一"},
  {"id":"m1-p1-c6","subjectId":"calculus","title":"多重积分","summary":"本章共 4 节：二重积分、极坐标二重积分、二重积分应用、三重积分。","sortOrder":60,"module":"数学一"},
  {"id":"m1-p1-c7","subjectId":"calculus","title":"曲线积分与曲面积分","summary":"本章共 7 节：第一类曲线积分、第二类曲线积分、格林公式、第一类曲面积分、第二类曲面积分 等。","sortOrder":70,"module":"数学一"},
  {"id":"m1-p1-c8","subjectId":"calculus","title":"无穷级数","summary":"本章共 7 节：常数项级数、正项级数、交错级数、任意项级数、幂级数、函数展开成幂级数 等。","sortOrder":80,"module":"数学一"},
  {"id":"m1-p1-c9","subjectId":"calculus","title":"常微分方程","summary":"本章共 7 节：基本概念、一阶微分方程、可降阶高阶方程、高阶线性微分方程、二阶常系数齐次线性方程 等。","sortOrder":90,"module":"数学一"},
  {"id":"m1-p2-c1","subjectId":"algebra","title":"行列式","summary":"本章共 5 节：行列式概念、行列式性质、余子式与代数余子式、按行/列展开、常见计算技巧。","sortOrder":10,"module":"数学一"},
  {"id":"m1-p2-c2","subjectId":"algebra","title":"矩阵","summary":"本章共 8 节：矩阵与特殊矩阵、矩阵运算、方阵行列式、逆矩阵、初等变换与初等矩阵、矩阵的秩 等。","sortOrder":20,"module":"数学一"},
  {"id":"m1-p2-c3","subjectId":"algebra","title":"向量","summary":"本章共 8 节：n 维向量、线性组合与线性表示、线性相关与线性无关、极大线性无关组 等。","sortOrder":30,"module":"数学一"},
  {"id":"m1-p2-c4","subjectId":"algebra","title":"线性方程组","summary":"本章共 6 节：克拉默法则、矩阵形式、齐次线性方程组、非齐次线性方程组、解的结构、初等行变换求解。","sortOrder":40,"module":"数学一"},
  {"id":"m1-p2-c5","subjectId":"algebra","title":"特征值与特征向量","summary":"本章共 7 节：概念、求特征值、求特征向量、特征值性质、相似矩阵、相似对角化、实对称矩阵。","sortOrder":50,"module":"数学一"},
  {"id":"m1-p2-c6","subjectId":"algebra","title":"二次型","summary":"本章共 7 节：二次型及矩阵表示、合同变换、二次型的秩、标准形与规范形、惯性定理、化标准形 等。","sortOrder":60,"module":"数学一"},
  {"id":"m1-p3-c1","subjectId":"probability","title":"随机事件与概率","summary":"本章共 10 节：随机试验与样本空间、事件关系与运算、概率公理与性质、古典概型、几何概型 等。","sortOrder":10,"module":"数学一"},
  {"id":"m1-p3-c2","subjectId":"probability","title":"一维随机变量及其分布","summary":"本章共 7 节：随机变量、分布函数、离散型随机变量、常见离散分布、连续型随机变量、常见连续分布 等。","sortOrder":20,"module":"数学一"},
  {"id":"m1-p3-c3","subjectId":"probability","title":"多维随机变量及其分布","summary":"本章共 6 节：二维随机变量、边缘分布、条件分布、独立性、二维均匀分布与二维正态分布 等。","sortOrder":30,"module":"数学一"},
  {"id":"m1-p3-c4","subjectId":"probability","title":"随机变量的数字特征","summary":"本章共 6 节：数学期望、方差、常见分布期望与方差、协方差、相关系数、矩。","sortOrder":40,"module":"数学一"},
  {"id":"m1-p3-c5","subjectId":"probability","title":"大数定律与中心极限定理","summary":"本章共 3 节：切比雪夫不等式、大数定律、中心极限定理。","sortOrder":50,"module":"数学一"},
  {"id":"m1-p3-c6","subjectId":"probability","title":"数理统计基本概念","summary":"本章共 5 节：总体与样本、统计量、经验分布函数（理解扩展）、三大抽样分布、正态总体抽样分布。","sortOrder":60,"module":"数学一"},
  {"id":"m1-p3-c7","subjectId":"probability","title":"参数估计","summary":"本章共 5 节：点估计、矩估计法、最大似然估计、估计量评价标准、区间估计。","sortOrder":70,"module":"数学一"},
  {"id":"m1-p3-c8","subjectId":"probability","title":"假设检验","summary":"本章共 5 节：基本思想、两类错误、正态总体均值检验、正态总体方差检验、两正态总体相关检验。","sortOrder":80,"module":"数学一"},
  {"id":"m2-p1-c1","subjectId":"calculus","title":"函数、极限与连续","summary":"本章共 7 节：函数、数列极限、函数极限、无穷小与无穷大、两个重要极限、常见未定式与求极限方法 等。","sortOrder":100,"module":"数学二"},
  {"id":"m2-p1-c2","subjectId":"calculus","title":"一元函数微分学","summary":"本章共 9 节：导数、微分、求导公式与法则、高阶导数、微分中值定理、泰勒定理、洛必达法则 等。","sortOrder":110,"module":"数学二"},
  {"id":"m2-p1-c3","subjectId":"calculus","title":"一元函数积分学","summary":"本章共 8 节：原函数与不定积分、基本积分公式、换元积分法、分部积分法、特殊函数积分 等。","sortOrder":120,"module":"数学二"},
  {"id":"m2-p1-c4","subjectId":"calculus","title":"多元函数微积分学","summary":"本章共 9 节：多元函数、二元函数极限、二元函数连续、偏导数、全微分、多元复合函数求导 等。","sortOrder":130,"module":"数学二"},
  {"id":"m2-p1-c5","subjectId":"calculus","title":"二重积分","summary":"本章共 5 节：二重积分概念、直角坐标计算、极坐标计算、二重积分技巧、二重积分应用。","sortOrder":140,"module":"数学二"},
  {"id":"m2-p1-c6","subjectId":"calculus","title":"常微分方程","summary":"本章共 9 节：基本概念、可分离变量方程、齐次微分方程、一阶线性微分方程、可降阶高阶方程 等。","sortOrder":150,"module":"数学二"},
  {"id":"m2-p2-c1","subjectId":"algebra","title":"行列式","summary":"本章共 5 节：行列式概念、基本性质、余子式与代数余子式、按行/列展开、计算方法。","sortOrder":70,"module":"数学二"},
  {"id":"m2-p2-c2","subjectId":"algebra","title":"矩阵","summary":"本章共 9 节：矩阵概念与特殊矩阵、线性运算与乘法、转置、方阵乘积行列式、逆矩阵、初等变换与初等矩阵 等。","sortOrder":80,"module":"数学二"},
  {"id":"m2-p2-c3","subjectId":"algebra","title":"向量","summary":"本章共 8 节：n 维向量、线性组合与线性表示、线性相关与线性无关、极大线性无关组 等。","sortOrder":90,"module":"数学二"},
  {"id":"m2-p2-c4","subjectId":"algebra","title":"线性方程组","summary":"本章共 5 节：克拉默法则、齐次线性方程组、非齐次线性方程组、解的结构、初等行变换求解。","sortOrder":100,"module":"数学二"},
  {"id":"m2-p2-c5","subjectId":"algebra","title":"特征值与特征向量","summary":"本章共 7 节：特征值、特征向量、特征值计算、特征向量计算、特征值性质、相似矩阵、相似对角化 等。","sortOrder":110,"module":"数学二"},
  {"id":"m2-p2-c6","subjectId":"algebra","title":"二次型","summary":"本章共 7 节：二次型、合同变换、二次型的秩、标准形与规范形、惯性定理、化标准形、正定二次型与正定矩阵。","sortOrder":120,"module":"数学二"}
]

/**
 * 政治题库总题数（**只是个数字**）。
 * 题库正文在 pages-politics 分包内，主包不能 import 它；但首页的「政治刷题」卡片
 * 要显示「已练 M / 共 T 题」，所以这里只把总数投影到主包。
 */
export const appPoliticsQuestionTotal = 462
