/**
 * 由 tools/build-content.ts 从 data/content 生成，请勿手改。
 * 重新生成：cd tools && npm run build:content
 * 数据来源时间：2026-09-18T12:20:27Z
 */

/**
 * 政治套卷投影：**主包**的资料库渲染政治学科时要画的东西——只有每套卷的题目 id。
 * 题干 / 选项 / 答案 / 解析 / 材料段落全部不在这里，它们在 pages-politics 分包内。
 *
 * 为什么连题干都不给：那一屏只画「来源切换 + 每套卷的进度卡」，卡上的两个数字是
 * 「已练 M / 共 N 题」——N = ids.length，M = 逐条查同学作答记录。题干在主包里没有任何
 * 用处，留着只是让主包白涨（题干一度进过主包，光这一项就是 202 KB）。
 */
export interface AppPoliticsPaperSet {
  book: 'x4' | 'x8'
  /** 卷内第几套：4套卷 1~4，8套卷 1~8 */
  set: number
  /** 这一套的题目 id，按卷面顺序 */
  ids: string[]
}


export const appPoliticsPaperSets: AppPoliticsPaperSet[] = [
  {"book":"x4","set":1,"ids":["q-maozhongte-3","q-maozhongte-4","q-maozhongte-5","q-maozhongte-6","q-maozhongte-7","q-maozhongte-8","q-maozhongte-9","q-maozhongte-10","q-maozhongte-11","q-maozhongte-12","q-maozhongte-13","q-maozhongte-14","q-mayuan-3","q-mayuan-4","q-mayuan-5","q-mayuan-6","q-mayuan-7","q-mayuan-8","q-mayuan-9","q-mayuan-10","q-mayuan-11","q-mayuan-12","q-shigang-1","q-shigang-2","q-shigang-3","q-shigang-4","q-shigang-5","q-shigang-6","q-shigang-7","q-shigang-8","q-shizheng-1","q-shizheng-2","q-shizheng-3","q-shizheng-4","q-sixiu-3","q-sixiu-4","q-sixiu-5","q-sixiu-6"]},
  {"book":"x4","set":2,"ids":["q-maozhongte-15","q-maozhongte-16","q-maozhongte-17","q-maozhongte-18","q-maozhongte-19","q-maozhongte-20","q-maozhongte-21","q-maozhongte-22","q-maozhongte-23","q-maozhongte-24","q-maozhongte-25","q-maozhongte-26","q-maozhongte-27","q-mayuan-13","q-mayuan-14","q-mayuan-15","q-mayuan-16","q-mayuan-17","q-mayuan-18","q-mayuan-19","q-mayuan-20","q-mayuan-21","q-shigang-9","q-shigang-10","q-shigang-11","q-shigang-12","q-shigang-13","q-shigang-14","q-shigang-15","q-shizheng-5","q-shizheng-6","q-shizheng-7","q-shizheng-8","q-sixiu-7","q-sixiu-8","q-sixiu-9","q-sixiu-10","q-sixiu-11"]},
  {"book":"x4","set":3,"ids":["q-maozhongte-28","q-maozhongte-29","q-maozhongte-30","q-maozhongte-31","q-maozhongte-32","q-maozhongte-33","q-maozhongte-34","q-maozhongte-35","q-maozhongte-36","q-maozhongte-37","q-maozhongte-38","q-maozhongte-39","q-mayuan-22","q-mayuan-23","q-mayuan-24","q-mayuan-25","q-mayuan-26","q-mayuan-27","q-mayuan-28","q-mayuan-29","q-shigang-16","q-shigang-17","q-shigang-18","q-shigang-19","q-shigang-20","q-shigang-21","q-shigang-22","q-shigang-23","q-shizheng-9","q-shizheng-10","q-shizheng-11","q-shizheng-12","q-shizheng-13","q-shizheng-14","q-sixiu-12","q-sixiu-13","q-sixiu-14","q-sixiu-15"]},
  {"book":"x4","set":4,"ids":["q-maozhongte-40","q-maozhongte-41","q-maozhongte-42","q-maozhongte-43","q-maozhongte-44","q-maozhongte-45","q-maozhongte-46","q-maozhongte-47","q-maozhongte-48","q-maozhongte-49","q-maozhongte-50","q-maozhongte-51","q-mayuan-30","q-mayuan-31","q-mayuan-32","q-mayuan-33","q-mayuan-34","q-mayuan-35","q-mayuan-36","q-mayuan-37","q-mayuan-38","q-mayuan-39","q-shigang-24","q-shigang-25","q-shigang-26","q-shigang-27","q-shigang-28","q-shigang-29","q-shigang-30","q-shizheng-15","q-shizheng-16","q-shizheng-17","q-shizheng-18","q-shizheng-19","q-sixiu-16","q-sixiu-17","q-sixiu-18","q-sixiu-19"]},
  {"book":"x8","set":1,"ids":["q-x8-s1-01","q-x8-s1-02","q-x8-s1-03","q-x8-s1-04","q-x8-s1-05","q-x8-s1-06","q-x8-s1-07","q-x8-s1-08","q-x8-s1-09","q-x8-s1-10","q-x8-s1-11","q-x8-s1-12","q-x8-s1-13","q-x8-s1-14","q-x8-s1-15","q-x8-s1-16","q-x8-s1-17","q-x8-s1-18","q-x8-s1-19","q-x8-s1-20","q-x8-s1-21","q-x8-s1-22","q-x8-s1-23","q-x8-s1-24","q-x8-s1-25","q-x8-s1-26","q-x8-s1-27","q-x8-s1-28","q-x8-s1-29","q-x8-s1-30","q-x8-s1-31","q-x8-s1-32","q-x8-s1-33","q-x8-s1-34","q-x8-s1-35","q-x8-s1-36","q-x8-s1-37","q-x8-s1-38"]},
  {"book":"x8","set":2,"ids":["q-x8-s2-01","q-x8-s2-02","q-x8-s2-03","q-x8-s2-04","q-x8-s2-05","q-x8-s2-06","q-x8-s2-07","q-x8-s2-08","q-x8-s2-09","q-x8-s2-10","q-x8-s2-11","q-x8-s2-12","q-x8-s2-13","q-x8-s2-14","q-x8-s2-15","q-x8-s2-16","q-x8-s2-17","q-x8-s2-18","q-x8-s2-19","q-x8-s2-20","q-x8-s2-21","q-x8-s2-22","q-x8-s2-23","q-x8-s2-24","q-x8-s2-25","q-x8-s2-26","q-x8-s2-27","q-x8-s2-28","q-x8-s2-29","q-x8-s2-30","q-x8-s2-31","q-x8-s2-32","q-x8-s2-33","q-x8-s2-34","q-x8-s2-35","q-x8-s2-36","q-x8-s2-37","q-x8-s2-38"]},
  {"book":"x8","set":3,"ids":["q-x8-s3-01","q-x8-s3-02","q-x8-s3-03","q-x8-s3-04","q-x8-s3-05","q-x8-s3-06","q-x8-s3-07","q-x8-s3-08","q-x8-s3-09","q-x8-s3-10","q-x8-s3-11","q-x8-s3-12","q-x8-s3-13","q-x8-s3-14","q-x8-s3-15","q-x8-s3-16","q-x8-s3-17","q-x8-s3-18","q-x8-s3-19","q-x8-s3-20","q-x8-s3-21","q-x8-s3-22","q-x8-s3-23","q-x8-s3-24","q-x8-s3-25","q-x8-s3-26","q-x8-s3-27","q-x8-s3-28","q-x8-s3-29","q-x8-s3-30","q-x8-s3-31","q-x8-s3-32","q-x8-s3-33","q-x8-s3-34","q-x8-s3-35","q-x8-s3-36","q-x8-s3-37","q-x8-s3-38"]},
  {"book":"x8","set":4,"ids":["q-x8-s4-01","q-x8-s4-02","q-x8-s4-03","q-x8-s4-04","q-x8-s4-05","q-x8-s4-06","q-x8-s4-07","q-x8-s4-08","q-x8-s4-09","q-x8-s4-10","q-x8-s4-11","q-x8-s4-12","q-x8-s4-13","q-x8-s4-14","q-x8-s4-15","q-x8-s4-16","q-x8-s4-17","q-x8-s4-18","q-x8-s4-19","q-x8-s4-20","q-x8-s4-21","q-x8-s4-22","q-x8-s4-23","q-x8-s4-24","q-x8-s4-25","q-x8-s4-26","q-x8-s4-27","q-x8-s4-28","q-x8-s4-29","q-x8-s4-30","q-x8-s4-31","q-x8-s4-32","q-x8-s4-33","q-x8-s4-34","q-x8-s4-35","q-x8-s4-36","q-x8-s4-37","q-x8-s4-38"]},
  {"book":"x8","set":5,"ids":["q-x8-s5-01","q-x8-s5-02","q-x8-s5-03","q-x8-s5-04","q-x8-s5-05","q-x8-s5-06","q-x8-s5-07","q-x8-s5-08","q-x8-s5-09","q-x8-s5-10","q-x8-s5-11","q-x8-s5-12","q-x8-s5-13","q-x8-s5-14","q-x8-s5-15","q-x8-s5-16","q-x8-s5-17","q-x8-s5-18","q-x8-s5-19","q-x8-s5-20","q-x8-s5-21","q-x8-s5-22","q-x8-s5-23","q-x8-s5-24","q-x8-s5-25","q-x8-s5-26","q-x8-s5-27","q-x8-s5-28","q-x8-s5-29","q-x8-s5-30","q-x8-s5-31","q-x8-s5-32","q-x8-s5-33","q-x8-s5-34","q-x8-s5-35","q-x8-s5-36","q-x8-s5-37","q-x8-s5-38"]},
  {"book":"x8","set":6,"ids":["q-x8-s6-01","q-x8-s6-02","q-x8-s6-03","q-x8-s6-04","q-x8-s6-05","q-x8-s6-06","q-x8-s6-07","q-x8-s6-08","q-x8-s6-09","q-x8-s6-10","q-x8-s6-11","q-x8-s6-12","q-x8-s6-13","q-x8-s6-14","q-x8-s6-15","q-x8-s6-16","q-x8-s6-17","q-x8-s6-18","q-x8-s6-19","q-x8-s6-20","q-x8-s6-21","q-x8-s6-22","q-x8-s6-23","q-x8-s6-24","q-x8-s6-25","q-x8-s6-26","q-x8-s6-27","q-x8-s6-28","q-x8-s6-29","q-x8-s6-30","q-x8-s6-31","q-x8-s6-32","q-x8-s6-33","q-x8-s6-34","q-x8-s6-35","q-x8-s6-36","q-x8-s6-37","q-x8-s6-38"]},
  {"book":"x8","set":7,"ids":["q-x8-s7-01","q-x8-s7-02","q-x8-s7-03","q-x8-s7-04","q-x8-s7-05","q-x8-s7-06","q-x8-s7-07","q-x8-s7-08","q-x8-s7-09","q-x8-s7-10","q-x8-s7-11","q-x8-s7-12","q-x8-s7-13","q-x8-s7-14","q-x8-s7-15","q-x8-s7-16","q-x8-s7-17","q-x8-s7-18","q-x8-s7-19","q-x8-s7-20","q-x8-s7-21","q-x8-s7-22","q-x8-s7-23","q-x8-s7-24","q-x8-s7-25","q-x8-s7-26","q-x8-s7-27","q-x8-s7-28","q-x8-s7-29","q-x8-s7-30","q-x8-s7-31","q-x8-s7-32","q-x8-s7-33","q-x8-s7-34","q-x8-s7-35","q-x8-s7-36","q-x8-s7-37","q-x8-s7-38"]},
  {"book":"x8","set":8,"ids":["q-x8-s8-01","q-x8-s8-02","q-x8-s8-03","q-x8-s8-04","q-x8-s8-05","q-x8-s8-06","q-x8-s8-07","q-x8-s8-08","q-x8-s8-09","q-x8-s8-10","q-x8-s8-11","q-x8-s8-12","q-x8-s8-13","q-x8-s8-14","q-x8-s8-15","q-x8-s8-16","q-x8-s8-17","q-x8-s8-18","q-x8-s8-19","q-x8-s8-20","q-x8-s8-21","q-x8-s8-22","q-x8-s8-23","q-x8-s8-24","q-x8-s8-25","q-x8-s8-26","q-x8-s8-27","q-x8-s8-28","q-x8-s8-29","q-x8-s8-30","q-x8-s8-31","q-x8-s8-32","q-x8-s8-33","q-x8-s8-34","q-x8-s8-35","q-x8-s8-36","q-x8-s8-37","q-x8-s8-38"]}
]
