// 审查每个知识点的讲义命中层级与出处
import { MATH_MODULES } from '../data/math-data'
import { getMathLecture } from '../data/math-lectures'

function clean(t: string): string {
  return t.replace(/`/g, '').replace(/^\d+(?:\.\d+)+\s*/, '').replace(/^\d+[.、]\s*/, '').trim()
}

const seen = new Set<string>()
const rows: Array<{ point: string; source: string | undefined; tag: string; generic: boolean }> = []

for (const mod of MATH_MODULES) {
  for (const part of mod.parts) {
    for (const ch of part.chapters) {
      for (const sec of ch.sections) {
        for (const p of sec.points) {
          const key = mod.name + p.title
          if (seen.has(key)) continue
          seen.add(key)
          const lec = getMathLecture(p.title, sec.title)
          rows.push({ point: `[${mod.name}] ${clean(p.title)}`, source: lec.source, tag: lec.tag, generic: Boolean(lec.generic) })
        }
      }
    }
  }
}

const withSrc = rows.filter((r) => r.source)
const noSrc = rows.filter((r) => !r.source)
console.log('有出处:', withSrc.length, ' 无出处:', noSrc.length)
console.log('\n--- 有出处明细 ---')
withSrc.forEach((r) => console.log(`  ${r.point}  <${r.tag}>  ${r.source}`))
console.log('\n--- generic 兜底(应为0) ---')
rows.filter((r) => r.generic).forEach((r) => console.log('  ', r.point))
