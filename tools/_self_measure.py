# -*- coding: utf-8 -*-
"""己 / 已 的**客观**判别。

判据
----
两字唯一区别是左侧竖笔是否出头到顶横之上，因此**最上方几行的墨迹跨度**截然不同：
  · `己`  最上方就是顶横本身 → 顶行墨迹横跨字宽的 60%~100%
  · `已`  最上方是竖笔尖   → 顶行墨迹只占字宽的 10%~25%

取「最上方 6% 高度内的墨迹列跨度 / 字宽」作特征，用**渲染的参照字形**标定分界，
再拿它去判扫描件里的字形。比「三跑 OCR 投票」可靠得多——OCR 在低分辨率下
极易把这两个字读混（实测同一行三跑给出 2:1 的矛盾结果）。

定位要点
--------
OCR 行只给整行的 x0/x1，没有逐字框。按「等宽字符均分」估位置会**被半角标点带偏**
（行里的 `,` 是 ASCII，实际只占半字宽）。所以这里用**宽度感知**的字宽单位：
汉字 = 1.0、ASCII 标点/数字/字母 = 0.5，再按总单位数换算像素。

用法：python tools/_self_measure.py
"""
import io
import sys

import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFont

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

PAPER = "C:/Users/imxia/Downloads/2026考研政治肖4肖8(1)/26肖秀荣《8套卷》.pdf"
FONT = "C:/Windows/Fonts/simsun.ttc"
DPI = 250          # 扫描件 OCR 用的 d250 坐标空间
CROP_DPI = 900
HALF = 7           # 上下各取 7pt（约一行高，避免串到邻行）
MARGIN = 0.10      # 左右各留 0.10 字宽（只为了不切掉目标字本身）

# (页码, y(d250), 行文本, 目标字在「去空白后」的下标, 标签)
ITEMS = [
    (50, 767.5, "作,靠能力更靠作风。把自己当作群众的一员,把群众的事当作自己的事,才能抽丝剥茧,把",
     11, "参照 自己(p50)"),
    (82, 945.0, "为中国人民谋幸福、为中华民族谋复兴确立为自己的初心和使命,点亮了实现中华民族伟大",
     21, "参照 自己(p82)"),
    (60, 608.0, "步,百折不挠为自已的前途命运而奋斗。”习近平总书记的重要论断,揭示了中华民族在直面",
     8, "待判 6-34"),
    (63, 239.0, "会做几十张,几百张,我犯小错误,下面就会犯大错误。当领导的要先把自已的手洗净,把腰",
     33, "待判 6-37"),
]


def unit_w(ch: str) -> float:
    """字宽单位：汉字/全角 = 1.0，ASCII = 0.5。"""
    return 0.5 if ord(ch) < 128 else 1.0


def measure(a):
    """量一张只含目标字的图，返回 (字宽, 字高, 顶行跨度比, 出头比)。"""
    dark = a[:, :, 0] < 140
    rows = np.nonzero(dark.any(axis=1))[0]
    cols = np.nonzero(dark.any(axis=0))[0]
    if not len(rows) or not len(cols):
        return None
    sub = dark[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1]
    H, W = sub.shape
    if H < 20 or W < 10:
        return None
    band = max(1, int(round(H * 0.06)))
    top = sub[:band, :]
    tcols = np.nonzero(top.any(axis=0))[0]
    top_span = (int(tcols[-1]) - int(tcols[0]) + 1) / float(W) if len(tcols) else 0.0

    rowink = sub.sum(axis=1) / float(W)
    any_r = np.nonzero(rowink > 0.02)[0]
    wide_r = np.nonzero(rowink > 0.35)[0]
    prot = (int(wide_r[0]) - int(any_r[0])) / float(H) if len(any_r) and len(wide_r) else -1.0
    return {"W": W, "H": H, "aspect": W / float(H), "top_span": top_span, "protrusion": prot}


def crop_nth(a, text, idx):
    dark = (a[:, :, 0] < 128).sum(axis=0)
    cols = np.nonzero(dark > 0)[0]
    x0, x1 = (int(cols[0]), int(cols[-1])) if len(cols) else (0, a.shape[1] - 1)
    chars = [c for c in text if not c.isspace()]
    units = [unit_w(c) for c in chars]
    total = sum(units)
    cw = (x1 - x0) / total                      # 一个汉字宽多少像素
    left = sum(units[:idx]) * cw
    right = (sum(units[:idx]) + units[idx]) * cw
    lo = int(x0 + left - MARGIN * cw)
    hi = int(x0 + right + MARGIN * cw)
    return a[:, max(0, lo):min(a.shape[1], hi)]


def paper_crop(doc, pg, y, text, idx):
    p = doc[pg - 1]
    ib = p.get_image_info()[0]["bbox"]
    c = ib[1] + y * 72.0 / DPI
    pix = p.get_pixmap(dpi=CROP_DPI, clip=pymupdf.Rect(ib[0], c - HALF, ib[2], c + HALF))
    a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
        pix.height, pix.width, pix.n)[:, :, :3]
    return crop_nth(a, text, idx)


def ref_glyph(ch, size=320):
    f = ImageFont.truetype(FONT, size)
    img = Image.new("RGB", (420, 480), "white")
    ImageDraw.Draw(img).text((30, 40), ch, font=f, fill="black")
    return np.array(img)


def main():
    doc = pymupdf.open(PAPER)
    panels = [("参照 己", ref_glyph("己")), ("参照 已", ref_glyph("已"))]
    for pg, y, text, idx, tag in ITEMS:
        panels.append((tag, paper_crop(doc, pg, y, text, idx)))

    print(f"{'标签':<18}{'字宽':>6}{'字高':>6}{'宽高比':>8}{'顶行跨度':>10}{'出头':>8}")
    print("-" * 58)
    for name, a in panels:
        m = measure(a)
        if m is None:
            print(f"{name:<18}  测量失败")
            continue
        print(f"{name:<18}{m['W']:>6}{m['H']:>6}{m['aspect']:>8.2f}"
              f"{m['top_span']:>10.3f}{m['protrusion']:>8.3f}")


if __name__ == "__main__":
    main()
