# -*- coding: utf-8 -*-
"""把「待判字形」和「同页已知的自己」裁成同一张大图，人工判读。

为什么不靠测量值下结论
----------------------
`_self_measure.py` 的顶行跨度判据在**渲染字形**上分得很开（己 0.83 / 已 0.11），
但扫描件里有两个干扰：
  1. OCR 行文字可能与纸面差字（漏字/多字），按「去空白后下标」定位会**整体偏移**；
  2. 半角逗号只占半字宽，等宽均分定位也会偏。

所以最终判读靠**看**：把目标字连同左右各 3 字裁出来，和**同一页**已知的
`自己`（OCR 读作自己、且测量值与渲染参照一致）并排放，字形异同一眼可见。

用法：python tools/_self_visual.py
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
CROP_DPI = 900
HALF = 6          # 上下各 6pt（一行高）
SPAN = 4          # 左右各取 4 个字宽

# (页码, y(d250), 行文本, 目标字下标, 标签)
ITEMS = [
    (50, 767.5, "作,靠能力更靠作风。把自己当作群众的一员,把群众的事当作自己的事,才能抽丝剥茧,把",
     12, "同页参照 自己(p50)"),
    (82, 945.0, "为中国人民谋幸福、为中华民族谋复兴确立为自己的初心和使命,点亮了实现中华民族伟大",
     21, "同页参照 自己(p82)"),
    (60, 608.0, "步,百折不挠为自已的前途命运而奋斗。”习近平总书记的重要论断,揭示了中华民族在直面",
     8, "待判 6-34"),
    (63, 239.0, "会做几十张,几百张,我犯小错误,下面就会犯大错误。当领导的要先把自已的手洗净,把腰",
     33, "待判 6-37"),
]


def unit_w(ch: str) -> float:
    return 0.5 if ord(ch) < 128 else 1.0


def crop_line(doc, pg, y, text, idx):
    """裁目标字左右各 SPAN 个汉字宽的横条。"""
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
    left = x0 + sum(units[:idx]) * cw
    lo = int(left - SPAN * cw)
    hi = int(left + (SPAN + 1) * cw)
    return a[:, max(0, lo):min(a.shape[1], hi)], cw


def ref_glyph(ch, size=300):
    f = ImageFont.truetype(FONT, size)
    img = Image.new("RGB", (400, 440), "white")
    ImageDraw.Draw(img).text((20, 30), ch, font=f, fill="black")
    return np.array(img)


def main():
    doc = pymupdf.open(PAPER)
    panels = [("渲染 己(己 U+5DF1)", ref_glyph("己")),
              ("渲染 已(已 U+5DF2)", ref_glyph("已"))]
    for pg, y, text, idx, tag in ITEMS:
        a, cw = crop_line(doc, pg, y, text, idx)
        panels.append((tag, a))
        print(f"{tag}: 裁窗 {a.shape[1]}x{a.shape[0]}  一字宽 {cw:.1f}px")

    TH = 170
    scaled = []
    for name, a in panels:
        im = Image.fromarray(a)
        w = max(1, int(im.width * TH / im.height))
        scaled.append((name, np.array(im.resize((w, TH), Image.LANCZOS))))

    W = max(a.shape[1] for _, a in scaled) + 40
    H = len(scaled) * (TH + 46) + 20
    cv = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(cv)
    lf = ImageFont.truetype(FONT, 26)
    y = 14
    for name, a in scaled:
        d.text((16, y), name, font=lf, fill=(150, 30, 30))
        cv.paste(Image.fromarray(a), (20, y + 34))
        y += TH + 46
    out = ".workbuddy-ai/tmp/crops/self-visual.png"
    cv.save(out)
    print("saved", out, cv.size)


if __name__ == "__main__":
    main()
