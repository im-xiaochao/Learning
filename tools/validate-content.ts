/**
 * 内容校验脚本：按《知识点数据存放格式与实例》第 10 节「录入与导入检查」体检 data/content 与 data/generated。
 *
 * 用法： tsx validate-content.ts
 * 退出码：0 = 无错误（可能有 warning）；1 = 存在错误
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..')
const CONTENT = path.join(ROOT, 'data/content')
const GENERATED = path.join(ROOT, 'data/generated')

const errors: string[] = []
const warnings: string[] = []
const err = (m: string) => errors.push(m)
const warn = (m: string) => warnings.push(m)

const readJson = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'))

const ID_RE = /^[a-z0-9-]+$/
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const STATUS = new Set(['draft', 'published', 'archived'])

const isNonEmptyString = (v: unknown) => typeof v === 'string' && v.trim().length > 0
const isPosInt = (v: unknown) => Number.isInteger(v) && (v as number) > 0

function checkId(id: unknown, where: string) {
  if (!isNonEmptyString(id)) return err(`${where}: id 缺失或不是字符串`)
  if (!ID_RE.test(id as string)) err(`${where}: id "${id}" 含非法字符（只允许小写英文/数字/连字符）`)
  return undefined
}

// ---------------------------------------------------------------- 1. catalog

const catalog = readJson(path.join(CONTENT, 'catalog.json'))
if (catalog.schemaVersion !== '1.0') err(`catalog: schemaVersion 应为 "1.0"，实际 ${catalog.schemaVersion}`)

const courseIds = new Set<string>()
const subjectIds = new Set<string>()
const chapterIds = new Set<string>()

if (!Array.isArray(catalog.courses) || catalog.courses.length === 0) err('catalog.courses 缺失或为空')
for (const c of catalog.courses || []) {
  checkId(c.id, 'catalog.courses')
  for (const f of ['name', 'sortOrder']) if (c[f] === undefined) err(`catalog.courses[${c.id}]: 缺少必填字段 ${f}`)
  if (courseIds.has(c.id)) err(`catalog.courses: id 重复 ${c.id}`)
  courseIds.add(c.id)
}

for (const s of catalog.subjects || []) {
  checkId(s.id, 'catalog.subjects')
  for (const f of ['courseId', 'name', 'shortName', 'sortOrder']) if (s[f] === undefined) err(`catalog.subjects[${s.id}]: 缺少必填字段 ${f}`)
  if (subjectIds.has(s.id)) err(`catalog.subjects: id 重复 ${s.id}`)
  subjectIds.add(s.id)
  if (!courseIds.has(s.courseId)) err(`catalog.subjects[${s.id}]: courseId "${s.courseId}" 在 courses 中不存在`)
}

for (const ch of catalog.chapters || []) {
  checkId(ch.id, 'catalog.chapters')
  for (const f of ['subjectId', 'title', 'summary', 'sortOrder']) if (ch[f] === undefined) err(`catalog.chapters[${ch.id}]: 缺少必填字段 ${f}`)
  if (chapterIds.has(ch.id)) err(`catalog.chapters: id 重复 ${ch.id}`)
  chapterIds.add(ch.id)
  if (!subjectIds.has(ch.subjectId)) err(`catalog.chapters[${ch.id}]: subjectId "${ch.subjectId}" 在 subjects 中不存在`)
  if (isNonEmptyString(ch.summary) && ((ch.summary as string).length < 10 || (ch.summary as string).length > 120)) {
    warn(`catalog.chapters[${ch.id}]: summary 长度 ${(ch.summary as string).length}，建议 30~80 字`)
  }
}

// ---------------------------------------------------------------- 2. 知识点

const kpIds = new Set<string>()
const kpById = new Map<string, any>()
const seenSectionIds = new Set<string>()
const sectionTitlesByChapter = new Map<string, string>()
let kpTotal = 0
let kpWithEmptyExamples = 0
const seenChapterBundles = new Set<string>()

const knowledgeRoot = path.join(CONTENT, 'knowledge')
for (const subjectDir of fs.readdirSync(knowledgeRoot)) {
  const dir = path.join(knowledgeRoot, subjectDir)
  if (!fs.statSync(dir).isDirectory()) continue
  if (!subjectIds.has(subjectDir)) err(`knowledge/${subjectDir}: 目录名不是合法的 subjectId`)

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue
    const rel = `knowledge/${subjectDir}/${file}`
    let bundle: any
    try {
      bundle = readJson(path.join(dir, file))
    } catch (e) {
      err(`${rel}: JSON 解析失败 — ${(e as Error).message}`)
      continue
    }
    const chapterId = file.replace(/\.json$/, '')
    seenChapterBundles.add(chapterId)
    if (!chapterIds.has(chapterId)) err(`${rel}: 文件名对应的 chapterId 不在 catalog.chapters 中`)
    if (bundle.chapterId !== chapterId) err(`${rel}: chapterId 字段(${bundle.chapterId}) 与文件名不一致`)
    if (bundle.subjectId !== subjectDir) err(`${rel}: subjectId 字段(${bundle.subjectId}) 与目录名不一致`)
    if (!Array.isArray(bundle.knowledge) || bundle.knowledge.length === 0) {
      warn(`${rel}: knowledge 为空`)
      continue
    }

    for (const kp of bundle.knowledge) {
      kpTotal++
      const where = `${rel}#${kp.id ?? '(无 id)'}`
      for (const f of ['schemaVersion', 'id', 'contentVersion', 'subjectId', 'chapterId', 'title', 'summary', 'tags', 'sortOrder', 'estimatedMinutes', 'anchor', 'keyPoints', 'examples', 'relatedKnowledgeIds', 'sources', 'status', 'updatedAt']) {
        if (kp[f] === undefined) err(`${where}: 缺少必填字段 ${f}`)
      }
      checkId(kp.id, where)
      if (kpIds.has(kp.id)) err(`${where}: 知识点 id 全局重复`)
      kpIds.add(kp.id)
      kpById.set(kp.id, kp)

      if (!isPosInt(kp.contentVersion)) err(`${where}: contentVersion 必须是正整数`)
      if (!isPosInt(kp.estimatedMinutes)) err(`${where}: estimatedMinutes 必须大于 0`)
      if (!Number.isInteger(kp.sortOrder)) err(`${where}: sortOrder 必须是整数`)
      if (kp.subjectId !== subjectDir) err(`${where}: subjectId 与所在目录不一致`)
      if (kp.chapterId !== chapterId) err(`${where}: chapterId 与所在文件不一致`)
      // 模板扩展字段：保留源数据的小节归属
      if (!isNonEmptyString(kp.sectionId)) err(`${where}: sectionId 缺失`)
      if (!isNonEmptyString(kp.sectionTitle)) err(`${where}: sectionTitle 缺失`)
      if (isNonEmptyString(kp.sectionId) && !(kp.sectionId as string).startsWith(`${chapterId}-s`)) {
        err(`${where}: sectionId "${kp.sectionId}" 应以 "${chapterId}-s" 开头`)
      }
      if (seenSectionIds.has(kp.sectionId) === false) seenSectionIds.add(kp.sectionId)
      sectionTitlesByChapter.set(`${chapterId}|${kp.sectionId}`, kp.sectionTitle)
      if (!STATUS.has(kp.status)) err(`${where}: status "${kp.status}" 不在 draft/published/archived 中`)
      if (!ISO_RE.test(kp.updatedAt || '')) err(`${where}: updatedAt 不是 ISO 8601 UTC（YYYY-MM-DDTHH:MM:SSZ）`)
      if (!Array.isArray(kp.tags)) err(`${where}: tags 必须是数组`)
      if (isNonEmptyString(kp.summary) && (kp.summary as string).length < 20) warn(`${where}: summary 偏短（${(kp.summary as string).length} 字）`)

      // anchor
      const a = kp.anchor || {}
      for (const f of ['type', 'format', 'content', 'caption']) if (!isNonEmptyString(a[f])) err(`${where}: anchor.${f} 必填`)
      if (!['formula', 'concept'].includes(a.type)) err(`${where}: anchor.type "${a.type}" 非法`)
      if (!['latex', 'text'].includes(a.format)) err(`${where}: anchor.format "${a.format}" 非法`)

      // keyPoints：设计要求 3 项
      if (!Array.isArray(kp.keyPoints) || kp.keyPoints.length !== 3) {
        err(`${where}: keyPoints 应为 3 项，实际 ${(kp.keyPoints || []).length}`)
      }
      const kpSecIds = new Set<string>()
      for (const k of kp.keyPoints || []) {
        for (const f of ['id', 'title', 'bodyMarkdown']) if (!isNonEmptyString(k[f])) err(`${where}: keyPoints.${f} 必填`)
        if (kpSecIds.has(k.id)) err(`${where}: keyPoints id 在本知识点内重复 ${k.id}`)
        kpSecIds.add(k.id)
      }

      // examples：至少 1 个，小节 ID 不重复
      if (!Array.isArray(kp.examples) || kp.examples.length < 1) {
        err(`${where}: examples 至少需要 1 项`)
      }
      for (const ex of kp.examples || []) {
        for (const f of ['id', 'title', 'bodyMarkdown']) if (!isNonEmptyString(ex[f])) err(`${where}: examples.${f} 必填`)
        if (kpSecIds.has(ex.id)) err(`${where}: examples id 与要点或其它例子重复 ${ex.id}`)
        kpSecIds.add(ex.id)
      }

      if (!Array.isArray(kp.relatedKnowledgeIds)) err(`${where}: relatedKnowledgeIds 必须是数组`)
      if (!Array.isArray(kp.sources)) err(`${where}: sources 必须是数组`)
      for (const s of kp.sources || []) if (!isNonEmptyString(s.title)) err(`${where}: sources[].title 必填`)
    }
  }
}

for (const id of chapterIds) if (!seenChapterBundles.has(id)) err(`catalog.chapters[${id}]: 没有对应的知识点文件`)

// 同一个小节 ID 必须对应同一个标题
{
  const titleOfSection = new Map<string, string>()
  for (const [key, title] of sectionTitlesByChapter) {
    const [, sectionId] = key.split('|')
    const prev = titleOfSection.get(sectionId)
    if (prev !== undefined && prev !== title) err(`sectionId ${sectionId}: 对应了多个标题（"${prev}" / "${title}"）`)
    titleOfSection.set(sectionId, title)
  }
  console.log(`小节        : ${titleOfSection.size}`)
}

// relatedKnowledgeIds 关联有效性
for (const [id, kp] of kpById) {
  for (const rel of kp.relatedKnowledgeIds || []) {
    if (!kpIds.has(rel)) err(`kp ${id}: relatedKnowledgeIds 指向不存在的知识点 ${rel}`)
  }
}

// ---------------------------------------------------------------- 3. 词库

const wordsFile = readJson(path.join(CONTENT, 'vocabulary/words.json'))
if (wordsFile.schemaVersion !== '1.0') err('words.json: schemaVersion 应为 "1.0"')
if (!courseIds.has(wordsFile.courseId)) err(`words.json: courseId "${wordsFile.courseId}" 在 courses 中不存在`)
if (!Array.isArray(wordsFile.words)) err('words.json: words 必须是数组')
if (wordsFile.count !== (wordsFile.words || []).length) err(`words.json: count(${wordsFile.count}) 与实际条数(${(wordsFile.words || []).length}) 不一致`)

const wordIds = new Set<string>()
const ACCENTS = new Set(['uk', 'us'])
let wordNoExamples = 0
let wordNoPos = 0
for (const w of wordsFile.words || []) {
  const where = `words.json#${w.id ?? w.word}`
  for (const f of ['schemaVersion', 'id', 'contentVersion', 'courseId', 'word', 'pronunciations', 'senses', 'examples', 'collocations', 'tags', 'sources', 'status', 'updatedAt']) {
    if (w[f] === undefined) err(`${where}: 缺少必填字段 ${f}`)
  }
  checkId(w.id, where)
  if (wordIds.has(w.id)) err(`${where}: 单词 id 重复`)
  wordIds.add(w.id)
  if (!isPosInt(w.contentVersion)) err(`${where}: contentVersion 必须是正整数`)
  if (w.courseId !== 'english') err(`${where}: courseId 应为 english`)
  if (!STATUS.has(w.status)) err(`${where}: status 非法`)
  if (!ISO_RE.test(w.updatedAt || '')) err(`${where}: updatedAt 不是 ISO 8601 UTC`)
  if (!Array.isArray(w.senses) || w.senses.length < 1) err(`${where}: senses 至少 1 项`)
  for (const s of w.senses || []) {
    if (s.partOfSpeech === undefined || s.meaningZh === undefined) err(`${where}: senses 需要 partOfSpeech 与 meaningZh`)
    if (!isNonEmptyString(s.meaningZh)) err(`${where}: senses[].meaningZh 为空`)
  }
  for (const p of w.pronunciations || []) {
    if (!ACCENTS.has(p.accent)) err(`${where}: pronunciations[].accent "${p.accent}" 非法`)
    if (!isNonEmptyString(p.ipa)) err(`${where}: pronunciations[].ipa 必填`)
  }
  if (!Array.isArray(w.examples) || w.examples.length < 1) wordNoExamples++
  if ((w.senses || []).every((s: any) => !s.partOfSpeech)) wordNoPos++
}

// ---------------------------------------------------------------- 4. 索引

const ki = readJson(path.join(GENERATED, 'knowledge-index.json'))
const vi = readJson(path.join(GENERATED, 'vocabulary-index.json'))
if (!ISO_RE.test(ki.generatedAt || '')) err('knowledge-index.json: generatedAt 不是 ISO 8601 UTC')
if (!ISO_RE.test(vi.generatedAt || '')) err('vocabulary-index.json: generatedAt 不是 ISO 8601 UTC')

const indexedKp = new Set((ki.items || []).map((i: any) => i.id))
for (const id of kpIds) if (!indexedKp.has(id)) err(`knowledge-index: 缺少知识点 ${id}`)
for (const i of ki.items || []) {
  if (!kpIds.has(i.id)) err(`knowledge-index: 索引项 ${i.id} 在内容中不存在`)
  if (!isNonEmptyString(i.searchText)) err(`knowledge-index: ${i.id} 的 searchText 为空`)
  const p = path.join(CONTENT, i.contentPath || '')
  if (!fs.existsSync(p)) err(`knowledge-index: ${i.id} 的 contentPath 不存在 — ${i.contentPath}`)
}
// 草稿不应进入索引
for (const i of ki.items || []) {
  const kp = kpById.get(i.id)
  if (kp && kp.status === 'draft') err(`knowledge-index: 草稿 ${i.id} 不应出现在索引中`)
}

const indexedWord = new Set((vi.items || []).map((i: any) => i.id))
for (const id of wordIds) if (!indexedWord.has(id)) err(`vocabulary-index: 缺少单词 ${id}`)
for (const i of vi.items || []) if (!wordIds.has(i.id)) err(`vocabulary-index: 索引项 ${i.id} 在词库中不存在`)

// ---------------------------------------------------------------- 报告

console.log('================ 校验报告 ================')
console.log(`章节        : ${chapterIds.size}`)
console.log(`知识点      : ${kpTotal}（索引 ${(ki.items || []).length}）`)
console.log(`单词        : ${(wordsFile.words || []).length}（索引 ${(vi.items || []).length}）`)
console.log('')

if (warnings.length > 0) {
  console.log(`⚠️  警告 ${warnings.length} 条：`)
  for (const w of warnings.slice(0, 20)) console.log(`   - ${w}`)
  if (warnings.length > 20) console.log(`   … 另有 ${warnings.length - 20} 条`)
  console.log('')
}

// 已知缺口：源数据没有例句，模板要求 examples 至少 1 项
console.log('📌 已知缺口（源数据本身没有，非转换错误）：')
console.log(`   - 单词 examples 为空：${wordNoExamples} / ${(wordsFile.words || []).length} 条`)
console.log(`     words.ts 只提供 word / phonetic / meaning，没有例句字段，模板要求「例句至少一项」。`)
console.log(`   - 单词无词性标记：${wordNoPos} 条（源释义未标注词性）`)
console.log('')

if (errors.length > 0) {
  console.log(`❌ 错误 ${errors.length} 条：`)
  for (const e of errors.slice(0, 40)) console.log(`   - ${e}`)
  if (errors.length > 40) console.log(`   … 另有 ${errors.length - 40} 条`)
  process.exit(1)
}
console.log('✅ 结构校验全部通过')
