/**
 * 把本地原型同步回 OpenDesign 项目文件（单文件 HTML）。
 *
 * 为什么要这个脚本：原型改动是在本地副本 `_od_tmp/proto/ci-shu-tong-xing.html` 上做的，
 * 而 OpenDesign 画布读的是项目目录里的 `ci-shu-tong-xing.html`。两者必须一致，
 * 否则画布看到的是旧稿、而 harness 测的是新稿（这个坑踩过）。
 * 走 MCP 的 write_file 要整份内容当参数（~880 KB），所以直接做文件复制。
 *
 * 用法：
 *   node tools/sync-od-proto.mjs            # 本地 → OpenDesign（覆盖前先备份到 .tmp-od/）
 *   node tools/sync-od-proto.mjs --check    # 只比对两边是否一致，不写
 *
 * 项目目录可用环境变量 OD_PROJECT_DIR 覆盖（换机器/换账号时用）。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

// 路径一律按「脚本所在的 tools/ 的上一级」解析，这样在项目根或 tools/ 下跑都行
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOCAL = path.join(ROOT, '_od_tmp/proto/ci-shu-tong-xing.html')
const FILE_NAME = 'ci-shu-tong-xing.html'
const BACKUP = path.join(ROOT, '.tmp-od/od-prev.html')

/** OpenDesign 把项目文件放在各 namespace 的 data/projects/<项目id>/ 下 */
function findProjectDir() {
  if (process.env.OD_PROJECT_DIR) return process.env.OD_PROJECT_DIR
  const root = path.join(os.homedir(), 'AppData/Roaming/Open Design/namespaces')
  if (!fs.existsSync(root)) return null
  for (const ns of fs.readdirSync(root)) {
    const projects = path.join(root, ns, 'data/projects')
    if (!fs.existsSync(projects)) continue
    for (const proj of fs.readdirSync(projects)) {
      if (proj.includes('ci-shu-tong-xing')) return path.join(projects, proj)
    }
  }
  return null
}

const dir = findProjectDir()
if (!dir) {
  console.error('❌ 没找到 OpenDesign 项目目录；用 OD_PROJECT_DIR=<dir> 指定')
  process.exit(1)
}
const target = path.join(dir, FILE_NAME)
if (!fs.existsSync(LOCAL)) {
  console.error(`❌ 本地原型不存在：${LOCAL}`)
  process.exit(1)
}

const hash = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 12)
const local = { size: fs.statSync(LOCAL).size, hash: hash(LOCAL) }
const remote = fs.existsSync(target) ? { size: fs.statSync(target).size, hash: hash(target) } : null

console.log(`本地      ${local.size} 字节  sha ${local.hash}`)
console.log(`OpenDesign ${remote ? `${remote.size} 字节  sha ${remote.hash}` : '（不存在）'}`)

const same = remote && remote.hash === local.hash && remote.size === local.size
if (same) {
  console.log('✅ 两边一致，无需同步')
  process.exit(0)
}
if (process.argv.includes('--check')) {
  console.log('⚠️  两边不一致（--check 模式，未写入）')
  process.exit(1)
}

if (remote) {
  fs.mkdirSync(path.dirname(BACKUP), { recursive: true })
  fs.copyFileSync(target, BACKUP)
  console.log(`↩️  旧稿已备份到 ${path.relative(process.cwd(), BACKUP)}`)
}
fs.copyFileSync(LOCAL, target)
console.log(`✅ 已写回 ${target}（${fs.statSync(target).size} 字节）`)
console.log('   提示：OpenDesign 画布可能要重新打开该文件才会刷新。')
