# -*- coding: utf-8 -*-
"""在肖四解析里定位「疑似形近字误读」的位置。

为什么需要它
------------
肖四解析来自扫描件 OCR。OCR 最常见的错误是**形近字混淆**——`入`/`人`、`己`/`已`、
`拨`/`拔`……这类错误会让一个词变成「两个都不成词的相邻字」：

    深入开展  →  jieba: [深入][开展]        正常
    深人开展  →  jieba: [深][人][开展]      ← 出现连续单字，可疑

反过来，从「词频」也能看出来：`深入` 高频、`深人` 不成词。

判据
----
1. 把字段按句读切段，逐段分词；
2. 找出**连续 ≥2 个单字**的位置（正常中文里连续单字很少见，多数是专名或误读）；
3. 报出上下文，供人工/裁原图判读。

⚠️ 输出是**候选**不是结论。专有名词（人名、地名、古文引语）会天然产生连续单字，
   必须逐条判读。

用法：
    python tools/_x4_lexcheck.py [文件] [--all]
"""

import io
import os
import re
import sys

import jieba

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DEFAULT_SRC = os.path.join(ROOT, "data/politics/questions.ts")

ID_RE = re.compile(r'id:\s*"([a-z0-9-]+)"')
FIELD = re.compile(r'(?<![A-Za-z])(explanation|answerPoints)\s*:\s*"((?:[^"\\]|\\.)*)"')
SPLIT = re.compile(r"[，。；：？！、\n（）()“”《》—…]+")
RUN = 2          # 连续几个单字才算候选


def unescape(s: str) -> str:
    return (s.replace("\\\\", "\x00")
             .replace('\\"', '"')
             .replace("\\n", "\n")
             .replace("\x00", "\\"))


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    show_all = "--all" in sys.argv
    raw = io.open(src, encoding="utf-8").read()
    ids = [(m.start(), m.group(1)) for m in ID_RE.finditer(raw)]

    def qid_at(pos):
        cur = "?"
        for off, q in ids:
            if off > pos:
                break
            cur = q
        return cur

    jieba.initialize()

    hits = []
    for m in FIELD.finditer(raw):
        qid = qid_at(m.start())
        body = unescape(m.group(2))
        for seg in SPLIT.split(body):
            seg = seg.strip()
            if len(seg) < 2:
                continue
            words = list(jieba.cut(seg, HMM=False))
            # 找连续单字串
            i = 0
            while i < len(words):
                if len(words[i]) == 1 and re.match(r"[\u4e00-\u9fff]", words[i]):
                    j = i
                    while (j < len(words) and len(words[j]) == 1
                           and re.match(r"[\u4e00-\u9fff]", words[j])):
                        j += 1
                    if j - i >= RUN:
                        run = "".join(words[i:j])
                        # 上下文
                        ctx = seg
                        k = ctx.find(run)
                        hits.append((qid, run, ctx[max(0, k - 14):k + len(run) + 14]))
                    i = j
                else:
                    i += 1

    print(f"连续 {RUN}+ 单字的位置：{len(hits)} 处")
    print()
    from collections import Counter
    c = Counter(r for _, r, _ in hits)
    print(f"去重后 {len(c)} 种")
    print()
    for run, n in c.most_common(200):
        sample = next(h for _, r, h in hits if r == run)
        print(f"  ×{n:<3d} 「{run}」   …{sample}…")


if __name__ == "__main__":
    main()
