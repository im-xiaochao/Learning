# -*- coding: utf-8 -*-
"""把肖四的题干 / 选项 / 材料 与《4套卷》试卷 PDF 的 OCR 做字符级对齐。

用法：
    python tools/_x4_qalign.py > tools/_x4-qalign.out

原理同 _x4_align.py：只保留汉字后定位、difflib 对齐，
报出「等长替换」与「OCR 多字（源漏字）」两类候选，供人工判断哪边对。
"""
import re
import difflib

import jieba
from jieba import dt

jieba.initialize()

SRC = r"D:\Code\Learning\data\politics\questions.ts"
OCR = r"D:\Code\Learning\tools\_x4-qocr.out"

CJK = re.compile(r"[\u4e00-\u9fff]")


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

blocks = []
for m in re.finditer(r'id: "(q-[a-z0-9-]+)"', mid):
    blocks.append((m.group(1), m.start()))
blocks.append((None, len(mid)))


def read_string(block, key):
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


def read_array_of_strings(block, key):
    fi = block.find(key)
    if fi < 0:
        return []
    end = block.find("]", fi)
    seg = block[fi:end if end > 0 else len(block)]
    return re.findall(r'"((?:[^"\\]|\\.)*)"', seg)


def read_options(block):
    fi = block.find("options: [")
    if fi < 0:
        return []
    end = block.find("]", fi)
    seg = block[fi:end if end > 0 else len(block)]
    return re.findall(r'text:\s*"((?:[^"\\]|\\.)*)"', seg)


def is_word(w):
    return w in dt.FREQ


def cjk(s):
    return "".join(c for c in s if CJK.match(c))


replaces = []
inserts = []
unmatched = []


def scan(qid, field, text):
    t = cjk(text)
    if len(t) < 12:
        return
    at = -1
    for plen in (20, 16, 12, 10):
        at = ocr_n.find(t[:plen])
        if at >= 0:
            break
    if at < 0:
        unmatched.append((qid, field, text[:26]))
        return
    win = ocr_n[max(0, at - 30):at + len(t) + 60]
    sm = difflib.SequenceMatcher(None, t, win, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "replace" and (i2 - i1) == (j2 - j1) and 1 <= (i2 - i1) <= 4:
            s_frag, o_frag = t[i1:i2], win[j1:j2]
            if s_frag == o_frag:
                continue
            s_pre, s_suf = t[max(0, i1 - 2):i1], t[i2:i2 + 2]
            o_pre, o_suf = win[max(0, j1 - 2):j1], win[j2:j2 + 2]
            s_ok = any(is_word(w) for w in (s_pre + s_frag, s_frag + s_suf) if len(w) >= 2)
            o_ok = any(is_word(w) for w in (o_pre + o_frag, o_frag + o_suf) if len(w) >= 2)
            replaces.append((qid, field, s_frag, o_frag, s_ok, o_ok,
                             t[max(0, i1 - 14):i2 + 14], win[max(0, j1 - 14):j2 + 14]))
        elif tag == "insert" and 1 <= (j2 - j1) <= 3:
            inserts.append((qid, field, win[j1:j2],
                            t[max(0, i1 - 14):i1 + 14], win[max(0, j1 - 14):j2 + 14]))


for k in range(len(blocks) - 1):
    qid, start = blocks[k]
    block = mid[start:blocks[k + 1][1]]
    if not re.match(r"q-(maozhongte|mayuan|shigang|sixiu|shizheng)-", qid):
        continue
    st = read_string(block, 'stem: "')
    if st:
        scan(qid, "stem", st)
    for j, op in enumerate(read_options(block)):
        scan(qid, f"option{j}", op)
    for j, p in enumerate(read_array_of_strings(block, "paragraphs: [")):
        scan(qid, f"材料{j}", p)

print(f"===== 定位失败（{len(unmatched)} 处）=====")
for qid, field, head in unmatched:
    print(f"  {qid:22s} {field:10s} {head}")

print(f"\n\n===== 等长替换（{len(replaces)} 处）=====")
for qid, field, s_frag, o_frag, s_ok, o_ok, s_ctx, o_ctx in replaces:
    flag = "★源错" if (o_ok and not s_ok) else ""
    print(f"\n[{qid} {field}] 源「{s_frag}」 / OCR「{o_frag}」  {flag}")
    print(f"    源  …{s_ctx}…")
    print(f"    OCR …{o_ctx}…")

print(f"\n\n===== OCR 多字（源疑似漏字，{len(inserts)} 处）=====")
for qid, field, frag, s_ctx, o_ctx in inserts:
    print(f"\n[{qid} {field}] OCR 多出「{frag}」")
    print(f"    源  …{s_ctx}…")
    print(f"    OCR …{o_ctx}…")
