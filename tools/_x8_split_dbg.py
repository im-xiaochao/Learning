# -*- coding: utf-8 -*-
"""按 `_x8_material.py` 自己的行序列定位可疑切分，打印每行的 x0 / 页 / 是否被判为段首。

用法：python tools/_x8_split_dbg.py [套号-题号 ...]
     python tools/_x8_split_dbg.py 3-36 5-35
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
g = {"__name__": "dbg"}
exec(compile(src, "_x8_material.py", "exec"), g)

pages = g["load_merged"]([
    os.path.join(ROOT, ".workbuddy-ai/tmp/rows/x8-d250.jsonl"),
    os.path.join(ROOT, ".workbuddy-ai/tmp/rows/x8-d160.jsonl"),
    os.path.join(ROOT, ".workbuddy-ai/tmp/rows/x8-d120.jsonl"),
])

PAGE_SET, SET_HDR, NOISE, QNUM, SUB1 = (
    g["PAGE_SET"], g["SET_HDR"], g["NOISE"], g["QNUM"], g["SUB1"],
)

wanted = set(sys.argv[1:]) or None

cur_set = None
cur_num = None
mat_lines = []
in_sub = False


def dump(s, n, lines):
    bases = g["page_bases"](lines)
    base0 = None
    print("===== 第%s套 %s 题（%d 行）" % (s, n, len(lines)))
    for pg, x0, t in lines:
        base = bases.get(pg) or base0
        if pg in bases:
            base0 = bases[pg]
        if base is None:
            base = x0
        is_start = ((x0 > base * 1.06) and not g["SRC"].match(t.strip())) or g["MATN"].match(t.strip())
        print("  %s p%-3d x0=%7.1f base=%7.1f  %s" % (
            "▶" if is_start else " ", pg, x0, base, t[:66]))
    print()


for pg in sorted(pages):
    s = PAGE_SET.get(pg)
    if s is None:
        continue
    if s != cur_set:
        cur_set = s
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
            if cur_num is not None and mat_lines:
                key = "%d-%d" % (cur_set, cur_num)
                if wanted is None or key in wanted:
                    dump(cur_set, cur_num, mat_lines)
            cur_num = int(qm.group(1))
            in_sub = False
            rest = t[qm.end():].strip()
            mat_lines = [(pg, r["x0"], rest)] if rest else []
            continue
        if cur_num is None:
            continue
        if not in_sub and SUB1.match(t):
            in_sub = True
            continue
        if not in_sub:
            mat_lines.append((pg, r["x0"], t))
