# -*- coding: utf-8 -*-
"""打印某道题（按 id）的全部文本字段，换行显示成 ` | `，用于核对 unwrap 结果。

用法：
    python tools/_nl_one.py q-x8-s3-38 [文件]
"""
import io
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FIELD = re.compile(r'(?<![A-Za-z])(stem|explanation|answerKey)\s*:\s*"((?:[^"\\]|\\.)*)"')
ARR = re.compile(r'(?<![A-Za-z])(answerPoints|paragraphs)\s*:\s*\[(.*?)\]', re.S)


def unescape(s: str) -> str:
    return (s.replace("\\\\", "\x00").replace('\\"', '"')
             .replace("\\n", "\n").replace("\x00", "\\"))


def main():
    qid = sys.argv[1]
    path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        ROOT, "data", "politics", "questions-x8.ts")
    raw = io.open(path, encoding="utf-8").read()
    j = raw.find(f'id: "{qid}"')
    if j < 0:
        print(f"未找到 {qid} 于 {os.path.basename(path)}")
        return 1
    # 题块 = 从 id 到下一个 `\n  },`
    end = raw.find("\n  },", j)
    blk = raw[j:end if end > 0 else j + 6000]
    print(f"=== {qid}  @ {os.path.basename(path)} ===")
    for m in FIELD.finditer(blk):
        t = unescape(m.group(2))
        if "\n" in t:
            print(f"\n[{m.group(1)}]  换行 {t.count(chr(10))} 处")
            for l in t.split("\n"):
                print(f"    {l}")
        else:
            print(f"\n[{m.group(1)}] {t[:200]}")
    for m in ARR.finditer(blk):
        items = re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(2))
        print(f"\n[{m.group(1)}]  {len(items)} 条")
        for it in items:
            t = unescape(it)
            print("    - " + t.replace("\n", " | "))
    return 0


if __name__ == "__main__":
    sys.exit(main())
