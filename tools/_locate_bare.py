"""定位「裸正确」所在题目，并打印上下文（只读）。

用法：python tools/_locate_bare.py "科学实践观的基本内容。正确"
"""
import io
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

needle = sys.argv[1] if len(sys.argv) > 1 else "科学实践观的基本内容。正确"
for f in ("data/politics/questions.ts", "data/politics/questions-x8.ts"):
    raw = io.open(os.path.join(ROOT, f), encoding="utf-8").read()
    lines = raw.split("\n")
    for i, l in enumerate(lines):
        if needle not in l:
            continue
        qid = None
        for j in range(i, -1, -1):
            m = re.search(r"id:\s*['\"]([a-z0-9-]+)", lines[j])
            if m:
                qid = m.group(1)
                break
        print(f"=== {f} 行 {i + 1} → {qid}")
        print("\n".join(lines[max(0, i - 5):i + 4]))
        print()
