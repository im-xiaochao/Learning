# -*- coding: utf-8 -*-
"""裁出「己/已」的**同源**字形对照图——不做 OCR，直接按行 y + 横向比例裁。

为什么这么裁：`rows/x8-d*.jsonl` 的 y 是 250dpi 空间的行位置，把它换算成
PDF 点后裁一条整页宽的窄带，再用横向比例框住目标字所在的区段。这样
**不做任何字符级插值**，不存在「下标算错切到邻字」的问题。

关键样本（p60 一页之内同时有对错两种写法，是最干净的同源对照）：
  · p60 y=608.0    `…百折不挠为自已的前途命运而奋斗…`  ← 待判（数据里是 `自已`）
  · p60 y=1358.5   `自己手中。`                        ← 参照（数据里是 `自己`）

用法：python tools/_self_crop2.py
"""
import io
import sys

import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFont

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

PAPER = "C:/Users/imxia/Downloads/2026考研政治肖4肖8(1)/26肖秀荣《8套卷》.pdf"
FONT = "C:/Windows/Fonts/simsun.ttc"
OUT = ".workbuddy-ai/tmp/crops/self-crop2.png"
DPI = 700
SRC_DPI = 250

# (页, 250dpi 的 y, 横向起止比例, 标签)
ITEMS = [
    (60, 608.0, 0.06, 0.32, "6-34  自已?"),
    (60, 1358.5, 0.06, 0.20, "参照 自己(同页)"),
    (63, 239.0, 0.06, 0.32, "6-37  自已?"),
    (82, 945.0, 0.06, 0.26, "参照 自己(p82)"),
]


def ref_glyph(ch, size=300):
    f = ImageFont.truetype(FONT, size)
    img = Image.new("RGB", (400, 420), "white")
    ImageDraw.Draw(img).text((60, 40), ch, font=f, fill="black")
    return np.array(img)


def main():
    doc = pymupdf.open(PAPER)
    panels = [("渲染 己 U+5DF1", ref_glyph("己")), ("渲染 已 U+5DF2", ref_glyph("已"))]
    for pg, y250, xf0, xf1, tag in ITEMS:
        page = doc[pg - 1]
        r = page.rect
        W = r.width
        yc = r.y0 + y250 * 72.0 / SRC_DPI
        clip = pymupdf.Rect(r.x0 + W * xf0, yc - 15, r.x0 + W * xf1, yc + 24)
        pix = page.get_pixmap(dpi=DPI, clip=clip)
        a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
            pix.height, pix.width, pix.n)[:, :, :3]
        panels.append((tag, a))
        print(f"{tag}: p{pg} y={y250:.0f} -> {a.shape[1]}x{a.shape[0]}")

    TH = 190
    scaled = []
    for name, a in panels:
        im = Image.fromarray(a)
        w = max(1, int(im.width * TH / im.height))
        scaled.append((name, np.array(im.resize((w, TH), Image.LANCZOS))))
    GAP = 20
    W = sum(a.shape[1] for _, a in scaled) + GAP * (len(scaled) - 1) + 20
    cv = Image.new("RGB", (W, TH + 74), "white")
    d = ImageDraw.Draw(cv)
    lf = ImageFont.truetype(FONT, 21)
    xo = 10
    for name, a in scaled:
        cv.paste(Image.fromarray(a), (xo, 60))
        d.text((xo, 22), name, font=lf, fill="black")
        d.rectangle([xo - 1, 59, xo + a.shape[1], 60 + TH], outline=(215, 215, 215))
        xo += a.shape[1] + GAP
    cv.save(OUT)
    print("saved", OUT, cv.size)


if __name__ == "__main__":
    main()
