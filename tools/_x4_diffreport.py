# -*- coding: utf-8 -*-
"""生成肖四修复明细：把 HEAD 版本与工作区的肖四区间逐题做字符级 diff，输出可复核的清单。

用法：
    python tools/_x4_diffreport.py > 肖四修复明细.md

只比对 `export const POLITICS_QUESTIONS` 与 `...POLITICS_QUESTIONS_X8` 之间（肖四区间），
逐题 diff，每条改动给 14 字上下文。
"""
import re
import subprocess
import difflib

SRC = r"data/politics/questions.ts"
START = "export const POLITICS_QUESTIONS"
END = "...POLITICS_QUESTIONS_X8"

old_all = subprocess.run(["git", "show", f"HEAD:{SRC}"], capture_output=True, text=True,
                         encoding="utf-8").stdout
new_all = open(SRC, encoding="utf-8").read()


def region(s):
    i, j = s.index(START), s.index(END)
    return s[i:j]


old_r, new_r = region(old_all), region(new_all)


def split_by_id(s):
    marks = [(m.group(1), m.start()) for m in re.finditer(r'id: "(q-[a-z0-9-]+)"', s)]
    out = {}
    for k, (qid, at) in enumerate(marks):
        end = marks[k + 1][1] if k + 1 < len(marks) else len(s)
        out[qid] = s[at:end]
    return out


A, B = split_by_id(old_r), split_by_id(new_r)
ids = [q for q in A if q in B]
only_old = [q for q in A if q not in B]
only_new = [q for q in B if q not in A]

print("# 肖四修复明细\n")
print(f"> 对比 `HEAD:{SRC}` 与工作区，只含肖四区间（`{START}` … `{END}`）。")
print("> 每条改动列出「原 → 改」，前后各留 14 字上下文，便于逐条对照原 PDF 复核。\n")

total = 0
punct = 0
changed = 0
lines = []
PUNCT_ONLY = re.compile(r'^[，。、；：！？（）《》“”‘’—…,.;:!?()<>"\'\s\\n]*$')

for qid in ids:
    a, b = A[qid], B[qid]
    if a == b:
        continue
    changed += 1
    ops = difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes()
    items = []
    for tag, i1, i2, j1, j2 in ops:
        if tag == "equal":
            continue
        pre = a[max(0, i1 - 14):i1].replace("\n", "⏎")
        suf = a[i2:i2 + 14].replace("\n", "⏎")
        old_frag = a[i1:i2].replace("\n", "⏎")
        new_frag = b[j1:j2].replace("\n", "⏎")
        is_punct = bool(PUNCT_ONLY.match(old_frag)) and bool(PUNCT_ONLY.match(new_frag))
        if is_punct:
            punct += 1
            continue
        total += 1
        items.append((pre, old_frag, new_frag, suf, tag))
    if not items:
        continue
    lines.append(f"\n## `{qid}`　{len(items)} 处\n")
    for pre, old_frag, new_frag, suf, tag in items:
        kind = {"replace": "改写", "delete": "删除", "insert": "补入"}[tag]
        lines.append(f"- **{kind}**　…{pre}『{old_frag}』{suf}…")
        if tag == "delete":
            lines.append(f"  - → 删掉『{old_frag}』")
        elif tag == "insert":
            lines.append(f"  - → 补入『{new_frag}』")
        else:
            lines.append(f"  - → 改为『{new_frag}』")

print(f"内容改动：**{changed}** 道题、**{total}** 处。")
print(f"另有半角标点统一为全角 **{punct}** 处（纯排版，未逐条列出）。")
if only_old:
    print(f"\n仅旧版有（已删）：{' '.join(only_old)}")
if only_new:
    print(f"\n仅新版有（新增）：{' '.join(only_new)}")
print("\n---")
print("\n".join(lines))
