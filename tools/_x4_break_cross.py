# -*- coding: utf-8 -*-
"""对肖四解析的**排版换行断点**做跨 OCR 跑对比，找出形近字误读。

为什么需要它
------------
肖四的解析来自《4套卷》答案解析 PDF 的 OCR，那份 PDF 是纯扫描件。文字在版面上
按行排布，OCR 逐行读，同一句话被拆成多行：

    把个人小我融          ← 行尾
    入国家大我，在为国…   ← 行首

OCR 把行首的「入」读成了形近的「人」，合并后成了「把个人小我**融人**国家大我」。
这种错误在合并后的文本里**看不出异常**（`融人` 也是两个字），从文本内部也无法用
词频判据区分——`融` 和 `人` 各自都是合法单字，而中文排版断行本来就允许出现在
任何字之间（`提出的`、`时期和` 都是正常的跨词组合）。

唯一可靠的办法是**回到 OCR 源**：同一页有三个不同 dpi 的独立跑
（`s4ans` / `s4ans-merged` / `s4ans300`），同一个位置读法不同就说明有人读错了。

判据
----
1. 取 `explanation` / `answerPoints` 里的**每一个排版换行断点**，用上一行末尾 8 字
   作锚点，在**另一跑**的拼接流里定位，取同长度的后续文本做字符级对齐；
2. 只保留**等长的短替换段（≤2 字）**——那才是形近字误读；
   长度不等的差异（insert/delete）是丢行/串行/水印混入，属另一类问题；
   长替换段（>2 字）几乎都是「恰好等长的错位」，另一跑在这里丢了行把后面顶上来；
3. 报出两跑读法，供裁原图定夺。

⚠️ 局限：只能发现「两跑不一致」的位置。**两跑都读错**的地方抓不到——
   那种情况必须裁原图逐字读（`_x4_break_cross.py` 之外的功夫）。

用法：
    python tools/_x4_break_cross.py [原始文件]
"""

import difflib
import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DEFAULT_SRC = os.path.join(ROOT, ".workbuddy-ai/tmp/x4-before-unwrap.ts")
ROWS = os.path.join(ROOT, ".workbuddy-ai/tmp/rows")

ID_RE = re.compile(r'id:\s*"([a-z0-9-]+)"')
# explanation 与 answerPoints 都是字符串字段，都来自同一份 PDF
FIELD = re.compile(r'(?<![A-Za-z])(explanation|answerPoints)\s*:\s*"((?:[^"\\]|\\.)*)"')
CJK = re.compile(r"[\u4e00-\u9fff]")
KEEP = re.compile(r"[^\u4e00-\u9fff0-9A-Za-z]")
ANCHOR = 8       # 锚点取上一行末尾几字
TAIL = 12        # 比较窗口取下一行开头几字
MAX_REP = 2      # 形近字误读的替换段长度上限


def unescape(s: str) -> str:
    return (s.replace("\\\\", "\x00")
             .replace('\\"', '"')
             .replace("\\n", "\n")
             .replace("\t", "\t")
             .replace("\x00", "\\"))


def load_stream(path: str) -> str:
    """把一跑 OCR 的所有行按「页序 + y 序」拼成一个连续流（去标点空白）。"""
    pages = {}
    for line in io.open(path, encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        pages[d["page"]] = d["rows"]
    parts = []
    for pg in sorted(pages):
        for r in sorted(pages[pg], key=lambda x: x["y"]):
            parts.append(r["text"])
    return KEEP.sub("", "".join(parts))


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    raw = io.open(src, encoding="utf-8").read()
    ids = [(m.start(), m.group(1)) for m in ID_RE.finditer(raw)]

    def qid_at(pos):
        cur = "?"
        for off, q in ids:
            if off > pos:
                break
            cur = q
        return cur

    # 收集所有断点（不再用「跨行组合不成词」过滤——正常词边界的断点两跑应当一致，
    # 不会产生差异；而「成词」的组合里也可能藏着误读，如 `X人` 恰好是词）
    cands = []
    for m in FIELD.finditer(raw):
        qid = qid_at(m.start())
        fld = m.group(1)
        body = unescape(m.group(2))
        if "\n" not in body:
            continue
        lines = body.split("\n")
        for i in range(len(lines) - 1):
            a_line, b_line = lines[i], lines[i + 1]
            if len(KEEP.sub("", a_line)) < ANCHOR or len(KEEP.sub("", b_line)) < 2:
                continue
            A, B = a_line.rstrip()[-1], b_line.lstrip()[0]
            if not (CJK.match(A) and CJK.match(B)):
                continue
            cands.append((qid, fld, a_line, b_line))

    print(f"断点总数：{len(cands)} 处（explanation + answerPoints）")
    print()

    streams = {}
    for f in ("s4ans.rows.jsonl", "s4ans300.rows.jsonl", "s4ans-merged.rows.jsonl"):
        p = os.path.join(ROWS, f)
        if os.path.exists(p):
            streams[f] = load_stream(p)
            print(f"  载入 {f}: {len(streams[f])} 字")
    print()

    # 差异分三类，必须分开看：
    #   · 短替换（≤2 字，等长）→ **形近字误读**，本脚本的目标；
    #   · 长替换（等长但 >2 字）→ 恰好等长的错位；
    #   · insert/delete → 丢行/串行/水印混入。
    sub_hits, mid_hits, other_hits = [], [], []
    for qid, fld, a_line, b_line in cands:
        anchor = KEEP.sub("", a_line)[-ANCHOR:]
        ours = anchor + KEEP.sub("", b_line)[:TAIL]
        for f, s in streams.items():
            i = s.find(anchor)
            if i < 0:
                continue
            theirs = s[i:i + len(ours)]
            if theirs == ours:
                continue
            ops = difflib.SequenceMatcher(None, ours, theirs, autojunk=False).get_opcodes()
            reps = [(ours[a:b], theirs[c:d]) for tag, a, b, c, d in ops if tag == "replace"]
            if not reps or not all(len(x) == len(y) for x, y in reps):
                other_hits.append((qid, fld, ours, theirs))
            elif all(len(x) <= MAX_REP for x, y in reps):
                sub_hits.append((qid, fld, f, reps, ours, theirs, a_line, b_line))
            else:
                mid_hits.append((qid, fld, f, reps, ours, theirs, a_line, b_line))
            break

    print(f"★ 短替换（形近字误读）：{len(sub_hits)} 处")
    print()
    for qid, fld, f, reps, ours, theirs, a_line, b_line in sub_hits:
        r = " / ".join(f"「{x}」→「{y}」" for x, y in reps)
        print(f"· {qid}  [{fld}]  {r}   （来自 {f}）")
        print(f"    上一行尾: …{a_line[-14:]}")
        print(f"    下一行首: {b_line[:14]}…")
        print(f"    我们: {ours}")
        print(f"    另跑: {theirs}")
        print()

    if mid_hits:
        print(f"（等长但替换段 >{MAX_REP} 字：{len(mid_hits)} 处，多为等长错位，抽样 5 条）")
        for qid, fld, f, reps, ours, theirs, a_line, b_line in mid_hits[:5]:
            r = " / ".join(f"「{x}」→「{y}」" for x, y in reps)
            print(f"· {qid}  [{fld}]  {r}   （来自 {f}）")
            print(f"    我们: {ours}")
            print(f"    另跑: {theirs}")
        print()
    print(f"（长度不等的差异 {len(other_hits)} 处：丢行/串行/水印，不在本脚本范围）")


if __name__ == "__main__":
    main()
