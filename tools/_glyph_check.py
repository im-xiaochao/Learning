# -*- coding: utf-8 -*-
"""把 `_glyph_pairs.py` 的候选拿到**干净源**（排版稿/答案解析文本层）里核对。

干净源是 PDF 自带文本层，不经 OCR，所以它的读法可以直接当判据；
但注意**它自己也会有错字**（实测 `建立起自已`、`工入阶级` 都出现在速刷本里），
所以「干净源也说错」时，还要看**同一本书的其它位置**怎么写同一个词。

用法：python tools/_glyph_check.py
"""
import io
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# 待核对的候选：(标签, 生成物里的串, 疑似正字)
PROBES = [
    ("自已", "建立起自已的革命政党", "建立起自己的革命政党"),
    ("自已", "为自已的前途命运而奋斗", "为自己的前途命运而奋斗"),
    ("自已", "要先把自已的手洗净", "要先把自己的手洗净"),
    ("工入", "加强对工入阶级的剥削", "加强对工人阶级的剥削"),
    ("入类", "入类自古逐水而居", "人类自古逐水而居"),
    ("入类", "入类可以凭借技术手段", "人类可以凭借技术手段"),
    ("入口", "改进作风的切入口和动员令", "改进作风的切入口和动员令"),
]

SOURCES = [
    ("速刷本(排版稿)", os.path.join(HERE, "_x8-suashua.txt")),
    ("答案解析(文本层)", os.path.join(HERE, "_x8-answers.txt")),
]


def squash(s: str) -> str:
    """去掉所有空白——干净源里换行会把词切开，必须先压平再找。"""
    return re.sub(r"\s", "", s)


def main():
    srcs = []
    for name, path in SOURCES:
        if os.path.exists(path):
            srcs.append((name, squash(io.open(path, encoding="utf-8").read())))

    for tag, bad, good in PROBES:
        print(f"── [{tag}] {bad}")
        hit_any = False
        for name, s in srcs:
            nb, ng = s.count(bad), s.count(good)
            if nb or ng:
                hit_any = True
                print(f"     {name}: 误形 {nb}   正形 {ng}")
        if not hit_any:
            print("     （两个干净源里都没有）")
        print()


if __name__ == "__main__":
    main()
