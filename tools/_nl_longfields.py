# -*- coding: utf-8 -*-
"""列出「大多数行都超宽」的字段——它们是幂等判据的分界，需要人工确认。

用法：
    python tools/_nl_longfields.py <文件> [阈值]
"""
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _nl_unwrap import vwidth  # noqa: E402

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

FIELD = re.compile(r'(?<![A-Za-z])(explanation)\s*:\s*"((?:[^"\\]|\\.)*)"')


def unescape(s: str) -> str:
    return (s.replace("\\\\", "\x00").replace('\\"', '"')
             .replace("\\n", "\n").replace("\x00", "\\"))


def main():
    path = sys.argv[1]
    thr = float(sys.argv[2]) if len(sys.argv) > 2 else 60.0
    raw = io.open(path, encoding="utf-8").read()
    ids = re.findall(r'id:\s*"([^"]+)"', raw)
    shown = 0
    for idx, (_, body) in enumerate(FIELD.findall(raw)):
        t = unescape(body)
        if "\n" not in t:
            continue
        ls = t.split("\n")
        wide = sum(1 for l in ls if vwidth(l) > thr)
        if wide * 2 > len(ls):        # 过半超宽
            shown += 1
            print(f"### 字段 #{idx}  {len(ls)} 行 / {wide} 行超宽")
            for l in ls:
                print(f"    [{vwidth(l):6.1f}] {l[:88]}")
            print()
    print(f"过半超宽的字段：{shown} 个")


if __name__ == "__main__":
    main()
