# -*- coding: utf-8 -*-
"""验证 `_x4_unwrap.py` 的结果可复现：拿**原始备份**重跑一遍，与当前文件逐字节比对。

用法：
    python tools/_x4_unwrap_verify.py <原始备份> <当前文件>
"""
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _nl_unwrap import looks_unwrapped, unwrap  # noqa: E402

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

FIELD = re.compile(r'(?<![A-Za-z])(explanation\s*:\s*)"((?:[^"\\]|\\.)*)"')


def unescape(s: str) -> str:
    return (s.replace("\\\\", "\x00").replace('\\"', '"')
             .replace("\\n", "\n").replace("\x00", "\\"))


def escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def main():
    raw_path, cur_path = sys.argv[1], sys.argv[2]
    raw = io.open(raw_path, encoding="utf-8").read()
    cur = io.open(cur_path, encoding="utf-8").read()

    n_before = n_after = 0
    skipped = 0

    def repl(m):
        nonlocal n_before, n_after, skipped
        pre, body = m.group(1), m.group(2)
        t = unescape(body)
        if looks_unwrapped(t):
            skipped += 1
        u = unwrap(t)
        n_before += t.count("\n")
        n_after += u.count("\n")
        return pre + '"' + escape(u) + '"'

    out = FIELD.sub(repl, raw)
    print(f"原始备份：换行 {n_before} → {n_after}（短路跳过字段 {skipped}）")
    if out == cur:
        print("✅ 与当前文件逐字节一致（结果可复现）")
        return 0
    print("✗ 与当前文件不一致")
    a, b = out.split("\n"), cur.split("\n")
    diff = 0
    for i in range(max(len(a), len(b))):
        x = a[i] if i < len(a) else "<缺>"
        y = b[i] if i < len(b) else "<缺>"
        if x != y:
            diff += 1
            if diff <= 5:
                print(f"  行{i+1}\n    重跑: {x[:110]}\n    当前: {y[:110]}")
    print(f"  差异行 {diff}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
