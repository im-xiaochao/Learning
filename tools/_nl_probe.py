# -*- coding: utf-8 -*-
"""按行打印若干 explanation / answerPoints 的「行长 + 视觉宽度」，用来定阈值。

判据原理：中文 PDF 两端对齐，**满行 ⟺ 段落未完**；段落末行必然短。
所以「换行是否是真段落分隔」= 「前一行是否明显短于满行宽度」。

用法：python tools/_nl_probe.py <qid> [qid...]
"""
import io
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIELD_RE = re.compile(r'(?<![A-Za-z])(stem|explanation|translation)\s*:\s*"((?:[^"\\]|\\.)*)"')
ARR_RE = re.compile(r'(?<![A-Za-z])(paragraphs|answerPoints|options)\s*:\s*\[(.*?)\n\s*\]', re.S)
STR_IN_ARR = re.compile(r'"((?:[^"\\]|\\.)*)"')


def unescape(s):
    return (s.replace("\\\\", "\x00").replace('\\"', '"')
             .replace("\\n", "\n").replace("\x00", "\\"))


def vwidth(s: str) -> float:
    """视觉宽度：汉字/全角标点算 1，ASCII 算 0.5。"""
    return sum(0.5 if ord(c) < 128 else 1.0 for c in s)


def load(path):
    raw = io.open(path, encoding="utf-8").read()
    marks = [(m.start(), m.group(1)) for m in re.finditer(r'(?<![A-Za-z])id\s*:\s*"([^"]+)"', raw)]
    marks.append((len(raw), None))
    out = {}
    for i in range(len(marks) - 1):
        b0, qid = marks[i]
        blk = raw[b0:marks[i + 1][0]]
        fs = []
        for m in FIELD_RE.finditer(blk):
            fs.append((m.group(1), unescape(m.group(2))))
        for m in ARR_RE.finditer(blk):
            key, body = m.group(1), m.group(2)
            if key == "options":
                continue
            for j, s in enumerate(STR_IN_ARR.finditer(body)):
                fs.append((f"{key}[{j}]", unescape(s.group(1))))
        out[qid] = fs
    return out


def main():
    want = sys.argv[1:]
    for f in ("data/politics/questions.ts", "data/politics/questions-x8.ts"):
        data = load(os.path.join(ROOT, f))
        for qid in want:
            if qid not in data:
                continue
            for fld, t in data[qid]:
                if "\n" not in t:
                    continue
                print(f"########## {f}  {qid}  {fld}  ({len(t)} 字符)")
                for ln in t.split("\n"):
                    w = vwidth(ln)
                    mark = "满行" if w >= 36 else "短行"
                    print(f"   w={w:5.1f} [{mark}] {ln}")
                print()


if __name__ == "__main__":
    main()
