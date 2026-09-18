# -*- coding: utf-8 -*-
"""漏字探测（词边界对齐版）

原理
----
OCR 丢一个汉字后，剩下的片段常常仍像一个词。朴素的「固定搭配去掉首字后反查」
假阳性极多（`系统推进` 里含 `统推进`、`接续奋斗` 里含 `续奋斗`），所以改成：
先用 jieba 分词，只保留**词边界对齐**的短语作为候选。

源文件里的 \\n 是**字面量两字符**（TS 字符串转义），不是真换行符；它非 CJK
且会把词切断（「中国特\\n色社会主义」），所以先抹掉所有空白与转义序列再分词，
并用「拼接流偏移 → 原文件行号」的映射把命中位置还原回去。

判据
----
对每个词对齐短语 Y（频次 >= MIN_GOOD），把它删掉任意一个汉字得到 X。
若 X 也是词对齐短语、但频次 <= MAX_BAD 且远小于 Y，则 X 极可能是 Y 漏了一个字。

**输出是候选，不是结论**——`中国近代史` 这种合法短词也会命中，必须逐条
对照源 PDF（tools/_crop_at.py / tools/_unwatermark.py）才能改。

用法：
    python tools/_misschar.py [MIN_GOOD] [MAX_BAD] [MAXTOK]
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

CJK = re.compile(r"[\u4e00-\u9fff]+")

# —— 1. 读原文件，构建「拼接流」及其偏移映射 ——
# 注意：源文件里的换行是**字面量两字符** `\` + `n`（TS 字符串转义），
# 不是真换行符，非 CJK 且会把词切断，必须一并抹掉。
ESC = re.compile(r"\\[nrt\"'\\/]")

raw = []  # (rel, no, text)
for rel in FILES:
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        continue
    with io.open(p, encoding="utf-8") as f:
        for i, text in enumerate(f, 1):
            raw.append((rel, i, text.rstrip("\n")))

chars = []
pos2loc = []  # 拼接流下标 -> (rel, no)
for rel, no, text in raw:
    for ch in ESC.sub("", text):
        if ch.isspace():
            continue
        chars.append(ch)
        pos2loc.append((rel, no))
joined = "".join(chars)

_line_of = {(r, n): t for r, n, t in raw}


def context(off, span):
    """给定拼接流偏移，还原成「文件:行  上下文」。"""
    rel, no = pos2loc[off]
    lo, hi = max(0, off - 26), off + span + 26
    return "%s:%d  …%s…" % (rel, no, joined[lo:hi])


# —— 2. 分词 + 词对齐短语频次（记录首个偏移） ——
phrase_count = Counter()
first_off = {}

for m in CJK.finditer(joined):
    run = m.group(0)
    base = m.start()
    toks = [t for t in jieba.cut(run) if t.strip()]
    off = base
    starts = []
    for t in toks:
        starts.append(off)
        off += len(t)
    for n in range(1, MAXTOK + 1):
        for i in range(0, len(toks) - n + 1):
            ph = "".join(toks[i:i + n])
            if len(ph) < 3:
                continue
            phrase_count[ph] += 1
            if ph not in first_off:
                first_off[ph] = starts[i]

aligned = set(phrase_count)

# —— 3. Y 删一字 → X ——
cand = defaultdict(list)
for y in aligned:
    if phrase_count[y] < MIN_GOOD:
        continue
    for i in range(len(y)):
        x = y[:i] + y[i + 1:]
        if len(x) >= 3 and x in aligned:
            cand[x].append(y)

hits = []
for x, ys in cand.items():
    nx = phrase_count[x]
    if nx > MAX_BAD:
        continue
    y = max(ys, key=lambda t: phrase_count[t])
    ny = phrase_count[y]
    if ny <= nx * 3:
        continue
    hits.append((ny, nx, x, y))

hits.sort(reverse=True)
print("词对齐短语 %d 条；漏字候选 %d 条（X 频次<=%d，Y 频次>=%d，MAXTOK=%d）\n"
      % (len(aligned), len(hits), MAX_BAD, MIN_GOOD, MAXTOK))
for ny, nx, x, y in hits:
    print("漏字候选  X=「%s」×%d  →  补后 Y=「%s」×%d" % (x, nx, y, ny))
    print("    " + context(first_off[x], len(x)))
