# -*- coding: utf-8 -*-
"""扫描题库里的硬换行（TS 源里的 `\\n` 转义），按「换行位置」分类。

背景：`explanation` / `answerPoints` 来自《答案解析》PDF 的**文本层**，文本层保留了
PDF 的排版换行。这些换行在 TS 里是 `\n` 转义 → 小程序渲染成真换行 → 用户在词中间
看到断行（`大洋` | `洲`、`1` | `亿人`）。

注意 TS 对象字面量的键**不带引号**（`explanation:` 而不是 `"explanation":`），
所以正则不能给键加引号——加了会一个都匹配不上（踩过）。

分类：
  · 换行前一个字是句末标点（。！？；：”》…）→ 疑似**段落分隔**，先保留待人工判
  · `材料 N` 独立成行的标题 → **故意**的换行，保留
  · 其余 → **排版换行**，应当删除（中文拼接不需要空格）

用法：python tools/_nl_audit.py [--list]
"""
import io
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SENT_END = "。！？；：”》…）】"
KEEP_RE = re.compile(r"^材料\s*\d\s*$")

# 键不带引号
FIELD_RE = re.compile(r'(?<![A-Za-z])(stem|explanation|translation|answerKey)\s*:\s*"((?:[^"\\]|\\.)*)"')
ARR_RE = re.compile(r'(?<![A-Za-z])(paragraphs|answerPoints|options)\s*:\s*\[(.*?)\n\s*\]', re.S)
STR_IN_ARR = re.compile(r'"((?:[^"\\]|\\.)*)"')
OPT_TEXT = re.compile(r'key\s*:\s*"[A-D]"\s*,\s*text\s*:\s*"((?:[^"\\]|\\.)*)"')


def unescape(s: str) -> str:
    return (s.replace("\\\\", "\x00")
             .replace('\\"', '"')
             .replace("\\n", "\n")
             .replace("\x00", "\\"))


def fields(path: str):
    """yield (qid, field, text)"""
    raw = io.open(path, encoding="utf-8").read()
    marks = [(m.start(), m.group(1)) for m in re.finditer(r'(?<![A-Za-z])id\s*:\s*"([^"]+)"', raw)]
    if not marks:
        raise SystemExit(f"⚠️ {path}: 没找到任何 id，正则可能不匹配")
    marks.append((len(raw), None))
    for i in range(len(marks) - 1):
        b0, qid = marks[i]
        b1 = marks[i + 1][0]
        blk = raw[b0:b1]
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
    show = "--list" in sys.argv
    total = {"排版换行": 0, "疑似段落": 0, "材料标题": 0}
    hits = []
    for f in ("data/politics/questions.ts", "data/politics/questions-x8.ts"):
        p = os.path.join(ROOT, f)
        per = {"排版换行": 0, "疑似段落": 0, "材料标题": 0}
        byfield = {}
        nq = 0
        for qid, fld, t in fields(p):
            if "\n" not in t:
                continue
            nq += 1
            for m in re.finditer(r"\n", t):
                i = m.start()
                prev = t[i - 1] if i > 0 else ""
                ls = t.rfind("\n", 0, i) + 1
                # 换行**之前**那一行。用 `t[ls:i]` 而不是 `t[ls:le]`：
                # 串里只有一个换行时 `find(..., i+1)` 返回 -1，`t[ls:-1]` 会把
                # 整段当成「这一行」，`材料 1` 这类标题就永远匹配不上（踩过）。
                line = t[ls:i]
                if KEEP_RE.match(line.strip()):
                    per["材料标题"] += 1
                    total["材料标题"] += 1
                    continue
                kind = "疑似段落" if prev in SENT_END else "排版换行"
                per[kind] += 1
                total[kind] += 1
                byfield[fld] = byfield.get(fld, 0) + 1
                if show:
                    hits.append((kind, qid, fld, t[max(0, i - 18): i + 18]))
        print(f"=== {f}   含换行的字段 {nq} 个")
        for k, v in per.items():
            print(f"    {k}: {v}")
        print(f"    按字段: {byfield}")
    print()
    print("=== 合计 ===")
    for k, v in total.items():
        print(f"  {k}: {v}")
    if show:
        print()
        print("=== 明细 ===")
        for tag, qid, fld, ctx in hits:
            print(f"[{tag}] {qid} {fld}")
            print(f"    {ctx!r}")


if __name__ == "__main__":
    main()
