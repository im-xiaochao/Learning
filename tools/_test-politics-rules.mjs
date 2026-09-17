/**
 * 负例测试：往政治题库里注入文档声称会拦下的错误，确认校验器真的拦得住。
 *
 * 为什么要做：文档写了「校验器会查 X」，如果其实查不了，文档就是在骗人。
 * 这个脚本逐条验证文档里的每句话。
 *
 * 用法：node tools/_test-politics-rules.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = path.resolve(import.meta.dirname, '..')
const TARGET = path.join(ROOT, 'data', 'content', 'politics', 'questions.json')
const BACKUP = TARGET + '.bak'

if (!fs.existsSync(TARGET)) {
  console.error('❌ 找不到 ' + TARGET)
  process.exit(1)
}

const original = fs.readFileSync(TARGET, 'utf8')
fs.writeFileSync(BACKUP, original, 'utf8')

/** 跑一次校验，返回是否通过 */
function validate() {
  try {
    execSync('npx tsx validate-content.ts', { cwd: path.join(ROOT, 'tools'), stdio: 'pipe' })
    return { pass: true, out: '' }
  } catch (e) {
    return { pass: false, out: (e.stdout || '') + (e.stderr || '') }
  }
}

/** 注入一个改动，跑校验，看是否被抓到 */
function expectCaught(label, mutate, expectSubstr) {
  const doc = JSON.parse(original)
  mutate(doc)
  // 默认把 count 同步成真实条数，避免无关的 count 报错干扰；
  // 想专门测 count 的用例，用 syncCount: false 关掉。
  if (mutate.syncCount !== false) doc.count = doc.questions.length
  fs.writeFileSync(TARGET, JSON.stringify(doc, null, 2), 'utf8')
  const r = validate()
  if (r.pass) {
    console.log(`  ❌ ${label} → 没被抓到（文档说会拦，其实没拦）`)
    return false
  }
  if (expectSubstr && !r.out.includes(expectSubstr)) {
    console.log(`  ⚠️  ${label} → 被抓到，但报错信息不是预期的「${expectSubstr}」`)
    console.log('      实际：' + r.out.split('\n').filter((l) => l.includes('❌') || l.includes('错误')).slice(0, 2).join(' | '))
    return false
  }
  console.log(`  ✅ ${label}`)
  return true
}

let pass = 0, fail = 0
const run = (label, mutate, substr, opts = {}) => {
  if (opts.noSync) mutate.syncCount = false
  if (expectCaught(label, mutate, substr)) pass++
  else fail++
}

console.log('\n=== 文档声称的规则，逐条注入错误验证 ===')

run('id 含非法字符（大写）', (d) => { d.questions[0].id = 'Q-Mayuan-1' }, '非法字符')
run('id 重复', (d) => { d.questions[1].id = d.questions[0].id }, '题目 id 重复')
run('module 不在考纲模块清单', (d) => { d.questions[0].module = '马原' }, '不在考纲模块清单')
run('difficulty 越界（4）', (d) => { d.questions[0].difficulty = 4 }, 'difficulty')
run('tags 不是数组', (d) => { d.questions[0].tags = '实践' }, 'tags 必须是数组')
run('缺 explanation', (d) => { delete d.questions[0].explanation }, '缺少必填字段 explanation')
run('选择题 answerKey 指向不存在的选项', (d) => { d.questions[0].answerKey = 'Z' }, '没有对应的选项')
run('选择题选项只有 1 个', (d) => { d.questions[0].options = [{ key: 'A', text: '只有一个' }] }, '至少 2 项')
run('选择题选项 key 重复', (d) => {
  d.questions[0].options = [{ key: 'A', text: '甲' }, { key: 'A', text: '乙' }]
}, 'options key 重复')

const matIdx = JSON.parse(original).questions.findIndex((q) => q.type === 'material')
run('材料题 paragraphs 为空数组', (d) => { d.questions[matIdx].material.paragraphs = [] }, 'paragraphs 至少 1 段')
run('材料题 answerPoints 为空数组', (d) => { d.questions[matIdx].answerPoints = [] }, 'answerPoints 至少 1 条')

// ── 多选题：answerKeys 与 answerKey 互斥，且 answerKeys 自身要合法 ──
// 拿一道单选题临时改造成多选题来测（改完只在这一条用例内生效）
const choiceIdx = Math.max(0, JSON.parse(original).questions.findIndex((q) => q.type === 'choice'))
/** 把第 choiceIdx 题变成多选题的骨架 */
function asMulti(d, answerKeys) {
  const q = d.questions[choiceIdx]
  q.type = 'multi'
  delete q.answerKey
  if (answerKeys !== undefined) q.answerKeys = answerKeys
  return q
}

run('多选题 answerKeys 只有 1 项', (d) => { asMulti(d, ['A']) }, '至少 2 项')
run('多选题 answerKeys 指向不存在的选项', (d) => { asMulti(d, ['A', 'Z']) }, '没有对应的选项')
run('多选题 answerKeys 重复', (d) => { asMulti(d, ['A', 'A']) }, 'answerKeys 重复')
run('多选题 answerKeys 不是数组', (d) => { asMulti(d, 'AB') }, '必须是数组')
run('多选题 缺 answerKeys', (d) => { asMulti(d, undefined) }, 'answerKeys 必须是数组')
run('多选题 同时带了 answerKey（单选字段）', (d) => {
  const q = asMulti(d, ['A', 'B'])
  q.answerKey = 'A'
}, '不应有 answerKey')
run('单选题 带了 answerKeys（多选字段）', (d) => {
  d.questions[choiceIdx].answerKeys = ['A', 'B']
}, '不应有 answerKeys')

run('type 非法', (d) => { d.questions[0].type = 'essay' }, '非法')
run('count 与实际条数不一致', (d) => { d.count = 999 }, '不一致', { noSync: true })
// 注意：5 个考纲模块现在**都有真题**，所以不能用真实模块名来造「多出」的用例
// （用真实模块名会先撞上「modules 有重复项」）。这里用一个题库里不存在的模块名。
run('modules 多出一个没题的模块', (d) => { d.modules.push({ name: '不存在的模块', count: 1 }) }, '多出')
run('modules 缺少真实存在的模块', (d) => { d.modules = d.modules.slice(1) }, '缺少')

fs.writeFileSync(TARGET, original, 'utf8')

console.log('\n=== 正例：恢复后应当通过 ===')
const r = validate()
if (r.pass) {
  console.log('  ✅ 还原后校验通过')
  pass++
} else {
  console.log('  ❌ 还原后仍报错：' + r.out.slice(0, 200))
  fail++
}

// 清理备份
try { fs.unlinkSync(BACKUP) } catch { /* 环境可能拦删，忽略 */ }

console.log('\n' + '='.repeat(48))
console.log(`通过 ${pass} / 失败 ${fail}`)
if (fail) {
  console.log('\n⚠️ 有规则没被拦住 —— 文档里对应的描述需要修正，或者校验器要补。')
  process.exit(1)
}
console.log('🎉 文档描述的规则全部真实生效')
