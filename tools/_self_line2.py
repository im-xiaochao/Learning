# -*- coding: utf-8 -*-
"""按 OCR 行的 y 渲染整行宽带，用于目视判读「己 / 已」。

为什么不用字符下标定位：OCR 行文本与纸面字形可能差字（半角标点占位、
丢字），按字数均分插值会切到邻字（前几次就栽在这）。整行宽带没有插值，
横向范围给足（5%~95% 版心宽），肉眼能顺读整句。

用法：python tools/_self_line2.py
"""
import io
import sys

import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFont

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

PAPER = "C:/Users/imxia/Downloads/2026考研政治肖4肖8(1)/26肖秀荣《8套卷》.pdf"
FONT = "C:/Windows/Fonts/simsun.ttc"
OUT = ".workbuddy-ai/tmp/crops/self-line2.png"
DPI = 480
SRC_DPI = 250

# (页, 250dpi 的 y, 标签)
ITEMS = [
    (60, 608.0, "p60 y608  6-34 待判"),
    (60, 1358.5, "p60 y1358 参照(同页)"),
    (63, 239.0, "p63 y239  6-37 待判"),
    (82, 945.0, "p82 y945  参照"),
    (82, 2408.0, "p82 y2408 参照2"),
]


def ref_glyph(ch, size=300):
    f = ImageFont.truetype(FONT, size)
    img = Image.new("RGB", (400, 420), "white")
    ImageDraw.Draw(img).text((60, 40), ch, font=f, fill="black")
    return np.array(img)


def main():
    doc = pymupdf.open(PAPER)
    panels = [("渲染 己", ref_glyph("己")), ("渲染 已", ref_glyph("已"))]
    for pg, y250, tag in ITEMS:
        page = doc[pg - 1]
        r = page.rect
        yc = r.y0 + y250 * 72.0 / SRC_DPI
        clip = pymupdf.Rect(r.x0 + r.width * 0.05, yc - 16,
                            r.x0 + r.width * 0.95, yc + 26)
        pix = page.get_pixmap(dpi=DPI, clip=clip)
        a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
            pix.height, pix.width, pix.n)[:, :, :3]
        panels.append((tag, a))
        print(f"{tag}: p{pg} y={y250:.0f} -> {a.shape[1]}x{a.shape[0]}")

    TH = 150
    scaled = []
    for name, a in panels:
        im = Image.fromarray(a)
        w = max(1, int(im.width * TH / im.height))
        scaled.append((name, np.array(im.resize((w, TH), Image.LANCZOS))))
    GAP = 14
    W = max(a.shape[1] for _, a in scaled) + 20
    H = (TH + 34) * len(scaled)
    cv = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(cv)
    lf = ImageFont.truetype(FONT, 20)
    yo = 6
    for name, a in scaled:
        d.text((10, yo), name, font=lf, fill="black")
        cv.paste(Image.fromarray(a), (10, yo + 26))
        d.rectangle([9, yo + 25, 10 + a.shape[1], yo + 26 + TH], outline=(210, 210, 210))
        yo += TH + 34
    cv.save(OUT)
    print("saved", OUT, cv.size)


if __name__ == "__main__":
    main()
