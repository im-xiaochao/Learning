// 提取 PDF 目录与文本样本，验证是否可文本化
const path = require('path')

async function extractOutline(pdfPath, label) {
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ url: pdfPath, useSystemFonts: true }).promise
  console.log(`\n=== ${label} ===`)
  console.log('pages:', doc.numPages)
  // 文本样本：第 5、10 页
  for (const p of [3, 8]) {
    if (p > doc.numPages) continue
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const text = content.items.map((it) => it.str).join('')
    console.log(`--- page ${p} text (${text.length} chars) ---`)
    console.log(text.slice(0, 300))
  }
  await doc.destroy()
}

const files = [
  ['c:/Users/imxia/.trae-cn/attachments/6aa6625315427e851bbadbd8/a0858ae6-414f-40e6-a528-1cf22f97bdde_6bbfd1ce-e1bd-484b-b988-770223a58dbe_27张宇基础30讲（高数）.pdf', '高数'],
  ['c:/Users/imxia/.trae-cn/attachments/6aa6625315427e851bbadbd8/4fe572e5-672a-46c1-8758-b0fb19a4c2de_7680a4bb-067d-4f35-b9ec-f6b44912ef36_27张宇基础30讲线代.pdf', '线代'],
  ['c:/Users/imxia/.trae-cn/attachments/6aa6625315427e851bbadbd8/996edc71-1bef-4e92-9373-62d40d8abc25_5434e026-3d64-41f9-b783-f412f93838a5_27张宇基础30讲概率.pdf', '概率'],
]

;(async () => {
  for (const [f, label] of files) {
    try {
      await extractOutline(f, label)
    } catch (e) {
      console.log(label, 'ERROR:', e.message)
    }
  }
})()
