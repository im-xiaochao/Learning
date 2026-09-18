# -*- coding: utf-8 -*-
"""把「参照字形（宋体己/已/巳）」与三处 OCR 裁图等高并排，一图定夺。

参照用系统宋体（simsun.ttc）渲染——书上的正文是宋体，笔画形态可比。
三处裁图来自《8套卷》试卷（扫描件）与《选择题速刷刷题本》（排版稿），
定位方式见 `_self_crop.py` / `_self_zoom.py`。

用法：python tools/_self_compare.py
"""
import io
import sys

import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFont

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = "C:/Users/imxia/Downloads/2026考研政治肖4肖8(1)"
PAPER = BASE + "/26肖秀荣《8套卷》.pdf"
SUA = BASE + "/肖四肖八速刷/26肖八选择题速刷刷题本.pdf"
OUT = "D:/Code/Learning/.workbuddy-ai/tmp/crops/self-compare.png"

FONT = "C:/Windows/Fonts/simsun.ttc"
DPI = 250
HALF = 16

PAPER_ITEMS = [
    (60, 608.0, "步,百折不挠为自已的前途命运而奋斗。”习近平总书记的重要论断,揭示了中华民族在直面", "6-34"),
    (63, 239.0, "会做几十张、几百张,我犯小错误，下面就会犯大错误。当领导的要先把自已的手洗净,把腰", "6-37"),
]


def ink_bounds(arr):
    dark = (arr[:, :, 0] < 128).sum(axis=0)
    cols = np.nonzero(dark > 0)[0]
    return (int(cols[0]), int(cols[-1])) if len(cols) else (0, arr.shape[1] - 1)


def crop_char(arr, text, idx, pad=0.10):
    """按字符均分裁第 idx 个字，左右各留 pad 个字宽。"""
    x0, x1 = ink_bounds(arr)
    chars = [c for c in text if not c.isspace()]
    cw = (x1 - x0) / len(chars)
    lo = int(x0 + (idx - pad) * cw)
    hi = int(x0 + (idx + 1 + pad) * cw)
    return arr[:, max(0, lo):min(arr.shape[1], hi)]


def paper_char(doc, pg, y, text, which):
    p = doc[pg - 1]
    ib = p.get_image_info()[0]["bbox"]
    c = ib[1] + y * 72.0 / DPI
    pix = p.get_pixmap(dpi=600, clip=pymupdf.Rect(ib[0], c - HALF, ib[2], c + HALF))
    a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
        pix.height, pix.width, pix.n)[:, :, :3]
    flat = text.replace(" ", "")
    i = flat.find("自已")
    return crop_char(a, text, i + which)


def sua_char(doc, which):
    """速刷本：文本层 bbox 按字均分，which=0 取「自」、1 取后面那个字。"""
    p = doc[57]
    hit = None
    for b in p.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            s = "".join(sp["text"] for sp in l["spans"])
            if "建立起自" in s:
                hit = (s, l["bbox"])
    if not hit:
        return None
    s, bb = hit
    cw = (bb[2] - bb[0]) / len(s)
    i = len(s) - 2 + which          # 行尾是「自」+待判字
    lo = bb[0] + (i - 0.10) * cw
    hi = bb[0] + (i + 1 + 0.10) * cw
    pix = p.get_pixmap(dpi=600, clip=pymupdf.Rect(lo, bb[1] - 2, hi, bb[3] + 2))
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(
        pix.height, pix.width, pix.n)[:, :, :3]


def to_gray_white(a):
    """统一成白底黑字的三通道图。"""
    if a.ndim == 2:
        a = np.stack([a] * 3, axis=-1)
    return a[:, :, :3]


def main():
    paper = pymupdf.open(PAPER)
    sua = pymupdf.open(SUA)

    panels = []      # (标签, ndarray)

    # 参照：宋体 己 / 已
    f = ImageFont.truetype(FONT, 300)
    for ch in "己已":
        img = Image.new("RGB", (340, 400), "white")
        ImageDraw.Draw(img).text((20, 30), ch, font=f, fill="black")
        panels.append((f"参照{ch}", np.array(img)))

    for pg, y, text, tag in PAPER_ITEMS:
        a = paper_char(paper, pg, y, text, 1)
        panels.append((f"{tag}", a))

    a = sua_char(sua, 1)
    if a is not None:
        panels.append(("8-21", a))

    # 统一高度 300，等比缩放
    TARGET_H = 300
    scaled = []
    for name, a in panels:
        a = to_gray_white(a)
        im = Image.fromarray(a)
        w = max(1, int(im.width * TARGET_H / im.height))
        im = im.resize((w, TARGET_H), Image.LANCZOS)
        scaled.append((name, np.array(im)))

    GAP = 24
    W = sum(a.shape[1] for _, a in scaled) + GAP * (len(scaled) - 1)
    cv = np.full((TARGET_H + 60, W, 3), 255, dtype=np.uint8)
    xo = 0
    lab = Image.new("RGB", (W, TARGET_H + 60), "white")
    d = ImageDraw.Draw(lab)
    lf = ImageFont.truetype(FONT, 26)
    for name, a in scaled:
        cv[60:60 + TARGET_H, xo:xo + a.shape[1]] = a
        d.text((xo + 4, 16), name, font=lf, fill="black")
        print(f"  {name}: {a.shape[1]}x{a.shape[0]}")
        xo += a.shape[1] + GAP
    Image.fromarray(cv).save(OUT)
    print("saved", OUT, cv.shape)


if __name__ == "__main__":
    main()
