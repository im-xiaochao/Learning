# -*- coding: utf-8 -*-
"""裁出《4套卷》答案解析 PDF 指定页的底部区域，存成 PNG 以便人眼核对。

用法： python tools/_x4_crop.py <页> <上边距比例> <下边距比例> <输出名> [dpi=300] [左边距比例=0] [右边距比例=1]

页幅很宽（A3 横排扫描），单行放大时把 x 范围切一半，否则图太宽看不清。
"""
import sys

import pymupdf
from PIL import Image

PDF = r"C:\Users\imxia\Downloads\2026考研政治肖4肖8(1)\26肖秀荣《4套卷》答案解析.pdf"
OUT = r"D:\Code\Learning\_od_tmp\crops"

page_no = int(sys.argv[1])
top = float(sys.argv[2])
bot = float(sys.argv[3])
name = sys.argv[4]
dpi = int(sys.argv[5]) if len(sys.argv) > 5 else 300
left = float(sys.argv[6]) if len(sys.argv) > 6 else 0.0
right = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0

doc = pymupdf.open(PDF)
page = doc[page_no - 1]
pix = page.get_pixmap(dpi=dpi, clip=pymupdf.Rect(
    page.rect.width * left, page.rect.height * top,
    page.rect.width * right, page.rect.height * bot))
path = f"{OUT}\\{name}.png"
pix.save(path)
print(path, pix.width, "x", pix.height)
