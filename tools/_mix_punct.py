# -*- coding: utf-8 -*-
"""扫描半角/全角括号与标点混用（`(2）`、`（2)`、`(1)` 夹在中文里等）。

`norm_punct()` 只把**半角→全角**单向转换，所以 `(2）` 这种「半开全闭」的混用形态
会原样留下——用户看到的就是括号大小不一。

用法：
    python tools/_mix_punct.py [文件...]
"""
import io
import os
import re
import sys
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FIELD = re.compile(r'(?<![A-Za-z])(stem|explanation|answerKey|text)\s*:\s*"((?:[^"\\]|\\.)*)"')
ARR = re.compile(r'(?<![A-Za-z])(answerPoints|paragraphs)\s*:\s*\[(.*?)\]', re.S)

CJK = r"\u4e00-\u9fff"

PATTERNS = [
    ("半开+全闭", re.compile(r"\([^()（）]{0,8}）")),
    ("全开+半闭", re.compile(r"（[^()（）]{0,8}\)")),
    ("半角括号夹汉字", re.compile(rf"[{CJK}][()][{CJK}]")),
    ("半角括号夹中文标点", re.compile(r"[()][，。；：、！？]|[，。；：、！？][()]")),
]


def unescape(s: str) -> str:
    return (s.replace("\\\\", "\x00").replace('\\"', '"')
             .replace("\\n", "\n").replace("\x00", "\\"))


def texts(raw):
    for m in FIELD.finditer(raw):
        yield unescape(m.group(2))
    for m in ARR.finditer(raw):
        for it in re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(2)):
            yield unescape(it)


def main():
    files = sys.argv[1:] or [
        os.path.join(ROOT, "data", "politics", "questions.ts"),
        os.path.join(ROOT, "data", "politics", "questions-x8.ts"),
    ]
    total = Counter()
    for path in files:
        raw = io.open(path, encoding="utf-8").read()
        print(f"=== {os.path.basename(path)}")
        for name, pat in PATTERNS:
            hits = []
            for t in texts(raw):
                for m in pat.finditer(t):
                    hits.append(t[max(0, m.start() - 22):m.end() + 22])
            total[name] += len(hits)
            print(f"  {name}: {len(hits)} 处")
            for h in hits[:6]:
                print(f"      …{h}…")
        print()
    print("合计:", dict(total))


if __name__ == "__main__":
    main()
