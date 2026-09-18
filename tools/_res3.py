# -*- coding: utf-8 -*-
"""核对肖八残留的 3 处形近字：在生成物、材料源、两个干净文本层里的形态。

用法：python tools/_res3.py
"""
import io
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

TARGETS = ["自已", "工入阶级", "入类自古"]


def qid_at(raw: str, i: int) -> str:
    j = raw.rfind('id: "', 0, i)
    if j < 0:
        return "?"
    return raw[j + 5:raw.find('"', j + 5)]


def show(label: str, path: str, keys):
    if not os.path.exists(path):
        print(f"--- {label}: 文件不存在")
        return
    t = io.open(path, encoding="utf-8").read()
    print(f"--- {label}  ({len(t)} 字符)")
    for kw in keys:
        n = t.count(kw)
        if not n:
            continue
        for m in re.finditer(re.escape(kw), t):
            i = m.start()
            ctx = t[max(0, i - 55):i + 45].replace("\n", "|")
            print(f"    [{kw}] x{n}  …{ctx}…")
    print()


print("######## 1. 生成物 ########")
show("questions-x8.ts", os.path.join(ROOT, "data/politics/questions-x8.ts"), TARGETS)

print("######## 2. 材料源（扫描件 OCR）########")
show("_x8-material.json", os.path.join(HERE, "_x8-material.json"), TARGETS)

print("######## 3. 干净文本层 ########")
show("_x8-suashua.txt", os.path.join(HERE, "_x8-suashua.txt"),
     ["自已", "自己", "工入阶级", "工人阶级", "入类", "人类"])
show("_x8-answers.txt", os.path.join(HERE, "_x8-answers.txt"),
     ["自已", "自己", "工入阶级", "工人阶级", "入类", "人类"])

print("######## 4. 跨行断开检查（源文本层可能断行）########")
for f in ("_x8-suashua.txt", "_x8-answers.txt"):
    p = os.path.join(HERE, f)
    if not os.path.exists(p):
        continue
    raw = io.open(p, encoding="utf-8").read()
    flat = raw.replace("\n", "")
    print(f"--- {f}（抹掉换行后）")
    for kw in ["工入阶级", "工人阶级", "入类自古", "人类自古", "建立起自已", "建立起自己"]:
        n = flat.count(kw)
        if n:
            i = flat.find(kw)
            print(f"    [{kw}] x{n}  …{flat[max(0, i - 55):i + 45]}…")
    print()
