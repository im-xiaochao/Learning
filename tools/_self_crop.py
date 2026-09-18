# -*- coding: utf-8 -*-
"""裁出三处 `自已` 的原图，竖向拼成一张，供人眼定夺是「己」还是「已」。

三处来源不同，定位方式也不同：

  · 6-34 / 6-37 在《8套卷》试卷（**纯扫描件**，无文本层）——先用 d250 原始像素
    空间的 y 定位到行，再按「行内字符序号」估算目标字所在的横向位置：
    取该行墨迹的左右边界，除以去空白后的字数得到字宽，从而裁到目标字 ±6 字。
    直接裁整行会得到 4000+ px 宽的图，缩放到屏幕上看不清笔画。
  · 8-21 在《选择题速刷刷题本》（**排版稿**，有文本层）——直接用 PDF 给出的
    行 bbox，无需估算。

用法：python tools/_self_crop.py
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
OUT = "D:/Code/Learning/.workbuddy-ai/tmp/crops/self.png"

DPI = 250          # 试卷 OCR 行坐标所属的 dpi
HALF = 16           # 行上下各取多少像素（d250 空间）
WIN = 3            # 目标字左右各取多少字
CJK_RANGE = (0x4E00, 0x9FFF)

# (页码, d250 的 y, 该行 OCR 原文, 目标字在该行中的序号)
PAPER_ITEMS = [
    (60, 608.0, "步,百折不挠为自已的前途命运而奋斗。”习近平总书记的重要论断,揭示了中华民族在直面", None),
    (63, 239.0, "会做几十张、几百张,我犯小错误，下面就会犯大错误。当领导的要先把自已的手洗净,把腰", None),
]


def ink_bounds(arr):
    """返回墨迹的左右边界列号（黑像素阈值 128）。"""
    dark = (arr[:, :, 0] < 128).sum(axis=0)
    cols = np.nonzero(dark > 0)[0]
    return (int(cols[0]), int(cols[-1])) if len(cols) else (0, arr.shape[1] - 1)


def crop_paper_line(doc, pg, y, text):
    """按字符序号裁到 `自已` 附近。"""
    p = doc[pg - 1]
    ib = p.get_image_info()[0]["bbox"]
    W = ib[2] - ib[0]
    c = ib[1] + y * 72.0 / DPI
    full = pymupdf.Rect(ib[0], c - HALF, ib[2], c + HALF)
    pix = p.get_pixmap(dpi=600, clip=full)
    a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
        pix.height, pix.width, pix.n)[:, :, :3]

    x0, x1 = ink_bounds(a)
    chars = [ch for ch in text if not ch.isspace()]
    idx = text.replace(" ", "").find("自已")
    n = len(chars)
    if n == 0 or idx < 0:
        print(f"  ⚠️ p{pg} 无法定位「自已」")
        return None
    cw = (x1 - x0) / n                      # 估算字宽
    mid = x0 + (idx + 1) * cw               # 「自已」的中心
    lo = max(0, int(mid - WIN * cw))
    hi = min(a.shape[1], int(mid + WIN * cw))
    print(f"  试卷 p{pg} y={y:.0f}  行内序号 {idx}/{n}  字宽≈{cw:.1f}px  "
          f"裁 [{lo},{hi}]")
    return a[:, lo:hi]


def crop_sua_line(doc):
    p = doc[57]                             # 第 58 页（1 起）
    hit = None
    for b in p.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            s = "".join(sp["text"] for sp in l["spans"])
            if "建立起自" in s:
                hit = (s, l["bbox"])
    if not hit:
        print("  ⚠️ 速刷本未找到目标行")
        return None
    s, bb = hit
    x0 = bb[0] + (bb[2] - bb[0]) * 0.865     # 行尾那一段
    r = pymupdf.Rect(x0, bb[1] - 2, bb[2], bb[3] + 2)
    pix = p.get_pixmap(dpi=600, clip=r)
    a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
        pix.height, pix.width, pix.n)[:, :, :3]
    print(f"  速刷本 p58  {a.shape}  原文尾={s[-20:]!r}")
    return a


def main():
    paper = pymupdf.open(PAPER)
    sua = pymupdf.open(SUA)
    strips = []
    for pg, y, text, _ in PAPER_ITEMS:
        a = crop_paper_line(paper, pg, y, text)
        if a is not None:
            strips.append(a)
    a = crop_sua_line(sua)
    if a is not None:
        strips.append(a)

    W = max(s.shape[1] for s in strips)
    GAP = 16
    H = sum(s.shape[0] for s in strips) + GAP * (len(strips) - 1)
    cv = np.full((H, W, 3), 255, dtype=np.uint8)
    yo = 0
    for s in strips:
        cv[yo:yo + s.shape[0], :s.shape[1]] = s
        yo += s.shape[0] + GAP
    Image.fromarray(cv).save(OUT)
    print("saved", OUT, cv.shape)


if __name__ == "__main__":
    main()
