"""扫描「裸正确」——解析里出现 `X正确。` 的答案陈述，但 **X 丢了**的位置。

判据（三条同时满足才算可疑）：
  1. `正确` 后面紧跟句读（`。`/`，`/`、`）——这是「点明正确选项」的写法；
     语法用法 `正确认识`/`正确方向`/`正确处理` 后面跟的是名词，自然排除。
  2. `正确` **前面一个字符**是句末标点 / 引号 / 换行 / 空格
     （`。，；：""''）)` + `\\n` + 空格）——字母丢了才会长这样。
  3. 往前 12 个字符里找不到选项标识（拉丁 `A`~`D` 或圈号 `①`~`⑩`）。

实测依据：肖四 `q-mayuan-17` / `q-mayuan-25` 的 `C正确` 在合并跑法里丢了 `C`，
原文变成 `…它是批判的和革命的。"正确。真理只能发展…`（原书确认有 `C`）。

用法：python tools/_bare-zhengque.py
"""
import io
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = re.compile(r"[A-D①-⑩]")
PREV_OK = set("。，；：\u201c\u201d\u2018\u2019）)\n \t\u3000、")


def scan(path):
    raw = io.open(path, encoding="utf-8").read().replace("\\n", "\n")
    hits = []
    for m in re.finditer(r"正确(?=[。，、])", raw):
        i = m.start()
        if i == 0 or raw[i - 1] not in PREV_OK:
            continue
        if MARK.search(raw[max(0, i - 12):i]):
            continue
        hits.append((i, raw[max(0, i - 45):i + 4]))
    return hits


def main():
    total = 0
    for f in ("data/politics/questions.ts", "data/politics/questions-x8.ts"):
        hits = scan(os.path.join(ROOT, f))
        total += len(hits)
        print(f"=== {f}  可疑 {len(hits)} 处")
        for _, ctx in hits:
            print(f"    …{ctx!r}")
        print()
    print(f"合计可疑 {total} 处")


if __name__ == "__main__":
    main()
