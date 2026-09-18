# -*- coding: utf-8 -*-
"""_x4_nearmiss.py 的负例自检：证明「单字 token」判据**既能滤掉假阳性、又不误杀真问题**。

只测判据本身（solo_token_spans + 词频），不碰数据文件。

用法：python tools/_x4_nearmiss_selftest.py
"""
import io
import sys

import jieba  # noqa: E402

sys.path.insert(0, "tools")
# 注意：导入 _x4_nearmiss 时它自己会 `sys.stdout = io.TextIOWrapper(...)`。
# 这边**不要再包一层**——两层 TextIOWrapper 抢同一个 buffer，第二次写入会
# 报 `I/O operation on closed file`（踩过）。
from _x4_nearmiss import freq, unknown_token_spans  # noqa: E402

# (上下文, 候选起点在串中的位置, 期望是否被标记, 说明)
CASES = [
    # —— 假阳性：应被滤掉（至少一个字落在多字 token 里）——
    ("促进人与自然和谐共生", 1, False, "促[进人]与 → 促进 + 人"),
    ("最终目标是实现人自由而全面的发展", 1, False, "最[终目]标 → 最终 + 目标"),
    ("超出人类所能", 1, False, "超[出人]类 → 超出 + 人类"),
    ("反抗外敌入侵", 3, False, "外[敌入]侵 → 外敌 + 入侵"),
    ("使自己成为团结全民族抗战的中坚力量", 1, False, "自[己成]为 → 自己 + 成为"),
    ("不存在只享受权利的主体", 4, False, "享[受权]利 → 享受 + 权利"),
    # —— 真问题：必须被标记（两字各是单字 token）——
    ("深人开展", 0, True, "深人 → 深 + 人（都切不出词）"),
    ("把个人小我融人国家大我", 6, True, "融人 → 融 + 人"),
    ("自已手中", 0, True, "自已 → 自 + 己"),
]

# 判据：候选两字各自是单字 token，且「替换后」是高频词
GOOD = 200
NEAR = {"入": "人", "人": "入", "己": "已", "已": "己"}


def flagged(body: str, pos: int) -> bool:
    if pos not in unknown_token_spans(body):
        return False
    cur = body[pos:pos + 2]
    if freq(cur) >= GOOD:
        return False
    for k in (0, 1):
        if cur[k] in NEAR:
            alt = cur[:k] + NEAR[cur[k]] + cur[k + 1:]
            if freq(alt) >= GOOD and freq(alt) >= freq(cur) * 20:
                return True
    return False


def main() -> int:
    jieba.initialize()
    bad = 0
    for body, pos, want, note in CASES:
        got = flagged(body, pos)
        ok = got == want
        if not ok:
            bad += 1
        mark = "✅" if ok else "✗"
        kind = "标记" if got else "不标记"
        print(f"{mark} {kind}  「{body[max(0,pos-4):pos+6]}」  {note}")
    print()
    print(f"通过 {len(CASES) - bad} / {len(CASES)}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
