# -*- coding: utf-8 -*-
"""找出某个串所在的题目 id（在生成文件里按行号回溯最近的 `id: "..."`）。

用法：
    python tools/_which_q.py <文件> <串>
"""
import io
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


def main():
    path, needle = sys.argv[1], sys.argv[2]
    lines = io.open(path, encoding="utf-8").read().split("\n")
    hit = False
    for i, l in enumerate(lines):
        if needle not in l:
            continue
        hit = True
        qid = None
        for j in range(i, -1, -1):
            m = re.search(r'id: "([^"]+)"', lines[j])
            if m:
                qid = m.group(1)
                break
        print(f"行 {i + 1}  题 {qid}  行内字面量换行 {l.count(chr(92) + 'n')} 处")
    if not hit:
        print(f"未找到「{needle}」")


if __name__ == "__main__":
    main()
