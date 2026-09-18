# -*- coding: utf-8 -*-
"""`_nl_unwrap` 的验收报告：统计换行保留数，并列出「仍可能断在词中间」的残留。

用法：
    python tools/_nl_report.py            # 只出统计
    python tools/_nl_report.py --show 12  # 再列 12 条「被保留的换行」样例
"""
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _nl_unwrap import unwrap, vwidth, FULL_W, KEEP_LINE  # noqa: E402

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FIELD_RE = re.compile(r'(?<![A-Za-z])(stem|explanation|translation)\s*:\s*"((?:[^"\\]|\\.)*)"')
ARR_RE = re.compile(r'(?<![A-Za-z])(paragraphs|answerPoints|options)\s*:\s*\[(.*?)\n\s*\]', re.S)
STR_IN_ARR = re.compile(r'"((?:[^"\\]|\\.)*)"')
OPT_TEXT = re.compile(r'key\s*:\s*"[A-D]"\s*,\s*text\s*:\s*"((?:[^"\\]|\\.)*)"')

# 汉字之间不该出现的断点：前一个字不是标点、后一个字不是标点 → 疑似断在词中间
BAD_BREAK = re.compile(r"[\u4e00-\u9fff0-9A-Za-z][\n](?=[\u4e00-\u9fff0-9A-Za-z])")


def bad_count(t: str) -> int:
    """「断在词中间」的换行数。

    ⚠️ 必须逐行判并排除 `材料 N` 与正文之间的换行——那是 `_nl_unwrap.KEEP_LINE`
    **有意保留**的标签换行（`材料 1` 独占一行）。拿 `BAD_BREAK` 直接扫全文会把它
    误报成「断在词中间」（`1` 和 `习` 都是实义字符，正则看不出 `材料 1` 是标签）。
    """
    lines = t.split("\n")
    n = 0
    for i in range(1, len(lines)):
        if KEEP_LINE.match(lines[i - 1].strip()):
            continue
        if BAD_BREAK.search(lines[i - 1][-1:] + "\n" + lines[i][:1]):
            n += 1
    return n


def unescape(s):
    return (s.replace("\\\\", "\x00").replace('\\"', '"')
             .replace("\\n", "\n").replace("\x00", "\\"))


def fields(path):
    raw = io.open(path, encoding="utf-8").read()
    marks = [(m.start(), m.group(1)) for m in re.finditer(r'(?<![A-Za-z])id\s*:\s*"([^"]+)"', raw)]
    marks.append((len(raw), None))
    for i in range(len(marks) - 1):
        b0, qid = marks[i]
        blk = raw[b0:marks[i + 1][0]]
        for m in FIELD_RE.finditer(blk):
            yield qid, m.group(1), unescape(m.group(2))
        for m in ARR_RE.finditer(blk):
            key, body = m.group(1), m.group(2)
            if key == "options":
                for o in OPT_TEXT.finditer(body):
                    yield qid, "option", unescape(o.group(1))
            else:
                for s in STR_IN_ARR.finditer(body):
                    yield qid, key, unescape(s.group(1))


def main():
    show = 0
    if "--show" in sys.argv:
        show = int(sys.argv[sys.argv.index("--show") + 1])
    kept_samples = []
    for f in ("data/politics/questions.ts", "data/politics/questions-x8.ts"):
        n_before = n_after = 0
        bad_before = bad_after = 0
        nf = 0
        for qid, fld, t in fields(os.path.join(ROOT, f)):
            if "\n" not in t:
                continue
            nf += 1
            u = unwrap(t)
            n_before += t.count("\n")
            n_after += u.count("\n")
            bad_before += bad_count(t)
            bad_after += bad_count(u)
            if show:
                for ln in u.split("\n")[1:]:
                    i = u.find(ln)
                    kept_samples.append((qid, fld, u[max(0, i - 22): i + 22]))
        print(f"=== {f}   含换行字段 {nf}")
        print(f"    换行 {n_before} → {n_after}（保留 {n_after}）")
        print(f"    疑似断在词中间 {bad_before} → {bad_after}")
    if show:
        print()
        print(f"=== 保留的换行样例（前 {show} 条）===")
        for qid, fld, ctx in kept_samples[:show]:
            print(f"  {qid} {fld}: …{ctx}…")


if __name__ == "__main__":
    main()
