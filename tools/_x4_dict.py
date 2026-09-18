# -*- coding: utf-8 -*-
"""
肖四用词校验：用 jieba 词典筛出「两个字都是常用字、但组合不成词」的二字窗口。
这类窗口是 OCR 形近字误识的高发区（嬉变、硚身、县花、天折、侣议…）。

用法：
  python tools/_x4_dict.py            # 全部候选
  python tools/_x4_dict.py 5          # 只看两侧字频都 ≥5 的
"""
import re
import sys
import os
import jieba

jieba.initialize()  # 必须先初始化，否则 dt.FREQ 为空

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'data/politics/questions.ts'), encoding='utf-8').read()
mid = src[src.index('export const POLITICS_QUESTIONS'): src.index('...POLITICS_QUESTIONS_X8')]

MIN = int(sys.argv[1]) if len(sys.argv) > 1 else 1

# 单字频（只统计肖四区间）
freq = {}
for c in mid:
    if '\u4e00' <= c <= '\u9fff':
        freq[c] = freq.get(c, 0) + 1

# jieba 词典：常见单字/词的 freq
def known(w):
    return jieba.get_FREQ(w) is not None

seen = {}
for m in re.finditer(r'[\u4e00-\u9fff]{2}', mid):
    w = m.group(0)
    if known(w):
        continue
    if freq.get(w[0], 0) < MIN or freq.get(w[1], 0) < MIN:
        continue
    if not known(w[0]) or not known(w[1]):
        continue
    ctx = mid[max(0, m.start() - 14): m.end() + 14].replace('\n', '⏎')
    seen.setdefault(w, []).append(ctx)

print(f'「二字都认识、组合不成词」的窗口：{len(seen)} 种\n')
for w, ctxs in sorted(seen.items(), key=lambda kv: -len(kv[1])):
    print(f'{w}  ×{len(ctxs)}')
    for c in ctxs[:3]:
        print(f'    {c}')
