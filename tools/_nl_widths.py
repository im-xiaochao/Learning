# -*- coding: utf-8 -*-
"""统计「断行点前一行的视觉宽度」分布，用来定「满行/短行」阈值。

判据：中文 PDF 两端对齐，满行 ⟺ 段落未完。段落末行必然短。
所以「这个换行是不是真段落分隔」= 「前一行是否明显短于满行宽度」。

用法：python tools/_nl_widths.py
"""
import io
import os
import re
import sys
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIELD_RE = re.compile(r'(?<![A-Za-z])(stem|explanation|translation)\s*:\s*"((?:[^"\\]|\\.)*)"')
ARR_RE = re.compile(r'(?<![A-Za-z])(paragraphs|answerPoints|options)\s*:\s*\[(.*?)\n\s*\]', re.S)
STR_IN_ARR = re.compile(r'"((?:[^"\\]|\\.)*)"')


def unescape(s):
    return (s.replace("\\\\", "\x00").replace('\\"', '"')
             .replace("\\n", "\n").replace("\x00", "\\"))


def vwidth(s: str) -> float:
    return sum(0.5 if ord(c) < 128 else 1.0 for c in s)


def fields(path):
    raw = io.open(path, encoding="utf-8").read()
    marks = [(m.start(), m.group(1)) for m in re.finditer(r'(?<![A-Za-z])id\s*:\s*"([^"]+)"', raw)]
    marks.append((len(raw), None))
    for i in range(len(marks) - 1):
        b0, qid = marks[i]
        blk = raw[b0:marks[i + 1][0]]
        for m in FIELD_RE.finditer(blk):
            yield qid, m.group(1), unescape(m.group(2))
        for m in ARR_RE.finditer(blk):
            key, body = m.group(1), m.group(2)
            if key == "options":
                continue
            for s in STR_IN_ARR.finditer(body):
                yield qid, key, unescape(s.group(1))


def main():
    for f in ("data/politics/questions.ts", "data/politics/questions-x8.ts"):
        c = Counter()
        tot = 0
        for qid, fld, t in fields(os.path.join(ROOT, f)):
            if "\n" not in t:
                continue
            lines = t.split("\n")
            for ln in lines[:-1]:
                c[int(vwidth(ln))] += 1
                tot += 1
        print(f"=== {f}   断行点 {tot}")
        for k in sorted(c):
            print(f"  w={k:3d}: {c[k]:5d} " + "#" * min(70, c[k] // 3))
        print()


if __name__ == "__main__":
    main()
