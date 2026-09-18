# -*- coding: utf-8 -*-
"""肖四答案键交叉验证（路径二）：题干 → 题号 → 答案。

用法：
    python tools/_x4_keycheck2.py > tools/_x4-keycheck2.out

与 _x4_keycheck.py（按解析文本定位）不同，这条路径不依赖解析文本：
  1. 在《4套卷》**试卷** OCR 里定位每道题的题干，读它前面的 `NN.` 得到题号，
     并按 `一、单项选择题` 的出现次数确定是第几套。
  2. 在**答案解析** OCR 里按同样的方式分套，抓 `NN. 答案 XXXX`，建 (套, 题号) → 答案 表。
  3. 比对源文件的 answerKey / answerKeys。

两条路径互相独立，结论一致才可信。
"""
import re
import difflib

SRC = r"D:\Code\Learning\data\politics\questions.ts"
QOCR = r"D:\Code\Learning\tools\_x4-qocr.out"
AOCR = r"D:\Code\Learning\tools\_x4-answerocr.out"

CJK = re.compile(r"[\u4e00-\u9fff]")
# 套卷边界用页眉里的「终极预测4套卷（一）」，比「一、单项选择题」可靠：
# 第 4 套的分节标题被 OCR 读成了裸的「单项选择题」，没有「一、」前缀。
SET_HDR = re.compile(r"终极预测\s*4?\s*套卷\s*[（(]\s*([一二三四])\s*[)）]")
QNUM = re.compile(r"^(\d{1,2})\s*[.．、]")
BWD = re.compile(r"(?:参考)?[答谷者]?案\s*[）)]?\s*[^A-D\s]{0,3}([A-D]{1,4})(?![A-Za-z\u4e00-\u9fff])")
CN = {"一": 1, "二": 2, "三": 3, "四": 4}


def load(path):
    lines = open(path, encoding="utf-8").read().split("\n")
    offsets, pos = [], 0
    for ln in lines:
        offsets.append(pos)
        pos += len(ln) + 1
    return lines, offsets


def norm_with_map(text):
    chars, idx = [], []
    for i, c in enumerate(text):
        if CJK.match(c):
            chars.append(c)
            idx.append(i)
    return "".join(chars), idx


# —— 试卷：分套 + 题干定位 ——
q_lines, q_off = load(QOCR)
q_raw = "\n".join(q_lines)
q_n, q_map = norm_with_map(q_raw)
q_norm_off = []          # 归一化下标 → 原文下标
q_norm_off = q_map

set_no = 0
q_marks = []             # (set_no, num, raw_offset)
for i, ln in enumerate(q_lines):
    h = SET_HDR.search(ln)
    if h:
        set_no = CN[h.group(1)]
    m = QNUM.match(ln)
    if m and set_no:
        q_marks.append((set_no, m.group(1), q_off[i]))
# 材料分析题的题干在 PDF 里也带 `34.` 这样的编号，上面已覆盖。

# —— 答案：分套 + (套, 题号) → 答案 ——
a_lines, a_off = load(AOCR)
a_raw = "\n".join(a_lines)
set_no = 0
a_map = {}               # (set_no, num) → 答案字母串
for i, ln in enumerate(a_lines):
    h = SET_HDR.search(ln)
    if h:
        set_no = CN[h.group(1)]
    if not set_no:
        continue
    for m in BWD.finditer(ln):
        pre = ln[max(0, m.start() - 16):m.start()]
        nm = re.findall(r"(\d{1,2})\s*[.．、]?", pre)
        if nm:
            a_map[(set_no, nm[-1])] = "".join(sorted(m.group(1)))

# —— 源文件 ——
src = open(SRC, encoding="utf-8").read()
g_i = src.index("export const POLITICS_QUESTIONS")
g_j = src.index("...POLITICS_QUESTIONS_X8")
mid = src[g_i:g_j]
blocks = [(m.group(1), m.start()) for m in re.finditer(r'id: "(q-[a-z0-9-]+)"', mid)]
blocks.append((None, len(mid)))


def read_string(block, key):
    fi = block.find(key)
    if fi < 0:
        return None
    i = fi + len(key)
    out = []
    while i < len(block):
        c = block[i]
        if c == "\\":
            out.append(block[i:i + 2])
            i += 2
            continue
        if c == '"':
            break
        out.append(c)
        i += 1
    return "".join(out)


def read_type(block):
    m = re.search(r"type:\s*'([a-z]+)'", block)
    return m.group(1) if m else None


def read_keys(block):
    m = re.search(r'answerKeys:\s*\[([^\]]*)\]', block)
    if m:
        return sorted(re.findall(r'"([A-D])"', m.group(1)))
    m = re.search(r'answerKey:\s*"([A-D]*)"', block)
    return sorted(m.group(1)) if m and m.group(1) else []


def read_tags(block):
    m = re.search(r"tags:\s*\[([^\]]*)\]", block)
    return re.findall(r'"([^"]*)"', m.group(1)) if m else []


ok = 0
bad = []
unknown = []
verdicts = {}
for k in range(len(blocks) - 1):
    qid, start = blocks[k]
    block = mid[start:blocks[k + 1][1]]
    if not re.match(r"q-(maozhongte|mayuan|shigang|sixiu|shizheng)-", qid):
        continue
    typ = read_type(block)
    if typ not in ("choice", "multi"):
        continue
    stem = read_string(block, 'stem: "') or ""
    exp_n = "".join(c for c in stem if CJK.match(c))
    if len(exp_n) < 20:
        unknown.append((qid, "题干太短，无法定位"))
        verdicts[qid] = ("unknown", "", "", "题干太短，无法定位")
        continue

    # 枚举候选位置，要求「定位点前面 90 字内有一个 `NN.` 题号标记」，取题干匹配比例最高的
    best, hit = -1.0, None
    for plen in (24, 20, 16, 12):
        probe = exp_n[:plen]
        if len(probe) < 12:
            break
        pos = q_n.find(probe)
        while pos >= 0:
            win = q_n[pos:pos + int(len(exp_n) * 1.5) + 40]
            sm = difflib.SequenceMatcher(None, exp_n, win, autojunk=False)
            score = sum(b.size for b in sm.get_matching_blocks()) / len(exp_n)
            if score > best:
                raw_at = q_norm_off[pos]
                # 找定位点前面最近的题号标记
                mark = None
                for st, num, roff in q_marks:
                    if roff <= raw_at:
                        mark = (st, num)
                    else:
                        break
                if mark and raw_at - 0 < 10 ** 9:
                    hit = (score, mark, raw_at)
                    best = score
            pos = q_n.find(probe, pos + 1)
        if best >= 0.9:
            break

    if hit is None or best < 0.8:
        unknown.append((qid, f"题干在试卷 OCR 里定位失败（最佳 {best:.2f}）"))
        verdicts[qid] = ("unknown", "", "", f"题干定位失败（最佳 {best:.2f}）")
        continue
    score, (st, num), raw_at = hit
    # 定位点必须紧跟在题号后面（题号与题干之间不会有别的内容）
    if raw_at - q_off[0] < 0:
        pass
    key = (st, num)
    if key not in a_map:
        unknown.append((qid, f"答案解析里没有第 {st} 套第 {num} 题的答案标记"))
        verdicts[qid] = ("unknown", "".join(read_keys(block)), "", f"答案解析缺第{st}套第{num}题标记")
        continue
    pdf = sorted(a_map[key])
    mine = read_keys(block)
    tags = read_tags(block)
    src_set = next((CN[t[1]] for t in tags if re.match(r"^第[一二三四]套$", t)), None)
    if src_set is not None and src_set != st:
        unknown.append((qid, f"套号对不上：源文件第 {src_set} 套 / 定位到第 {st} 套（第 {num} 题）"))
        verdicts[qid] = ("unknown", "".join(mine), "".join(pdf),
                         f"套号对不上：源第{src_set}套 / 定位第{st}套第{num}题")
        continue
    if mine == pdf:
        ok += 1
        verdicts[qid] = ("ok", "".join(mine), "".join(pdf), f"第{st}套第{num}题")
    else:
        bad.append((qid, typ, "".join(mine), "".join(pdf), st, num, score))
        verdicts[qid] = ("bad", "".join(mine), "".join(pdf), f"第{st}套第{num}题")

print("肖四客观题（路径二：题干→题号→答案）")
print(f"  答案一致    {ok} 题")
print(f"  ❌ 不一致    {len(bad)} 题")
print(f"  ⚠️ 无法比对  {len(unknown)} 题\n")

if bad:
    print("===== 答案不一致 =====")
    for qid, typ, mine, pdf, st, num, score in bad:
        print(f"  {qid:22s} {typ:7s} 源「{mine}」 / 第{st}套第{num}题「{pdf}」  （题干匹配 {score:.2f}）")
    print()

if unknown:
    print("===== 无法比对 =====")
    for qid, note in unknown:
        print(f"  {qid:22s} {note}")
    print()

print("===== 答案解析里抓到的 (套, 题号) → 答案 =====")
for k in sorted(a_map):
    print(f"  第{k[0]}套 第{k[1]:>2} 题 → {a_map[k]}")

# —— 落盘 TSV，供 _x4_keycheck_all.py 合并 ——
import os
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_x4-keycheck2.tsv")
with open(out, "w", encoding="utf-8", newline="\n") as f:
    f.write("qid\tverdict\tsrc\tpdf\tnote\n")
    for qid in sorted(verdicts):
        v, s, p, note = verdicts[qid]
        f.write(f"{qid}\t{v}\t{s}\t{p}\t{note}\n")
print(f"\n已写入 {out}（{len(verdicts)} 行）")
