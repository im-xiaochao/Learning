# -*- coding: utf-8 -*-
"""材料题正文的**标点 / 结构异常**扫描。

为什么需要
----------
前面三个探测器都盯着「字」：不一致扫描看跑法差异、窗口扫描看四源归属、词法扫描看
词典。但 OCR 还会**吞标点**和**造标点**，这几种都漏掉：
  · `完成修，,向公众开放` —— 吞了「缮」，又把逗号读成两个（`，` + `,`）
  · `从"一五"到十四五"` —— 吞了「十四五」前面的开引号
  · `进行斗争毛泽东同志把…` —— 吞了句号
  · `夜半临深池"摘编自《人民日报》` —— 出处注前少了句号
这些不影响「词」的成立，词法与窗口都发现不了。

判据（逐条都是**规则**，不是启发式，误报率低）
------------------------------------------------
  1. 连续同类标点（`，，`、`。。`、`、,` …）
  2. 半角标点夹在汉字之间（`汉字,汉字`）
  3. 中文串里出现 ASCII 引号 `"` / `'`
  4. 引号 / 括号不配对（`“` ≠ `”`、`（` ≠ `）`）
  5. 两个汉字之间夹空格
  6. 出处注（`摘编自`/`摘自`/`选自`）前一个字符不是句末标点或后引号
  7. 单个 `…`（原书统一用 `……`）
  8. 段落末尾不是句末标点

用法：
    python tools/_x8_punct.py <material.json>
"""
import io
import json
import re
import sys

HALF = ",;:?!"
RULES = [
    ("连续同类标点", re.compile(r"[，。；：、]{2,}|[,;:?!]{2,}|[，。；：、][,;:?!]|[,;:?!][，。；：、]")),
    ("半角标点夹在汉字间", re.compile(r"[\u4e00-\u9fff][,;:?!][\u4e00-\u9fff]")),
    ("中文串里的 ASCII 引号", re.compile(r"[\u4e00-\u9fff][\"'][\u4e00-\u9fff]|[\u4e00-\u9fff][\"'][，。]|[\"'][\u4e00-\u9fff]")),
    ("汉字间夹空格", re.compile(r"[\u4e00-\u9fff] [\u4e00-\u9fff]")),
    ("出处注前缺句末标点", re.compile(r"[^。！？””\n](摘编自|摘自|选自)")),
    ("单个省略号", re.compile(r"(?<!…)…(?!…)")),
]


def main():
    mat = json.load(io.open(sys.argv[1], encoding="utf-8"))["sets"]
    n_hit = 0
    for s in sorted(mat, key=int):
        for n in sorted(mat[s], key=int):
            q = mat[s][n]
            texts = [(f"材料段{i+1}", p) for i, p in enumerate(q.get("paragraphs") or [])]
            texts.append(("题干", q.get("stem") or ""))
            for label, t in texts:
                hits = []
                for name, rx in RULES:
                    for m in rx.finditer(t):
                        hits.append((name, m.start(), m.group(0)))
                if t.count("“") != t.count("”"):
                    hits.append(("引号不配对", 0, f"“x{t.count('“')} ”x{t.count('”')}"))
                if t.count("（") != t.count("）"):
                    hits.append(("括号不配对", 0, f"（x{t.count('（')} ）x{t.count('）')}"))
                if t and t[-1] not in "。！？””…）":
                    hits.append(("段末非句末标点", len(t) - 1, t[-1]))
                if hits:
                    n_hit += 1
                    print("第%s套 %s题 %s" % (s, n, label))
                    for name, i, g in hits:
                        print("   [%s] 「%s」  …%s…" % (name, g, t[max(0, i - 24):i + 26]))
                    print()
    print("=== 命中 %d 处 ===" % n_hit)


main()
