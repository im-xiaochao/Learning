# -*- coding: utf-8 -*-
"""按 ## 节统计 MEMORY.md 的体积，找出最占地方的部分。"""
import io
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

p = sys.argv[1] if len(sys.argv) > 1 else ".workbuddy-ai/memory/MEMORY.md"
t = io.open(p, encoding="utf-8").read()
print("总字节", len(t.encode("utf-8")), "| 字符", len(t))

parts = re.split(r"(?m)^(## .*)$", t)
rows = []
if parts[0].strip():
    rows.append(("(前言)", parts[0]))
for i in range(1, len(parts), 2):
    rows.append((parts[i], parts[i] + parts[i + 1]))

rows.sort(key=lambda kv: -len(kv[1].encode("utf-8")))
for head, body in rows:
    print(f"{len(body.encode('utf-8')):6d}  {head}")
