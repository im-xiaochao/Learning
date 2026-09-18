# -*- coding: utf-8 -*-
"""单字级比对：目标字左右各裁 2 字，最高倍渲染，并排看竖笔是否出头。

字宽模型修正：**印刷体里 ASCII 标点也是全角占位**（OCR 输出成 `,` 但纸面占一格），
所以只有 ASCII 字母/数字按 0.5 算，其余一律 1.0。

用法：python tools/_self_zoom2.py
"""
import io
import sys

import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFont

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

PAPER = "C:/Users/imxia/Downloads/2026考研政治肖4肖8(1)/26肖秀荣《8套卷》.pdf"
FONT = "C:/Windows/Fonts/simsun.ttc"
DPI = 250
CROP_DPI = 1100
HALF = 13          # 上下各 13pt ≈ 一行高

ITEMS = [
    (50, 767.5, "作,靠能力更靠作风。把自己当作群众的一员,把群众的事当作自己的事,才能抽丝剥茧,把",
     12, "参照 p50（自己）"),
    (60, 608.0, "步,百折不挠为自已的前途命运而奋斗。”习近平总书记的重要论断,揭示了中华民族在直面",
     8, "待判 6-34"),
    (82, 945.0, "为中国人民谋幸福、为中华民族谋复兴确立为自己的初心和使命,点亮了实现中华民族伟大",
     21, "参照 p82（自己）"),
    (63, 239.0, "会做几十张,几百张,我犯小错误,下面就会犯大错误。当领导的要先把自已的手洗净,把腰",
     33, "待判 6-37"),
]


def unit_w(ch: str) -> float:
    # 只有 ASCII 字母/数字是半角；ASCII 标点在印刷体里仍是全角占位
    return 0.5 if (ord(ch) < 128 and ch.isalnum()) else 1.0


def crop_around(doc, pg, y, text, idx, span=2):
    p = doc[pg - 1]
    ib = p.get_image_info()[0]["bbox"]
    c = ib[1] + y * 72.0 / DPI
    pix = p.get_pixmap(dpi=CROP_DPI, clip=pymupdf.Rect(ib[0], c - HALF, ib[2], c + HALF))
    a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
        pix.height, pix.width, pix.n)[:, :, :3]
    dark = (a[:, :, 0] < 128).sum(axis=0)
    cols = np.nonzero(dark > 0)[0]
    x0, x1 = (int(cols[0]), int(cols[-1])) if len(cols) else (0, a.shape[1] - 1)
    chars = [ch for ch in text if not ch.isspace()]
    units = [unit_w(ch) for ch in chars]
    cw = (x1 - x0) / float(sum(units))
    lo = int(x0 + sum(units[:max(0, idx - span)]) * cw)
    hi = int(x0 + sum(units[:min(len(units), idx + span + 1)]) * cw)
    return a[:, max(0, lo):min(a.shape[1], hi)]


def ref_glyph(ch, size=300):
    f = ImageFont.truetype(FONT, size)
    img = Image.new("RGB", (420, 400), "white")
    ImageDraw.Draw(img).text((60, 30), ch, font=f, fill="black")
    return np.array(img)


def main():
    doc = pymupdf.open(PAPER)
    panels = [("渲染 己 U+5DF1", ref_glyph("己")),
              ("渲染 已 U+5DF2", ref_glyph("已"))]
    for pg, y, text, idx, tag in ITEMS:
        a = crop_around(doc, pg, y, text, idx)
        panels.append((tag, a))
        print(f"{tag}: {a.shape[1]}x{a.shape[0]}")

    TH = 320
    scaled = []
    for name, a in panels:
        im = Image.fromarray(a)
        w = max(1, int(im.width * TH / im.height))
        scaled.append((name, np.array(im.resize((w, TH), Image.LANCZOS))))

    GAP = 26
    W = sum(a.shape[1] for _, a in scaled) + GAP * (len(scaled) - 1) + 40
    cv = Image.new("RGB", (W, TH + 78), "white")
    d = ImageDraw.Draw(cv)
    lf = ImageFont.truetype(FONT, 24)
    x = 20
    for name, a in scaled:
        d.text((x, 14), name, font=lf, fill=(150, 30, 30))
        cv.paste(Image.fromarray(a), (x, 52))
        d.rectangle([x - 1, 51, x + a.shape[1], 52 + TH], outline=(200, 200, 200))
        x += a.shape[1] + GAP
    out = ".workbuddy-ai/tmp/crops/self-zoom2.png"
    cv.save(out)
    print("saved", out, cv.size)


if __name__ == "__main__":
    main()
