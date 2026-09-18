# -*- coding: utf-8 -*-
"""检查肖四 explanation 在**排版换行断点**处的形近字误读。

背景
----
肖四的解析来自《4套卷》答案解析 PDF 的 OCR。那份 PDF 是**纯扫描件**（无文本层），
文字在版面上按行排布，OCR 逐行读。于是同一句话被拆成多行，**跨行的字**就成了
形近字误读的高发点：

    把个人小我融          ← 行尾
    入国家大我，在为国…   ← 行首

OCR 把行首的「入」读成了形近的「人」，合并后变成「把个人小我**融人**国家大我」。
这类错误在**合并后的文本里看不出异常**（`融人` 也是两个字），只能回到断点处查。

判据
----
对每个断点取 A（上一行末字）+ B（下一行首字）组成的双字组 AB：

  1. A、B 必须都是汉字（排除标点 / 数字 / 拉丁字母边界）；
  2. AB **不在** jieba 词典（或频次极低）→ 说明这个跨行组合不成词；
  3. 且 A、B **至少有一方在自己那一侧站不住脚**：
       A 合理 ⟺ A 与上一行倒数第二字成词（`提出`|出），或 A 本身是常见单字（`的`）
       B 合理 ⟺ B 与下一行第二字成词（入|`国家`），或 B 本身是常见单字
     A、B 都合理 → 正常的词边界，跳过。

第 3 条是这个脚本的关键。只用「AB 不成词」会留下 250+ 条噪声——中文里跨词
组合天然不成词（`出的`、`时期和`）。真正的问题形态是「**一方合理、另一方不合理**」：
`把个人小我融|入国家大我`，`融` 与 `我` 不成词、`融` 也不是常见单字 → A 站不住脚。
换句话说，判据抓的是「有一侧的字在它那个位置**说不通**」。

输出候选的上下文，供逐条对照原 PDF。

用法：
    python tools/_x4_break_check.py [原始文件]      # 默认 .workbuddy-ai/tmp/x4-before-unwrap.ts
"""
import io
import os
import re
import sys

import jieba

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DEFAULT_SRC = os.path.join(ROOT, ".workbuddy-ai/tmp/x4-before-unwrap.ts")

FIELD = re.compile(r'(?<![A-Za-z])(explanation\s*:\s*)"((?:[^"\\]|\\.)*)"')
ID_RE = re.compile(r'id:\s*"([a-z0-9-]+)"')

CJK = re.compile(r"[\u4e00-\u9fff]")
# 频次低于此值视为「不成词」。jieba 词典里「融入」的频次是几百，
# 而「融人」根本不在词典（get 返回 0）。
MIN_FREQ = 20


def unescape(s: str) -> str:
    """把 TS 字符串字面量还原成真实文本。"""
    return (s.replace("\\\\", "\x00")
             .replace('\\"', '"')
             .replace("\\n", "\n")
             .replace("\\t", "\t")
             .replace("\x00", "\\"))


def known(w: str) -> bool:
    return jieba.dt.FREQ.get(w, 0) >= MIN_FREQ


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    raw = io.open(src, encoding="utf-8").read()

    # 建立「字段起始偏移 → 所属题 id」的映射
    ids = [(m.start(), m.group(1)) for m in ID_RE.finditer(raw)]

    def qid_at(pos: int) -> str:
        cur = "?"
        for off, q in ids:
            if off > pos:
                break
            cur = q
        return cur

    jieba.initialize()

    n_break = 0
    cands = []
    for m in FIELD.finditer(raw):
        qid = qid_at(m.start())
        body = unescape(m.group(2))
        if "\n" not in body:
            continue
        lines = body.split("\n")
        for i in range(len(lines) - 1):
            a_line, b_line = lines[i], lines[i + 1]
            if not a_line or not b_line:
                continue
            n_break += 1
            A, B = a_line[-1], b_line[0]
            if not (CJK.match(A) and CJK.match(B)):
                continue
            AB = A + B
            if known(AB):
                continue
            # A 在自己那一侧是否站得住脚：与上一行倒数第二字成词，或本身是常见单字
            A2 = (a_line[-2] + A) if len(a_line) >= 2 else ""
            a_ok = known(A) or bool(A2 and known(A2))
            # B 同理：与下一行第二字成词，或本身是常见单字
            B2 = (B + b_line[1]) if len(b_line) >= 2 else ""
            b_ok = known(B) or bool(B2 and known(B2))
            if a_ok and b_ok:
                continue        # 正常的词边界
            cands.append((qid, AB, A2, B2, a_ok, b_ok, a_line[-16:], b_line[:16]))

    print(f"断点总数 {n_break}")
    print(f"候选 {len(cands)} 处")
    print()
    for qid, AB, A2, B2, a_ok, b_ok, tail, head in cands:
        print(f"· {qid}  跨行组合「{AB}」  A合理:{a_ok} B合理:{b_ok}")
        print(f"    上一行尾: …{tail}")
        print(f"    下一行首: {head}…")
        print(f"    A+前字「{A2}」  B+后字「{B2}」")
        print()


if __name__ == "__main__":
    main()
