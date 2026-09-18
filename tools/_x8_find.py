# -*- coding: utf-8 -*-
"""在**原始 d250 像素空间**里定位字串，输出可直接喂给 `_stack_crops.py` 的清单。

为什么不用 `_x8_find.py` 的归一化 y：归一化分母是 OCR 内容高度，而裁图用的
`page.get_image_info()[0].bbox` 是整幅扫描图（含页边距）。两者不等高，
误差随 y 线性放大——页面上部差不到半行，页面底部能差 2 行（踩过）。
原始像素 y 配 `dpi` 换算 `y_pt = y * 72 / dpi` 是精确的。

用法：
    python tools/_x8_find.py 同仇敌屹 心无旁骜 ...      # 打印
    python tools/_x8_find.py --list out.txt 同仇敌屹 ...  # 写成清单
"""
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DPI = 250
ROWS = os.path.join(ROOT, ".workbuddy-ai/tmp/rows/x8-d250.jsonl")
pages = {}
for line in io.open(ROWS, encoding="utf-8"):
    d = json.loads(line)
    pages[d["page"]] = d["rows"]

args = sys.argv[1:]
out_path = None
if args and args[0] == "--list":
    out_path = args[1]
    args = args[2:]

lines = []
for needle in args:
    hits = [(pg, r) for pg in sorted(pages) for r in pages[pg] if needle in r["text"]]
    print("--- %r  %d 处" % (needle, len(hits)))
    for pg, r in hits:
        print("    p%-3d y=%7.1f  %s" % (pg, r["y"], r["text"][:76]))
        lines.append("%d %.1f %d" % (pg, r["y"], DPI))

if out_path:
    io.open(out_path, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("\n清单已写 %s（%d 行）" % (out_path, len(lines)))
