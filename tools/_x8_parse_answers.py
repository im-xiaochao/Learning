# -*- coding: utf-8 -*-
"""解析肖八《答案解析》文本层 → 每套的答案速查表 + 逐题解析 + 材料题参考答案。

文本层的坑（都已在下面的正则/预处理里处理）：
  1. 两位数的题号会被拆开：`1 0 . 答案C` 其实是第 10 题。
  2. 多选答案的字母带空格：`答案A B D` 其实是 ABD。
  3. 页脚页码是独占一行的裸数字，会被误当成题号；
     规律是「打印页码 = PDF 页号 - 2」，据此精确剔除。
  4. **`N. 答案X` 标记会整条丢失**（第2套第2题直接从第1题的简析接到下一题的简析）。
     所以客观题解析用「简析」当块分隔符、缺标记的按顺序补号；
     材料题参考答案更乱（40 条只有 29 个 `参考答案` 标记），
     改成「第 33 题解析之后 → 按 `(1)` 切块」的结构化方案。

用法：python tools/_x8_parse_answers.py > tools/_x8-answers.json
"""
import json
import re
import sys

SRC = r"D:\Code\Learning\tools\_x8-answers.txt"

NUM = r"(\d(?:\s*\d)?)"
SET_HDR = re.compile(r"考研政治冲刺\s*8?\s*套卷\s*[（(]?\s*([一二三四五六七八])\s*[)）]?\s*答案及解析")
# 客观题答案标记：`1 . 答案A` / `8.答案 A` / `1 0 . 答案C` / `21. 答案A C D`
ANS_MARK = re.compile(rf"^\s*{NUM}\s*[.．、]?\s*答\s*案\s*([A-D](?:\s*[A-D])*)\s*$")
# 解析块的起始词
JIANXI = re.compile(r"^\s*(?:【\s*)?简\s*析\s*(?:】)?\s*")
# 材料题每小问的分隔：(1) 出现在行首，或紧跟在「参考答案 / 考答案」之后
# 注意文本层是**扫描件 OCR 出来的**，不少 `参考答案(1)` 标记整条丢失，
# 所以「有显式题号就用题号，没有才按上一个 +1 推」，不能一律顺序编号（否则会整体错位）。
REF_START = re.compile(
    r"^\s*(?:(\d(?:\s*\d)?)\s*[.．、]?\s*)?(?:参\s*考\s*答\s*案|考\s*答\s*案)\s*(?:[（(]\s*1\s*[)）])?"
)
PLAIN1 = re.compile(r"^\s*[（(]\s*1\s*[)）]\s*")
# 材料区起点：材料分析题标题（**有的套卷文本层里没有这个标题**，见下面的 REF_LINE 兜底）
MAT_HDR = re.compile(r"^\s*三\s*、\s*材料分析题")
# 兜底：`34 . 参考答案(1)…` / `参考答案(1)…` / `36 . 考答案(1)…`
# 注意必须带「考」字，否则会误伤客观题的 `N. 答案X`
REF_LINE = re.compile(r"^\s*(?:\d(?:\s*\d)?\s*[.．、]?\s*)?(?:参\s*考\s*答\s*案|考\s*答\s*案)")
CN = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8}
HEAD_NOISE = re.compile(r"考研政治冲刺|答案及解析分册|肖秀荣|微信公众号|新浪微博")
# 选择题大标题：开新板块，必须终结上一题的解析（否则第16题解析会把「二、多项选择题」吃进去）
SEC_HDR = re.compile(r"^\s*[一二三]\s*、\s*(?:单项选择|多项选择|材料分析)题")
# 版权页/条码：第8套最后一段参考答案会把它们一起吸进来
META_LINE = re.compile(r"^[-\d]{6,}$|^定价\s*[:：]|^ISBN|^91[78]\d{8,}$|^·")
# 书末附加内容（增值服务、作者简介、书目）——出现在第8套参考答案之后，
# 不加这道闸会把「2026考研政治终极预测4套卷」之类的书目吸进第38题的采分点。
BACK_MATTER = re.compile(r"考研书系|增值服务|作者简介|上架建议|肖秀荣考研系列|知识点精讲精练|授权码")
FW = str.maketrans("ＡＢＣＤａｂｃｄ", "ABCDabcd")


def norm_num(s: str) -> int:
    return int(re.sub(r"\s+", "", s))


def norm_letters(s: str) -> str:
    return "".join(sorted(set(re.sub(r"\s+", "", s))))


def join_marks(lines: list) -> list:
    """题号与「答案」被拆成两行：`23.` / `答案B C D` → 合成一行。

    文本层里有 5 处这样（第1套23、第4套7、第4套27、第6套32、第8套9）。
    只在「下一行以『答案』开头」时才合并，不会误伤答案速查表的题号行。
    """
    out, k = [], 0
    while k < len(lines):
        if (k + 1 < len(lines)
                and re.fullmatch(r"\d{1,2}\s*[.．、]?", lines[k])
                and re.match(r"^答\s*案\s*[A-D]", lines[k + 1])):
            out.append(lines[k] + lines[k + 1])
            k += 2
            continue
        out.append(lines[k])
        k += 1
    return out


def load_pages():
    """按 @@@PAGE 切页，剔除页眉、页码、空页标记。"""
    raw = open(SRC, encoding="utf-8").read().split("\n")
    pages, cur = [], None
    for ln in raw:
        if ln.startswith("@@@PAGE "):
            if cur is not None:
                pages.append(cur)
            cur = {"no": int(ln.split()[1]), "lines": []}
            continue
        if cur is not None:
            cur["lines"].append(ln)
    if cur is not None:
        pages.append(cur)

    for p in pages:
        lines = [l.strip() for l in p["lines"] if l.strip()]
        # 剔除页眉噪声，但**套卷标题行要留**（它同时含「考研政治冲刺」和套号）。
        lines = [l for l in lines if not HEAD_NOISE.search(l) or SET_HDR.search(l)]
        lines = [l for l in lines if l != "(本页无文字层)"]
        # 页脚页码：独占一行的裸数字，且等于「PDF 页号 - 2」
        if lines and re.fullmatch(r"\d{1,3}", lines[-1]) and int(lines[-1]) == p["no"] - 2:
            lines.pop()
        # 全角字母（`20.答案ＡBD`）先归一，否则 ANS_MARK 匹配不到
        lines = [l.translate(FW) for l in lines]
        lines = [l for l in lines if not META_LINE.match(l)]
        p["lines"] = join_marks(lines)
    return pages


def main():
    pages = load_pages()
    sets = {i: {"table": {}, "marked": {}, "expl": {}, "ref": {}} for i in range(1, 9)}
    warnings = []

    cur_set = None
    mode = None          # 'expl' | 'mat'
    cur_num = None
    buf = []
    mat_lines = []
    expect = 1
    last_mark = 0
    stopped = False      # 命中书末附加内容后置位，后续整页跳过

    def flush():
        nonlocal buf, cur_num, mode
        if cur_num is not None and buf:
            text = JIANXI.sub("", "\n".join(buf)).strip()
            if text and mode == "expl":
                sets[cur_set]["expl"][cur_num] = text
        buf = []

    def close_set():
        """一套结束：把材料区切成 34~38 五块。"""
        nonlocal mat_lines, mode, cur_num
        flush()
        if cur_set is None:
            mat_lines, mode, cur_num = [], None, None
            return
        blocks = []          # [(显式题号 or None, [行])]
        cur = None
        for ln in mat_lines:
            m = REF_START.match(ln)
            if m:
                n = norm_num(m.group(1)) if m.group(1) else None
                rest = ln[m.end():]
                # REF_START 把 `参考答案(1)` 里的 `(1)` 一起吃掉了，补回来，
                # 否则审计会判「有 (2) 却没有 (1) → 第(1)问答案开头丢失」。
                if re.search(r"[（(]\s*1\s*[)）]\s*$", ln[:m.end()]):
                    rest = "（1）" + rest
                cur = [n, [rest]]
                blocks.append(cur)
                continue
            m2 = PLAIN1.match(ln)
            if m2:
                rest = "（1）" + ln[m2.end():]
                # `34. 参考答案` 单独成行、`(1)…` 在下一行时，上一块是空壳，
                # 要并回去而不是另起一块（否则题号整体错位一格）。
                if cur is not None and not "".join(cur[1]).strip():
                    cur[1] = [rest]
                    continue
                cur = [None, [rest]]
                blocks.append(cur)
                continue
            if cur is not None:
                cur[1].append(ln)
        nextn = 34
        for n, body in blocks:
            num = n if (n and 34 <= n <= 38) else nextn
            text = "\n".join(body).strip()
            if 34 <= num <= 38 and text:
                sets[cur_set]["ref"][num] = text
            nextn = num + 1
        mat_lines, mode, cur_num = [], None, None

    for p in pages:
        lines = p["lines"]
        i = 0
        while i < len(lines):
            ln = lines[i]
            m = SET_HDR.search(ln)
            if m:
                s = CN[m.group(1)]
                # 每页页眉都是同一句话（`…冲刺8套卷(二)答案及解析`）。
                # 只有套号真的变了才算换套；否则当成噪声跳过，
                # 不然会把跨页的那道题解析从页中间生生截断。
                if s != cur_set:
                    close_set()
                    cur_set = s
                    expect = 1
                    last_mark = 0
                i += 1
                continue
            if cur_set is None:
                i += 1
                continue
            if BACK_MATTER.search(ln):
                # 书末的增值服务/作者简介/书目，到此为止不再收内容
                flush()
                mode, cur_num = None, None
                stopped = True
                i += 1
                continue
            if stopped:
                i += 1
                continue
            if ln.strip() in ("答案速查", "答案速查表"):
                flush()
                mode, cur_num = None, None
                # 表格是「一行题号、一行字母」的交替序列
                j = i + 1
                while j + 1 < len(lines):
                    a, b = lines[j].strip(), lines[j + 1].strip()
                    if re.fullmatch(r"\d(?:\s*\d)?", a) and re.fullmatch(r"[A-D](?:\s*[A-D]){0,3}", b):
                        sets[cur_set]["table"][norm_num(a)] = norm_letters(b)
                        j += 2
                    else:
                        break
                i = j
                continue
            if MAT_HDR.match(ln) or REF_LINE.match(ln):
                flush()
                mode = "mat"
                mat_lines.append(ln)
                i += 1
                continue
            if SEC_HDR.match(ln):
                # `二、多项选择题` / `一、单项选择题` 是板块分界，不是解析正文。
                flush()
                mode, cur_num = None, None
                i += 1
                continue
            ma = ANS_MARK.match(ln)
            if ma:
                n = norm_num(ma.group(1))
                # 题号只会递增；倒退说明 OCR 把数字认错了（第4套第15题被读成 `13．答案D`），
                # 按顺序推回正确题号，否则会覆盖掉真正第 13 题的解析。
                if n <= last_mark:
                    n = expect
                flush()
                mode, cur_num, last_mark = "expl", n, n
                expect = n + 1
                # 逐题标记是**独立于答案速查表**的第二读数，用于交叉验证
                sets[cur_set]["marked"][n] = norm_letters(ma.group(2))
                i += 1
                continue
            jx = JIANXI.match(ln)
            if jx:
                # 「简析」开新块：上一块有内容就收尾并取下一号
                if mode == "expl" and buf:
                    flush()
                    cur_num, expect = expect, expect + 1
                elif mode != "expl":
                    flush()
                    mode, cur_num = "expl", expect
                    expect += 1
                rest = ln[jx.end():].strip()
                buf = [rest] if rest else []
                i += 1
                continue
            if mode == "expl":
                buf.append(ln)
            elif mode == "mat":
                mat_lines.append(ln)
            i += 1
    close_set()

    out = {"sets": {}}
    for s in range(1, 9):
        d = sets[s]
        out["sets"][str(s)] = {
            "table": {str(k): v for k, v in sorted(d["table"].items())},
            "marked": {str(k): v for k, v in sorted(d["marked"].items())},
            "expl": {str(k): v for k, v in sorted(d["expl"].items())},
            "ref": {str(k): v for k, v in sorted(d["ref"].items())},
        }
        # 答案速查表 vs 逐题标记：同一本书里两处独立的答案，必须一致
        dis = [(k, d["table"][k], d["marked"][k]) for k in d["table"] if k in d["marked"] and d["table"][k] != d["marked"][k]]
        if dis:
            warnings.append(f"第{s}套 速查表与逐题标记冲突 {len(dis)} 处：{dis[:4]}")
        n1 = len([k for k in d["table"] if k <= 16])
        n2 = len([k for k in d["table"] if 17 <= k <= 33])
        if n1 != 16:
            warnings.append(f"第{s}套 单选答案 {n1}/16")
        if n2 != 17:
            warnings.append(f"第{s}套 多选答案 {n2}/17")
        if len(d["expl"]) < 33:
            miss = [n for n in range(1, 34) if n not in d["expl"]]
            warnings.append(f"第{s}套 解析 {len(d['expl'])}/33，缺 {miss}")
        if len(d["ref"]) != 5:
            warnings.append(f"第{s}套 材料参考答案 {len(d['ref'])}/5")

    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
    print("\n=== 自检 ===", file=sys.stderr)
    for s in range(1, 9):
        d = sets[s]
        print(f"  第{s}套：答案速查 {len(d['table'])} 项 / 解析 {len(d['expl'])} 条 / 材料参考 {len(d['ref'])} 条", file=sys.stderr)
    if warnings:
        print("\n⚠️ 异常：", file=sys.stderr)
        for w in warnings:
            print("   " + w, file=sys.stderr)
    else:
        print("\n✅ 全部达标（每套 16+17 答案、33 条解析、5 条材料参考答案）", file=sys.stderr)


main()
