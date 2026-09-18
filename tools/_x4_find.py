# -*- coding: utf-8 -*-
"""在 PDF 指定页里定位包含某段文字的那一行，并把那一行裁成 PNG 供人眼核对。

用法：
    python tools/_x4_find.py <ans|q> <页> <关键词> [dpi=300] [上下留白倍数=1.2]

会打印命中的行文本与坐标，并输出 _od_tmp/crops/find_<页>_<关键词>.png
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
OUT = r"D:\Code\Learning\_od_tmp\crops"

which = sys.argv[1]
page_no = int(sys.argv[2])
term = sys.argv[3]
dpi = int(sys.argv[4]) if len(sys.argv) > 4 else 300
pad = float(sys.argv[5]) if len(sys.argv) > 5 else 1.2

doc = pymupdf.open(PDFS[which])
page = doc[page_no - 1]
pix = page.get_pixmap(dpi=dpi)
img = Image.open(io.BytesIO(pix.tobytes("png")))
W, H = img.size

engine = RapidOCR()
res, _ = engine(np.array(img))

found = []
for item in res or []:
    box, text = item[0], item[1]
    if term in text:
        ys = [p[1] for p in box]
        xs = [p[0] for p in box]
        found.append((min(ys), max(ys), min(xs), max(xs), text))

if not found:
    print(f"第 {page_no} 页没找到「{term}」")
    print("该页识别到的行：")
    for item in res or []:
        print("   ", item[1])
    sys.exit(0)

for y0, y1, x0, x1, text in found:
    h = y1 - y0
    print(f"命中：{text}")
    print(f"  y {y0:.0f}~{y1:.0f} / 页高 {H}  → 比例 {y0 / H:.4f}~{y1 / H:.4f}")
    top = max(0.0, y0 - h * pad)
    bot = min(float(H), y1 + h * pad)
    path = f"{OUT}\\find_{page_no}_{term}.png"
    img.crop((0, int(top), W, int(bot))).save(path)
    print(f"  → {path}")
