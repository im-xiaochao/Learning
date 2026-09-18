# -*- coding: utf-8 -*-
"""渲染速刷本（排版稿）原页，核对 3 处形近字的**印面字形**。

速刷本是真排版稿（嵌入子集化字体、无图片对象），理论上文本层即印面。
但子集化字体若 ToUnicode 映射有误，会出现「提取到的字 ≠ 印面的字」——
这种错误是**孤立**的，正好符合「13 处 `自己` + 1 处 `自已`」的形态。
所以必须渲染出来看。

用法：python tools/_res3_render.py
"""
import io
import os
import sys

import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFont

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

PDF = r"C:/Users/imxia/Downloads/2026考研政治肖4肖8(1)/肖四肖八速刷/26肖八选择题速刷刷题本.pdf"
OUT = r"D:/Code/Learning/.workbuddy-ai/tmp/crops/res3.png"
FONT = r"C:/Windows/Fonts/msyh.ttc"

# (锚点串, 目标字在锚点后的偏移, 标签)
# 目标字即待判的那个字（`自` 之后 / `工` 之后 / `(` 之后）
ITEMS = [
    ("建立起自", 3, "题干21 建立[起]自?"),
    ("入类自古逐水而居", 0, "题干1 [入]类?"),
    ("加强对日益高涨", 5, "题干27 工[入]阶级?"),
]


def main():
    doc = pymupdf.open(PDF)
    panels = []

    # 参照：用系统字体渲染 己/已/人/入
    f = ImageFont.truetype(FONT, 200)
    ref = Image.new("RGB", (900, 300), "white")
    d = ImageDraw.Draw(ref)
    d.text((20, 30), "己 已 人 入", font=f, fill="black")
    panels.append(("参照 己 已 人 入（系统字体）", np.array(ref)))

    for anchor, off, tag in ITEMS:
        hit = None
        for pno in range(doc.page_count):
            page = doc[pno]
            for blk in page.get_text("dict")["blocks"]:
                for line in blk.get("lines", []):
                    s = "".join(sp["text"] for sp in line["spans"])
                    if anchor in s:
                        hit = (pno, line["bbox"], s)
                        break
                if hit:
                    break
            if hit:
                break
        if not hit:
            print(f"  {tag}: 锚点 {anchor!r} 未命中")
            continue
        pno, bbox, s = hit
        page = doc[pno]
        x0, y0, x1, y1 = bbox
        # 按字符序号切出目标字（排版稿等宽，按字数均分）
        n = len(s)
        i = s.index(anchor) + off
        cx = x0 + (x1 - x0) * i / n
        cw = (x1 - x0) / n
        clip = pymupdf.Rect(cx - cw * 1.2, y0 - 3, cx + cw * 2.2, y1 + 3)
        pix = page.get_pixmap(dpi=600, clip=clip)
        arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
            pix.height, pix.width, pix.n)[:, :, :3]
        print(f"  {tag}: p{pno+1}  行={s[:40]!r}  目标下标={i}")
        panels.append((f"{tag}  p{pno+1}", arr))

    # 竖向拼图
    H = 300
    scaled = []
    for name, a in panels:
        im = Image.fromarray(a)
        w = max(1, int(im.width * H / im.height))
        scaled.append((name, np.array(im.resize((w, H), Image.LANCZOS))))
    GAP = 20
    W = max(a.shape[1] for _, a in scaled) + 40
    cv = Image.new("RGB", (W, (H + 60) * len(scaled)), "white")
    dr = ImageDraw.Draw(cv)
    lf = ImageFont.truetype(FONT, 22)
    yo = 10
    for name, a in scaled:
        dr.text((20, yo), name, font=lf, fill="black")
        cv.paste(Image.fromarray(a), (20, yo + 34))
        yo += H + 60
    cv.save(OUT)
    print("saved", OUT, cv.size)


if __name__ == "__main__":
    main()
