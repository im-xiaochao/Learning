# -*- coding: utf-8 -*-
"""错字探测（形近字/替换版）—— **高召回、低精度，输出必须人工筛**

⚠️ 实测在 `3 1 5 3` 参数下仍产出 5000+ 条候选，绝大多数是假阳性：
   合法的短词恰好是某个长词「换一个字」的形态（`的定性`/`的定量`、`发展有`/`发展的`）。
   根因是没有「字形相似度」约束——OCR 只会把字认成形近字，而本脚本允许替换成
   语料里出现过的**任意**汉字。

结论：这条路的正确解法是**字形相似度表**（或同页双 OCR 差分），不是穷举替换。
保留本脚本是为了记录这个负面结论，别直接拿它的输出改数据。

比它可靠的两个替代：
  tools/_misschar.py   漏字（删一字）——词边界对齐，精度可用
  tools/_rarechar.py   稀有字扫描——OCR 认进来的字通常极罕见，逐条看上下文

用法：
    python tools/_misschar3.py [MIN_GOOD] [MAX_BAD] [MAXTOK] [MINLEN]
"""
import io
import os
import re
import sys
from collections import Counter, defaultdict

import jieba

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = [
    "data/politics/questions.ts",
    "data/politics/questions-x8.ts",
]

MIN_GOOD = int(sys.argv[1]) if len(sys.argv) > 1 else 3
MAX_BAD = int(sys.argv[2]) if len(sys.argv) > 2 else 1
MAXTOK = int(sys.argv[3]) if len(sys.argv) > 3 else 5
MINLEN = int(sys.argv[4]) if len(sys.argv) > 4 else 3

CJK = re.compile(r"[\u4e00-\u9fff]+")
ESC = re.compile(r"\\[nrt\"'\\/]")

raw = []
for rel in FILES:
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        continue
    with io.open(p, encoding="utf-8") as f:
        for i, text in enumerate(f, 1):
            raw.append((rel, i, text.rstrip("\n")))

chars = []
pos2loc = []
for rel, no, text in raw:
    for ch in ESC.sub("", text):
        if ch.isspace():
            continue
        chars.append(ch)
        pos2loc.append((rel, no))
joined = "".join(chars)


def context(off, span):
    rel, no = pos2loc[off]
    lo, hi = max(0, off - 26), off + span + 26
    return "%s:%d  …%s…" % (rel, no, joined[lo:hi])


phrase_count = Counter()
first_off = {}
for m in CJK.finditer(joined):
    run = m.group(0)
    toks = [t for t in jieba.cut(run) if t.strip()]
    off = m.start()
    starts = []
    for t in toks:
        starts.append(off)
        off += len(t)
    for n in range(1, MAXTOK + 1):
        for i in range(0, len(toks) - n + 1):
            ph = "".join(toks[i:i + n])
            if len(ph) < MINLEN:
                continue
            phrase_count[ph] += 1
            if ph not in first_off:
                first_off[ph] = starts[i]

aligned = set(phrase_count)

# —— 高频 Y 的通配键索引：Y 的第 i 位 → '*' ——
wild = defaultdict(list)
for y, ny in phrase_count.items():
    if ny < MIN_GOOD or len(y) < MINLEN:
        continue
    for i in range(len(y)):
        wild[y[:i] + "*" + y[i + 1:]].append(y)

hits = []
seen = set()
for x, nx in phrase_count.items():
    if nx > MAX_BAD or len(x) < MINLEN or x in seen:
        continue
    if len(x) == 2 and nx > 1:
        continue
    best = None
    for i in range(len(x)):
        key = x[:i] + "*" + x[i + 1:]
        for y in wild.get(key, ()):
            ny = phrase_count[y]
            if ny <= nx * 3:
                continue
            if len(x) == 2 and ny < 10:
                continue
            if best is None or ny > best[1]:
                best = (y, ny, i)
    if best:
        seen.add(x)
        hits.append((best[1], nx, x, best[0], best[2]))

hits.sort(reverse=True)
print("词对齐短语 %d 条；错字候选 %d 条（X 频次<=%d，Y 频次>=%d，MAXTOK=%d）\n"
      % (len(aligned), len(hits), MAX_BAD, MIN_GOOD, MAXTOK))
for ny, nx, x, y, i in hits:
    print("错字候选  X=「%s」×%d  →  疑似 Y=「%s」×%d（第%d字）"
          % (x, nx, y, ny, i + 1))
    print("    " + context(first_off[x], len(x)))
