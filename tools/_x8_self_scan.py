# -*- coding: utf-8 -*-
"""定位 `自已`（误读，U+5DF2）在肖八整条管线里的每一处，标出来源与所属题。

`自已` 不是中文词（`己` 才是「自身」，`已` 是「已经」），出现即误读。
但要先分清它在**哪个源**、落到**哪个字段**，才能决定改哪里。

用法：python tools/_x8_self_scan.py
"""
import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

BAD = "自已"      # U+81EA + U+5DF2
GOOD = "自己"     # U+81EA + U+5DF1


def scan_file(path, label):
    if not os.path.exists(path):
        print(f"--- {label}: 文件不存在")
        return
    raw = io.open(path, encoding="utf-8").read()
    n_bad = raw.count(BAD)
    print(f"--- {label}  ({os.path.basename(path)})")
    print(f"    自已={n_bad}  自己={raw.count(GOOD)}")
    if not n_bad:
        return
    # 逐处打印上下文
    for m in re.finditer(re.escape(BAD), raw):
        i = m.start()
        print(f"      …{raw[max(0, i-50):i+50]!r}…")
    print()


def main():
    print("=" * 72)
    print("一、管线源文件")
    print("=" * 72)
    for f, label in [
        ("tools/_x8-material.json", "材料正文（扫描件 OCR）"),
        ("tools/_x8-suashua.txt", "客观题题干/选项（排版稿文本层）"),
        ("tools/_x8-answers.txt", "答案解析文本层"),
        ("tools/_x8-answers-patch.json", "答案解析补丁（OCR 行 → expl/ref）"),
        ("tools/_x8-manual.json", "人工补丁表"),
    ]:
        scan_file(os.path.join(ROOT, f), label)

    print("=" * 72)
    print("二、生成物（逐题定位）")
    print("=" * 72)
    gen = os.path.join(ROOT, "data/politics/questions-x8.ts")
    raw = io.open(gen, encoding="utf-8").read()
    ids = [(m.start(), m.group(1)) for m in re.finditer(r'id:\s*"([a-z0-9-]+)"', raw)]

    def qid_at(pos):
        cur = "?"
        for off, q in ids:
            if off > pos:
                break
            cur = q
        return cur

    n = 0
    for m in re.finditer(re.escape(BAD), raw):
        i = m.start()
        qid = qid_at(i)
        n += 1
        print(f"  [{n}] {qid}  …{raw[max(0, i-50):i+50]}…")
    print(f"\n生成物里 `自已` 共 {n} 处")


if __name__ == "__main__":
    main()
