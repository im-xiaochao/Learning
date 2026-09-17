/**
 * 政治题型判定（**主包与分包共用**，所以放主包 utils/ 而不是 pages-politics 内）。
 *
 * 为什么值得单独一个文件：加「多选题」时，`type === 'choice'` 这种写法在 3 处
 * 静默漏判——错题重练漏掉全部多选、统计把多选当材料题、结果页多选答错不标色。
 * 校验器管不到这种错。**按题型分流的地方一律用这里的函数。**
 *
 * 参数只要带 type 就够，所以主包的清单类型（AppPoliticsListItem）与
 * 分包的完整题目类型（AppPoliticsQuestion）都能传进来。
 */

/** 客观题 = 单选 + 多选（材料题没有对错，只看参考答案） */
export function isObjective(type: string): boolean {
  return type === 'choice' || type === 'multi'
}
