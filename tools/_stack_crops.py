# -*- coding: utf-8 -*-
"""把若干「可疑行」逐行裁出来，竖向拼成一张长图，供人工一次判读多处。

为什么要拼图：可疑行散布在 30 多页里，一页一图要读 80 多张；而每一处只需要
**一行**的宽度就能判（错字都能在本行内找到上下文）。竖向拼接后一张图能放 10 行，
读图次数降一个数量级。

合成为什么用 numpy 而不是 `Pixmap.copy`
---------------------------------------
`Pixmap.copy(src, irect)` 在 RGB（无 alpha）目标上会把源整块**丢掉**：
实测 10 条带里只有 3 条落了像素，其余全白，且不报错。逐条按数组贴图没有这个问题。

用法：
    python tools/_stack_crops.py <清单txt> <pdf> <out_dir> [每图行数] [半高pt]
清单每行：`<页码> <原始y> <ocr_dpi>`
"""
import io
import os
import sys

import numpy as np
import pymupdf
from PIL import Image

PDF, OUT = sys.argv[2], sys.argv[3]
PER = int(sys.argv[4]) if len(sys.argv) > 4 else 10
HALF = float(sys.argv[5]) if len(sys.argv) > 5 else 17.0
DPI = 380

items = []
for line in io.open(sys.argv[1], encoding="utf-8"):
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    pg, y, od = line.split()
    items.append((int(pg), float(y), float(od)))


def to_arr(pix):
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)


doc = pymupdf.open(PDF)
os.makedirs(OUT, exist_ok=True)
made = []
for gi in range(0, len(items), PER):
    grp = items[gi:gi + PER]
    strips = []
    for pg, y, od in grp:
        page = doc[pg - 1]
        ib = page.get_image_info()[0]["bbox"]
        c = ib[1] + y * 72.0 / od
        pix = page.get_pixmap(dpi=DPI, clip=pymupdf.Rect(ib[0], c - HALF, ib[2], c + HALF))
        strips.append(to_arr(pix)[:, :, :3])
    W = max(s.shape[1] for s in strips)
    H = sum(s.shape[0] for s in strips) + 8 * (len(strips) - 1)
    canvas = np.full((H, W, 3), 255, dtype=np.uint8)
    yo = 0
    for s in strips:
        canvas[yo:yo + s.shape[0], :s.shape[1]] = s
        yo += s.shape[0] + 8
    path = os.path.join(OUT, "stack-%02d.png" % (gi // PER + 1))
    Image.fromarray(canvas).save(path)
    made.append((path, grp))

print("共 %d 行 → %d 张图" % (len(items), len(made)))
for path, grp in made:
    print("  %s : %s" % (os.path.basename(path),
                         ", ".join("p%d@%.0f" % (a, b) for a, b, _ in grp)))
