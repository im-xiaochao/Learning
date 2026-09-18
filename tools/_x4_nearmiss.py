# -*- coding: utf-8 -*-
"""形近字误读筛查：找出「把某字换成它的形近字后，才成为一个高频词」的位置。

思路
----
OCR 最常见的错误是**形近字混淆**。这类错误有个可判定的特征：

    深人开展  →  `深人` 不成词（FREQ≈0），换成 `深入` 就是高频词
    自已手中  →  `自已` 不成词，换成 `自己` 就是高频词
    拨乱反正  →  `拨乱` 成词，`拔乱` 不成词（反向验证）

所以判据是**双向的**：
  · 原串低频、替换后高频  → 候选（原文可能是误读）
  · 原串高频、替换后低频  → 说明原串正确（用来排除）

⚠️ 光靠词频会有大量**子串跨越词边界**的假阳性。实测 11 条候选里 11 条都是：

    促[进人]与自然   → `进` 属于 `促进`，`人` 是下一词的开头，合法
    最[终目]标       → `最终` + `目标`，合法
    超[出人]类       → `超出` + `人类`，合法
    反抗外敌[入]侵   → `外敌` + `入侵`，合法

这些位置的共同点是：候选两字**跨在多字 token 的边界上**（`进` 属于 `促进`、
`出` 属于 `超出`）。而真正的误读（`深人开展`、`融人国家大我`）jieba 切不出词，
HMM 会**猜**成一个双字 token（`深人`、`融人`）——词典里当然没有它。

所以判据再加一条：**候选必须是 jieba 切出的一个双字 token，且不在词典里**
（见 `unknown_token_spans`）。

⚠️ 输出是**候选**不是结论。必须逐条判读：
   · 专有名词、古文引语里会有合法的低频组合；
   · 反向也可能——如果原串本身就该是低频词。

用法：
    python tools/_x4_nearmiss.py [文件] [最低提升倍数]
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
CJK = re.compile(r"[\u4e00-\u9fff]")

# 形近字表。每条是「一组互相形近的字」，扫描时组内两两互为候选。
# 来源：本次修复中实证的混淆（入/人、己/已、干/千、戌/戍）+ 中文 OCR 常见混淆。
NEAR = [
    "入人", "己已巳", "拨拔", "未末", "土士", "日曰", "天夭", "千干", "鸟乌", "兔免",
    "辨辩辫", "即既", "候侯", "复覆", "暖缓", "微徽", "厉历", "徒徙", "待侍", "戒戎",
    "戍戌戊", "拆折", "析折", "茶荼", "延廷", "段叚", "轧轨", "狠很", "准淮", "值植",
    "从丛", "具俱", "刺剌", "束朿", "扰拢", "抵祗", "低底", "卯卵", "印卬", "卷券",
    "要耍", "壶壸", "毫亳", "亨享", "汆氽", "崇祟", "巷港", "采釆", "柝析", "誊誉",
    "滕腾", "般股", "断段", "继续", "援缓", "宇字", "宙宇", "逢逄", "幻幼", "抹末",
    "卸御", "冈网", "风凤", "凤夙", "鸣呜", "铜钢", "铅铝", "住往", "拂佛", "徇循",
    "抑仰", "授受", "扛抗", "膜模", "摸摩", "摩磨", "州洲", "广厂", "励历", "棉绵",
    "锦棉", "密蜜", "幕慕", "墓幕", "陪赔", "部倍", "桨浆", "蓬篷", "蓝篮", "篁皇",
    "缝逢", "么幺", "缸缺", "扁匾", "篇偏", "遍偏", "编偏", "白自", "百白", "目日",
    "贝见", "且旦", "田由", "甲申", "电申", "己巳", "戍戌", "卷眷", "券卷", "神袖",
    "袍抱", "衷哀", "哀衰", "衰衷", "享亨", "亳毫", "匆勿", "勿匆", "戌戍",
]

PAIRS = []
for grp in NEAR:
    for i in range(len(grp)):
        for j in range(len(grp)):
            if i != j:
                PAIRS.append((grp[i], grp[j]))


def unescape(s: str) -> str:
    return (s.replace("\\\\", "\x00")
             .replace('\\"', '"')
             .replace("\\n", "\n")
             .replace("\x00", "\\"))


def freq(w: str) -> int:
    return jieba.dt.FREQ.get(w, 0)


def unknown_token_spans(body: str) -> set:
    """返回「jieba 切出了一个**不在词典里**的双字 token」的起始位置集合。

    实测 jieba 的 HMM 对未知序列会**猜**成一个双字词：

        深人开展  → ['深人', '开展']     `深人` 不在 FREQ
        融人国家  → ['融人', '国家']     `融人` 不在 FREQ
        自已手中  → ['自已', '手中']     `自已` 不在 FREQ

    而合法的跨词边界不会产生这种 token（`进人` 会被切成 `促进` + `人与自然`）：

        促进人与自然 → ['促进', '人与自然', ...]
        超出人类所能 → ['超出', '人类', '所', '能']

    所以「jieba 猜出来的、词典里没有的双字 token」就是误读的高置信信号。

    ⚠️ 最初我把判据写成「两字各是单字 token」，方向正好相反——真阳性（`深人`）
    被 HMM 合并成一个 token，反而漏掉了（负例自检 `_x4_nearmiss_selftest.py` 抓到）。
    """
    ok = set()
    for w, s, e in jieba.tokenize(body):
        if len(w) == 2 and e - s == 2 and freq(w) == 0:
            ok.add(s)
    return ok


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    ratio = float(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].replace(".", "").isdigit() else 20.0
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

    GOOD = 200       # 「替换后算高频」的门槛
    hits = []
    for m in FIELD.finditer(raw):
        qid = qid_at(m.start())
        body = unescape(m.group(2))
        solos = unknown_token_spans(body)
        for i in range(len(body) - 1):
            a, b = body[i], body[i + 1]
            if not (CJK.match(a) and CJK.match(b)):
                continue
            if i not in solos:
                continue        # 跨在多字 token 边界上 → 合法的跨词边界
            cur = a + b
            f_cur = freq(cur)
            # 已经是高频词就不看（除非替换后更高，但那种情况少见且噪声大）
            if f_cur >= GOOD:
                continue
            for x, y in PAIRS:
                if a == x:
                    alt = y + b
                elif b == x:
                    alt = a + y
                else:
                    continue
                f_alt = freq(alt)
                if f_alt >= GOOD and f_alt >= f_cur * ratio:
                    ctx = body[max(0, i - 12):i + 14].replace("\n", "|")
                    hits.append((qid, cur, alt, f_cur, f_alt, ctx, i))
                break

    # 去重：同一 (题, 原串, 替换) 只报一次
    seen = set()
    uniq = []
    for h in hits:
        k = (h[0], h[1], h[2])
        if k in seen:
            continue
        seen.add(k)
        uniq.append(h)

    print(f"形近字候选：{len(uniq)} 处（原始命中 {len(hits)}）")
    print()
    for qid, cur, alt, fc, fa, ctx, pos in uniq:
        print(f"· {qid}  「{cur}」({fc}) → 「{alt}」({fa})")
        print(f"    …{ctx}…")
    print()
    print("⚠️ 以上是候选，需逐条判读（专名/古文引语会有合法低频组合）。")


if __name__ == "__main__":
    main()
