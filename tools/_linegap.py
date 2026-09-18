# -*- coding: utf-8 -*-
"""
行距缺口探测器：找出「某一页里相邻两行之间的垂直间距异常大于本页行距中位数」的位置。

原理
----
排版稿每页的行距是均匀的。OCR / 文本层如果漏检一整行，页面上就会出现一个
≈2 倍行距的空档。用「本页行距中位数 × 阈值」作判据即可定位漏行位置，
再据此裁图人工补录。

用法
----
  # 文本层（肖八答案解析 PDF 自带 OCR 文本层）
  python tools/_linegap.py text  "<pdf>" [阈值]

  # OCR 行（肖四答案解析没有可用文本层，走 .workbuddy-ai/tmp/rows/*.jsonl）
  python tools/_linegap.py rows  "<rows.jsonl>" [阈值]

阈值默认 1.7。
"""
import sys
import os
import glob
import json
import io
import statistics
import re

import pymupdf


STRUCT = (
    "套卷答案及解析",
    "答案及解析",
    "分册",
    "增值服务",
    "作者简介",
    "肖秀荣考研系列",
    "图书答疑",
    "微信小程序",
    "扫描下方",
    "国开乐学",
    "正版书",
    "上架建议",
    "定价",
    "ISBN",
    "知识图谱",
    "考点预测",
    "终极预测",
    "CS扫描全能王",
    "扫描APP",
    "回开研学",
)


def is_struct(t):
    t = t.strip()
    if not t:
        return True
    if t.isdigit():                       # 页码 / 页眉数字
        return True
    if len(t) <= 3 and not any("\u4e00" <= c <= "\u9fff" for c in t):
        return True
    if any(k in t for k in STRUCT):
        return True
    if re.match(r"^\s*[一二三]\s*、\s*(单项选择|多项选择|材料分析)题", t):
        return True
    return False


def scan_lines(rows_per_page, thr, label, show_struct=False):
    """rows_per_page: [(page, [(y, text), ...]), ...]"""
    total = 0
    for page, rows in rows_per_page:
        rows = sorted(rows, key=lambda r: r[0])
        if len(rows) < 5:
            continue
        gaps = [rows[i + 1][0] - rows[i][0] for i in range(len(rows) - 1)]
        gaps = [g for g in gaps if g > 0]
        if len(gaps) < 4:
            continue
        med = statistics.median(gaps)
        if med <= 0:
            continue
        for i in range(len(rows) - 1):
            g = rows[i + 1][0] - rows[i][0]
            if g > med * thr:
                structural = is_struct(rows[i][1]) or is_struct(rows[i + 1][1])
                if structural and not show_struct:
                    continue
                total += 1
                print(f'[{label}] p{page}  缺口 {g:.0f}（本页行距中位数 {med:.0f}，≈{g / med:.1f} 倍）')
                print(f'        上一行: {rows[i][1][:60]!r}')
                print(f'        下一行: {rows[i + 1][1][:60]!r}')
    print(f'\n[{label}] 共 {total} 处疑似漏行（结构行{"含" if show_struct else "已滤"}）')


def from_text(pdf_path, thr):
    d = pymupdf.open(pdf_path)
    out = []
    for i, page in enumerate(d):
        dic = page.get_text("dict")
        rows = []
        for blk in dic.get("blocks", []):
            for ln in blk.get("lines", []):
                txt = "".join(sp.get("text", "") for sp in ln.get("spans", [])).strip()
                if not txt:
                    continue
                rows.append((ln["bbox"][1], txt))
        out.append((i + 1, rows))
    scan_lines(out, thr, os.path.basename(pdf_path))


def from_rows(pattern, thr):
    for f in sorted(glob.glob(pattern)):
        out = []
        for ln in io.open(f, encoding="utf-8"):
            ln = ln.strip()
            if not ln:
                continue
            r = json.loads(ln)
            out.append((r["page"], [(x["y"], x["text"]) for x in r.get("rows", [])]))
        scan_lines(out, thr, os.path.basename(f))


if __name__ == "__main__":
    mode = sys.argv[1]
    target = sys.argv[2]
    thr = float(sys.argv[3]) if len(sys.argv) > 3 else 1.7
    if mode == "text":
        from_text(target, thr)
    else:
        from_rows(target, thr)
