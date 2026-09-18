# -*- coding: utf-8 -*-
"""把材料题的整段正文按「连续行带」裁出来，供全量目视校对。

两个坑
------
1. **行位置必须取三跑并集。** 单次 OCR 会随机漏行（d250 在 p9 就漏了
   `给,让科普服务普惠共享。从许许多多的应用情形看…` 整行）。若按某一跑的 y 逐行裁，
   漏掉的行在图上直接消失，校对时看不见也就发现不了。这里把三跑的行都换算成 pt
   后取并集，保证每一行都落在某个带里。
2. **各跑的 y 是独立像素空间。** 必须用 `y * 72 / 该跑 dpi` 换算，不能按
   `y / maxy * 页高`（页脚不是每次都检出，maxy 不可比，会整体偏移约 50 个归一化单位）。

用法：
    python tools/_x8_bands.py <pdf> <out_dir> <套号...> -- <rows1.jsonl> <rows2.jsonl> ...
"""
import io
import json
import os
import re
import sys

import numpy as np
import pymupdf
from PIL import Image

args = sys.argv[1:]
sep = args.index("--")
PDF, OUT = args[0], args[1]
SETS = [int(x) for x in args[2:sep]] or list(range(1, 9))
ROWFILES = args[sep + 1:]
PER = 18
DPI = 380

PAGE_SET = {}
for _s, (_a, _b) in enumerate(
        [(8, 11), (18, 21), (28, 31), (38, 42), (49, 53), (60, 63), (70, 73), (80, 83)], start=1):
    for _p in range(_a, _b + 1):
        PAGE_SET[_p] = _s

# 三跑并集：页 → 排序去重后的 (pt, text)
bypage = {}
for f in ROWFILES:
    m = re.search(r"-d(\d+)", os.path.basename(f))
    odpi = float(m.group(1)) if m else 250.0
    for line in io.open(f, encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        pg = d["page"]
        for r in d["rows"]:
            bypage.setdefault(pg, []).append((r["y"] * 72.0 / odpi, r["text"]))
for pg in bypage:
    bypage[pg].sort()
    merged = []
    for pt, t in bypage[pg]:
        if merged and pt - merged[-1][0] < 5:
            if len(t) > len(merged[-1][1]):
                merged[-1] = (merged[-1][0], t)
            continue
        merged.append((pt, t))
    bypage[pg] = merged

doc = pymupdf.open(PDF)
os.makedirs(OUT, exist_ok=True)
manifest = []
for s in SETS:
    sel = []
    started = False
    for p in sorted(p for p, ss in PAGE_SET.items() if ss == s):
        for pt, t in bypage.get(p, []):
            if re.match(r"^\s*34\s*[.．、。,，]", t):
                started = True
            if started:
                sel.append((p, pt, t))
    for gi in range(0, len(sel), PER):
        grp = sel[gi:gi + PER]
        blocks = []
        for p in sorted({g[0] for g in grp}):
            pts = [g[1] for g in grp if g[0] == p]
            page = doc[p - 1]
            ib = page.get_image_info()[0]["bbox"]
            pix = page.get_pixmap(dpi=DPI, clip=pymupdf.Rect(
                ib[0], min(pts) - 9, ib[2], max(pts) + 14))
            blocks.append(np.frombuffer(pix.samples, dtype=np.uint8)
                          .reshape(pix.height, pix.width, pix.n)[:, :, :3])
        W = max(a.shape[1] for a in blocks)
        H = sum(a.shape[0] for a in blocks) + 10 * (len(blocks) - 1)
        canvas = np.full((H, W, 3), 255, dtype=np.uint8)
        yo = 0
        for a in blocks:
            canvas[yo:yo + a.shape[0], :a.shape[1]] = a
            yo += a.shape[0] + 10
        path = os.path.join(OUT, "s%d-%02d.png" % (s, gi // PER + 1))
        Image.fromarray(canvas).save(path)
        manifest.append((path, grp))

print("共 %d 张图" % len(manifest))
for path, grp in manifest:
    print("%s  p%s..p%s" % (os.path.basename(path), grp[0][0], grp[-1][0]))
