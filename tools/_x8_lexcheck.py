# -*- coding: utf-8 -*-
"""材料题正文的**词法**扫描——抓四个 OCR 源一起读错的位置。

为什么需要第三个探测器
----------------------
  · `_x8_disagree.py`：抓「跑法之间不一致」。三跑一致读错时看不见。
  · `_x8_matcheck.py`：抓「四个源里都找不到」。四个源**一起**读错时同样看不见。
`同仇敌忾` → 四源一致读成 `同仇敌屹` 就是这类：不一致扫描只报出旁边的 `仇/优`，
`屹` 是人工判读时顺带看出来的。

判据
----
用 jieba 分词（其词典约 35 万词），把材料正文切出来的 token 分两类打出来：
  1. **单字 token 且 jieba 词频为 0** —— 正常中文里几乎不出现孤立的生僻单字，
     命中多半是「词被读坏」：`雒`(英雄)、`藓`(鲜血)、`屹`(敌忾)、`钨`(大鸨)。
  2. **多字 token 不在 jieba 词典里** —— 如 `涅架`、`璐安`、`涫染`、`热披词`。

**输出是候选，不是结论**：专有名词（`潞安`、`邹彬`）、新造词（`新质生产力`）会误报，
必须逐条对照原书图片（`tools/_crop_raw.py`）才能改。

用法：
    python tools/_x8_lexcheck.py <material.json>
"""
import io
import json
import re
import sys
from collections import Counter

import jieba

KEEP = re.compile(r"[\u4e00-\u9fff]+")
# 免检白名单：jieba 词典里没有但在本书里完全合法的词
WHITE = {
    "新质生产力", "中国式现代化", "全过程人民民主", "人类命运共同体", "全球文明倡议",
    "全球安全倡议", "全球发展倡议", "上合组织", "亚太经合组织", "二十届四中全会",
    "十五五", "十四五", "绿水青山", "邹彬", "宋学文", "郑文星", "张秉贵", "林同楠",
    "温榆河", "斑头秋沙鸭", "青头潜鸭", "黄胸鹀", "大鸨", "飞播造林", "换电柜",
    "沉浸式调研", "清朗", "花式汇报", "盲人骑瞎马", "夜半临深池", "一抔热土",
    "休戚与共", "荣辱与共", "生死与共", "命运与共", "挺膺担当", "心无旁骛",
    "中流砥柱", "赓续", "峥嵘", "兢兢业业", "普惠包容", "潞安", "会晤", "福祉",
    "斗殴", "渲染", "热搜词", "狼狈", "擅自", "惹事", "告诫", "阻遏", "戍边",
    "同仇敌忾", "涅槃", "位卑未敢忘忧国", "汲取", "一瞥", "舆论场", "敢于正视",
}
WHITE_CH = set("峥嵘兢惕屹鸨鹀鹬鹭鸥鸫鹃鸦鹊鹂鹏鹤鹰鹞鹦鹭鸥鸻鹬鸨")


def main():
    mat = json.load(io.open(sys.argv[1], encoding="utf-8"))["sets"]
    # 必须先 initialize：jieba 是懒加载的，`initialize()` 会**重新赋值** `dt.FREQ`，
    # 先取引用再分词会拿到一张空表（`中国`/`发展` 都会被判成「不在词典里」）。
    jieba.initialize()
    freq = jieba.dt.FREQ
    bad1, bad2 = Counter(), Counter()
    ctx1, ctx2 = {}, {}
    for s in sorted(mat, key=int):
        for n in sorted(mat[s], key=int):
            q = mat[s][n]
            for para in (q.get("paragraphs") or []):
                for run in KEEP.finditer(para):
                    t = run.group(0)
                    for tok in jieba.cut(t):
                        if not KEEP.fullmatch(tok or ""):
                            continue
                        if tok in WHITE:
                            continue
                        if len(tok) == 1:
                            if freq.get(tok, 0) == 0 and tok not in WHITE_CH:
                                bad1[tok] += 1
                                ctx1.setdefault(tok, (s, n, t[:70]))
                        elif len(tok) >= 2 and tok not in freq:
                            bad2[tok] += 1
                            ctx2.setdefault(tok, (s, n, t[:70]))

    print("=== ① 词频为 0 的孤立单字（%d 种）===" % len(bad1))
    for k, v in bad1.most_common():
        s, n, t = ctx1[k]
        print("  「%s」x%d  第%s套%s题  %s" % (k, v, s, n, t))
    print("\n=== ② 不在词典里的多字词（%d 种）===" % len(bad2))
    for k, v in bad2.most_common():
        s, n, t = ctx2[k]
        print("  「%s」x%d  第%s套%s题  %s" % (k, v, s, n, t))


main()
