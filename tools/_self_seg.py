# -*- coding: utf-8 -*-
"""按「列墨迹投影」把整行切成单字，逐字测**顶行墨迹跨度**，判定 己 / 已。

判据（已用系统字体渲染参照标定，7.7 倍分离）
--------------------------------------------
  · 己 (U+5DF1)：竖笔**不出头** → 最顶那几行墨迹就是那条**宽顶横** → 跨度 ≈ 0.83
  · 已 (U+5DF2)：竖笔**出头**   → 最顶那几行只有**竖笔尖**     → 跨度 ≈ 0.11
  · 巳 (U+5DF3)：封口           → 顶部也是宽横，但左侧闭合

所以「顶行跨度」是 己/已 的干净判据：宽 = 己，窄 = 已。

为什么用投影分割而不是按字数插值
--------------------------------
印刷体里 ASCII 标点也是**全角占位**，按字数插值必然偏移（前几版就栽在这）。
投影分割不依赖任何字宽模型——直接看像素。

用法：python tools/_self_seg.py [页 [y]]
"""
import io
import json
import os
import sys

import numpy as np
import pymupdf

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAPER = "C:/Users/imxia/Downloads/2026考研政治肖4肖8(1)/26肖秀荣《8套卷》.pdf"
ROWS = os.path.join(ROOT, ".workbuddy-ai/tmp/rows/x8-d250.jsonl")

DPI = 400
SRC_DPI = 250          # rows 的 y 是这一跑的原始像素空间
INK = 150              # 二值化阈值
GAP = 2                # 列墨迹间隔 ≥ 它才算字间空隙（400dpi 下汉字间距约 3~8px）
TOP_ROWS = 6           # 「顶行」取最上面几行墨迹


def load_rows():
    pages = {}
    for line in io.open(ROWS, encoding="utf-8"):
        line = line.strip()
        if line:
            d = json.loads(line)
            pages[d["page"]] = d["rows"]
    return pages


def segments(mask):
    """按列墨迹把行切成字符段，返回 [(x0, x1)]。"""
    col = mask.sum(axis=0)
    on = col > 0
    segs = []
    x = 0
    n = len(on)
    while x < n:
        if not on[x]:
            x += 1
            continue
        x0 = x
        gap = 0
        while x < n:
            if on[x]:
                gap = 0
            else:
                gap += 1
                if gap >= GAP:
                    break
            x += 1
        segs.append((x0, x - gap))
    return segs


def top_span(mask, x0, x1):
    """顶行墨迹跨度 / 字宽。"""
    sub = mask[:, x0:x1]
    rows = np.nonzero(sub.sum(axis=1) > 0)[0]
    if len(rows) == 0:
        return 0.0, 0.0
    top = rows[0]
    band = sub[top:top + TOP_ROWS, :]
    cols = np.nonzero(band.sum(axis=0) > 0)[0]
    if len(cols) == 0:
        return 0.0, 0.0
    span = (cols[-1] - cols[0] + 1) / float(x1 - x0)
    height = (rows[-1] - rows[0] + 1)
    return span, height


def main():
    pages = load_rows()
    want_pg = int(sys.argv[1]) if len(sys.argv) > 1 else None
    want_y = float(sys.argv[2]) if len(sys.argv) > 2 else None

    doc = pymupdf.open(PAPER)
    targets = []
    for pg in sorted(pages):
        for r in pages[pg]:
            if "自已" in r["text"] or "自己" in r["text"]:
                targets.append((pg, r["y"], r["text"]))

    for pg, y, text in targets:
        if want_pg and pg != want_pg:
            continue
        if want_y and abs(y - want_y) > 1:
            continue
        page = doc[pg - 1]
        r = page.rect
        yc = r.y0 + y * 72.0 / SRC_DPI
        clip = pymupdf.Rect(r.x0 + r.width * 0.04, yc - 13,
                            r.x0 + r.width * 0.96, yc + 13)
        pix = page.get_pixmap(dpi=DPI, clip=clip)
        arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
            pix.height, pix.width, pix.n)[:, :, :3]
        gray = arr.mean(axis=2)
        mask = gray < INK
        segs = segments(mask)
        print(f"\n=== p{pg} y={y:.1f}   {text[:70]!r}")
        print(f"    段数 {len(segs)}   行高 {mask.shape[0]}px")
        # 逐段测
        rows = []
        for i, (x0, x1) in enumerate(segs):
            sp, h = top_span(mask, x0, x1)
            rows.append((i, x0, x1, x1 - x0, sp, h))
        # 找出所有「宽顶」段（可能是 己/自/百/... ）
        print("    顶行跨度 > 0.55 的段（宽顶横）：")
        for i, x0, x1, w, sp, h in rows:
            if sp > 0.55:
                print(f"      #{i:2d}  x={x0:4d}-{x1:4d} w={w:3d}  "
                      f"top={sp:.2f}  h={h}")
        # 标出含 自 的位置：自 也有宽顶
        print("    全部段：")
        line = "  ".join(f"{i}:{sp:.2f}" for i, _, _, _, sp, _ in rows)
        print("      " + line)
        # 与 OCR 文本对齐（按段数截断/补齐）
        n = min(len(segs), len(text))
        print("    段 ↔ 字 对齐（前 %d）：" % n)
        pairs = []
        for i in range(n):
            pairs.append(f"{text[i]}:{rows[i][4]:.2f}")
        print("      " + " ".join(pairs))


if __name__ == "__main__":
    main()
