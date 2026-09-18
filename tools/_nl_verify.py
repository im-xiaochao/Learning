# -*- coding: utf-8 -*-
"""验证「只动了换行」：逐字段比较 unwrap 前后，去掉换行后必须逐字符一致。

用法：python tools/_nl_verify.py <旧文件> <新文件>
"""
import io
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

FIELD_RE = re.compile(r'(?<![A-Za-z])(stem|explanation|translation|answerKey)\s*:\s*"((?:[^"\\]|\\.)*)"')
ARR_RE = re.compile(r'(?<![A-Za-z])(paragraphs|answerPoints|options)\s*:\s*\[(.*?)\n\s*\]', re.S)
STR_IN_ARR = re.compile(r'"((?:[^"\\]|\\.)*)"')
OPT_TEXT = re.compile(r'key\s*:\s*"[A-D]"\s*,\s*text\s*:\s*"((?:[^"\\]|\\.)*)"')


def unescape(s):
    return (s.replace("\\\\", "\x00").replace('\\"', '"')
             .replace("\\n", "\n").replace("\x00", "\\"))


def fields(path):
    """{(qid, field, idx): text}"""
    raw = io.open(path, encoding="utf-8").read()
    marks = [(m.start(), m.group(1)) for m in re.finditer(r'(?<![A-Za-z])id\s*:\s*"([^"]+)"', raw)]
    marks.append((len(raw), None))
    out = {}
    for i in range(len(marks) - 1):
        b0, qid = marks[i]
        blk = raw[b0:marks[i + 1][0]]
        for m in FIELD_RE.finditer(blk):
            out[(qid, m.group(1), 0)] = unescape(m.group(2))
        for m in ARR_RE.finditer(blk):
            key, body = m.group(1), m.group(2)
            if key == "options":
                for j, o in enumerate(OPT_TEXT.finditer(body)):
                    out[(qid, "option", j)] = unescape(o.group(1))
            else:
                for j, s in enumerate(STR_IN_ARR.finditer(body)):
                    out[(qid, key, j)] = unescape(s.group(1))
    return out


def main():
    old, new = fields(sys.argv[1]), fields(sys.argv[2])
    if set(old) != set(new):
        print("⚠️ 字段集合不同")
        print("  只在旧:", sorted(set(old) - set(new))[:8])
        print("  只在新:", sorted(set(new) - set(old))[:8])
    diff = 0
    for k in sorted(set(old) & set(new)):
        a, b = old[k], new[k]
        if a.replace("\n", "") != b.replace("\n", ""):
            diff += 1
            if diff <= 10:
                print(f"✗ {k}")
                print(f"   旧: {a[:120]!r}")
                print(f"   新: {b[:120]!r}")
    n_before = sum(t.count("\n") for t in old.values())
    n_after = sum(t.count("\n") for t in new.values())
    print(f"字段数 {len(old)}   换行 {n_before} → {n_after}")
    print("去掉换行后逐字符一致" if diff == 0 else f"✗ {diff} 个字段内容被改动")


if __name__ == "__main__":
    main()
