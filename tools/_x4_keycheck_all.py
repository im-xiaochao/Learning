# -*- coding: utf-8 -*-
"""合并肖四答案键的两条独立验证路径，给出逐题最终判定。

用法：
    python tools/_x4_keycheck.py  > tools/_x4-keycheck.out    # 先跑路径一
    python tools/_x4_keycheck2.py > tools/_x4-keycheck2.out   # 再跑路径二
    python tools/_x4_keycheck_all.py                          # 合并

两条路径互相独立：
  路径一：源 explanation 文本 → 在答案解析 OCR 里定位 → 取前面最近的「NN.答案 XXXX」
  路径二：源 stem 文本 → 在试卷 OCR 里定位 → 读前面的题号 NN + 页眉套号 → 查答案表

判定规则：
  一致（双路径）  两条路径都验到且都与源一致 → 最强证据
  一致（单路径）  只有一条路径验到，且与源一致
  ❌ 不一致        任一路径报出与源不一致 → 必须人工看
  ⚠️ 未覆盖        两条路径都没验到（OCR 缺行/题干太短）

额外做一次一致性交叉检查：两路径都验到同一题时，它们读出的 PDF 答案必须相同，
否则说明至少有一条路径定位错了（哪怕各自都和源一致）。
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
P1 = os.path.join(HERE, "_x4-keycheck.tsv")
P2 = os.path.join(HERE, "_x4-keycheck2.tsv")

OK1 = {"OK", "MANUAL"}
BAD1 = {"BAD"}
OK2 = {"ok"}
BAD2 = {"bad"}


def load(path):
    """返回 qid → (verdict, src, pdf)。容忍有/无表头。"""
    out = {}
    if not os.path.exists(path):
        return out
    for line in open(path, encoding="utf-8").read().splitlines():
        if not line.strip():
            continue
        f = line.split("\t")
        if f[0] == "qid":          # 表头
            continue
        qid, v = f[0], f[1]
        src = f[2] if len(f) > 2 else ""
        pdf = f[3] if len(f) > 3 else ""
        out[qid] = (v, src, pdf)
    return out


p1 = load(P1)
p2 = load(P2)
qids = sorted(set(p1) | set(p2))

both = []
single = []
bad = []
none = []
conflict = []

for qid in qids:
    v1, s1, d1 = p1.get(qid, ("-", "", ""))
    v2, s2, d2 = p2.get(qid, ("-", "", ""))
    o1, o2 = v1 in OK1, v2 in OK2
    b1, b2 = v1 in BAD1, v2 in BAD2

    if b1 or b2:
        bad.append((qid, v1, s1 or s2, d1 or d2, v2))
        continue
    # 两路径都验到时，PDF 答案必须一致
    if o1 and o2 and d1 and d2 and sorted(d1) != sorted(d2):
        conflict.append((qid, s1 or s2, d1, d2))
        continue
    if o1 and o2:
        both.append((qid, s1 or s2, d1 or d2))
    elif o1 or o2:
        single.append((qid, s1 or s2, d1 or d2, "路径一" if o1 else "路径二"))
    else:
        none.append((qid, v1, v2))

total = len(qids)
print("肖四答案键 · 双路径交叉验证合并结果")
print(f"  参与比对客观题      {total} 题")
print(f"  ✅ 一致（双路径）    {len(both)} 题")
print(f"  ✅ 一致（单路径）    {len(single)} 题")
print(f"  ❌ 不一致            {len(bad)} 题")
print(f"  ⚠️ 两路径冲突        {len(conflict)} 题")
print(f"  ⚠️ 未覆盖            {len(none)} 题")
print()

if bad:
    print("===== ❌ 不一致（必须人工看）=====")
    for qid, v1, src, pdf, v2 in bad:
        print(f"  {qid:22s} 源「{src}」 / PDF「{pdf}」  （路径一 {v1} / 路径二 {v2}）")
    print()

if conflict:
    print("===== ⚠️ 两路径读出的 PDF 答案不同（说明有路径定位错）=====")
    for qid, src, d1, d2 in conflict:
        print(f"  {qid:22s} 源「{src}」 路径一「{d1}」 路径二「{d2}」")
    print()

if none:
    print("===== ⚠️ 两条路径都没验到 =====")
    for qid, v1, v2 in none:
        print(f"  {qid:22s} （路径一 {v1} / 路径二 {v2}）")
    print()

if single:
    print("===== 仅单路径覆盖 =====")
    for qid, src, pdf, which in single:
        print(f"  {qid:22s} 源「{src}」 / PDF「{pdf}」  （{which}）")
    print()

print(f"结论：{total} 道客观题中 {len(both) + len(single)} 道经至少一条独立路径核对与源一致，"
      f"{len(bad) + len(conflict)} 道存在矛盾，{len(none)} 道未覆盖。")
