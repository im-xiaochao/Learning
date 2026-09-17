// 抽查线代/概率 section intro 主题的讲义来源
import { MATH_MODULES } from '../data/math/tree'
import { getMathLecture } from '../data/math/lectures'

for (const mod of MATH_MODULES) {
  for (const part of mod.parts) {
    if (!/线性代数|概率/.test(part.title)) continue
    for (const ch of part.chapters) {
      for (const sec of ch.sections) {
        for (const topic of sec.intro || []) {
          const lec = getMathLecture(topic, sec.title)
          console.log(`[${part.title.slice(3)}/${ch.title.slice(3)}] ${topic}  =>  <${lec.tag}> ${lec.source || '(无)'} ${lec.generic ? 'GENERIC' : ''}`)
        }
      }
    }
  }
}
