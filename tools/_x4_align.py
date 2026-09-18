# -*- coding: utf-8 -*-
"""把肖四每条 explanation 与答案解析 PDF 的 OCR 做字符级对齐，找出「源文件写错、PDF 是对的」的差异点。

用法：
    python tools/_x4_align.py            # 全量报告
    python tools/_x4_align.py 单词        # 只看某个词相关

原理：
  1. 源文件 explanation 只保留汉字；OCR 同样只保留汉字（并保留原始下标用于打印上下文）。
  2. 用 explanation 前 24 字在 OCR 里定位，取一段窗口做 difflib 对齐。
  3. 只看 'replace' 且两边等长的片段。对每个差异，取差异点两侧各 2 字组成 4 字窗口，
     比较「源侧窗口」和「OCR 侧窗口」在 jieba 词典里的存在性。
     只有「源侧不成词、OCR 侧成词」才报——这才是源文件写错的强证据。
"""
import re
import sys
import difflib

import jieba
from jieba import dt

jieba.initialize()

SRC = r"D:\Code\Learning\data\politics\questions.ts"
OCR = r"D:\Code\Learning\tools\_x4-answerocr.out"

CJK = re.compile(r"[\u4e00-\u9fff]")
FILTER = sys.argv[1] if len(sys.argv) > 1 else None


def norm_with_map(text):
    chars, idx = [], []
    for i, c in enumerate(text):
        if CJK.match(c):
            chars.append(c)
            idx.append(i)
    return "".join(chars), idx


raw = open(OCR, encoding="utf-8").read()
ocr_n, ocr_map = norm_with_map(raw)

src = open(SRC, encoding="utf-8").read()
g_i = src.index("export const POLITICS_QUESTIONS")
g_j = src.index("...POLITICS_QUESTIONS_X8")
mid = src[g_i:g_j]

# 切题
blocks = []
for m in re.finditer(r'id: "(q-[a-z0-9-]+)"', mid):
    blocks.append((m.group(1), m.start()))
blocks.append((None, len(mid)))

def get_explanation(block):
    key = 'explanation: "'
    fi = block.find(key)
    if fi < 0:
        return None
    i = fi + len(key)
    out = []
    while i < len(block):
        c = block[i]
        if c == "\\":
            out.append(block[i:i + 2])
            i += 2
            continue
        if c == '"':
            break
        out.append(c)
        i += 1
    return "".join(out)

def is_word(w):
    return w in dt.FREQ

def window(s, a, b):
    return s[max(0, a):b]

report = []
soft = []
missing = []
unmatched = []

for k in range(len(blocks) - 1):
    qid, start = blocks[k]
    end = blocks[k + 1][1]
    if not qid.startswith(("q-maozhongte-", "q-mayuan-", "q-shigang-", "q-sixiu-", "q-shizheng-")):
        continue
    exp_raw = get_explanation(mid[start:end])
    if not exp_raw:
        continue
    exp = "".join(c for c in exp_raw if CJK.match(c))
    if len(exp) < 60:
        continue

    at = -1
    for plen in (24, 20, 16, 12, 8):
        at = ocr_n.find(exp[:plen])
        if at >= 0:
            break
    if at < 0:
        unmatched.append(qid)
        continue

    lo = max(0, at - 30)
    win = ocr_n[lo:at + len(exp) + 80]

    sm = difflib.SequenceMatcher(None, exp, win, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        # ---- 类型一：等长替换（源写成了形近字） ----
        if tag == "replace" and (i2 - i1) == (j2 - j1) and (i2 - i1) <= 6:
            s_frag = exp[i1:i2]
            o_frag = win[j1:j2]
            if s_frag == o_frag:
                continue
            s_pre, s_suf = exp[max(0, i1 - 2):i1], exp[i2:i2 + 2]
            o_pre, o_suf = win[max(0, j1 - 2):j1], win[j2:j2 + 2]
            s_ok = any(is_word(w) for w in (s_pre + s_frag, s_frag + s_suf) if len(w) >= 2)
            o_ok = any(is_word(w) for w in (o_pre + o_frag, o_frag + o_suf) if len(w) >= 2)
            if o_ok and not s_ok:
                report.append((qid, exp[max(0, i1 - 14):i2 + 14], o_frag, s_frag,
                               win[max(0, j1 - 14):j2 + 14]))
            elif s_frag != o_frag and i2 - i1 <= 2:
                soft.append((qid, s_frag, o_frag,
                             exp[max(0, i1 - 12):i2 + 12], win[max(0, j1 - 12):j2 + 12]))
            continue

        # ---- 类型二：OCR 比源多 1~3 字（源漏字） ----
        if tag == "insert" and 1 <= (j2 - j1) <= 3:
            s_win = exp[max(0, i1 - 3):i1] + exp[i1:i1 + 3]
            o_win = win[max(0, j1 - 3):j1] + win[j1:j2] + win[j2:j2 + 3]
            s_ok = any(is_word(s_win[k:k + 2]) for k in range(len(s_win) - 1))
            o_ok = any(is_word(o_win[k:k + 2]) for k in range(len(o_win) - 1))
            if o_ok and not s_ok:
                missing.append((qid, win[j1:j2],
                                exp[max(0, i1 - 12):i1 + 12], win[max(0, j1 - 12):j2 + 12]))

print(f"对齐失败 {len(unmatched)} 题：{' '.join(unmatched)}\n")
print(f"疑似「源错 OCR 对」共 {len(report)} 处：\n")
for qid, s_ctx, o_frag, s_frag, o_ctx in report:
    if FILTER and FILTER not in s_ctx and FILTER not in o_ctx:
        continue
    print(f"[{qid}]  {s_frag} → {o_frag}")
    print(f"    源  …{s_ctx}…")
    print(f"    OCR …{o_ctx}…")

print(f"\n\n===== 全部单/双字替换（{len(soft)} 处，需人工判断哪边对）=====\n")
for qid, s_frag, o_frag, s_ctx, o_ctx in soft:
    print(f"[{qid}]  源「{s_frag}」 / OCR「{o_frag}」")
    print(f"    源  …{s_ctx}…")
    print(f"    OCR …{o_ctx}…")

print(f"\n\n===== 源文件疑似漏字（OCR 多出，{len(missing)} 处）=====\n")
for qid, frag, s_ctx, o_ctx in missing:
    print(f"[{qid}]  OCR 多出「{frag}」")
    print(f"    源  …{s_ctx}…")
    print(f"    OCR …{o_ctx}…")
