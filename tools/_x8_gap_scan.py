# -*- coding: utf-8 -*-
"""扫描「三跑都漏检」的材料行：同一页内相邻行的 y 间距约为正常行高的 2 倍。

为什么需要：`load_merged` 的聚簇能补回「只有某几跑检出的行」，但如果**三跑都漏**，
合并结果里那一行就直接消失，段落里会留下一句半截话（如 5-37 的
`…是最宝贵的精神` 后面直接接下一段）。只有按行距找空槽才能发现。

用法：python tools/_x8_gap_scan.py
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

src = io.open(os.path.join(HERE, "_x8_material.py"), encoding="utf-8").read()
src = re.sub(r"(?m)^main\(\)\s*$", "", src)
# 让被 exec 的模块里 `os.path.dirname(os.path.abspath(__file__))` 仍指向 tools/
g = {"__name__": "dbg", "__file__": os.path.join(HERE, "_x8_material.py")}
exec(compile(src, "_x8_material.py", "exec"), g)

pages = g["inject_manual_lines"](g["load_merged"]([
    os.path.join(ROOT, ".workbuddy-ai/tmp/rows/x8-d250.jsonl"),
    os.path.join(ROOT, ".workbuddy-ai/tmp/rows/x8-d160.jsonl"),
    os.path.join(ROOT, ".workbuddy-ai/tmp/rows/x8-d120.jsonl"),
]))
PAGE_SET, SET_HDR, NOISE, QNUM, SUB1 = (
    g["PAGE_SET"], g["SET_HDR"], g["NOISE"], g["QNUM"], g["SUB1"],
)

cur_set = cur_num = None
mat = []          # [(pg, y, x0, text)]
in_sub = False
hits = []


def flush(s, n, lines):
    if not lines:
        return
    # 只比**同页内**相邻行的间距：y 是「按页归一化」的，跨页差值无意义
    for (p1, y1, _, t1), (p2, y2, _, t2) in zip(lines, lines[1:]):
        if p1 != p2:
            continue
        gaps = [b[1] - a[1] for a, b in zip(lines, lines[1:]) if a[0] == b[0]]
        if len(gaps) < 4:
            continue
        gaps.sort()
        med = gaps[len(gaps) // 2]
        if med <= 0:
            continue
        if (y2 - y1) > med * 1.6:
            hits.append((s, n, p1, y1, y2, med, t1, t2))


for pg in sorted(pages):
    s = PAGE_SET.get(pg)
    if s is None:
        continue
    if s != cur_set:
        if cur_num is not None:
            flush(cur_set, cur_num, mat)
        cur_set = s
        cur_num, mat, in_sub = None, [], False
    for r in pages[pg]:
        t = r["text"].strip()
        if not t:
            continue
        m = SET_HDR.search(t)
        if m and len(t) < 40:
            continue
        if NOISE.search(t) and not QNUM.match(t):
            continue
        if re.fullmatch(r"\d{1,3}", t):
            continue
        qm = QNUM.match(t)
        if qm and 34 <= int(qm.group(1)) <= 38:
            if cur_num is not None:
                flush(cur_set, cur_num, mat)
            cur_num = int(qm.group(1))
            in_sub = False
            rest = t[qm.end():].strip()
            mat = [(pg, r["y"], r["x0"], rest)] if rest else []
            continue
        if cur_num is None:
            continue
        if not in_sub and SUB1.match(t):
            in_sub = True
            continue
        if not in_sub:
            mat.append((pg, r["y"], r["x0"], t))

if cur_num is not None:
    flush(cur_set, cur_num, mat)

print("=== 疑似整行漏检：%d 处 ===" % len(hits))
for s, n, pg, y1, y2, med, t1, t2 in hits:
    print("  %s-%s  p%-3d  gap=%.1f (行高 %.1f)  y=%.0f→%.0f" % (s, n, pg, y2 - y1, med, y1, y2))
    print("      上行尾: …%s" % t1[-34:])
    print("      下行头: %s…" % t2[:34])
