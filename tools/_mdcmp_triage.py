"""把 `_x8_mdcmp.py` 的输出按「谁的读法更可能对」分诊。

判据：对 replace 段，检查「我们」侧与「md」侧的**差异字符**是否落在
`_x8-manual.json` 的 `typos` 表里——若我们侧是正形、md 侧是残形，就是我们赢。
delete 段则看被删的内容是否能在源文件里找到（我们多出的行是否是 md 丢行）。

用法：python tools/_mdcmp_triage.py [报告文件]
"""
import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def parse(path):
    t = io.open(path, encoding="utf-8").read().split("\n")
    setname = kind = None
    rows = []
    for i, l in enumerate(t):
        m = re.match(r"===== (第\d套)", l)
        if m:
            setname = m.group(1)
            continue
        m = re.match(r"\s+· (\w+)", l)
        if m:
            kind = m.group(1)
            continue
        if l.strip().startswith("我们:"):
            ours = l.strip()[3:].strip()
            md = t[i + 1].strip()[3:].strip() if i + 1 < len(t) else ""
            rows.append((setname, kind, ours, md))
    return rows


def main():
    rep = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        ROOT, ".workbuddy-ai/tmp/mdcmp9.txt")
    man = json.load(io.open(os.path.join(HERE, "_x8-manual.json"), encoding="utf-8"))
    good = {g for _, g in man["typos"]}
    bad = {b for b, _ in man["typos"]}
    mat = json.load(io.open(os.path.join(HERE, "_x8-material.json"), encoding="utf-8"))["sets"]
    # ⚠️ 必须和 `_x8_mdcmp.py` 的 norm 保持一致（只留汉字/数字/字母），
    # 否则报告里打印的是**归一化后**的串，拿去原文里 count 永远是 0。
    def norm(s):
        return re.sub(r"[^\u4e00-\u9fff0-9A-Za-z]", "", s)

    ours_all = norm("".join(
        p for s in sorted(mat, key=int) for n in sorted(mat[s], key=int)
        for p in mat[s][n]["paragraphs"])
        + "".join((mat[s][n].get("stem") or "")
                  for s in sorted(mat, key=int) for n in sorted(mat[s], key=int)))

    rows = parse(rep)
    print(f"总差异 {len(rows)} 处\n")

    # ---- replace：抽取两侧的差异片段 ----
    print("######## replace（逐条看差异片段）########")
    for s, k, o, m in rows:
        if k != "replace":
            continue
        # 找最长公共前后缀，中间就是差异
        a, b = o, m
        p = 0
        while p < min(len(a), len(b)) and a[p] == b[p]:
            p += 1
        q = 0
        while q < min(len(a), len(b)) - p and a[len(a) - 1 - q] == b[len(b) - 1 - q]:
            q += 1
        da, db = a[p:len(a) - q], b[p:len(b) - q]
        tag = ""
        if any(g in (da or "") for g in good) and (db in bad or any(x in (db or "") for x in bad)):
            tag = "  ← 我们有正形/md 是残形"
        print(f"{s}  我们「{da}」 vs md「{db}」{tag}")
        print(f"     …{a[max(0, p - 30):p + len(da) + 30]}…")

    # ---- delete：我们多出的内容是否真在源里 ----
    print()
    print("######## delete（我们多出，逐条查是否重复/噪声）########")
    dup = 0
    for s, k, o, m in rows:
        if k != "delete":
            continue
        mm = re.search(r"【(.*?)】", o)
        chunk = mm.group(1) if mm else ""
        n = ours_all.count(chunk) if chunk else 0
        flag = "" if n <= 1 else f"  ⚠️ 在材料里出现 {n} 次"
        if n > 1:
            dup += 1
        print(f"{s}  x{n}  {chunk[:80]}{flag}")
    print(f"\n重复出现（可能重复行）: {dup} 处")


if __name__ == "__main__":
    main()
