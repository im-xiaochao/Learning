# -*- coding: utf-8 -*-
"""把「自X」两字放大到单字级，与渲染参照并排，判定 X 是 己 还是 已。

坐标来源：`_self_line2.py` 渲染的整行图里量出的横向比例（不是按字数插值）。
  · 目标字在整行图中的 x 像素 → 页面横向比例 = 0.05 + (x / 图宽) * 0.9

用法：python tools/_self_zoom3.py
"""
import io
import sys

import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFont

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

PAPER = "C:/Users/imxia/Downloads/2026考研政治肖4肖8(1)/26肖秀荣《8套卷》.pdf"
FONT = "C:/Windows/Fonts/simsun.ttc"
OUT = ".workbuddy-ai/tmp/crops/self-zoom3.png"
DPI = 1400
SRC_DPI = 250

# (页, 250dpi 的 y, 左比例, 右比例, 标签)
ITEMS = [
    (60, 608.0, 0.19, 0.33, "p60  6-34  「自?」"),
    (60, 1358.5, 0.075, 0.215, "p60  参照「自?手中」"),
    (63, 239.0, 0.45, 0.59, "p63  6-37  「自?」"),
    (82, 945.0, 0.35, 0.49, "p82  参照「自?」"),
]


def ref_glyph(ch, size=300):
    f = ImageFont.truetype(FONT, size)
    img = Image.new("RGB", (380, 400), "white")
    ImageDraw.Draw(img).text((60, 30), ch, font=f, fill="black")
    return np.array(img)


def main():
    doc = pymupdf.open(PAPER)
    panels = [("渲染 己 (U+5DF1)", ref_glyph("己")), ("渲染 已 (U+5DF2)", ref_glyph("已"))]
    for pg, y250, xf0, xf1, tag in ITEMS:
        page = doc[pg - 1]
        r = page.rect
        yc = r.y0 + y250 * 72.0 / SRC_DPI
        clip = pymupdf.Rect(r.x0 + r.width * xf0, yc - 11,
                            r.x0 + r.width * xf1, yc + 11)
        pix = page.get_pixmap(dpi=DPI, clip=clip)
        a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
            pix.height, pix.width, pix.n)[:, :, :3]
        panels.append((tag, a))
        print(f"{tag}: {a.shape[1]}x{a.shape[0]}")

    TH = 190
    scaled = []
    for name, a in panels:
        im = Image.fromarray(a)
        w = max(1, int(im.width * TH / im.height))
        scaled.append((name, np.array(im.resize((w, TH), Image.LANCZOS))))
    GAP = 16
    W = sum(a.shape[1] for _, a in scaled) + GAP * (len(scaled) - 1) + 20
    cv = Image.new("RGB", (W, TH + 66), "white")
    d = ImageDraw.Draw(cv)
    lf = ImageFont.truetype(FONT, 19)
    xo = 10
    for name, a in scaled:
        d.text((xo, 18), name, font=lf, fill="black")
        cv.paste(Image.fromarray(a), (xo, 54))
        d.rectangle([xo - 1, 53, xo + a.shape[1], 54 + TH], outline=(215, 215, 215))
        xo += a.shape[1] + GAP
    cv.save(OUT)
    print("saved", OUT, cv.size)


if __name__ == "__main__":
    main()
