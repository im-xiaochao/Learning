# -*- coding: utf-8 -*-
"""多数票校验：找出「合并选中的文本只有 1 票、另外两跑一致反对」的材料行。

为什么这样判
------------
`load_merged` 默认取最高 dpi（d250）。三次 OCR 的错字是**独立**的，
所以「两跑一致、第三跑不同」时，少数那一跑基本就是错的。这一条能捞到
`同仇敌屹` / `心无旁骜` / `位单未敢` 这类形近字——它们三跑读得都不一样，
但按多数票一眼可辨。

输出的是**候选**，仍要回原书核对（三跑可能同错，见 `_x8_gap_scan.py` 的注释）。

用法：python tools/_x8_merge_check.py
"""
import io
import json
import os
import re
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

src = io.open(os.path.join(HERE, "_x8_material.py"), encoding="utf-8").read()
src = re.sub(r"(?m)^main\(\)\s*$", "", src)
g = {"__name__": "dbg", "__file__": os.path.join(HERE, "_x8_material.py")}
exec(compile(src, "_x8_material.py", "exec"), g)

norm, norm_noell = g["norm"], g["norm_noell"]
estimate_scales, PAGE_SET = g["estimate_scales"], g["PAGE_SET"]
DPIS = [250, 160, 120]
RUNS = ["x8-d250", "x8-d160", "x8-d120"]

runs = []
for r in RUNS:
    pages = {}
    for line in io.open(os.path.join(ROOT, ".workbuddy-ai/tmp/rows/%s.jsonl" % r), encoding="utf-8"):
        d = json.loads(line)
        pages[d["page"]] = d["rows"]
    runs.append(pages)

rows = []
for pg in sorted(PAGE_SET):
    runs_rows = [run.get(pg) or [] for run in runs]
    if not any(runs_rows):
        continue
    scales = estimate_scales(runs_rows)
    base = max((max((x["y"] for x in rr), default=0) * sc
                for rr, sc in zip(runs_rows, scales)), default=0) or 1.0
    k = 1000.0 / base
    items = []
    for ri, rr in enumerate(runs_rows):
        sc = scales[ri] * k
        for x in rr:
            items.append({"ri": ri, "yn": x["y"] * sc, "text": x["text"]})
    items.sort(key=lambda i: i["yn"])
    clusters = []
    for it in items:
        if clusters and it["yn"] - clusters[-1]["yn"] < 12:
            clusters[-1]["items"].append(it)
        else:
            clusters.append({"yn": it["yn"], "items": [it]})
    for c in clusters:
        by_ri = {}
        for it in c["items"]:
            by_ri.setdefault(it["ri"], it)
        if len(by_ri) < 3:
            continue                     # 票数不足，多数票无意义
        votes = Counter(norm_noell(by_ri[i]["text"]) for i in by_ri)
        top, cnt = votes.most_common(1)[0]
        chosen = min(by_ri, key=lambda i: i)
        if cnt >= 2 and norm_noell(by_ri[chosen]["text"]) != top:
            rows.append((pg, chosen, by_ri, votes))

print("=== 选中文本只有 1 票、另两跑一致反对：%d 处 ===" % len(rows))
for pg, chosen, by_ri, votes in rows:
    top = votes.most_common(1)[0][0]
    print("\n  p%-3d 选中 d%d: %s" % (pg, DPIS[chosen], by_ri[chosen]["text"][:74]))
    for i in sorted(by_ri):
        if i == chosen:
            continue
        mark = "★" if norm_noell(by_ri[i]["text"]) == top else " "
        print("      %s d%d: %s" % (mark, DPIS[i], by_ri[i]["text"][:74]))
