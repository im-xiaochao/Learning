# -*- coding: utf-8 -*-
"""扫描材料题「段落被从词中间切开」的缺陷。

为什么会发生
------------
`_x8_material.py` 的 `split_paragraphs` 靠行首缩进（x0）判断段落起点。
**跨页续行**的缩进常常和「段首缩进」撞上，于是同一句话被切成两段。
后果：刷题页把半截句单独渲染成一个段落。

判据
----
前一段**不以**句末标点（。！？；：”》…·—"）结尾，且
后一段**不以**「材料 / 摘编自 / 摘自 / 选自」开头，且
前一段长度 >= 12 → 可疑（人工判）。

注意：判据必须跑在**应用人工补丁之后**的文本上。`_x8-material.json` 是未打补丁的
原始抽取结果，有些段落要等 `_x8_build.py` 的 `typos` 表补上 `——` 才完整
（典型：2-36 的 `习近平总书记两次重要宣示——`），不补就会报假阳性。

用法：
    python tools/_x8_split_scan.py
"""
import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
END_OK = "。！？；：”》…、,，;:!?)）·．.—\"'"
START_OK = ("材料", "摘编自", "摘自", "选自", "（1）", "(1)", "（2）", "(2)")

MANUAL = json.load(io.open(os.path.join(ROOT, "tools", "_x8-manual.json"), encoding="utf-8"))


def apply_typos(t):
    """与 `_x8_build.py` 的 apply_typos 同规则（含幂等的负向后顾）。"""
    for bad, good in MANUAL.get("typos") or []:
        if bad in t:
            t = re.sub(r"(?<!" + re.escape(good[0]) + ")" + re.escape(bad), good, t)
    return t


def main():
    mat = json.load(io.open(os.path.join(ROOT, "tools", "_x8-material.json"),
                            encoding="utf-8"))["sets"]
    n = 0
    for s in sorted(mat, key=int):
        for q in sorted(mat[s], key=int):
            ps = [apply_typos(p) for p in mat[s][q]["paragraphs"]]
            for i in range(len(ps) - 1):
                a, b = ps[i].rstrip(), ps[i + 1].lstrip()
                if len(a) < 12:
                    continue
                if a.endswith(tuple(END_OK)):
                    continue
                if b.startswith(START_OK):
                    continue
                n += 1
                print(f"\n· {s}-{q} 段{i+1} → 段{i+2}")
                print(f"    尾: …{a[-46:]}")
                print(f"    头: {b[:46]}…")
    print(f"\n可疑切分 {n} 处")


main()
