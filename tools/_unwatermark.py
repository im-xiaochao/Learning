# -*- coding: utf-8 -*-
"""绕开水印层裁图（用于核对被「扫描全能王」二维码盖住的正文）

背景
----
肖四/肖八《答案解析》PDF 是扫描件，页面 = 扫描图（一个大 image xref）
+ 右下角二维码水印（另一个小 image xref，单独叠加）。
用 pymupdf 渲染页面会把水印一起画上，正文行尾被盖住。

做法：直接取**最大的那个 image**（扫描图层）的像素，按归一化坐标裁剪，
水印是独立对象，因此不会出现。

用法：
    python tools/_unwatermark.py <pdf> <页码1起> <y0> <y1> <out.png> [x0] [x1]

    y0/y1/x0/x1 均为 0~1000 的归一化坐标（相对页面），省略 x 则整幅宽。
"""
import sys

import numpy as np
import pymupdf
from PIL import Image


def main():
    pdf, pg = sys.argv[1], int(sys.argv[2])
    y0, y1 = float(sys.argv[3]), float(sys.argv[4])
    out = sys.argv[5]
    x0 = float(sys.argv[6]) if len(sys.argv) > 6 else 0.0
    x1 = float(sys.argv[7]) if len(sys.argv) > 7 else 1000.0

    d = pymupdf.open(pdf)
    page = d[pg - 1]

    # 找出「面积最大」的 image —— 那就是扫描图层
    infos = page.get_image_info(xrefs=True)
    if not infos:
        raise SystemExit("该页没有 image，可能是矢量页，直接用 crop_hi.py")
    big = max(infos, key=lambda i: i["width"] * i["height"])
    xref = big["xref"]
    bx0, by0, bx1, by1 = big["bbox"]

    pix = pymupdf.Pixmap(d, xref)
    arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if pix.n == 4:
        arr = arr[:, :, :3]

    H, W = pix.height, pix.width
    cy0 = max(0, int(H * y0 / 1000.0))
    cy1 = min(H, int(H * y1 / 1000.0))
    cx0 = max(0, int(W * x0 / 1000.0))
    cx1 = min(W, int(W * x1 / 1000.0))
    sub = arr[cy0:cy1, cx0:cx1]

    Image.fromarray(sub).save(out)
    print("saved %s  %dx%d  (扫描图 xref=%s %dx%d, 页面 bbox=%s)"
          % (out, sub.shape[1], sub.shape[0], xref, W, H,
             tuple(round(v) for v in (bx0, by0, bx1, by1))))


if __name__ == "__main__":
    main()
