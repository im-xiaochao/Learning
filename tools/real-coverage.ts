// 用真实逻辑统计每个知识点的讲义来源：direct / scoped / generic
import { MATH_MODULES } from '../data/math/tree'
import { getMathLecture } from '../data/math/lectures'

const seen = new Set<string>()
let total = 0
let generic = 0
const genericList: string[] = []

for (const mod of MATH_MODULES) {
  for (const part of mod.parts) {
    for (const ch of part.chapters) {
      for (const sec of ch.sections) {
        for (const p of sec.points) {
          total++
          const lec = getMathLecture(p.title, sec.title)
          const key = mod.name + '|' + p.title
          if (lec.generic) {
            generic++
            if (!seen.has(p.title)) genericList.push(`[${mod.name}] ${p.title}  (${part.title}/${ch.title}/${sec.title})`)
          }
          seen.add(key)
        }
      }
    }
  }
}
console.log('知识点总数:', total)
console.log('generic 兜底数:', generic)
console.log('--- generic 明细 ---')
genericList.forEach((t) => console.log(' ·', t))
