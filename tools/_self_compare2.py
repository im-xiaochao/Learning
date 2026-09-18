# -*- coding: utf-8 -*-
"""己/已 字形定夺：拿**同一份扫描件里已知的 `自己`** 当参照，等高并排。

为什么这样比：
  · 己 / 已 的唯一区别是**左侧竖笔是否出头到顶横之上**（已出头、己不出头）；
  · 扫描分辨率下这一点极易被 OCR 读错，三跑投票（2:1）不足以定夺；
  · 同一本书同一字体同一扫描 dpi，已知的 `自己` 就是最可靠的参照——
    比用系统字体渲染更接近原始字形。

**字符定位**：OCR 行只给整行的 x0/宽度，没有逐字框。这里按「去空白后字符均分」
估算第 idx 个字的位置，再左右各留 PAD 个字宽——所以窗口里会出现 ±4 个字，
足以目视确认裁到的是不是目标字。窗口高度只有一行（HALF=9pt），避免串到邻行。

用法：python tools/_self_compare2.py
"""
import io
import sys

import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFont

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

PAPER = "C:/Users/imxia/Downloads/2026考研政治肖4肖8(1)/26肖秀荣《8套卷》.pdf"
OUT = "D:/Code/Learning/.workbuddy-ai/tmp/crops/self-compare2.png"

FONT = "C:/Windows/Fonts/simsun.ttc"
DPI = 250          # 扫描件 OCR 用的 d250 坐标空间
CROP_DPI = 900     # 输出裁图的分辨率
HALF = 9           # 上下各取多少 pt（约一行高）
PAD = 1.5          # 左右各留几个字宽

# (页码, y(d250 空间), 行文本, 目标字在「去空白后」的下标, 标签)
ITEMS = [
    # 已知正确的参照（OCR 三跑都读 `自己`）——目标字是 `己`
    (50, 767.5, "作,靠能力更靠作风。把自己当作群众的一员,把群众的事当作自己的事,才能抽丝剥茧,把",
     11, "参照 自己(p50)"),
    (82, 945.0, "为中国人民谋幸福、为中华民族谋复兴确立为自己的初心和使命,点亮了实现中华民族伟大",
     21, "参照 自己(p82)"),
    # 待判
    (60, 608.0, "步,百折不挠为自已的前途命运而奋斗。”习近平总书记的重要论断,揭示了中华民族在直面",
     8, "待判 6-34"),
    (63, 239.0, "会做几十张,几百张,我犯小错误,下面就会犯大错误。当领导的要先把自已的手洗净,把腰",
     33, "待判 6-37"),
]


def ink_bounds(a):
    dark = (a[:, :, 0] < 128).sum(axis=0)
    cols = np.nonzero(dark > 0)[0]
    return (int(cols[0]), int(cols[-1])) if len(cols) else (0, a.shape[1] - 1)


def crop_nth(a, text, idx, pad=PAD):
    x0, x1 = ink_bounds(a)
    chars = [c for c in text if not c.isspace()]
    cw = (x1 - x0) / len(chars)
    lo = int(x0 + (idx - pad) * cw)
    hi = int(x0 + (idx + 1 + pad) * cw)
    return a[:, max(0, lo):min(a.shape[1], hi)]


def paper_crop(doc, pg, y, text, idx):
    p = doc[pg - 1]
    ib = p.get_image_info()[0]["bbox"]
    c = ib[1] + y * 72.0 / DPI
    pix = p.get_pixmap(dpi=CROP_DPI, clip=pymupdf.Rect(ib[0], c - HALF, ib[2], c + HALF))
    a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
        pix.height, pix.width, pix.n)[:, :, :3]
    return crop_nth(a, text, idx)


def ref_glyph(ch, size=300):
    f = ImageFont.truetype(FONT, size)
    img = Image.new("RGB", (360, 420), "white")
    ImageDraw.Draw(img).text((25, 30), ch, font=f, fill="black")
    return np.array(img)


def main():
    doc = pymupdf.open(PAPER)

    panels = [("字体参照 己", ref_glyph("己")), ("字体参照 已", ref_glyph("已"))]
    for pg, y, text, idx, tag in ITEMS:
        panels.append((tag, paper_crop(doc, pg, y, text, idx)))

    TARGET_H = 240
    scaled = []
    for name, a in panels:
        im = Image.fromarray(a)
        w = max(1, int(im.width * TARGET_H / im.height))
        scaled.append((name, np.array(im.resize((w, TARGET_H), Image.LANCZOS))))

    # 两行三列排布（一行太宽读不清）
    COLS = 3
    rows = [scaled[i:i + COLS] for i in range(0, len(scaled), COLS)]
    GAP = 26
    col_w = max(a.shape[1] for _, a in scaled)
    cv = Image.new("RGB", (col_w * COLS + GAP * (COLS + 1),
                           (TARGET_H + 60) * len(rows) + 10), "white")
    d = ImageDraw.Draw(cv)
    lf = ImageFont.truetype(FONT, 22)
    for ri, row in enumerate(rows):
        yo = 10 + ri * (TARGET_H + 60)
        for ci, (name, a) in enumerate(row):
            xo = GAP + ci * (col_w + GAP)
            cv.paste(Image.fromarray(a), (xo, yo + 40))
            d.text((xo, yo + 8), name, font=lf, fill="black")
            d.rectangle([xo - 1, yo + 39, xo + a.shape[1], yo + 40 + TARGET_H],
                        outline=(210, 210, 210))
            print(f"  {name}: {a.shape[1]}x{a.shape[0]}")
    cv.save(OUT)
    print("saved", OUT, cv.size)


if __name__ == "__main__":
    main()
