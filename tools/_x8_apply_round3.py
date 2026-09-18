# -*- coding: utf-8 -*-
"""第 3 轮人工补丁：材料正文全量校读后发现的形近字 / 缺标点 / 半角引号。

背景
----
`_misschar.py`（删字启发式）与 `_x8_lexcheck.py`（词法）都只能抓「缺字」，
抓不到**形近字替换**（`抗白`/`抗日`、`螨珊`/`蹒跚`、`票赋`/`禀赋`）——
替换后的串仍然是合法字序列，词频判据不敏感。

所以这一轮改用最笨也最可靠的办法：把 8 套材料正文（181 段 / 2.3 万字）
全量打印出来逐字校读，再把每一条候选裁原书图片逐字确认。

用法
----
    python tools/_x8_apply_round3.py            # dry-run，只报命中数
    python tools/_x8_apply_round3.py --apply    # 写入 _x8-manual.json
"""
import collections
import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MANUAL = os.path.join(HERE, "_x8-manual.json")

# (坏形, 正形)。坏形必须匹配 **apply_typos 看到的原文**（即 norm_punct 之前的文本，
# 标点还是半角的）。每条都在原书上逐字核对过。
NEW = [
    # —— 形近字 / 缺字 ——
    ("抗白民族统一战线", "抗日民族统一战线"),          # 1-36 段1，原书 p10「是对抗日民族统一战线」
    ("典论场", "舆论场"),                              # 2-34 段3，原书 p18「舆论场上也不乏批评」
    ("螨珊步履", "蹒跚步履"),                          # 2-34 段4，原书 p18「跋涉中的蹒跚步履」
    ("乘持天下情怀", "秉持天下情怀"),                  # 2-38 段3，原书 p21（单字级放大确认是「秉」）
    ("严于律已", "严于律己"),                          # 6-37 段11，原书 p62
    ("伤人害已", "伤人害己"),                          # 7-38 段1，原书 p73
    ("都不会得！", "都不会得逞！"),                    # 4-38 段2，原书 p42「图谋都不会得逞！」
    # —— 缺标点 / 多标点 ——
    ("完成修，,向公众开放", "完成修缮，向公众开放"),    # 2-37 段2，原书 p20：缺「缮」+ 多了个半角逗号
    ("是发展的“包”，换个角度", "是发展的“包袱”，换个角度"),  # 3-34 段4，原书 p28「发展的“包袱”」
    ("决死的战争。.全部问题", "决死的战争。全部问题"),  # 4-36 段2，原书 p40：句号后多一个点
    ("；国之所需,吾志所向”", "；“国之所需,吾志所向”"),  # 4-37 段3，原书 p41：缺左引号
    ("送单时，,电动车", "送单时，电动车"),              # 5-34 段3，原书 p49
    ("在纪念馆大厅，,习近平", "在纪念馆大厅，习近平"),  # 4-37 段6，原书 p41
    ("12月中旬，,在中央经济工作会议", "12月中旬，在中央经济工作会议"),  # 7-34 段2，原书 p70
    ("飞入街巷阡陌“礼让”", "飞入街巷阡陌，“礼让”"),    # 6-37 段2，原书 p62：阡陌后缺逗号
    ("让他三尺又何妨？张家人", "让他三尺又何妨？”张家人"),  # 6-37 段5，原书 p62：缺右引号
    ("摘编自人民网2025年3月17日）", "摘编自人民网（2025年3月17日）"),  # 6-37 段6，原书 p62
    ("以和平合作、开放、包容的亚洲价值观", "以和平、合作、开放、包容的亚洲价值观"),  # 6-38 段3，原书 p63
    ("从“一五”到十四五”", "从“一五”到“十四五”"),      # 7-36 段4，原书 p72：缺左引号
    ("宣扬以暴制暴”等", "宣扬“以暴制暴”等"),            # 7-37 段2，原书 p73：缺左引号
    ("沙坡头五带一体”铁路治沙技术", "沙坡头“五带一体”铁路治沙技术"),  # 8-34 段1，原书 p80
    ("（2025.年2月26日）", "（2025年2月26日）"),        # 8-34 段3，原书 p80：多一个点
    ("强调中华民族伟大复兴势不可挡”", "强调“中华民族伟大复兴势不可挡”"),  # 2-36 段4，原书 p19
    ("从“不可逆转”到势不可挡”", "从“不可逆转”到“势不可挡”"),  # 2-36 段4，原书 p20
    ("为产业升级注入新活力回望", "为产业升级注入新活力……回望"),  # 1-34 段1，原书 p8：漏了省略号
    ("习近平总书记指出“2002年", "习近平总书记指出：“2002年"),  # 2-35 段1，原书 p19：缺冒号
    # —— 半角引号（原书都是全角）——
    ('“三个10"定律', "“三个10”定律"),                  # 2-34 段5
    ('“和平尊"。', "“和平尊”。"),                      # 3-38 段2
    ("“从‘书架'走向\"货架””", "“从‘书架’走向‘货架’”"),  # 4-34 题干，原书 p39
    ("指出\"纠治‘屏幕中的形式主义’”", "指出“纠治‘屏幕中的形式主义’”"),  # 6-34 题干
    ('把腰杆挺直！""', "把腰杆挺直！”"),                # 6-37 段11：两个半角引号，原书只有一个全角
    ('为什么要"持续推进平等有序的世界多极化”', "为什么要“持续推进平等有序的世界多极化”"),  # 8-38 题干，原书 p83
    ('为什么要"坚守多边主义”', "为什么要“坚守多边主义”"),  # 8-38 题干，原书 p83
    ("““正义必胜！和平必胜！人民必胜！'是历史昭示的伟大真理”",
     "“‘正义必胜！和平必胜！人民必胜！’是历史昭示的伟大真理”"),  # 3-36 题干，原书 p30
    ('中华民族伟大复兴。"', "中华民族伟大复兴。”"),      # 8-35 段3，原书 p81
]


def sources():
    """apply_typos 会碰到的全部原文。"""
    out = []
    mat = json.load(io.open(os.path.join(HERE, "_x8-material.json"), encoding="utf-8"))["sets"]
    for s in mat:
        for n in mat[s]:
            out.append(mat[s][n].get("stem") or "")
            out.extend(mat[s][n].get("paragraphs") or [])
    # 速刷本：sets[s] 是**列表**，每项是一道客观题
    sua = json.load(io.open(os.path.join(HERE, "_x8-suashua.json"), encoding="utf-8"))["sets"]
    for s in sua:
        for q in sua[s]:
            out.append(q.get("stem") or "")
            for o in q.get("options") or []:
                out.append(o.get("text") or "")
    # 答案解析：sets[s] 是 {table, marked, expl, ref}
    ans = json.load(io.open(os.path.join(HERE, "_x8-answers.json"), encoding="utf-8"))["sets"]
    for s in ans:
        for key in ("expl", "ref"):
            for n, t in (ans[s].get(key) or {}).items():
                out.append(t or "")
    return out


def main():
    apply = "--apply" in sys.argv
    blob = "\n".join(sources())
    manual = json.load(io.open(MANUAL, encoding="utf-8"),
                       object_pairs_hook=collections.OrderedDict)
    have = {tuple(x) for x in manual["typos"]}

    bad = 0
    added = []
    for old, new in NEW:
        if (old, new) in have:
            print(f"  已存在，跳过      {old}  →  {new}")
            continue
        c = blob.count(old)
        mark = "OK " if c == 1 else "!! "
        if c != 1:
            bad += 1
        print(f"  {mark}命中 {c}  {old}  →  {new}")
        if c == 1:
            added.append([old, new])

    print(f"\n待新增 {len(added)} 条，异常 {bad} 条")
    if bad:
        print("有异常，未写入。")
        return
    if not apply:
        print("（dry-run，加 --apply 才写入）")
        return
    manual["typos"].extend(added)
    io.open(MANUAL, "w", encoding="utf-8").write(
        json.dumps(manual, ensure_ascii=False, indent=2) + "\n")
    print(f"已写入 {MANUAL}，typos 共 {len(manual['typos'])} 条")


main()
