# -*- coding: utf-8 -*-
"""对官方《8套卷》的目标页重跑 OCR，拿**精确行框**，再按印刷体等宽模型裁出目标字。

为什么要重跑：`rows/x8-d*.jsonl` 只存了 `y/x0/text`，没有 bbox。之前用
「x0 + 估算行宽」插值定位，因为把半角逗号按 0.5 字宽算（印刷体其实是全角占位），
下标整体偏移，裁出来的窗口老是切到邻字。

这次的做法：
  1. 渲染整页为图像；
  2. OCR 拿到目标行的**精确行框**（四点多边形）；
  3. 按「每个字符等宽」均分（印刷体中文正文里 ASCII 标点也是全角占位）；
  4. 从**同一张图像**裁出目标字 → 零换算误差。

用法：
    python tools/_self_ocr.py
"""
import io
import sys

import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFont
from rapidocr_onnxruntime import RapidOCR

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

PAPER = "C:/Users/imxia/Downloads/2026考研政治肖4肖8(1)/26肖秀荣《8套卷》.pdf"
FONT = "C:/Windows/Fonts/simsun.ttc"
OUT = ".workbuddy-ai/tmp/crops/self-ocr.png"
DPI = 600

# (页, 行锚点, 该行在 250dpi 空间的 y, 标签)
# 锚点选**不含目标字**的稳定片段——这样即使目标字被 OCR 读错也能定位到行。
# p60 上同时有 `自已`(6-34) 和 `自己手中。` —— 同一页、同一扫描件、同一字体，
# 是最干净的同源对照：两处字形的差异只可能来自字本身。
#
# 只渲染目标行附近的窄带再高 dpi OCR：整页 600dpi 会超沙箱内存
# （记过这条：300dpi 都可能 bad allocation）。
ITEMS = [
    (60, "前途命运", 608.0, "6-34 待判"),
    (60, "自己手中", 1358.5, "参照 自己(同页)"),
    (63, "把腰", 239.0, "6-37 待判"),
    (82, "确立为", 945.0, "参照 自己(p82)"),
]
SRC_DPI = 250       # rows 的坐标空间


def ref_glyph(ch, size=300):
    f = ImageFont.truetype(FONT, size)
    img = Image.new("RGB", (400, 420), "white")
    ImageDraw.Draw(img).text((60, 40), ch, font=f, fill="black")
    return np.array(img)


def main():
    engine = RapidOCR()
    doc = pymupdf.open(PAPER)
    panels = [("渲染 己", ref_glyph("己")), ("渲染 已", ref_glyph("已"))]

    for pg, anchor, y250, tag in ITEMS:
        page = doc[pg - 1]
        r = page.rect
        yc = r.y0 + y250 * 72.0 / SRC_DPI
        # 窄带：整页宽 × 约 40pt 高（够两行）
        pix = page.get_pixmap(dpi=DPI, clip=pymupdf.Rect(r.x0, yc - 16, r.x1, yc + 26))
        arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
            pix.height, pix.width, pix.n)[:, :, :3]
        res, _ = engine(arr)
        if not res:
            print(f"{tag}: p{pg} OCR 无结果")
            continue
        hit = None
        for box, text, score in res:
            if anchor in text:
                hit = (np.array(box, dtype=float), text)
                break
        if hit is None:
            print(f"{tag}: p{pg} 未找到锚点 {anchor!r}")
            continue
        box, text = hit
        s = text.replace(" ", "")
        k = s.find("自")
        if k < 0:
            print(f"{tag}: 行内没有「自」: {text!r}")
            continue
        # 行框：取四点的 x 范围与 y 范围
        xs, ys = box[:, 0], box[:, 1]
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        cw = (x1 - x0) / len(s)
        # 目标字 = 「自」后面那个字
        cx0 = x0 + k * cw
        cx1 = cx0 + cw * 2          # 连「自」一起裁，方便对照
        a = arr[int(max(0, y0)):int(y1), int(max(0, cx0)):int(cx1)]
        if a.size == 0:
            print(f"{tag}: 裁窗为空")
            continue
        panels.append((tag, a))
        print(f"{tag}: p{pg} 行={text[:44]!r}")
        print(f"    「自」下标 {k}  行框 x {x0:.0f}~{x1:.0f}  字宽 {cw:.1f}  → 裁图 {a.shape[1]}x{a.shape[0]}")

    # 拼图：统一高度
    TH = 200
    scaled = []
    for name, a in panels:
        im = Image.fromarray(a)
        w = max(1, int(im.width * TH / im.height))
        scaled.append((name, np.array(im.resize((w, TH), Image.LANCZOS))))
    GAP = 24
    W = sum(a.shape[1] for _, a in scaled) + GAP * (len(scaled) - 1) + 20
    cv = Image.new("RGB", (W, TH + 74), "white")
    d = ImageDraw.Draw(cv)
    lf = ImageFont.truetype(FONT, 22)
    xo = 10
    for name, a in scaled:
        cv.paste(Image.fromarray(a), (xo, 60))
        d.text((xo, 22), name, font=lf, fill="black")
        d.rectangle([xo - 1, 59, xo + a.shape[1], 60 + TH], outline=(215, 215, 215))
        xo += a.shape[1] + GAP
    cv.save(OUT)
    print("saved", OUT, cv.size)


if __name__ == "__main__":
    main()
