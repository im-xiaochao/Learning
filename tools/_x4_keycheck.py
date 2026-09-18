# -*- coding: utf-8 -*-
"""用答案解析 PDF 的 OCR 交叉验证肖四每一道客观题的答案键。

用法：
    python tools/_x4_keycheck.py > tools/_x4-keycheck.out

思路：
  1. 在 OCR 里抓所有「NN. 答案 XXXX」标记（带答案字母的才是客观题），记下它在原文里的字符下标。
  2. 把源文件每条 explanation 的前 20 个汉字在 OCR 里定位，取它**前面最近的那个标记**。
  3. 比对标记里的字母与源文件的 answerKey / answerKeys。
"""
import difflib
import re
import sys

SRC = r"D:\Code\Learning\data\politics\questions.ts"
OCR = r"D:\Code\Learning\tools\_x4-answerocr.out"

CJK = re.compile(r"[\u4e00-\u9fff]")
# 答案标记：允许 OCR 把「答案」读成「谷案 / 者答案 / 参考答案」，末尾可能有「）」
MARK = re.compile(r"(\d{1,2})\s*[.、．]?\s*(?:参考)?[答谷者]?[案]\s*[）)]?\s*([A-D]{1,4})(?![A-Za-z\u4e00-\u9fff])")
# 只认「答案 + 字母」，中间最多容忍 3 个非字母字符（OCR 会插字，如「答案索A」）
BWD = re.compile(r"(?:参考)?[答谷者]?案\s*[）)]?\s*[^A-D\s]{0,3}([A-D]{1,4})(?![A-Za-z\u4e00-\u9fff])")

raw = open(OCR, encoding="utf-8").read()

# —— 归一化（只留汉字）并保留原始下标映射 ——
chars, idx = [], []
for i, c in enumerate(raw):
    if CJK.match(c):
        chars.append(c)
        idx.append(i)
ocr_n = "".join(chars)


def to_raw(npos):
    return idx[npos]


# —— 抓标记 ——
marks = []
for m in MARK.finditer(raw):
    # 标记所在位置的「归一化下标」：统计它前面有多少汉字
    npos = sum(1 for c in raw[:m.start()] if CJK.match(c))
    marks.append((npos, m.group(1), m.group(2), m.start()))
marks.sort()

# —— 读源文件肖四区间 ——
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


rows = []
for k in range(len(blocks) - 1):
    qid, start = blocks[k]
    block = mid[start:blocks[k + 1][1]]
    if not re.match(r"q-(maozhongte|mayuan|shigang|sixiu|shizheng)-", qid):
        continue
    typ = read_type(block)
    if typ not in ("choice", "multi"):
        continue
    expl = read_string(block, 'explanation: "')
    if not expl:
        rows.append((qid, typ, read_keys(block), None, None, "无解析"))
        continue
    exp_n = "".join(c for c in expl if CJK.match(c))
    # 定位解析在 OCR 里的位置。两个坑：
    #  坑一：解析开头的套话（如「国务院新闻办公室于…发布《…》白皮书。白皮书」）在多题里重复出现，
    #        只取「首次出现」会匹配到别人的简析 → 枚举所有候选，取对齐度最高的。
    #  坑二：OCR 会整行漏检，解析第一行可能根本不在 OCR 里 → 退回用中段探针，
    #        但这时必须要求极高相似度（≥0.95），否则会落到无关文本上、报出假的不一致。
    # 打分用「解析有多少比例能按顺序对上」（匹配块总长 / 解析长度，完美匹配为 1.0）；
    # 不能用 ratio()——窗口比解析长，ratio 会被稀释到 0.77 封顶。
    def score_at(win_from):
        win = ocr_n[win_from:win_from + int(len(exp_n) * 1.6) + 40]
        sm2 = difflib.SequenceMatcher(None, exp_n, win, autojunk=False)
        return sum(b.size for b in sm2.get_matching_blocks()) / len(exp_n)

    at = None
    best = -1.0
    # —— 第一遍：按解析开头定位，阈值 0.80 ——
    for plen in (24, 20, 16, 12, 10):
        probe = exp_n[:plen]
        if len(probe) < 10:
            break
        pos = ocr_n.find(probe)
        while pos >= 0:
            r = score_at(pos)
            if r > best:
                best, at = r, pos
            pos = ocr_n.find(probe, pos + 1)
        if best >= 0.95:
            break
    threshold = 0.80
    # —— 第二遍：开头缺失时，从 1/4、1/2 处取探针，但阈值提到 0.95 ——
    if best < threshold:
        for frac in (0.25, 0.5):
            s = int(len(exp_n) * frac)
            if s + 12 > len(exp_n):
                continue
            probe = exp_n[s:s + 16]
            pos = ocr_n.find(probe)
            while pos >= 0:
                win_from = max(0, pos - s)
                r = score_at(win_from)
                if r > best:
                    best, at = r, win_from
                pos = ocr_n.find(probe, pos + 1)
        threshold = 0.95
    if at is None or best < threshold:
        rows.append((qid, typ, read_keys(block), None, None,
                     f"解析在 OCR 里定位失败（最佳匹配比例 {best:.2f}）"))
        continue
    # 坑：OCR 常把题号和「答案」拆到两行（`4. \n、答案D`），或在「答案」和字母之间插字
    # （`10.答案索A`），所以别用行首正则，改成从定位点往前 200 字里找**最后一个**「答案+字母」。
    back = raw[max(0, idx[at] - 400):idx[at]]
    cands = list(BWD.finditer(back))
    if not cands:
        rows.append((qid, typ, read_keys(block), None, None, "前面 400 字里没有答案标记"))
        continue
    last = cands[-1]
    pdf_ans = sorted(last.group(1))
    numwin = back[max(0, last.start() - 16):last.start()]
    nm = re.findall(r"(\d{1,2})\s*[.、．]?", numwin)
    pdf_num = nm[-1] if nm else "?"

    prev_i = -1
    for i, mp in enumerate(marks):
        if mp[0] <= at:
            prev_i = i
        else:
            break
    rows.append((qid, typ, read_keys(block), pdf_num, pdf_ans, None,
                 {"at": at, "prev": prev_i, "marks": marks, "raw": raw, "idx": idx,
                  "expl": expl, "back": back}))

ok = 0
bad = []
unknown = []
manual_ok = 0
verdicts = {}   # qid → (判定, 源答案, PDF 答案)

# OCR 把答案字母读坏、已裁原图人眼确认过的两处（证据见 tools/_x4-keycheck.out 的定位上下文）。
# 这两处不能靠脚本自动判，写死在这里，避免每次都报成「不一致」。
MANUAL = {
    "q-maozhongte-29": ("C", "第3套第5题，原图 `5. 答案 C`（OCR 读成 `答案】`，字母丢失）"),
    "q-mayuan-32": ("C", "第4套第4题，原图 `4. 答案 C`（OCR 读成 `4.1答案 C`；该题题干首行被漏检，路径一无法定位）"),
}

for row in rows:
    qid, typ, mine, num, pdf, note = row[:6]
    dbg = row[6] if len(row) > 6 else None
    mine_s = "".join(mine)
    if note:
        if qid in MANUAL:
            want = MANUAL[qid][0]
            if mine == sorted(want):
                manual_ok += 1
                verdicts[qid] = ("MANUAL", mine_s, want)
            else:
                bad.append((qid, typ, mine_s, want, num, dbg))
                verdicts[qid] = ("BAD", mine_s, want)
            continue
        unknown.append((qid, note))
        verdicts[qid] = ("SKIP", mine_s, "")
        continue
    pdf_s = "".join(pdf)
    if mine == pdf:
        ok += 1
        verdicts[qid] = ("OK", mine_s, pdf_s)
    else:
        if qid in MANUAL:
            want = MANUAL[qid][0]
            if mine == sorted(want):
                manual_ok += 1
                verdicts[qid] = ("MANUAL", mine_s, want)
                continue
        bad.append((qid, typ, mine_s, pdf_s, num, dbg))
        verdicts[qid] = ("BAD", mine_s, pdf_s)

# 写机器可读结果，供 _x4_keycheck_all.py 合并两条路径
with open(r"D:\Code\Learning\tools\_x4-keycheck.tsv", "w", encoding="utf-8") as f:
    for qid, (v, mine_s, pdf_s) in verdicts.items():
        f.write(f"{qid}\t{v}\t{mine_s}\t{pdf_s}\n")

print(f"肖四客观题共 {len(rows)} 题")
print(f"  答案一致（脚本自动核对）  {ok} 题")
print(f"  答案一致（人工裁图确认）  {manual_ok} 题")
print(f"  ❌ 不一致                  {len(bad)} 题")
print(f"  ⚠️ 无法比对                {len(unknown)} 题\n")

if bad:
    print("===== 答案不一致（含定位上下文，用于判断是不是定位错了）=====")
    for qid, typ, mine, pdf, num, dbg in bad:
        print(f"\n  {qid}  {typ}  源「{mine}」 / 关联到 PDF 第 {num} 题「{pdf}」")
        if not dbg:
            continue
        marks, raw, idx = dbg["marks"], dbg["raw"], dbg["idx"]
        pi = dbg["prev"]
        raw_at = idx[dbg["at"]]
        print(f"    解析开头：{dbg['expl'][:40]}")
        print(f"    定位到的原文位置（归一化下标 {dbg['at']}）：…{raw[max(0, raw_at - 40):raw_at + 30]}…")
        for k in range(max(0, pi - 2), min(len(marks), pi + 3)):
            npos, n, ans, roff = marks[k]
            tag = "← 关联到的" if k == pi else ""
            print(f"      标记[{k}] 第 {n} 题 {ans}  原文：{raw[roff:roff + 30].splitlines()[0]!r} {tag}")
    print()

if unknown:
    print("===== 无法比对（需人工看）=====")
    for qid, note in unknown:
        print(f"  {qid:22s} {note}")
    print()

if manual_ok:
    print("===== 人工裁图确认（OCR 读坏答案字母）=====")
    for qid, (ans, why) in MANUAL.items():
        print(f"  {qid:22s} → {ans}　{why}")
    print()

print("\n===== 抓到的答案标记（前 60 条）=====")
for npos, num, ans, roff in marks[:60]:
    line = raw[roff:roff + 40].split("\n")[0]
    print(f"  第 {num:>2} 题 → {ans:<4}  {line}")
