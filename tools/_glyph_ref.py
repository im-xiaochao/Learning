# -*- coding: utf-8 -*-
"""用系统宋体渲染「己 / 已 / 巳 / 自」参照图，与 OCR 裁图并排比对。

判据（只在顶横之上那一小截笔画）：
  · `己`  顶横之上**无**笔画
  · `已`  顶横之上露出一小截竖
  · `巳`  整个「口」封死，顶横之上也无笔画，但底部是闭合的

书上的字是宋体，所以用 simsun.ttc 渲染，笔画形态才可比。

用法：python tools/_glyph_ref.py
"""
import io
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

FONT = "C:/Windows/Fonts/simsun.ttc"
OUT = "D:/Code/Learning/.workbuddy-ai/tmp/crops/glyph-ref.png"
SIZE = 200
CHARS = "己已巳自"


def main():
    f = ImageFont.truetype(FONT, SIZE)
    cells = []
    for ch in CHARS:
        img = Image.new("RGB", (SIZE + 40, SIZE + 60), "white")
        d = ImageDraw.Draw(img)
        d.text((20, 20), ch, font=f, fill="black")
        cells.append(np.array(img))
    GAP = 20
    H = max(c.shape[0] for c in cells)
    W = sum(c.shape[1] for c in cells) + GAP * (len(cells) - 1)
    cv = np.full((H, W, 3), 255, dtype=np.uint8)
    xo = 0
    for c in cells:
        cv[:c.shape[0], xo:xo + c.shape[1]] = c
        xo += c.shape[1] + GAP
    Image.fromarray(cv).save(OUT)
    print("参照图（左→右）：", "  ".join(CHARS))
    print("saved", OUT, cv.shape)


if __name__ == "__main__":
    main()
