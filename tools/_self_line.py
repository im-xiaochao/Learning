# -*- coding: utf-8 -*-
"""整行宽裁：把含目标字的**整行**裁出来读，避免靠字符下标插值定位（半角逗号会带偏）。

用法：python tools/_self_line.py
"""
import io
import sys

import numpy as np
import pymupdf
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

PAPER = "C:/Users/imxia/Downloads/2026考研政治肖4肖8(1)/26肖秀荣《8套卷》.pdf"
DPI = 250
CROP_DPI = 320
HALF = 13          # 上下各 13pt ≈ 一行高

ITEMS = [
    (50, 767.5, "p50 参照（应为自己）"),
    (82, 945.0, "p82 参照（应为自己）"),
    (60, 608.0, "6-34 待判（为自已的前途命运）"),
    (63, 239.0, "6-37 待判（要先把自已的手洗净）"),
]


def main():
    doc = pymupdf.open(PAPER)
    strips = []
    for pg, y, tag in ITEMS:
        p = doc[pg - 1]
        ib = p.get_image_info()[0]["bbox"]
        c = ib[1] + y * 72.0 / DPI
        pix = p.get_pixmap(dpi=CROP_DPI, clip=pymupdf.Rect(ib[0], c - HALF, ib[2], c + HALF))
        a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
            pix.height, pix.width, pix.n)[:, :, :3]
        # 只保留有墨迹的列，去掉两侧空白
        dark = (a[:, :, 0] < 128).sum(axis=0)
        cols = np.nonzero(dark > 0)[0]
        if len(cols):
            a = a[:, max(0, int(cols[0]) - 6):int(cols[-1]) + 6]
        strips.append((tag, a))
        print(f"{tag}: {a.shape[1]}x{a.shape[0]}")

    # 统一缩放到相同高度，纵向堆叠，行间加分隔
    TH = 130
    scaled = []
    for tag, a in strips:
        im = Image.fromarray(a)
        w = max(1, int(im.width * TH / im.height))
        scaled.append((tag, np.array(im.resize((w, TH), Image.LANCZOS))))

    GAP = 22
    W = max(a.shape[1] for _, a in scaled) + 40
    H = sum(a.shape[0] for _, a in scaled) + GAP * (len(scaled) - 1) + 20
    cv = Image.new("RGB", (W, H), "white")
    y = 10
    for tag, a in scaled:
        cv.paste(Image.fromarray(a), (20, y))
        y += a.shape[0] + GAP
    out = ".workbuddy-ai/tmp/crops/self-line.png"
    cv.save(out)
    print("saved", out, cv.size)


if __name__ == "__main__":
    main()
