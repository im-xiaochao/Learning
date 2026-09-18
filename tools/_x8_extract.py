# -*- coding: utf-8 -*-
"""抽取肖八的三个文本源，带页标记落盘。

三个源：
  suashua  肖八选择题速刷刷题本.pdf  —— 排版稿，有文本层 → 客观题题干 + 选项（最干净）
  ans      肖秀荣《8套卷》答案解析.pdf —— 有文本层 → 全部答案 + 解析 + 材料题参考答案
  paper    肖秀荣《8套卷》.pdf        —— 扫描件，无文本层 → 只用来补材料题的「材料 + 问题」

用法：python tools/_x8_extract.py
"""
import os
import sys

import pymupdf

BASE = r"C:\Users\imxia\Downloads\2026考研政治肖4肖8(1)"
SRC = {
    "suashua": os.path.join(BASE, "肖四肖八速刷", "26肖八选择题速刷刷题本.pdf"),
    "ans": os.path.join(BASE, "26肖秀荣《8套卷》答案解析.pdf"),
    "paper": os.path.join(BASE, "26肖秀荣《8套卷》.pdf"),
}
OUT = {
    "suashua": r"D:\Code\Learning\tools\_x8-suashua.txt",
    "ans": r"D:\Code\Learning\tools\_x8-answers.txt",
}


def dump(key, path):
    doc = pymupdf.open(path)
    lines = []
    for i in range(doc.page_count):
        lines.append(f"@@@PAGE {i + 1}")
        t = doc[i].get_text()
        if t.strip():
            lines.append(t.rstrip("\n"))
        else:
            lines.append("(本页无文字层)")
    doc.close()
    with open(OUT[key], "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")
    print(f"{key:8s} → {OUT[key]}  ({len(lines)} 行)")


def probe(key, path):
    """paper 是扫描件，只统计信息、不落盘。"""
    doc = pymupdf.open(path)
    withtext = [i + 1 for i in range(doc.page_count) if doc[i].get_text().strip()]
    print(f"{key:8s}   {doc.page_count} 页，有文本层的页：{withtext or '无（纯扫描）'}")
    doc.close()


for k in ("suashua", "ans"):
    if not os.path.exists(SRC[k]):
        sys.exit(f"缺少源文件：{SRC[k]}")
    dump(k, SRC[k])
probe("paper", SRC["paper"])
