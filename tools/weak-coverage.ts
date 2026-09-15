// 统计最终 pointDetail 的弱覆盖点（无专属讲解，关系图不展示）
import { MATH_MODULES } from '../data/math-data'
import { pointDetail } from '../data/math-detail'

let total = 0
const weak: string[] = []
const weakSeen = new Set<string>()

for (const mod of MATH_MODULES) {
  for (const part of mod.parts) {
    for (const ch of part.chapters) {
      for (const sec of ch.sections) {
        for (const p of sec.points) {
          total++
          const d = pointDetail(p, sec)
          if (!d.visualUseful) {
            const key = p.title
            if (!weakSeen.has(key)) {
              weakSeen.add(key)
              weak.push(`[${mod.name}] ${p.title}  (${sec.title})`)
            }
          }
        }
      }
    }
  }
}
console.log('知识点总数:', total)
console.log('弱覆盖(visualUseful=false):', weak.length)
weak.forEach((t) => console.log(' ·', t))
