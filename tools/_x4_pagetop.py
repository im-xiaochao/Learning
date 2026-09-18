# -*- coding: utf-8 -*-
"""
把《4套卷》答案解析 PDF 每一页的「顶部条带」单独 OCR 一遍。
用途：正文在页脚处被截断时，续文就在下一页顶部。

用法：
  python tools/_x4_pagetop.py <起页> <止页> [顶部比例=0.22] [dpi=200]
"""
import io
import os
import sys

import pymupdf
import numpy as np
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

PDF = r"C:\Users\imxia\Downloads\2026考研政治肖4肖8(1)\26肖秀荣《4套卷》答案解析.pdf"

start = int(sys.argv[1])
end = int(sys.argv[2])
frac = float(sys.argv[3]) if len(sys.argv) > 3 else 0.22
dpi = int(sys.argv[4]) if len(sys.argv) > 4 else 200

engine = RapidOCR()
doc = pymupdf.open(PDF)

for pno in range(start - 1, min(end, doc.page_count)):
    page = doc[pno]
    pix = page.get_pixmap(dpi=dpi)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    w, h = img.size
    top = img.crop((0, 0, w, int(h * frac)))
    res, _ = engine(np.array(top))
    txt = " / ".join(r[1] for r in (res or []))
    print(f"p{pno + 1:>3} | {txt}", flush=True)
