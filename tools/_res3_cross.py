# -*- coding: utf-8 -*-
"""对 3 处残留形近字做跨源交叉验证。

对每一处，在下列源里查找同句的读法：
  · tools/_x8-suashua.txt     速刷本文本层
  · tools/_x8-answers.txt     答案解析文本层
  · 111/26肖秀荣《8套卷》.md   独立第三套 OCR

用法：python tools/_res3_cross.py
"""
import io
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
MD = r"C:/Users/imxia/Downloads/2026考研政治肖4肖8(1)/111/26肖秀荣《8套卷》.md"

# (标签, 前后文锚点, 待验证的两种写法)
CASES = [
    ("5-34 材料  为自已的前途命运",
     "百折不挠为",
     [("自已", "为自已的前途命运"), ("自己", "为自己的前途命运")]),
    ("6-37 材料  先把自已的手洗净",
     "当领导的要先",
     [("自已", "先把自已的手洗净"), ("自己", "先把自己的手洗净")]),
    ("题干(21)  建立起自已的革命政党",
     "必须建立起",
     [("自已", "建立起自已的革命政党"), ("自己", "建立起自己的革命政党")]),
    ("题干(1)   入类自古逐水而居",
     "逐水而居",
     [("入类", "入类自古逐水而居"), ("人类", "人类自古逐水而居")]),
    ("题干  加强对工入阶级的剥削",
     "加强对",
     [("工入阶级", "加强对工入阶级的剥削"), ("工人阶级", "加强对工人阶级的剥削")]),
]


def load(path, flatten=False):
    if not os.path.exists(path):
        return None
    t = io.open(path, encoding="utf-8").read()
    return t.replace("\n", "") if flatten else t


SRCS = [
    ("速刷本", load(os.path.join(HERE, "_x8-suashua.txt"), True)),
    ("答案解析", load(os.path.join(HERE, "_x8-answers.txt"), True)),
    ("独立OCR", load(MD, True)),
]

for label, anchor, variants in CASES:
    print("=" * 78)
    print(f"## {label}")
    print(f"   锚点：{anchor}")
    for name, text in SRCS:
        if text is None:
            print(f"   {name:8s}: （文件不存在）")
            continue
        found = []
        for tag, needle in variants:
            n = text.count(needle)
            if n:
                found.append(f"{tag}×{n}")
        # 锚点上下文
        i = text.find(anchor)
        ctx = f"…{text[max(0, i - 8):i + 30]}…" if i >= 0 else "（锚点未命中）"
        print(f"   {name:8s}: {'  '.join(found) if found else '两者都没有'}   锚点处: {ctx}")
    print()
