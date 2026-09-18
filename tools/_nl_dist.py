# -*- coding: utf-8 -*-
"""对比「原始（未 unwrap）」与「已 unwrap」两种状态下，断行点前一行的宽度分布。

用途：给 `_nl_unwrap.py` 的幂等保护找一条**安全**的分界。如果两者的分布有重叠，
就不能用「单行宽度」当判据，得换别的。

用法：
    python tools/_nl_dist.py <文件> [文件...]
"""
import io
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _nl_unwrap import vwidth  # noqa: E402

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

FIELD = re.compile(r'(?<![A-Za-z])(explanation)\s*:\s*"((?:[^"\\]|\\.)*)"')


def unescape(s: str) -> str:
    return (s.replace("\\\\", "\x00").replace('\\"', '"')
             .replace("\\n", "\n").replace("\x00", "\\"))


def main():
    for path in sys.argv[1:]:
        raw = io.open(path, encoding="utf-8").read()
        allw = []
        nf = 0
        for _, body in FIELD.findall(raw):
            t = unescape(body)
            if "\n" not in t:
                continue
            nf += 1
            allw.extend(vwidth(l) for l in t.split("\n"))
        if not allw:
            print(f"{os.path.basename(path)}: 无含换行字段")
            continue
        allw.sort()
        n = len(allw)
        c = Counter(int(w // 10) * 10 for w in allw)
        print(f"=== {os.path.basename(path)}  字段 {nf}  行 {n}")
        print(f"    最大 {allw[-1]:.0f}  中位 {allw[n // 2]:.0f}  "
              f"p90 {allw[int(n * 0.9)]:.0f}  p99 {allw[int(n * 0.99)]:.0f}")
        for k in sorted(c):
            bar = "#" * min(60, c[k] // 4)
            print(f"    {k:3d}+: {c[k]:5d} {bar}")
        print()


if __name__ == "__main__":
    main()
