# -*- coding: utf-8 -*-
"""
肖四「一字之差的近词」扫描。

对每个二字窗口 ab：
  - ab 本身不是词典词；
  - 且 a 或 b 在肖四区间里出现 ≤ MIN 次（生僻 → 疑似 OCR 误识）；
就把「词典里所有 xb 和 ay」列出来。正确写法通常就在列表里，
一眼能认（嬉变 → 嬗变/蜕变；硚身 → 跻身/挺身…）。

用法：
  python tools/_x4_nearword.py        # MIN=6
  python tools/_x4_nearword.py 10
"""
import re
import sys
import os
import jieba

jieba.initialize()
from jieba import dt  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'data/politics/questions.ts'), encoding='utf-8').read()
mid = src[src.index('export const POLITICS_QUESTIONS'): src.index('...POLITICS_QUESTIONS_X8')]

MIN = int(sys.argv[1]) if len(sys.argv) > 1 else 6

freq = {}
for c in mid:
    if '\u4e00' <= c <= '\u9fff':
        freq[c] = freq.get(c, 0) + 1

# 建立索引：按首字 / 按次字
by_first = {}
by_second = {}
for w in dt.FREQ:
    if len(w) == 2 and '\u4e00' <= w[0] <= '\u9fff' and '\u4e00' <= w[1] <= '\u9fff':
        by_first.setdefault(w[0], set()).add(w[1])
        by_second.setdefault(w[1], set()).add(w[0])

known = lambda w: dt.FREQ.get(w) is not None

# 太常用的功能字，做替换候选没意义
STOP = set('的了是在有和就不人都一个上也很到说要去你会着没看好自己他她它们么什为对与及其所之所以可被把从向这那大小多少高长新之其中里个们我你')

hits = {}
for m in re.finditer(r'[\u4e00-\u9fff]{2}', mid):
    a, b = m.group(0)
    if known(a + b):
        continue
    if freq.get(a, 0) > MIN and freq.get(b, 0) > MIN:
        continue
    cand = set()
    fa, fb = freq.get(a, 0), freq.get(b, 0)
    # 只对「生僻的那一个」提候选；两侧都常用就跳过（的/是/也 之类的噪音）
    if fa <= MIN:
        for x in by_second.get(b, ()):
            if freq.get(x, 0) >= 10:
                cand.add(x + b)
    if fb <= MIN:
        for y in by_first.get(a, ()):
            if freq.get(y, 0) >= 10:
                cand.add(a + y)
    if not cand or len(cand) > 16:
        continue
    ctx = mid[max(0, m.start() - 16): m.end() + 16].replace('\n', '⏎')
    hits.setdefault(a + b, [ctx, cand])

print(f'可疑窗口 {len(hits)} 个（阈值 {MIN}）\n')
for w, (ctx, cand) in sorted(hits.items(), key=lambda kv: min(freq.get(kv[0][0], 0), freq.get(kv[0][1], 0))):
    print(f'{w}   [{"|".join(sorted(cand))}]')
    print(f'    {ctx}')
