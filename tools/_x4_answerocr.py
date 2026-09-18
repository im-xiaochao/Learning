# -*- coding: utf-8 -*-
"""
《4套卷》PDF 逐页整页 OCR，带页码输出。
用途：把正文在页脚被截断、或答案开头丢失的内容补回来；也可用来核对题干。

用法：
  python tools/_x4_answerocr.py <起页> <止页> [dpi=150] [ans|q]
    ans（默认）= 答案解析 PDF，q = 试卷 PDF
"""
import io
import sys

import pymupdf
import numpy as np
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

PDFS = {
    "ans": r"C:\Users\imxia\Downloads\2026考研政治肖4肖8(1)\26肖秀荣《4套卷》答案解析.pdf",
    "q": r"C:\Users\imxia\Downloads\2026考研政治肖4肖8(1)\26肖秀荣《4套卷》.pdf",
}

start = int(sys.argv[1])
end = int(sys.argv[2])
dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 150
which = sys.argv[4] if len(sys.argv) > 4 else "ans"
PDF = PDFS[which]

engine = RapidOCR()
doc = pymupdf.open(PDF)

for pno in range(start - 1, min(end, doc.page_count)):
    pix = doc[pno].get_pixmap(dpi=dpi)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    res, _ = engine(np.array(img))
    print(f"@@@PAGE {pno + 1}", flush=True)
    for r in res or []:
        print(r[1], flush=True)
