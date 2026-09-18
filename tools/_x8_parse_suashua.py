# -*- coding: utf-8 -*-
"""解析「26肖八选择题速刷刷题本」文本层 → 8 套 × 33 道客观题的 {stem, options}。

格式（排版稿）：
    26 肖八·卷一
    一、单项选择题。
    (1) 题干…（可跨多行）
    A. 选项（可跨多行）
    B. …
    二、多项选择题。
    (17) …
    公众号：做题本集结地          ← 页脚，丢弃
    26 肖秀荣8 套卷选择
    · 第2 页，共62 页·

用法：python tools/_x8_parse_suashua.py > tools/_x8-suashua.json
"""
import json
import re
import sys

SRC = r"D:\Code\Learning\tools\_x8-suashua.txt"

SET_RE = re.compile(r"^26\s*肖八\s*[·・]\s*卷\s*([一二三四五六七八])\s*$")
SEC_RE = re.compile(r"^[一二]、\s*(单项选择|多项选择)题")
QNUM_RE = re.compile(r"^[（(]\s*(\d{1,2})\s*[)）]\s*(.*)$")
# 排版稿里偶有漏括号的题号（卷二第7题 `7 新中国成立…`、卷八第14题 `14 “法律既…`）。
# 只在「刚读完选项 D」且号码正好等于下一题号时才认，避免把题干续行里的数字当题号。
BARE_RE = re.compile(r"^(\d{1,2})\s+(.*)$")
OPT_RE = re.compile(r"^([A-D])\s*[.．、]\s*(.*)$")
CN = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8}
# 页脚：公众号行 / 书名行 / 页码行
FOOT_RE = re.compile(r"^(公众号|26\s*肖秀荣8\s*套卷选择|·\s*第\s*\d+\s*页|【Free|「Free)")
# 书末的「选择题答案速查」表：卷八第33题的 D 选项会把整张表吸进来。
# 注意目录页（第1页）也有同样的标题，那时 `sets` 还是空的，用这个条件区分。
STOP_RE = re.compile(r"^\s*选择题答案速查")


def clean(s: str) -> str:
    """去掉排版稿里的软空格：`1% 工作法` → `1%工作法`，`9 月` → `9月`。"""
    s = s.strip()
    s = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])", "", s)
    s = re.sub(r"(?<=\d)\s+(?=[\u4e00-\u9fff])", "", s)
    s = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=\d)", "", s)
    s = re.sub(r"(?<=[，。、；：）“”])\s+", "", s)
    return s.strip()


def main():
    lines = open(SRC, encoding="utf-8").read().split("\n")
    sets = {}
    cur_set = None
    cur_sec = None            # 'choice' | 'multi'
    q = None                  # 当前题 dict
    opts = []
    buf = []
    field = None              # 'stem' | 'A'..'D'
    last_num = 0              # 本分节上一题号，用于识别漏括号的题号

    def flush_field():
        nonlocal buf
        if not buf:
            return
        text = clean("".join(buf))
        buf = []
        if not text:
            return
        if field == "stem":
            q["stem"] = (q["stem"] + text) if q["stem"] else text
        elif field:
            opts[ord(field) - 65]["text"] = (opts[ord(field) - 65]["text"] + text) if opts[ord(field) - 65]["text"] else text

    def flush_q():
        nonlocal q, opts, field, last_num
        if q is None:
            return
        flush_field()
        q["options"] = [o for o in opts if o["text"]]
        q["type"] = "choice" if cur_sec == "choice" else "multi"
        q["set"] = CN[cur_set]
        sets.setdefault(CN[cur_set], []).append(q)
        last_num = q["num"]
        q, opts, field = None, [], None

    for raw in lines:
        if raw.startswith("@@@PAGE"):
            continue
        ln = raw.rstrip()
        if not ln.strip():
            continue
        if FOOT_RE.match(ln.strip()):
            continue
        if STOP_RE.match(ln.strip()) and sets:
            # 已经解析出题目 → 这是书末的答案速查表，收尾退出（保留当前选项文本）
            flush_q()
            break
        m = SET_RE.match(ln.strip())
        if m:
            flush_q()
            cur_set = m.group(1)
            continue
        if SEC_RE.match(ln.strip()):
            flush_q()
            cur_sec = "choice" if "单项" in ln else "multi"
            last_num = 0
            continue
        m = QNUM_RE.match(ln.strip())
        if not m and q is not None and field == "D":
            b = BARE_RE.match(ln.strip())
            if b and int(b.group(1)) == q["num"] + 1:
                m = b
        if m and cur_set:
            flush_q()
            q = {"num": int(m.group(1)), "stem": "", "options": []}
            opts = [{"key": chr(65 + i), "text": ""} for i in range(4)]
            field = "stem"
            buf = [m.group(2)]
            continue
        m = OPT_RE.match(ln.strip())
        if m and q is not None:
            flush_field()
            field = m.group(1)
            buf = [m.group(2)]
            continue
        # 续行
        if q is not None:
            buf.append(ln.strip())
    flush_q()

    out = {"sets": {str(k): v for k, v in sorted(sets.items())}}
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)

    # —— 覆盖度自检（写 stderr，别污染 stdout 的 JSON） ——
    print("\n=== 覆盖度 ===", file=sys.stderr)
    tot = 0
    for s in range(1, 9):
        qs = sets.get(s, [])
        nums = sorted(x["num"] for x in qs)
        tot += len(qs)
        exp = list(range(1, 17)) if True else []
        miss = [n for n in range(1, 34) if n not in nums]
        bad4 = [x["num"] for x in qs if len(x["options"]) != 4]
        empty = [x["num"] for x in qs if not x["stem"].strip()]
        print(f"  第{s}套：{len(qs)} 题  缺号={miss or '无'}  选项≠4={bad4 or '无'}  空题干={empty or '无'}", file=sys.stderr)
    print(f"  合计 {tot} 题（期望 264）", file=sys.stderr)


main()
