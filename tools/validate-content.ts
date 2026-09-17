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

// ---------------------------------------------------------------- 3.5 政治题库

/**
 * 政治题库：规范化数据在 `data/content/politics/questions.json`。
 * 政治没有知识点，这份题库就是政治模块的全部内容，所以校验要严：
 *  - id 唯一且合法（id 是用户对错记录的键，改了就对不上）
 *  - 选择题：options 至少 2 项、key 不重复、answerKey 必须命中某一项
 *  - 材料题：material.paragraphs 非空、answerPoints 非空
 *  - explanation 必填
 *  - module 合法（来自 POLITICS_MODULES）
 *
 * 题库为空（count === 0）是合法状态，只提示不报错。
 */
const politicsFile = path.join(CONTENT, 'politics/questions.json')
const POLITICS_MODULES = new Set([
  '马克思主义基本原理',
  '毛泽东思想和中国特色社会主义理论体系',
  '中国近现代史纲要',
  '思想道德与法治',
  '形势与政策',
])
let politicsTotal = 0
let politicsChoice = 0
let politicsMulti = 0
let politicsMaterial = 0

if (!fs.existsSync(politicsFile)) {
  warn('politics/questions.json: 不存在（政治题库还没生成？跑一次 build:content）')
} else {
  const pol = readJson(politicsFile)
  if (pol.schemaVersion !== '1.0') err('politics/questions.json: schemaVersion 应为 "1.0"')
  if (pol.courseId !== 'politics') err(`politics/questions.json: courseId 应为 politics，实际 ${pol.courseId}`)
  if (!subjectIds.has(pol.subjectId)) err(`politics/questions.json: subjectId "${pol.subjectId}" 在 catalog.subjects 中不存在`)
  if (!ISO_RE.test(pol.updatedAt || '')) err('politics/questions.json: updatedAt 不是 ISO 8601 UTC')
  if (!Array.isArray(pol.questions)) err('politics/questions.json: questions 必须是数组')
  if (pol.count !== (pol.questions || []).length) {
    err(`politics/questions.json: count(${pol.count}) 与实际条数(${(pol.questions || []).length}) 不一致`)
  }

  const qIds = new Set<string>()
  for (const q of pol.questions || []) {
    politicsTotal++
    const where = `politics/questions.json#${q.id ?? '(无 id)'}`
    for (const f of ['id', 'type', 'module', 'difficulty', 'stem', 'tags', 'explanation']) {
      if (q[f] === undefined) err(`${where}: 缺少必填字段 ${f}`)
    }
    // 题库 id 不是文档规定的实体 id 格式（形如 q-mayuan-1），单独放宽校验
    if (!isNonEmptyString(q.id)) err(`${where}: id 必填`)
    else if (!/^[a-z0-9-]+$/.test(q.id)) err(`${where}: id "${q.id}" 含非法字符（只允许小写英文/数字/连字符）`)
    if (qIds.has(q.id)) err(`${where}: 题目 id 重复`)
    qIds.add(q.id)
    if (!POLITICS_MODULES.has(q.module)) err(`${where}: module "${q.module}" 不在考纲模块清单中`)
    if (![1, 2, 3].includes(q.difficulty)) err(`${where}: difficulty "${q.difficulty}" 应为 1/2/3`)
    if (!isNonEmptyString(q.stem)) err(`${where}: stem 必填`)
    if (!isNonEmptyString(q.explanation)) err(`${where}: explanation 必填`)
    if (!Array.isArray(q.tags)) err(`${where}: tags 必须是数组`)

    // 单选与多选共用选项结构，差别只在答案字段：
    //   单选 answerKey  : string      多选 answerKeys : string[]（≥2）
    // 两者互斥——单选写了 answerKeys、或多选写了 answerKey，都直接报错，
    // 避免出现「答案存了但判分读的是另一个字段」这种静默错误。
    if (q.type === 'choice' || q.type === 'multi') {
      if (q.type === 'choice') politicsChoice++
      else politicsMulti++
      if (!Array.isArray(q.options) || q.options.length < 2) {
        err(`${where}: options 至少 2 项，实际 ${(q.options || []).length}`)
      }
      const keys = new Set<string>()
      for (const o of q.options || []) {
        if (!isNonEmptyString(o.key)) err(`${where}: options[].key 必填`)
        if (!isNonEmptyString(o.text)) err(`${where}: options[${o.key}].text 必填`)
        if (keys.has(o.key)) err(`${where}: options key 重复 ${o.key}`)
        keys.add(o.key)
      }
      if (q.type === 'choice') {
        if (!isNonEmptyString(q.answerKey)) err(`${where}: 单选题 answerKey 必填`)
        else if (!keys.has(q.answerKey)) err(`${where}: answerKey "${q.answerKey}" 没有对应的选项`)
        if (q.answerKeys !== undefined) err(`${where}: 单选题不应有 answerKeys（那是多选题的字段）`)
      } else {
        if (!Array.isArray(q.answerKeys)) err(`${where}: 多选题 answerKeys 必须是数组`)
        else {
          if (q.answerKeys.length < 2) err(`${where}: 多选题 answerKeys 至少 2 项，实际 ${q.answerKeys.length}`)
          const seen = new Set<string>()
          for (const k of q.answerKeys) {
            if (!isNonEmptyString(k)) err(`${where}: answerKeys[] 含空值`)
            else if (!keys.has(k)) err(`${where}: answerKeys "${k}" 没有对应的选项`)
            if (seen.has(k)) err(`${where}: answerKeys 重复 ${k}`)
            seen.add(k)
          }
        }
        if (q.answerKey !== undefined) err(`${where}: 多选题不应有 answerKey（那是单选题的字段）`)
      }
      if (q.material !== undefined || q.answerPoints !== undefined) {
        warn(`${where}: 选择题带了 material / answerPoints 字段，运行数据里会被忽略`)
      }
    } else if (q.type === 'material') {
      politicsMaterial++
      const m = q.material || {}
      if (!isNonEmptyString(m.title)) err(`${where}: material.title 必填`)
      if (!Array.isArray(m.paragraphs) || m.paragraphs.length === 0) err(`${where}: material.paragraphs 至少 1 段`)
      for (const [i, p] of (m.paragraphs || []).entries()) {
        if (!isNonEmptyString(p)) err(`${where}: material.paragraphs[${i}] 为空`)
      }
      if (!Array.isArray(q.answerPoints) || q.answerPoints.length === 0) err(`${where}: answerPoints 至少 1 条`)
      for (const [i, p] of (q.answerPoints || []).entries()) {
        if (!isNonEmptyString(p)) err(`${where}: answerPoints[${i}] 为空`)
      }
      if (q.options !== undefined || q.answerKey !== undefined || q.answerKeys !== undefined) {
        warn(`${where}: 材料题带了 options / answerKey / answerKeys 字段，运行数据里会被忽略`)
      }
    } else {
      err(`${where}: type "${q.type}" 非法（只允许 choice / multi / material）`)
    }
  }

  // modules 统计要与题目对得上
  const actualModules = new Set((pol.questions || []).map((q: any) => q.module))
  const listedModules = new Set((pol.modules || []).map((m: any) => m.name))
  for (const m of actualModules) if (!listedModules.has(m)) err(`politics/questions.json: modules 缺少 "${m}"`)
  for (const m of listedModules) if (!actualModules.has(m)) err(`politics/questions.json: modules 多出 "${m}"（题库里没有这个模块的题）`)
  if ((pol.modules || []).length !== listedModules.size) err('politics/questions.json: modules 有重复项')

  // 运行数据必须写进分包目录【内部】，否则会被打回主包
  const politicsPkg = path.join(ROOT, 'pages-politics/questions.ts')
  if (!fs.existsSync(politicsPkg)) {
    err('pages-politics/questions.ts 不存在 —— 政治题库运行数据必须写在分包目录里')
  } else if (politicsTotal > 0) {
    const src = fs.readFileSync(politicsPkg, 'utf8')
    for (const q of pol.questions || []) {
      if (!src.includes(JSON.stringify(q.id))) err(`pages-politics/questions.ts 里找不到题目 ${q.id}`)
    }
  }
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
console.log(`政治题库    : ${politicsTotal} 题（单选 ${politicsChoice} / 多选 ${politicsMulti} / 材料 ${politicsMaterial}）`)
console.log(`单词        : ${(wordsFile.words || []).length}（索引 ${(vi.items || []).length}）`)
console.log('')

if (politicsTotal === 0) {
  console.log('📌 政治题库为空：政治模块当前是刷题页，题库在 data/politics/questions.ts。')
  console.log('   这是合法状态（页面显示空态）；补题后重跑 build:content 即可。')
  console.log('')
}

if (warnings.length > 0) {
  console.log(`⚠️  警告 ${warnings.length} 条：`)
  for (const w of warnings.slice(0, 20)) console.log(`   - ${w}`)
  if (warnings.length > 20) console.log(`   … 另有 ${warnings.length - 20} 条`)
  console.log('')
}

// 已知缺口：词表本身没有例句，深度内容靠 data/english/word-content.ts 人工补充，尚未覆盖全库
const totalWords = (wordsFile.words || []).length
console.log('📌 已知缺口（源数据本身没有，非转换错误）：')
console.log(`   - 单词 examples 为空：${wordNoExamples} / ${totalWords} 条（已覆盖 ${totalWords - wordNoExamples} 条）`)
console.log(`     data/english/words.ts 只提供 word / phonetic / meaning；例句 / 词根 / 助记 / 搭配`)
console.log(`     由 data/english/word-content.ts 人工撰写后并入，模板要求 examples 至少一项。`)
console.log(`   - 单词无词性标记：${wordNoPos} 条（源释义未标注词性）`)
console.log('')

if (errors.length > 0) {
  console.log(`❌ 错误 ${errors.length} 条：`)
  for (const e of errors.slice(0, 40)) console.log(`   - ${e}`)
  if (errors.length > 40) console.log(`   … 另有 ${errors.length - 40} 条`)
  process.exit(1)
}
console.log('✅ 结构校验全部通过')
