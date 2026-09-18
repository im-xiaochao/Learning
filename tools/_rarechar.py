# -*- coding: utf-8 -*-
"""稀有字扫描

OCR 把字认错时，**认进来的那个字**往往在语料里极罕见（襄、窥、嵘、阂…）。
所以：统计全语料的汉字频次，把出现次数 <= N 的字连同上下文列出来人工判定。

注意：稀有 ≠ 错误。专有名词（人名、地名、古文）也会稀有。这份清单是**候选**，
不是结论，必须逐条对照原 PDF。

用法：
    python tools/_rarechar.py [阈值N] [是否只列错字疑似 0/1]
"""
import io
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = [
    "data/politics/questions.ts",
    "data/politics/questions-x8.ts",
]

THR = int(sys.argv[1]) if len(sys.argv) > 1 else 3

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

# 拼成连续流（抹掉转义与空白），同时保留「下标 -> 行号」映射
chars = []
pos2loc = []
for rel, no, text in raw:
    for ch in ESC.sub("", text):
        if ch.isspace():
            continue
        chars.append(ch)
        pos2loc.append((rel, no))
joined = "".join(chars)

freq = Counter(c for c in joined if "\u4e00" <= c <= "\u9fff")
rare = {c for c, n in freq.items() if n <= THR}

# 只保留「只含常见字 + 恰好一个稀有字」的 4 字窗口，避免把整句古文都捞出来
COMMON_MIN = 20
out = []
for i, ch in enumerate(joined):
    if ch not in rare:
        continue
    lo = max(0, i - 12)
    hi = min(len(joined), i + 13)
    out.append((ch, freq[ch], pos2loc[i], joined[lo:hi]))

print("汉字总数 %d，去重 %d；频次 <= %d 的稀有字 %d 个，出现 %d 处\n"
      % (sum(freq.values()), len(freq), THR, len(rare), len(out)))
for ch, n, (rel, no), ctx in out:
    print("「%s」×%d  %s:%d  …%s…" % (ch, n, rel, no, ctx))
