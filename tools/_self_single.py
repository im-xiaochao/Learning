# -*- coding: utf-8 -*-
"""只裁「自」后面那一个字，放到最大，与渲染参照并排——这是最终判据。

用法：python tools/_self_single.py
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
CROP_DPI = 1800
HALF = 11

ITEMS = [
    (50, 767.5, "作,靠能力更靠作风。把自己当作群众的一员,把群众的事当作自己的事,才能抽丝剥茧,把",
     12, "p50 自己"),
    (82, 945.0, "为中国人民谋幸福、为中华民族谋复兴确立为自己的初心和使命,点亮了实现中华民族伟大",
     21, "p82 自己"),
    (60, 608.0, "步,百折不挠为自已的前途命运而奋斗。”习近平总书记的重要论断,揭示了中华民族在直面",
     8, "6-34"),
    (63, 239.0, "会做几十张,几百张,我犯小错误,下面就会犯大错误。当领导的要先把自已的手洗净,把腰",
     33, "6-37"),
]


def unit_w(ch: str) -> float:
    return 0.5 if (ord(ch) < 128 and ch.isalnum()) else 1.0


def crop_char(doc, pg, y, text, idx):
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
    lo = int(x0 + sum(units[:idx]) * cw)
    hi = int(x0 + sum(units[:idx + 1]) * cw)
    return a[:, max(0, lo):min(a.shape[1], hi)]


def ref_glyph(ch, size=460):
    f = ImageFont.truetype(FONT, size)
    img = Image.new("RGB", (620, 600), "white")
    ImageDraw.Draw(img).text((90, 40), ch, font=f, fill="black")
    return np.array(img)


def top_span(a):
    """顶行墨迹跨度 / 字宽。己 → 宽（顶横）；已 → 窄（竖笔尖）。"""
    dark = a[:, :, 0] < 140
    rows = np.nonzero(dark.any(axis=1))[0]
    cols = np.nonzero(dark.any(axis=0))[0]
    if not len(rows) or not len(cols):
        return -1.0
    sub = dark[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1]
    H, W = sub.shape
    band = max(1, int(round(H * 0.06)))
    tc = np.nonzero(sub[:band, :].any(axis=0))[0]
    return (int(tc[-1]) - int(tc[0]) + 1) / float(W) if len(tc) else 0.0


def main():
    doc = pymupdf.open(PAPER)
    panels = [("渲染 己 U+5DF1", ref_glyph("己")),
              ("渲染 已 U+5DF2", ref_glyph("已"))]
    for pg, y, text, idx, tag in ITEMS:
        a = crop_char(doc, pg, y, text, idx)
        panels.append((tag, a))
        print(f"{tag:12s} {a.shape[1]}x{a.shape[0]}  顶行跨度={top_span(a):.3f}")

    TH = 420
    scaled = []
    for name, a in panels:
        im = Image.fromarray(a)
        w = max(1, int(im.width * TH / im.height))
        scaled.append((name, np.array(im.resize((w, TH), Image.LANCZOS))))

    GAP = 26
    W = sum(a.shape[1] for _, a in scaled) + GAP * (len(scaled) - 1) + 40
    cv = Image.new("RGB", (W, TH + 84), "white")
    d = ImageDraw.Draw(cv)
    lf = ImageFont.truetype(FONT, 26)
    x = 20
    for name, a in scaled:
        d.text((x, 16), name, font=lf, fill=(150, 30, 30))
        cv.paste(Image.fromarray(a), (x, 56))
        d.rectangle([x - 1, 55, x + a.shape[1], 56 + TH], outline=(200, 200, 200))
        x += a.shape[1] + GAP
    out = ".workbuddy-ai/tmp/crops/self-single.png"
    cv.save(out)
    print("saved", out, cv.size)


if __name__ == "__main__":
    main()
