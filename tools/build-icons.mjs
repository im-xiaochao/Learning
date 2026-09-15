/**
 * 图标构建脚本：把设计稿里的内联 SVG path 栅格化成 PNG。
 *
 * 为什么需要：设计稿用 `<svg>` 内联图标，但微信小程序不支持 svg 标签，
 * `<image>` 也无法继承 currentColor，所以必须预先生成带颜色的 PNG。
 *
 * 用法： node build-icons.mjs
 * 产出：
 *   static/tabbar/*.png   5 个 tab × 2 态，81×81（微信 tabBar 推荐尺寸）
 *   static/icons/*.png    页面内图标，48×48，每图标 3 种配色
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas, loadImage } from '@napi-rs/canvas'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')

/* ── OKLCH → HEX：设计稿的颜色都是 oklch，PNG 需要具体色值 ── */
function oklchToHex(L, C, H) {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  const toSrgb = (v) => {
    const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055
    return Math.round(Math.min(1, Math.max(0, c)) * 255)
  }
  return `#${lin.map((v) => toSrgb(v).toString(16).padStart(2, '0')).join('')}`
}

const COLOR = {
  // 设计稿 :root 变量
  primary: oklchToHex(0.43, 0.079, 185), // --primary
  muted: oklchToHex(0.48, 0.022, 190), // --muted
  accentInk: oklchToHex(0.46, 0.11, 36), // --accent-ink
  onPrimary: '#ffffff',
}

/* ── 图标路径：取自设计稿的 iconPaths ── */
const PATHS = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  book: '<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14M6 9h3M6 12h3M15 9h3M15 12h3"/>',
  math: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7h8M8 12h2m-1-1v2M14 12h2M8 17h2M14 16l2 2m0-2-2 2"/>',
  library: '<path d="m12 3.2 8.4 4.6-8.4 4.6-8.4-4.6 8.4-4.6Z"/><path d="m4.6 13 7.4 4.1L19.4 13"/>',
  plan: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-11 5h6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  circleCheck: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  star: '<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.6l-5.7 3 1.1-6.4L2.8 9.7l6.4-.9Z"/>',
  sound: '<path d="M11 4 5 9H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5M5.4 7a8 8 0 0 1 13.2-1L20 8M4 16l1.4 2A8 8 0 0 0 19 17"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  flame: '<path d="M13 3c1 5-4 5-2 9 2-1 3-3 3-5 4 3 6 6 5 10a7 7 0 0 1-14-1c0-4 3-6 5-9-1 4 1 5 1 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="COLOR"/><circle cx="12" cy="12" r="1.8" fill="COLOR"/><circle cx="19" cy="12" r="1.6" fill="COLOR"/>',
  logo: '<path d="M3 5c4-1 7 1 9 3 2-2 5-4 9-3v13c-4-1-7 1-9 3-2-2-5-4-9-3Z"/><path d="M12 8v13M6 10c1 0 2 1 3 2m6 0c1-1 2-2 3-2"/>',
}

/** tabBar 图标：学习 / 单词 / 数学 / 资料库 / 我的 */
const TABS = ['home', 'book', 'math', 'library', 'user']

function svg(pathData, color, size, strokeWidth) {
  const body = pathData.replaceAll('COLOR', color)
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`,
  )
}

async function render(pathData, color, size, strokeWidth = 1.65) {
  const img = await loadImage(svg(pathData, color, size, strokeWidth))
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  // 图标在 24 视口里留 2 的呼吸位，避免贴边
  const pad = Math.round(size * (2 / 24))
  ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2)
  return canvas.toBuffer('image/png')
}

function write(file, buf) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, buf)
}

const tabDir = path.join(ROOT, 'static/tabbar')
const iconDir = path.join(ROOT, 'static/icons')

/** 清掉上一轮的产物，避免改了配色清单后残留旧文件 */
function cleanPng(dir) {
  if (!fs.existsSync(dir)) return
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.png')) continue
    try {
      fs.unlinkSync(path.join(dir, f))
    } catch {
      /* 删不掉就覆盖写 */
    }
  }
}
cleanPng(iconDir)
cleanPng(tabDir)

let count = 0

// tabBar：普通态用 muted，选中态用 primary
for (const name of TABS) {
  write(path.join(tabDir, `${name}.png`), await render(PATHS[name], COLOR.muted, 81, 1.7))
  write(path.join(tabDir, `${name}-on.png`), await render(PATHS[name], COLOR.primary, 81, 1.9))
  count += 2
}

// 页面内图标：只生成页面真正用到的配色组合，避免 4×17 个文件白占主包
// '' = muted（次要文字）  '-primary' = 主题色  '-on' = 主色卡片上的白  '-accent' = 强调橙
const UI_VARIANTS = {
  back: ['-primary'],
  chevron: [''],
  arrow: ['-primary', '-on'],
  check: ['-primary', '-on'],
  circleCheck: ['-primary', '-on'],
  star: ['', '-accent'],
  sound: ['-primary'],
  search: [''],
  refresh: ['-primary'],
  target: ['-primary'],
  plan: [''],
  plus: ['-primary'],
  eye: ['-primary'],
  flame: ['-accent'],
  clock: [''],
  logo: ['-primary'],
}

const VARIANTS = [
  ['', COLOR.muted],
  ['-primary', COLOR.primary],
  ['-accent', COLOR.accentInk],
  ['-on', COLOR.onPrimary],
]
const VARIANT_COLOR = new Map(VARIANTS)

for (const [name, suffixes] of Object.entries(UI_VARIANTS)) {
  for (const suffix of suffixes) {
    write(path.join(iconDir, `${name}${suffix}.png`), await render(PATHS[name], VARIANT_COLOR.get(suffix), 48))
    count += 1
  }
}

const iconCount = Object.values(UI_VARIANTS).reduce((n, v) => n + v.length, 0)
console.log(`已生成 ${count} 个 PNG：`)
console.log(`  static/tabbar/   ${TABS.length * 2} 个（81×81）`)
console.log(`  static/icons/    ${iconCount} 个（48×48）`)
console.log(`配色：primary ${COLOR.primary} · muted ${COLOR.muted} · accent ${COLOR.accentInk}`)
