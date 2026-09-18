"""
把张宇《基础30讲》扫描件的指定页渲染成 PNG，供人工/多模态核对。

背景：三本书都是**纯扫描件**（每页 0 文本、1 张图），本机没有 tesseract，
所以走「渲染成图 → 直接看图」这条路。渲染结果落在 .tmp-pdf/ 下。

用法：
  python tools/_pdf_render.py list                      # 列出三本书与页数
  python tools/_pdf_render.py render 高数 1-6           # 渲染高数第 1~6 页
  python tools/_pdf_render.py render 概率 12 15 20      # 指定若干页
  python tools/_pdf_render.py toc 高数                  # 渲染每本书前 12 页（找目录）

页码是 PDF 物理页（1 起），不是书上印的页码。
"""
import os
import re
import sys
from pathlib import Path

import pymupdf

pymupdf.TOOLS.mupdf_display_errors(False)  # 扫描件里的注释对象会刷一堆无意义的警告

BOOKS = {
    '高数': r'C:\Users\imxia\Downloads\27张宇《基础30讲》\27张宇基础30讲（高数）.pdf',
    '线代': r'C:\Users\imxia\Downloads\27张宇《基础30讲》\27张宇基础30讲线代.pdf',
    '概率': r'C:\Users\imxia\Downloads\27张宇《基础30讲》\27张宇基础30讲概率.pdf',
}
OUT = Path(__file__).resolve().parent.parent / '.tmp-pdf'
DPI = 110  # 够看清中文正文；要看清公式下标再调到 150


def parse_pages(args):
    pages = []
    for a in args:
        m = re.fullmatch(r'(\d+)-(\d+)', a)
        if m:
            pages.extend(range(int(m.group(1)), int(m.group(2)) + 1))
        else:
            pages.append(int(a))
    return pages


def render(book, pages):
    OUT.mkdir(exist_ok=True)
    doc = pymupdf.open(BOOKS[book])
    out = []
    for p in pages:
        if not (1 <= p <= doc.page_count):
            print(f'  跳过 p{p}（超出 {doc.page_count} 页）')
            continue
        pix = doc[p - 1].get_pixmap(dpi=DPI)
        f = OUT / f'{book}-p{p:04d}.png'
        pix.save(f)
        out.append(str(f))
    doc.close()
    for f in out:
        print(f)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'list'
    if cmd == 'list':
        for name, path in BOOKS.items():
            doc = pymupdf.open(path)
            print(f'{name}: {doc.page_count} 页  {path}')
            doc.close()
    elif cmd == 'toc':
        book = sys.argv[2]
        render(book, list(range(1, 13)))
    elif cmd == 'render':
        render(sys.argv[2], parse_pages(sys.argv[3:]))
    else:
        print(__doc__)
