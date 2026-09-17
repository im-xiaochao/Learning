/**
 * 政治模块样式保真度检查。
 *
 * 「对照原型把政治模块样式对齐」这件事靠肉眼比对是守不住的——改一次就飘一点。
 * 这个脚本**直接解析原型 `_od_tmp/proto/ci-shu-tong-xing.html` 的 <style>**，
 * 把政治刷题相关的选择器逐条抽出来，再和实现里那两个文件的 <style> 对账
 * （`components/PoliticsQuiz.vue`、`pages-politics/paper/paper.vue`，映射关系见 MAP）。
 *
 * 为什么以原型为准而不是手抄一份期望值：手抄那份会跟着实现一起漂，等于自己给自己判卷。
 *
 * 只比「几何 + 颜色令牌」两个白名单里的属性：
 *   - display / flex-direction / align-items 等布局机制**故意不比**——小程序没有
 *     CSS grid、也没有 button/svg，布局写法必然不同（见 EXCEPTIONS）。
 *   - 原型里的 oklch() 字面量在小程序 WebView 上不可靠，实现换成 hex。但**不是「像 hex 就放行」**：
 *     脚本会真的把 oklch 换算成 sRGB（`oklchToHex`，已用项目自己的 10 个令牌交叉验证 10/10 一致），
 *     再逐通道比，容差 1。这样随手写的近似色会被打回。
 *
 * 用法：
 *   node tools/check-politics-style.mjs                     # 查映射表里登记的全部文件
 *   node tools/check-politics-style.mjs components/PoliticsQuiz.vue   # 只查其中一个
 *   node tools/check-politics-style.mjs --self-test         # 反向验证：故意改坏，必须被抓到
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PROTO = path.join(ROOT, '_od_tmp/proto/ci-shu-tong-xing.html')

/* ── 属性白名单 ────────────────────────────────────────────────────── */
const GEOM = [
  'min-height',
  'padding',
  'border-radius',
  'gap',
  'margin',
  'margin-top',
  'margin-bottom',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'width',
  'height',
  'top',
  'right',
  'opacity',
]
const COLOR = ['background', 'border', 'border-left', 'color', 'border-color']
const WHITELIST = new Set([...GEOM, ...COLOR])

/**
 * 选择器映射表：**按文件**分组。
 *
 * 政治视图拆成两层之后样式也分了家，「某条规则该在哪个文件里」由这张表说了算：
 *   components/PoliticsQuiz.vue     —— 资料库内嵌那一屏（来源切换 + 套卷卡）
 *   pages-politics/paper/paper.vue  —— 卷详情页（进度卡 + 题目列表，题干在这里）
 *
 * 反过来也管：「原型里还有、两个文件里都没有」会被报出来，逼着人把死规则删干净
 * （考纲模块那一套 .sub-group / .sub-chips 就是这么清掉的）。
 *
 * 改名不是随意改的：原型是原生 HTML（h3/p/svg/button），小程序只有 view/text/image，
 * 所以语义上同一个盒子会换名字。换名字可以，但必须在这里登记，不能悄悄多出来。
 */
const MAP = {
  'components/PoliticsQuiz.vue': [
    ['.src-switch', '.src-switch'],
    ['.src-chip', '.src-chip'],
    ['.src-chip.active', '.src-chip.active'],
    ['.paper-grid', '.paper-grid'],
    ['.paper-card', '.paper-card'],
    ['.paper-card::after', '.paper-card::after'],
    ['.paper-rate', '.paper-rate'],
    ['.paper-rate.good', '.paper-rate.good'],
    ['.hint-note', '.hint-note'],
  ],
  'pages-politics/paper/paper.vue': [
    ['.quiz-list', '.quiz-list'],
    ['.quiz-row', '.quiz-row'],
    ['.quiz-row.ok', '.quiz-row.ok'],
    ['.quiz-row.bad', '.quiz-row.bad'],
    ['.quiz-row h3', '.quiz-stem'], // 题干：h3 → text
    ['.quiz-row p', '.quiz-meta'], // meta 行：p → text
    ['.quiz-row svg', '.quiz-mark'], // 状态图标：svg → image
  ],
}

/**
 * 有意偏离登记表。key = `原型选择器::属性`。
 *   accept: 'omit'    → **允许实现不写这个属性**（非样式丢失，而是换机制了）
 *   accept: <字符串>  → 归一化后相等即通过
 *
 * 注意：oklch / var(--x) 这类颜色**不需要登记**——会真算成 hex 再比（容差 1）。
 * 只有「换了机制所以属性根本不存在」才登记，避免这张表变成万能后门。
 */
const EXCEPTIONS = {
  '.quiz-row svg::color': {
    accept: 'omit',
    why: '小程序用 <image> 加载烘焙好颜色的 PNG，不像内联 svg 那样继承 color',
  },
  '.paper-card::width': {
    accept: 'omit',
    why: '实现改走 flex:1 1 calc(50% - 6px) 排两列；写 width:100% 会把卡片撑成整行',
  },
}

/* ── 解析 ──────────────────────────────────────────────────────────── */
/** 抽出所有 <style> 块拼起来，再去掉 @media / @keyframes 这些嵌套体（本检查只关心平铺规则） */
function styleBlocks(html) {
  const out = []
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let m
  while ((m = re.exec(html))) out.push(m[1])
  return out.join('\n')
}

/** 把 CSS 文本解析成 { selector: { prop: value } }，保留顺序，后写的覆盖先写的 */
function parseCss(css) {
  const clean = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@(media|keyframes|supports|font-face)[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
  const rules = {}
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = re.exec(clean))) {
    const sels = m[1]
      .split(',')
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    const decls = {}
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':')
      if (i < 0) continue
      const prop = d.slice(0, i).trim().toLowerCase()
      const val = d
        .slice(i + 1)
        .replace(/\s+/g, ' ')
        .replace(/\s*!\s*important/i, '')
        .trim()
      if (prop && val) decls[prop] = val
    }
    for (const s of sels) rules[s] = { ...(rules[s] || {}), ...decls }
  }
  return rules
}

const norm = (v) => {
  let s = String(v).replace(/\s+/g, '').toLowerCase()
  // 数值规范化：.6 ≡ 0.6，0.60 ≡ 0.6 —— 否则会拿「写法不同」当「样式不一致」误报
  s = s.replace(/(?<![\w.])\.(\d)/g, '0.$1')
  s = s.replace(/(\d+\.\d*?)0+(?=[^\d]|$)/g, '$1').replace(/(\d+)\.(?=[^\d]|$)/g, '$1')
  return s
}
const isHex = (v) => /^#[0-9a-f]{3,8}$/i.test(String(v).trim())
const isOklch = (v) => /oklch\(/i.test(String(v))

/**
 * oklch → sRGB hex。
 *
 * 为什么要真算：原型大量用 oklch()，小程序 WebView 不支持，实现只能换 hex。
 * 如果检查器只认「像不像 hex」，那 #abcdef 这种随手写的值也能过——等于没检。
 * 本函数已用项目自己的 10 个令牌交叉验证（App.vue 的 --primary/#005d55 等，10/10 完全一致），
 * 所以它是可信基准。alpha 忽略（原型这里的 oklch 都没有 alpha）。
 */
function oklchToHex(str) {
  const m = String(str).match(/oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:deg)?\s*(?:\/[^)]*)?\)/i)
  if (!m) return null
  const num = (s) => (s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s))
  const [L, C, H] = [num(m[1]), num(m[2]), parseFloat(m[3])]
  if ([L, C, H].some((x) => !Number.isFinite(x))) return null
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const mm = m_ ** 3
  const s = s_ ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ]
  return (
    '#' +
    lin
      .map((c) => {
        const v = Math.min(1, Math.max(0, c))
        const g = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
        return Math.round(Math.min(1, Math.max(0, g)) * 255)
          .toString(16)
          .padStart(2, '0')
      })
      .join('')
  )
}

/** 逐通道比较两个 hex，返回最大差值（非法 hex 返回 null） */
function hexDelta(a, b) {
  const parse = (h) => {
    const s = String(h).trim().replace('#', '')
    const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s
    if (full.length !== 6 || !/^[0-9a-f]{6}$/i.test(full)) return null
    return full.match(/../g).map((x) => parseInt(x, 16))
  }
  const [x, y] = [parse(a), parse(b)]
  if (!x || !y) return null
  return Math.max(...x.map((v, i) => Math.abs(v - y[i])))
}

/**
 * 把原型里的值解析成可比较的 hex：
 *   1) var(--x) 查原型 :root 的令牌定义（可能嵌套 var）
 *   2) oklch(...) 走 oklchToHex
 * 解析不出来返回 null。
 */
function resolveProtoHex(value, protoRules, depth = 0) {
  if (depth > 5) return null
  const v = String(value).trim()
  const varM = v.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)$/i)
  if (varM) {
    const token = protoRules[':root']?.[varM[1]]
    if (token) return resolveProtoHex(token, protoRules, depth + 1)
    return varM[2] ? resolveProtoHex(varM[2], protoRules, depth + 1) : null
  }
  if (isOklch(v)) return oklchToHex(v)
  if (isHex(v)) return v.toLowerCase()
  return null
}

const HEX_TOLERANCE = 1 // 只容忍四舍五入误差；手估的近似色差值远大于 1

/**
 * 盒模型四边值。原型大量用 `margin: 9px 0 0` 这种简写，实现里写 `margin-top: 9px`
 * 是等价的——不比出四边就容易把等价写法报成不一致。
 * 单边缺失按 0 算（CSS 初值就是 0）。
 */
function boxOf(decls, prop) {
  const shorthand = decls[prop]
  if (shorthand) {
    const parts = shorthand.split(' ')
    const [t, r = t, b = t, l = r] = parts
    return { top: t, right: r, bottom: b, left: l }
  }
  return {
    top: decls[`${prop}-top`] ?? '0',
    right: decls[`${prop}-right`] ?? '0',
    bottom: decls[`${prop}-bottom`] ?? '0',
    left: decls[`${prop}-left`] ?? '0',
  }
}
const BOX_PROPS = new Set(['margin', 'padding'])

/* ── 审计（纯函数，供自检复用）──────────────────────────────────────── */
/**
 * @param targets [{ file, src }]，file 必须是 MAP 的键
 * 只审「被测文件在 MAP 里登记过」的那些选择器，所以传部分文件进来是合法的
 * （自检就只传一个文件、只改一个文件）。
 */
function audit(targets, protoRules) {
  const rules = new Map(targets.map((t) => [t.file, parseCss(styleBlocks(t.src))]))
  const pass = { n: 0 }
  const failures = []
  const deviations = []

  for (const [file, entries] of Object.entries(MAP)) {
    if (!rules.has(file)) continue
    const vueRules = rules.get(file)
    for (const [protoSel, vueSel] of entries) {
      const p = protoRules[protoSel]
      const v = vueRules[vueSel]
      if (!p) {
        failures.push(`原型里找不到 ${protoSel}（映射表该更新了）`)
        continue
      }
      if (!v) {
        failures.push(`${file} 里找不到 ${vueSel}（原型有 ${protoSel}，没对上）`)
        continue
      }
      for (const prop of Object.keys(p)) {
        if (!WHITELIST.has(prop)) continue
        const pv = p[prop]
        const vv = v[prop]
        const exc = EXCEPTIONS[`${protoSel}::${prop}`]

        if (vv === undefined) {
          if (exc && exc.accept === 'omit') {
            pass.n++
            deviations.push(`${protoSel} ${prop}: ${pv} → 省略（${exc.why}）`)
            continue
          }
          // margin / padding 简写 vs 单边写法，按四边等价比
          if (BOX_PROPS.has(prop)) {
            const pb = boxOf(p, prop)
            const vb = boxOf(v, prop)
            const bad = Object.keys(pb).filter((k) => norm(pb[k]) !== norm(vb[k]))
            if (!bad.length) {
              pass.n++
              if (!v[prop]) deviations.push(`${protoSel} ${prop}: ${pv} → 用单边写法等价表达`)
              continue
            }
            failures.push(
              `${file} 的 ${vueSel} 缺 ${prop}: ${pv}（${bad.map((k) => `${k} 期望 ${pb[k]} 实际 ${vb[k]}`).join('、')}）`,
            )
            continue
          }
          failures.push(`${file} 的 ${vueSel} 缺 ${prop}: ${pv}   （原型 ${protoSel}）`)
          continue
        }

        if (norm(pv) === norm(vv)) {
          pass.n++
          continue
        }

        // 原型用 oklch / var(--x)，实现只能写 hex —— 真算一遍，容差 1 个通道
        const wantHex = resolveProtoHex(pv, protoRules)
        if (wantHex && isHex(vv)) {
          const delta = hexDelta(wantHex, vv)
          if (delta !== null && delta <= HEX_TOLERANCE) {
            pass.n++
            if (norm(wantHex) !== norm(vv))
              deviations.push(`${protoSel} ${prop}: ${pv} → ${vv}（四舍五入范围内）`)
            continue
          }
          failures.push(
            `${file} 的 ${vueSel} ${prop} 原型 ${pv} 应换算为 ${wantHex}，实际写了 ${vv}` +
              (delta === null ? '' : `（差 ${delta}/255）`),
          )
          continue
        }

        // 已登记的字面量替换
        if (exc && exc.accept !== 'omit' && norm(exc.accept) === norm(vv)) {
          pass.n++
          deviations.push(`${protoSel} ${prop}: ${pv} → ${vv}（${exc.why}）`)
          continue
        }
        failures.push(`${file} 的 ${vueSel} ${prop} 期望 ${pv}，实际 ${vv}`)
      }
    }
  }

  // 布局层：纸卷用 flex 模拟两列网格，这是有意的，但要确认真的是两列
  const home = rules.get('components/PoliticsQuiz.vue')
  if (home) {
    const grid = home['.paper-grid']
    const card = home['.paper-card']
    if (!grid) failures.push('缺 .paper-grid')
    else if (!/flex/.test(grid.display || ''))
      failures.push(`.paper-grid 原型是 grid，实现必须是 flex 模拟（当前 display:${grid.display}）`)
    else pass.n++
    if (!card) failures.push('缺 .paper-card')
    else if (!/calc\(50%/.test(card.flex || ''))
      failures.push(`.paper-card 必须 flex: 1 1 calc(50% - 6px) 才能排出两列（当前 ${card.flex}）`)
    else pass.n++
  }

  return { pass: pass.n, failures, deviations }
}

/* ── 自检：故意改坏，必须被抓到 ────────────────────────────────────── */
const MUTATIONS = [
  // ── 卷详情页（pages-politics/paper/paper.vue）──
  { file: 'pages-politics/paper/paper.vue', find: 'min-height: 67px', to: 'min-height: 66px', expect: ['.quiz-row min-height'] },
  // 关键负例：拿一个「像 hex 但换算不对」的值喂进去，必须报「应换算为 …」
  {
    file: 'pages-politics/paper/paper.vue',
    find: 'border-color: #b0dec4;',
    to: 'border-color: #abcdef;',
    expect: ['.quiz-row.ok border-color'],
  },
  // ── 资料库内嵌那一屏（components/PoliticsQuiz.vue）──
  { file: 'components/PoliticsQuiz.vue', find: 'padding: 3px;', to: 'padding: 5px;', expect: ['.src-switch padding'] },
  // 关键负例：把已换算对的值再偏移 5 个通道，容差 1 不该放过
  { file: 'components/PoliticsQuiz.vue', find: 'color: #ffffff;', to: 'color: #fafafa;', expect: ['color'], nth: 1 },
  // 关键负例：白名单外的属性漂移不该被误报（防「什么都报」的假阳性）
  {
    file: 'pages-politics/paper/paper.vue',
    find: 'text-align: left;',
    to: 'text-align: center;',
    expect: [],
    allowClean: true,
  },
]

const protoRules = parseCss(styleBlocks(fs.readFileSync(PROTO, 'utf8')))

if (process.argv.includes('--self-test')) {
  console.log('\n=== 自检：改坏样式，检查器必须报错 ===\n')
  const base = {}
  for (const f of Object.keys(MAP)) base[f] = fs.readFileSync(path.join(ROOT, f), 'utf8')
  /** 只改一个文件，其余按原样一起进来——这样也顺带验证了「多文件一起审」 */
  const targetsOf = (override = {}) => Object.keys(MAP).map((f) => ({ file: f, src: override[f] ?? base[f] }))

  const baseResult = audit(targetsOf(), protoRules)
  let ok = 0
  let bad = 0
  const say = (good, msg) => {
    if (good) {
      ok++
      console.log(`  ✓ ${msg}`)
    } else {
      bad++
      console.log(`  ✗ ${msg}`)
    }
  }

  say(
    baseResult.failures.length === 0,
    `基线干净（通过 ${baseResult.pass}，失败 ${baseResult.failures.length}` +
      (baseResult.failures.length ? `：${baseResult.failures.join(' | ')}` : '') +
      '）',
  )

  for (const mut of MUTATIONS) {
    const { file, find, to, expect, nth = 1, allowClean } = mut
    const src = base[file]
    if (src === undefined) {
      say(false, `改坏用例指向没登记的文件 ${file}，自检本身要修`)
      continue
    }
    // 逐个替换并断言「替换真的发生了」——否则自检会假绿（踩过这个坑）
    const idx = expect[0] ? findNthIndex(src, find, nth) : src.indexOf(find)
    if (idx < 0) {
      say(false, `改坏用例无效：${file} 里找不到第 ${nth} 个 "${find}"，自检本身要修`)
      continue
    }
    const mutated = src.slice(0, idx) + to + src.slice(idx + find.length)
    const r = audit(targetsOf({ [file]: mutated }), protoRules)
    if (allowClean) {
      say(
        r.failures.length === 0,
        `白名单外改动被忽略、不误报 → "${find}"` +
          (r.failures.length ? `（却报了：${r.failures.join(' | ')}）` : ''),
      )
      continue
    }
    const hit = expect.every((e) => r.failures.some((f) => f.includes(e)))
    say(
      hit,
      `抓到 ${expect.join(' / ')} → "${to}"` + (hit ? '' : `（实际失败项：${r.failures.join(' | ') || '无'}）`),
    )
  }

  console.log(`\n自检通过 ${ok} / 失败 ${bad}`)
  process.exit(bad > 0 ? 1 : 0)
}

function findNthIndex(str, sub, n) {
  let i = -1
  for (let k = 0; k < n; k++) {
    i = str.indexOf(sub, i + 1)
    if (i < 0) return -1
  }
  return i
}

/* ── 主流程 ────────────────────────────────────────────────────────── */
const argPath = process.argv.slice(2).find((a) => !a.startsWith('--'))
const FILES = argPath ? [argPath.replace(/\\/g, '/')] : Object.keys(MAP)

if (!fs.existsSync(PROTO)) {
  console.error(`找不到原型文件：${PROTO}`)
  process.exit(1)
}

const targets = []
for (const f of FILES) {
  const full = path.resolve(ROOT, f)
  if (!MAP[f]) {
    console.error(`${f} 不在映射表 MAP 里——先在 MAP 里登记它该有哪些选择器`)
    process.exit(1)
  }
  if (!fs.existsSync(full)) {
    console.error(`找不到被测文件：${full}`)
    process.exit(1)
  }
  targets.push({ file: f, src: fs.readFileSync(full, 'utf8') })
}

console.log('\n=== 政治模块样式保真度（以原型为基准）===\n')

const result = audit(targets, protoRules)

console.log(`  ✓ 逐属性比对通过 ${result.pass} 项`)

if (result.deviations.length) {
  console.log(`\n已登记的有意偏离（${result.deviations.length} 项）：`)
  for (const d of result.deviations) console.log(`  · ${d}`)
}

console.log('')
if (result.failures.length) {
  console.log(`✗ 保真度不达标（${result.failures.length} 项）：`)
  for (const f of result.failures) console.log(`   - ${f}`)
  console.log(`\n通过 ${result.pass} / 失败 ${result.failures.length}`)
  process.exit(1)
}
console.log(`✅ 政治模块样式与原型一致（通过 ${result.pass} / 失败 0）`)
