# -*- coding: utf-8 -*-
"""追查 `自已`(U+5DF2 已，误) 在整条管线里的流转。

`自已` 正确的写法是 `自己`(U+5DF1 己)。这两个字只差一笔，OCR 极易混。
本脚本按「源 → patch → 生成物」逐层列出，判定每一处的去向：

  · 落在 **材料正文 / 速刷本**（`_x8-material.json` / `_x8-suashua.json`）→ 直接进生成物，要修
  · 落在 **答案解析 patch**（`_x8-answers-patch.json`）→ 只有原字段为空时才会被采用，
    没被采用的就是「另一跑的读法」，不影响生成物（但要确认它确实没被采用）

用法：python tools/_x8_self_trace.py
"""
import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BAD = "自已"
GOOD = "自己"


def rd(p):
    return io.open(p, encoding="utf-8").read()


def walk_json(path, label):
    """列出 JSON 源里所有含 BAD 的条目（含字段名与题号）。"""
    if not os.path.exists(path):
        print(f"  （缺 {path}）")
        return
    d = json.load(io.open(path, encoding="utf-8"))
    hits = []

    def rec(node, trail):
        if isinstance(node, dict):
            for k, v in node.items():
                rec(v, trail + [str(k)])
        elif isinstance(node, list):
            for i, v in enumerate(node):
                rec(v, trail + [str(i)])
        elif isinstance(node, str) and BAD in node:
            for m in re.finditer(BAD, node):
                i = m.start()
                hits.append((".".join(trail), node[max(0, i - 40):i + 40]))

    rec(d, [])
    print(f"=== {label}（{os.path.relpath(path, ROOT)}）：{len(hits)} 处")
    for trail, ctx in hits:
        print(f"    [{trail}]  …{ctx!r}…")


def main():
    print("码点：", "  ".join(f"{c}=U+{ord(c):04X}" for c in BAD),
          "  正确写法：", "  ".join(f"{c}=U+{ord(c):04X}" for c in GOOD))
    print()

    walk_json(os.path.join(HERE, "_x8-material.json"), "材料正文（直接进生成物）")
    print()
    walk_json(os.path.join(HERE, "_x8-suashua.json"), "速刷本（客观题题干/选项）")
    print()
    walk_json(os.path.join(HERE, "_x8-answers.json"), "答案解析文本层")
    print()
    walk_json(os.path.join(HERE, "_x8-answers-patch.json"), "答案解析 patch（仅补空字段）")
    print()

    # 逐处判定 patch 是否被采用
    patch = json.load(io.open(os.path.join(HERE, "_x8-answers-patch.json"),
                              encoding="utf-8"))["sets"]
    ans = json.load(io.open(os.path.join(HERE, "_x8-answers.json"),
                            encoding="utf-8"))["sets"]
    print("=== patch 里含 `自已` 的条目：是否被采用 ===")
    for s in sorted(patch, key=int):
        for key in ("expl", "ref"):
            for n, txt in (patch[s].get(key) or {}).items():
                if BAD not in txt:
                    continue
                cur = (ans.get(s, {}).get(key, {}).get(n) or "").strip()
                used = not cur
                print(f"  第{s}套 {key}[{n}]  被采用={'是' if used else '否（原字段已有内容）'}"
                      f"  原文长度={len(cur)}")
    print()

    # 生成物
    gen = rd(os.path.join(ROOT, "data", "politics", "questions-x8.ts"))
    n_bad, n_good = gen.count(BAD), gen.count(GOOD)
    print(f"=== 生成物 questions-x8.ts：`自已` {n_bad} 处 / `自己` {n_good} 处")
    for m in re.finditer(BAD, gen):
        i = m.start()
        j = gen.rfind('id: "', 0, i)
        qid = gen[j + 5:gen.find('"', j + 5)]
        print(f"    {qid}  …{gen[max(0, i-50):i+50]!r}…")


if __name__ == "__main__":
    main()
