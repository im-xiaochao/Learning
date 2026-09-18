# -*- coding: utf-8 -*-
"""用 `111/26肖秀荣《8套卷》.md`（另一套 OCR）交叉核对材料正文。

为什么需要：
  `_x8-material.json` 来自我们自己的多 dpi RapidOCR（合并策略是「高 dpi 优先」，
  不是多数票），所以**三次跑法同时读错的地方会静默通过**。`111/*.md` 是另一次
  独立 OCR，错误模式不同（它把 `福祉`/`斗殴`/`潞安`/`普惠包容` 都读对了，而我们错了），
  拿它做差分能把这类错字顶出来。

做法：
  1. md 有 `## 第 N 页` 标记，按 `_x8_material.py` 的 PAGE_SET 页段表把 md 切成 8 套；
  2. 每套内把「我们全部材料段落 + 小问」与「md 对应页段」都归一化成
     「只留汉字/数字/字母」的串，用 difflib 全局对齐；
  3. 只打印非 equal 的片段（我们 vs md），带上下文。

判读原则：
  - 两边都像词 → 可能是 md 的错，忽略；
  - 我们不像词、md 像词 → 我们错，修；
  - 两边都不像词 → 必须裁原书图看。

用法：
  python tools/_x8_mdcmp.py "C:/.../111/26肖秀荣《8套卷》.md" tools/_x8-material.json
"""
import difflib
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

PAGE_SET = {}
for _s, (_a, _b) in enumerate(
        [(8, 11), (18, 21), (28, 31), (38, 42), (49, 53), (60, 63), (70, 73), (80, 83)], start=1):
    for _p in range(_a, _b + 1):
        PAGE_SET[_p] = _s


def norm(s: str) -> str:
    # `——`（两个 U+2014）会被下面的字符类抹掉，但 OCR 常把它读成 `一一`（U+4E00，
    # 汉字「一」）——那**不会**被抹掉，于是同一处破折号在我们这侧消失、在 md 侧留下
    # `一一`，比对器会报成「md 比我们多」。实测 3 处假阳性（医药界 / 政府工作报告 / 主基调）。
    # 先把「≥2 个 一/—」折成一个 `—`，两侧对称，再统一抹掉。
    s = re.sub(r"[—一]{2,}", "—", s)
    return re.sub(r"[^\u4e00-\u9fff0-9A-Za-z]", "", s)


def apply_manual(s: str) -> str:
    """先过 `_x8-manual.json` 的 typos，再比对。

    否则比对器会把已经修好的错字再报一遍，看不出「还剩哪些」。幂等方式与
    `_x8_build.py` 的 apply_typos 一致：后缀型看「后面是否已经跟着补的那截」，
    替换型看「残形前一个字是否已经是正写首字」。
    """
    manual = json.load(io.open(os.path.join(HERE, "_x8-manual.json"), encoding="utf-8"))
    for bad, good in manual.get("typos") or []:
        if bad not in s:
            continue
        if good.startswith(bad):
            s = re.sub(re.escape(bad) + r"(?!" + re.escape(good[len(bad):]) + ")", good, s)
        else:
            s = re.sub(r"(?<!" + re.escape(good[0]) + ")" + re.escape(bad), good, s)
    return s


def load_md(path: str) -> dict:
    raw = io.open(path, encoding="utf-8").read()
    pages, cur, buf = {}, None, []
    for line in raw.split("\n"):
        m = re.match(r"##\s*第\s*(\d+)\s*页", line)
        if m:
            if cur is not None:
                pages[cur] = "\n".join(buf)
            cur, buf = int(m.group(1)), []
            continue
        if cur is not None:
            buf.append(line)
    if cur is not None:
        pages[cur] = "\n".join(buf)
    # 页眉：`2026考研政治冲刺8套卷（五）` / `2026考研政治冲刺8套卷试题分册`。
    # 实测变体很多，中间那一两个字常被 OCR 打坏：`2026考研政治冲刺③套卷`（8 → ③）、
    # `2026老考研政治冲刺8套卷`（多插一个「老」）。所以中间放宽成 0~4 个任意字符。
    # 末尾用 `[^\n]*` 是安全的：md 的页眉都独占一行，而这里传进来的还带着换行。
    for p in pages:
        pages[p] = re.sub(r"20\d\d\s*考研政治冲刺\s*[^\n]{0,4}?套卷[^\n]*", "", pages[p])
    return pages


def trim_material(md_text: str) -> str:
    """把 md 页段裁到「第 34 题材料」起点，并抹掉题号分隔符。

    材料题的页段区间里还夹着 31~33 三道客观题（它们在 34 题之前），
    不裁掉会在差分里变成一大段 insert 噪声。`34 结合材料回答问题` 是稳定锚点。

    锚点要写成 `回答[问间][题间]`：md 里出现过 `34结合材料回答间题`（问/间 颠倒）。
    """
    m = re.search(r"34\s*结合材料回答[问间][题间]", md_text)
    if m:
        md_text = md_text[m.end():]
    # 每道材料题之间的 `35结合材料回答问题` 之类分隔符，我们这边没有，抹掉
    md_text = re.sub(r"\d{2}\s*结合材料回答[问间][题间]", "", md_text)
    return md_text


def ctx(s: str, a: int, b: int, w: int = 26) -> str:
    lo, hi = max(0, a - w), min(len(s), b + w)
    head = "…" if lo > 0 else ""
    tail = "…" if hi < len(s) else ""
    return f"{head}{s[lo:a]}【{s[a:b]}】{s[b:hi]}{tail}"


def main():
    md_path, mat_path = sys.argv[1], sys.argv[2]
    pages = load_md(md_path)
    mat = json.load(io.open(mat_path, encoding="utf-8"))["sets"]

    total = 0
    for s in sorted(mat, key=int):
        md_text = trim_material(
            norm("".join(pages.get(p, "") for p in sorted(pages) if PAGE_SET.get(p) == int(s))))
        ours_parts = []
        for n in sorted(mat[s], key=int):
            ours_parts.append("".join(mat[s][n]["paragraphs"]))
            ours_parts.append(mat[s][n].get("stem") or "")
        ours = norm(apply_manual("".join(ours_parts)))
        if not md_text:
            print(f"===== 第{s}套：md 无对应页段 =====")
            continue
        sm = difflib.SequenceMatcher(None, ours, md_text, autojunk=False)
        ops = [o for o in sm.get_opcodes() if o[0] != "equal"]
        if not ops:
            print(f"===== 第{s}套：0 处差异（{len(ours)} 字）=====")
            continue
        print(f"\n===== 第{s}套：{len(ops)} 处差异（我们 {len(ours)} 字 / md {len(md_text)} 字）=====")
        for tag, i1, i2, j1, j2 in ops:
            a, b = ours[i1:i2], md_text[j1:j2]
            if not a and not b:
                continue
            total += 1
            print(f"  · {tag}")
            print(f"      我们: {ctx(ours, i1, i2)}")
            print(f"      md  : {ctx(md_text, j1, j2)}")
    print(f"\n合计差异 {total} 处")


main()
