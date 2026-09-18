# -*- coding: utf-8 -*-
"""把肖四（`data/politics/questions.ts`，手工源文件）里解析的 **PDF 排版换行** 去掉。

肖四的 `explanation` 和肖八一样，来自《答案解析》PDF 的文本层，每行排版都保留了，
小程序渲染出来就是词中间断行（`大洋` | `洲`、`1` | `亿人`）。

判据与实现见 `tools/_nl_unwrap.py`（满行 ⟺ 段落未完；段末行必然短且以句末标点结尾）。

⚠️ **单向操作**：合并后原始行宽信息就丢了，再跑一次会把真段落也吃掉。脚本自带前置
检查——发现文件已处理过就跳过。确实要重跑加 `--force`。

用法：
    python tools/_x4_unwrap.py            # dry-run：只报数，不写
    python tools/_x4_unwrap.py --apply    # 写回
"""
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _nl_unwrap import LAYOUT_MAX_W, looks_unwrapped, unwrap, vwidth  # noqa: E402

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "politics", "questions.ts")

# 只改 `explanation: "..."`（肖四的换行全在这一个字段里）。
# 键**不带引号**（TS 对象字面量），给键加引号会一个都匹配不上（踩过）。
FIELD = re.compile(r'(?<![A-Za-z])(explanation\s*:\s*)"((?:[^"\\]|\\.)*)"')


def unescape(s):
    return (s.replace("\\\\", "\x00").replace('\\"', '"')
             .replace("\\n", "\n").replace("\x00", "\\"))


def escape(s):
    return (s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n"))


def main():
    apply = "--apply" in sys.argv
    raw = io.open(SRC, encoding="utf-8").read()

    # ⚠️ 前置检查：这是**单向**操作，对已处理过的文件再跑一次会把真段落也合并掉
    # （合并后的段落在「前行满行」判据下必然被判成排版换行）。
    # 判据用**比例**而不是「存在超宽行」——原始文本里也有少量超宽行（OCR 把相邻两行
    # 并进一个框；实测原始 2% 的行超宽，处理后 91%）。
    fields = FIELD.findall(raw)
    lines = [l for _, body in fields for l in unescape(body).split("\n") if l]
    wide = sum(1 for l in lines if vwidth(l) > LAYOUT_MAX_W)
    if lines and wide * 2 > len(lines) and "--force" not in sys.argv:
        print(f"⏭ 跳过：{wide}/{len(lines)} 行超宽（>{LAYOUT_MAX_W:.0f}），"
              f"这份文件已经去过排版换行。")
        print("   （再跑一次会把真段落也合并掉。确实要重跑请加 --force。）")
        return 0

    n_before = n_after = 0
    changed = 0
    hits = []

    def repl(m):
        nonlocal n_before, n_after, changed
        pre, body = m.group(1), m.group(2)
        t = unescape(body)
        u = unwrap(t)
        n_before += t.count("\n")
        n_after += u.count("\n")
        if u != t:
            changed += 1
        return pre + '"' + escape(u) + '"'

    out = FIELD.sub(repl, raw)
    print(f"字段数 {len(FIELD.findall(raw))}   有改动 {changed}")
    print(f"换行 {n_before} → {n_after}（保留 {n_after}）")

    # 内容不变量：**逐字段**比较「去掉换行后的文本」，必须完全一致。
    # 不要用「整文件抹掉 \\n 再比」那种粗糙办法——它会把转义的反斜杠也一起吃掉，
    # 出现假差异（踩过）。
    bad = 0
    for (pre_a, a), (pre_b, b) in zip(FIELD.findall(raw), FIELD.findall(out)):
        if pre_a != pre_b or unescape(a).replace("\n", "") != unescape(b).replace("\n", ""):
            bad += 1
            if bad <= 5:
                print(f"✗ 内容被改动：{unescape(a)[:80]!r}")
    if bad:
        print(f"✗ {bad} 个字段内容被改动，已中止")
        return 1
    print("✅ 逐字段去掉换行后完全一致")
    if apply:
        io.open(SRC, "w", encoding="utf-8").write(out)
        print(f"已写回 {SRC}")
    else:
        print("（dry-run，未写）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
