# -*- coding: utf-8 -*-
"""形近字对扫描：找出「把某个字换成形近字后，变成高频词」的位置。

为什么需要它
------------
`_x4_nearmiss.py` 的判据是「候选双字组不在 jieba 词典」——**这条判据有个致命盲区**：
jieba 词典本身就收了一些错字词，最典型的是 `自已`（freq=263，其实是 `自己` 的误写）。
凡是「错字也被词典收了」的，那条路永远抓不到。

本脚本换判据：**频次比**。对每个形近字对 (X 误, Y 正)，
  · 取库里含 X 的 2 字窗口，把 X 换成 Y 得到候选词；
  · 若 `freq(候选) / freq(原词)` 很大（默认 ≥ 20）且 `freq(候选)` 够高（默认 ≥ 500），
    则该处极可能是形近字误读。

为什么用频次比而不是「不在词典」
--------------------------------
`自已` freq=263 不是 0，所以「不在词典」判不出来。但 `自己` freq 是它的几百倍——
「同一个人在同一本书里，99.6% 写 `自己`、0.4% 写 `自已`」这件事本身就是证据。

⚠️ 输出是**候选**不是结论。专有名词、古文引语里会有合法的低频组合，
   必须逐条判读（本脚本只负责把 43k 字压到十几条）。

用法：
    python tools/_glyph_pairs.py [文件...] [--min-ratio 20] [--min-good 500]
"""

import io
import os
import re
import sys
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import jieba  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

CJK = re.compile(r"[\u4e00-\u9fff]")

# 形近字对：(误, 正)。左列是常见的 OCR 误读，右列是正字。
# 只列**字形相近、且正字在高频词里常见**的——否则噪声会淹没信号。
PAIRS = [
    ("已", "己"),   # 自已/自己、已/己
    ("己", "已"),   # 反向：己经/已经（对称扫，两条都要）
    ("巳", "已"),
    ("人", "入"),   # 融人/融入、深人/深入
    ("入", "人"),
    ("拨", "拔"),   # 拨乱/拔乱
    ("拔", "拨"),
    ("末", "未"),
    ("未", "末"),
    ("土", "士"),
    ("士", "土"),
    ("曰", "日"),
    ("汩", "汨"),
    ("剌", "刺"),
    ("荼", "茶"),
    ("候", "侯"),
    ("侯", "候"),
    ("兔", "免"),
    ("免", "兔"),
    ("洒", "酒"),
    ("酒", "洒"),
    ("幻", "幼"),
    ("幼", "幻"),
    ("夭", "天"),
    ("干", "千"),
    ("千", "干"),
    ("戌", "戍"),
    ("戍", "戌"),
    ("毋", "母"),
    ("今", "令"),
    ("令", "今"),
    ("祟", "崇"),
    ("崇", "祟"),
    ("忝", "恭"),
    ("俱", "具"),
    ("具", "俱"),
    ("梁", "染"),
    ("染", "梁"),
    ("藉", "籍"),
    ("籍", "藉"),
    ("署", "暑"),
    ("暑", "署"),
    ("治", "冶"),
    ("冶", "治"),
    ("辨", "辩"),
    ("辩", "辨"),
    ("即", "既"),
    ("既", "即"),
    ("恼", "脑"),
    ("脑", "恼"),
    ("慕", "幕"),
    ("幕", "慕"),
    ("蓝", "篮"),
    ("篮", "蓝"),
    ("担", "耽"),
    ("密", "蜜"),
    ("蜜", "密"),
    ("燥", "躁"),
    ("躁", "燥"),
    ("幅", "副"),
    ("副", "幅"),
    ("帐", "账"),
    ("账", "帐"),
    ("作", "做"),
    ("做", "作"),
]

# 标量字段（`stem: "..."`）。
FIELD = re.compile(r'(?<![A-Za-z])(stem|explanation|text)\s*:\s*"((?:[^"\\]|\\.)*)"')
# 数组字段（`paragraphs: [...]` / `answerPoints: [...]` / `options: [{...}]`）。
# ⚠️ 漏掉这个会静默跳过材料段落——`自已` 有 2/3 就藏在 paragraphs 里（踩过）。
ARR_FIELD = re.compile(r'(?<![A-Za-z])(paragraphs|answerPoints|options)\s*:\s*\[(.*?)\n\s*\]', re.S)
STR = re.compile(r'"((?:[^"\\]|\\.)*)"')


def iter_bodies(raw: str):
    """依次产出 (字段名, 未转义的正文)。覆盖标量字段与数组字段里的每个字符串。"""
    for m in FIELD.finditer(raw):
        yield m.group(1), m.start(), unescape(m.group(2))
    for m in ARR_FIELD.finditer(raw):
        for s in STR.finditer(m.group(2)):
            yield m.group(1), m.start(), unescape(s.group(1))


def unescape(s: str) -> str:
    out = []
    i = 0
    while i < len(s):
        if s[i] == "\\" and i + 1 < len(s):
            n = s[i + 1]
            out.append({"n": "\n", "t": "\t", '"': '"', "\\": "\\"}.get(n, n))
            i += 2
        else:
            out.append(s[i])
            i += 1
    return "".join(out)


def freq(w: str) -> int:
    return jieba.dt.FREQ.get(w, 0)


def qid_at(raw: str, pos: int) -> str:
    j = raw.rfind('id: "', 0, pos)
    if j < 0:
        return "?"
    k = raw.find('"', j + 5)
    return raw[j + 5:k]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    min_ratio, min_good = 20.0, 500
    for a in sys.argv[1:]:
        if a.startswith("--min-ratio"):
            min_ratio = float(a.split("=")[1])
        elif a.startswith("--min-good"):
            min_good = int(a.split("=")[1])

    jieba.initialize()
    files = args or [os.path.join(ROOT, "data", "politics", "questions.ts"),
                     os.path.join(ROOT, "data", "politics", "questions-x8.ts")]

    hits = []
    for path in files:
        raw = io.open(path, encoding="utf-8").read()
        for _fld, start, body in iter_bodies(raw):
            qid = qid_at(raw, start)
            for i, ch in enumerate(body):
                for bad, good in PAIRS:
                    if ch != bad:
                        continue
                    # 两种窗口：候选在左（ch 后跟一字）与在右（ch 前接一字）
                    for lo, hi in ((i, i + 2), (i - 1, i + 1)):
                        if lo < 0 or hi > len(body):
                            continue
                        seg = body[lo:hi]
                        if len(seg) != 2 or not all(CJK.match(c) for c in seg):
                            continue
                        cand = seg.replace(bad, good)
                        f_cur, f_new = freq(seg), freq(cand)
                        if f_new >= min_good and f_cur * min_ratio <= f_new:
                            hits.append((os.path.basename(path), qid, seg, cand,
                                         f_cur, f_new, body[max(0, lo - 18):hi + 18]))

    print(f"扫描 {len(files)} 个文件，{len(PAIRS)} 组形近字对")
    print(f"判据：freq(候选) ≥ {min_good} 且 ≥ {min_ratio:g}× freq(原)")
    print(f"候选 {len(hits)} 处")
    print()

    # 按 (原串, 候选) 归并，同一种误读只打印一次上下文示例
    grouped = defaultdict(list)
    for h in hits:
        grouped[(h[2], h[3], h[4], h[5])].append(h)

    for (seg, cand, fc, fn), lst in sorted(grouped.items(), key=lambda x: -x[0][3]):
        print(f"· 「{seg}」→「{cand}」   freq {fc} → {fn}   （{len(lst)} 处）")
        for f, qid, *_rest, ctx in lst[:4]:
            print(f"    {f} {qid}: …{ctx}…")
        if len(lst) > 4:
            print(f"    …还有 {len(lst) - 4} 处")
        print()


if __name__ == "__main__":
    main()
