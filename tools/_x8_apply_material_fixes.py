# -*- coding: utf-8 -*-
"""把肖八材料正文的形近字/漏字修正写进 `_x8-manual.json` 的 typos 表。

为什么用 typos 而不是直接改 `_x8-material.json`
----------------------------------------------
`_x8-material.json` 是 `_x8_material.py` 的产物（多 dpi OCR 合并），
直接改它会在下次重跑 OCR 时被覆盖；`_x8-manual.json` 是人工补丁表，
由 `_x8_build.py` 在生成 TS 时应用，是这条管线里**唯一**该放人工修正的地方。

每条都带「材料正文命中数」断言，不符就整批不写。

用法：
    python tools/_x8_apply_material_fixes.py           # 只看报告
    python tools/_x8_apply_material_fixes.py --apply   # 写回 _x8-manual.json
"""
import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
MATERIAL = os.path.join(HERE, "_x8-material.json")
MANUAL = os.path.join(HERE, "_x8-manual.json")
SUASHUA = os.path.join(HERE, "_x8-suashua.json")
ANSWERS = os.path.join(HERE, "_x8-answers.json")

# (坏形, 正形, 材料正文里应出现的次数)
FIXES = [
    # —— 原书逐字核对（裁原书图判读，见 肖八修复明细.md）——
    ("顽瘴瘤疾", "顽瘴痼疾", 1),
    ("人民英雒", "人民英雄", 1),
    ("争做先”的夺进力量", "争做先锋”的奋进力量", 1),
    ("芙雄者、国之干", "英雄者、国之干", 1),
    ("和藓血铸就", "和鲜血铸就", 1),
    ("网络暴力庆气", "网络暴力戾气", 1),
    ("打架斗殿", "打架斗殴", 1),
    ("过度泣染", "过度渲染", 1),
    ("热披词", "热搜词", 1),
    ("或者涫染", "或者渲染", 1),
    ("大钨", "大鸨", 1),
    ("黄胸鸥", "黄胸鹀", 1),
    ("政府工作报告-2025年3月5日", "政府工作报告——2025年3月5日", 1),
    ("政府工作报告一一2025年3月5日", "政府工作报告——2025年3月5日", 1),
    ("”一一医药界", "”——医药界", 1),
    ("两次重要宣示", "两次重要宣示——", 1),
    ("生活一:", "生活一瞥：", 1),
    ("（2025年-6月20日）", "（2025年6月20日）", 1),
    ("主基调一一", "主基调——", 1),
    # 不能只写 `全球气候治理`：客观题里有「全球气候治理体系」、解析里有「为全球气候治理注入…」，
    # 全局替换会把那两处正文也加上破折号。用带书名号的完整串把范围锁死在材料出处注上。
    ("《共迎时代挑战携手推进全球气候治理", "《共迎时代挑战 携手推进全球气候治理——", 1),
    ("生动实践。化强国的重要标志",
     "生动实践。《关于健全新时代志愿服务体系的意见》提出,到2035年,"
     "“志愿服务成为社会主义文化强国的重要标志", 1),
    # —— 形近字：词形唯一，无需裁图 ——
    ("帝来", "带来", 1),
    ("在这里取精神力量", "在这里汲取精神力量", 1),
    ("璐安化工", "潞安化工", 1),
    ("凤凰涅架", "凤凰涅槃", 1),
    ("物业撞自锁车", "物业擅自锁车", 1),
    ("盲人骑马", "盲人骑瞎马", 1),
    ("的嵘岁月", "的峥嵘岁月", 1),
    ("增进民生福社", "增进民生福祉", 1),
    ("我们要特续开展", "我们要持续开展", 1),
    ("推动普包容的经济全球化", "推动普惠包容的经济全球化", 1),
    ("实现千旱地区", "实现干旱地区", 1),
    ("即窥窥业业", "即兢兢业业", 1),
    ("件包襄", "件包裹", 1),
]


def material_text() -> str:
    m = json.load(io.open(MATERIAL, encoding="utf-8"))["sets"]
    return "".join(
        p for s in m for n in m[s] for p in m[s][n]["paragraphs"]
    ) + "".join(m[s][n].get("stem") or "" for s in m for n in m[s])


def other_texts() -> list:
    out = []
    for f in (SUASHUA, ANSWERS):
        if os.path.exists(f):
            out.append((os.path.basename(f), json.dumps(
                json.load(io.open(f, encoding="utf-8")), ensure_ascii=False)))
    return out


def main():
    apply = "--apply" in sys.argv
    mat = material_text()
    others = other_texts()

    ok, bad = [], []
    print("=== 逐条核对（材料正文命中数）===")
    for old, new, want in FIXES:
        got = mat.count(old)
        mark = "OK " if got == want else "✗  "
        print(f"  {mark} x{got} (期望 {want})  {old[:40]}")
        (ok if got == want else bad).append((old, new, want, got))

    print()
    print("=== 副作用检查：坏形是否也出现在客观题 / 解析里 ===")
    risky = 0
    for old, new, want, _ in ok:
        for name, txt in others:
            n = txt.count(old)
            if n:
                risky += 1
                print(f"  ⚠️ {name}: x{n}  {old[:40]}")
    if not risky:
        print("  无（所有坏形只出现在材料正文）")

    if bad:
        print()
        print("✗ 有 %d 条命中数不符，整批不写。" % len(bad))
        return 1
    if not apply:
        print()
        print("（dry-run）加 --apply 写回 %s" % os.path.basename(MANUAL))
        return 0

    manual = json.load(io.open(MANUAL, encoding="utf-8"))
    typos = manual.setdefault("typos", [])
    have = {tuple(t) for t in typos}
    added = 0
    for old, new, _, _ in ok:
        if (old, new) in have:
            continue
        typos.append([old, new])
        added += 1
    manual["_note_typos_suffix"] = (
        "后缀型条目（正形以坏形开头，如 [\"两次重要宣示\",\"两次重要宣示——\"]）"
        "由 `_x8_build.py` 的 apply_typos 走「已补过就不再补」分支，"
        "否则会重复追加。"
    )
    io.open(MANUAL, "w", encoding="utf-8").write(
        json.dumps(manual, ensure_ascii=False, indent=2) + "\n")
    print()
    print("已写入 %d 条（typos 共 %d 条）" % (added, len(typos)))
    return 0


sys.exit(main())
