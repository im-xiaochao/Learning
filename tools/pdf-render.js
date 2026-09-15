// 渲染 PDF 指定页面为 PNG，供视觉阅读
const fs = require('fs')
const path = require('path')
const { createCanvas } = require('@napi-rs/canvas')

const OUT = path.join(__dirname, 'pages')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function renderPages(pdfPath, label, pageNums) {
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.mjs')
  const wasmUrl = path.join(__dirname, 'node_modules/pdfjs-dist/wasm').replace(/\\/g, '/') + '/'
  const doc = await pdfjs.getDocument({ url: pdfPath, useSystemFonts: true, wasmUrl }).promise
  for (const p of pageNums) {
    if (p < 1 || p > doc.numPages) continue
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale: 2.0 })
    const canvas = createCanvas(viewport.width, viewport.height)
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise
    const file = path.join(OUT, `${label}-p${String(p).padStart(3, '0')}.png`)
    fs.writeFileSync(file, canvas.toBuffer('image/png'))
    console.log('saved', file)
  }
}

const [, , pdfPath, label, pagesArg] = process.argv
const pageNums = pagesArg.split(',').map((s) => parseInt(s.trim(), 10))
renderPages(pdfPath, label, pageNums).catch((e) => {
  console.error('ERROR', e)
  process.exit(1)
})
