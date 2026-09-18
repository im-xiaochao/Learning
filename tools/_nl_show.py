# -*- coding: utf-8 -*-
"""打印某个题库文件里**保留下来**的换行（即被判为「真段落分隔」的位置）。

用来人工核对 unwrap 的结果：保留下来的应该都是真段落头（`（2）`、`第二，`、
`点拨`、`（注：` 之类），而不是「词中间断行」。

用法：
    python tools/_nl_show.py [文件] [条数]
"""
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _nl_unwrap import vwidth  # noqa: E402

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 键**不带引号**（TS 对象字面量）
FIELD = re.compile(r'(?<![A-Za-z])(explanation|answerPoints\s*:\s*\[|stem|text)\s*:?\s*'
                   r'"((?:[^"\\]|\\.)*)"')


def unescape(s: str) -> str:
    return (s.replace("\\\\", "\x00").replace('\\"', '"')
             .replace("\\n", "\n").replace("\x00", "\\"))


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        ROOT, "data", "politics", "questions.ts")
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 80
    raw = io.open(path, encoding="utf-8").read()
    n = 0
    print(f"=== {os.path.basename(path)} 保留的换行 ===")
    for m in FIELD.finditer(raw):
        b = unescape(m.group(2))
        if "\n" not in b:
            continue
        ls = b.split("\n")
        for i in range(1, len(ls)):
            n += 1
            if n <= limit:
                prev_w = vwidth(ls[i - 1])
                print(f"  {n:3d}  [前行宽{prev_w:5.1f}]  …{ls[i-1][-16:]!r}"
                      f"  ||  {ls[i][:34]!r}")
    print(f"\n保留换行总数 {n}")


if __name__ == "__main__":
    main()
