# -*- coding: utf-8 -*-
"""把三处 `自` 后面那一个字单独裁出来放大，并排比对。

`己` / `已` 只差一笔：
  · `己`：竖折钩**不**穿过上面那一横（顶横之上没有笔画）
  · `已`：竖折**穿过**顶横，顶横之上露出一小截竖
并排放大后，这一笔一眼可辨。

用法：python tools/_self_zoom.py
"""
import io
import sys

import numpy as np
import pymupdf
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = "C:/Users/imxia/Downloads/2026考研政治肖4肖8(1)"
PAPER = BASE + "/26肖秀荣《8套卷》.pdf"
SUA = BASE + "/肖四肖八速刷/26肖八选择题速刷刷题本.pdf"
OUT = "D:/Code/Learning/.workbuddy-ai/tmp/crops/self-zoom.png"

DPI = 250
HALF = 16

# 试卷：页码、d250 的 y、该行 OCR 原文（用去空白后的序号定位）
PAPER_ITEMS = [
    (60, 608.0, "步,百折不挠为自已的前途命运而奋斗。”习近平总书记的重要论断,揭示了中华民族在直面", "6-34"),
    (63, 239.0, "会做几十张、几百张,我犯小错误，下面就会犯大错误。当领导的要先把自已的手洗净,把腰", "6-37"),
]


def ink_bounds(arr):
    dark = (arr[:, :, 0] < 128).sum(axis=0)
    cols = np.nonzero(dark > 0)[0]
    return (int(cols[0]), int(cols[-1])) if len(cols) else (0, arr.shape[1] - 1)


def char_cell(arr, text, want_index):
    """把整行按字符均分，返回第 want_index 个字的横向区间。"""
    x0, x1 = ink_bounds(arr)
    chars = [c for c in text if not c.isspace()]
    cw = (x1 - x0) / len(chars)
    lo = x0 + want_index * cw
    return int(lo), int(lo + cw)


def main():
    paper = pymupdf.open(PAPER)
    sua = pymupdf.open(SUA)
    panels = []

    for pg, y, text, tag in PAPER_ITEMS:
        p = paper[pg - 1]
        ib = p.get_image_info()[0]["bbox"]
        c = ib[1] + y * 72.0 / DPI
        pix = p.get_pixmap(dpi=600, clip=pymupdf.Rect(ib[0], c - HALF, ib[2], c + HALF))
        a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
            pix.height, pix.width, pix.n)[:, :, :3]
        flat = text.replace(" ", "")
        i = flat.find("自已")
        for off, name in ((i, "自"), (i + 1, "？")):
            lo, hi = char_cell(a, text, off)
            panels.append((f"{tag} {name}", a[:, lo:hi]))

    # 速刷本：用文本层 bbox 的最后一个字
    p = sua[57]
    hit = None
    for b in p.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            s = "".join(sp["text"] for sp in l["spans"])
            if "建立起自" in s:
                hit = (s, l["bbox"])
    if hit:
        s, bb = hit
        cw = (bb[2] - bb[0]) / len(s)
        # 倒数第 1、2 个字
        for k, name in ((len(s) - 1, "？"), (len(s) - 2, "自")):
            lo = bb[0] + k * cw
            r = pymupdf.Rect(lo, bb[1] - 2, lo + cw, bb[3] + 2)
            pix = p.get_pixmap(dpi=600, clip=r)
            a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
                pix.height, pix.width, pix.n)[:, :, :3]
            panels.append((f"8-21 {name}", a))

    # 并排（横排），每格等高
    H = max(a.shape[0] for _, a in panels)
    GAP = 18
    W = sum(a.shape[1] for _, a in panels) + GAP * (len(panels) - 1)
    cv = np.full((H, W, 3), 255, dtype=np.uint8)
    xo = 0
    for name, a in panels:
        cv[:a.shape[0], xo:xo + a.shape[1]] = a
        print(f"  {name}: {a.shape}")
        xo += a.shape[1] + GAP
    Image.fromarray(cv).save(OUT)
    print("saved", OUT, cv.shape)


if __name__ == "__main__":
    main()
