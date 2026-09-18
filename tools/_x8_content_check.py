"""在**生成文件** `data/politics/questions-x8.ts` 上做内容级体检。

与 `_x8_punct.py` 的区别：那个读的是**未打补丁的源** `_x8-material.json`，
会把构建期才归一化的东西（半角标点、省略号、`材料 N` 间距）报成问题。
这个读的是最终交付物，只报**真的会显示给用户**的异常。

用法：
    python tools/_x8_content_check.py
"""
import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TS = os.path.join(ROOT, "data", "politics", "questions-x8.ts")


def content_fields():
    """把 TS 里的**内容字符串**抠出来（跳过 `id:` / `module:` 之类的语法字段）。"""
    raw = io.open(TS, encoding="utf-8").read()
    keep = {
        "stem", "text", "explanation", "answerKey", "expl",
    }
    for m in re.finditer(r'"(stem|text|explanation|answerKey)":\s*"((?:[^"\\]|\\.)*)"', raw):
        yield m.group(1), m.group(2)
    # 数组型字段：paragraphs / answerPoints / answerKeys
    for m in re.finditer(r'"(paragraphs|answerPoints)":\s*\[(.*?)\]', raw, re.S):
        for s in re.finditer(r'"((?:[^"\\]|\\.)*)"', m.group(2)):
            yield m.group(1), s.group(1)
    for m in re.finditer(r'"answerKeys":\s*\[(.*?)\]', raw, re.S):
        yield "answerKeys", m.group(1)


def unesc(s: str) -> str:
    return s.replace("\\n", "\n").replace('\\"', '"').replace("\\\\", "\\")


def main():
    bad = 0

    def hit(tag, field, ctx):
        nonlocal bad
        bad += 1
        print(f"  [{tag}] {field}: …{ctx}…")

    print("=== ① 半角标点夹在汉字间 ===")
    n0 = bad
    for f, s in content_fields():
        t = unesc(s)
        for mm in re.finditer(r"[\u4e00-\u9fff][,;:?!][\u4e00-\u9fff]", t):
            hit("半角标点", f, t[max(0, mm.start() - 16):mm.end() + 16])
    print(f"  → {bad - n0} 处")

    print("\n=== ② 非标准省略号（应为 `……`）===")
    n1 = bad
    for f, s in content_fields():
        t = unesc(s)
        for mm in re.finditer(r"[.·．]{2,}|…{1}(?!…)|…{3,}", t):
            hit("省略号", f, t[max(0, mm.start() - 16):mm.end() + 16])
    print(f"  → {bad - n1} 处")

    print("\n=== ③ 汉字/数字之间的多余空格 ===")
    n2 = bad
    for f, s in content_fields():
        t = unesc(s)
        for mm in re.finditer(r"[\u4e00-\u9fff][ \t]+(?=[\u4e00-\u9fff0-9])|[0-9][ \t]+(?=[0-9年月日名万个家多元岁])", t):
            hit("空格", f, t[max(0, mm.start() - 16):mm.end() + 16])
    print(f"  → {bad - n2} 处")

    print("\n=== ④ `材料N` 应写成 `材料 N` ===")
    n3 = bad
    for f, s in content_fields():
        t = unesc(s)
        for mm in re.finditer(r"材料[0-9]", t):
            hit("材料N", f, t[max(0, mm.start() - 16):mm.end() + 16])
    print(f"  → {bad - n3} 处")

    print("\n=== ⑤ 中文串里的半角双引号（内容层）===")
    n4 = bad
    for f, s in content_fields():
        t = unesc(s)
        for mm in re.finditer(r"[\u4e00-\u9fff]\"|\"[\u4e00-\u9fff]", t):
            hit("ASCII引号", f, t[max(0, mm.start() - 16):mm.end() + 16])
    print(f"  → {bad - n4} 处")

    print("\n=== ⑥ 引号配对（每字段内 “ 与 ” 数量应相等）===")
    n5 = bad
    for f, s in content_fields():
        t = unesc(s)
        a, b = t.count("“"), t.count("”")
        if a != b:
            hit("引号不配对", f, f"“x{a} ”x{b}  {t[:70]}")
    print(f"  → {bad - n5} 处")

    print(f"\n合计异常 {bad} 处")
    return 0 if bad == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
