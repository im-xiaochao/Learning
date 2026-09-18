# -*- coding: utf-8 -*-
"""用 RapidOCR 补《答案解析》文本层的洞。

文本层本身是「扫描件 + OCR」，会整行丢失（第3套第4题、第4套第15题的简析整块没了；
8 道材料题的参考答案也缺）。这里对缺口的页段重新 OCR（多 dpi 合并），
用和 `_x8_parse_answers.py` 相同的分块规则再抽一遍，**只补缺口**。

用法：
  python tools/_x8_fill.py rows/x8a-d250.jsonl rows/x8a-d160.jsonl rows/x8a-d120.jsonl \
      > tools/_x8-answers-patch.json
"""
import json
import re
import sys

# 答案解析 PDF 的页 → 套号（各套起始页 3/13/22/32/42/52/62/72）
PAGE_SET = {}
for _s, (_a, _b) in enumerate(
        [(3, 12), (13, 21), (22, 31), (32, 41), (42, 51), (52, 61), (62, 71), (72, 82)], start=1):
    for _p in range(_a, _b + 1):
        PAGE_SET[_p] = _s

NUM = r"(\d(?:\s*\d)?)"
ANS_MARK = re.compile(rf"^\s*{NUM}\s*[.．、]?\s*答\s*案\s*([A-D](?:\s*[A-D])*)\s*$")
JIANXI = re.compile(r"^\s*(?:【\s*)?简\s*析\s*(?:】)?\s*")
REF_START = re.compile(
    r"^\s*(?:(\d(?:\s*\d)?)\s*[.．、]?\s*)?(?:参\s*考\s*答\s*案|考\s*答\s*案)\s*(?:[（(]\s*1\s*[)）])?"
)
PLAIN1 = re.compile(r"^\s*[（(]\s*[1lI]\s*[)）]\s*")
MAT_HDR = re.compile(r"^\s*三\s*、\s*材料分析题")
REF_LINE = re.compile(r"^\s*(?:\d(?:\s*\d)?\s*[.．、]?\s*)?(?:参\s*考\s*答\s*案|考\s*答\s*案)")
NOISE = re.compile(r"考研政治冲刺|答案及解析分册|肖秀荣|微信公众号|新浪微博")


def norm(t):
    return re.sub(r"[\s。，、,．.；;：:！!？?（）()“”\"'《》\-—~～]", "", t)


def estimate_scales(runs_rows):
    """估算每个 OCR 运行相对参考运行的坐标缩放比（见 `_x8_material.py` 同名函数的说明）。"""
    if not runs_rows:
        return []
    ref = max(range(len(runs_rows)), key=lambda i: len(runs_rows[i]))
    refmap = {}
    for r in runs_rows[ref]:
        k = norm(r["text"])
        if k and k not in refmap:
            refmap[k] = r["y"]
    scales = []
    for i, rows in enumerate(runs_rows):
        if i == ref or not rows:
            scales.append(1.0)
            continue
        ratios = [refmap[k] / r["y"]
                  for r in rows
                  for k in (norm(r["text"]),)
                  if k in refmap and r["y"] > 0]
        if len(ratios) >= 3:
            ratios.sort()
            scales.append(ratios[len(ratios) // 2])
        elif rows and runs_rows[ref]:
            scales.append(runs_rows[ref][0]["y"] / rows[0]["y"])
        else:
            scales.append(1.0)
    return scales


def load_merged(paths):
    """把多次 OCR 按「页 + 对齐后的 y」聚成行。

    注意：**不能**按各 run 自己的 maxy 归一化（页脚不一定每次都被检出，
    基准不可比）。这里先按缩放比对齐到参考 run，再统一除以各 run maxy 的最大值。
    """
    runs = []
    for p in paths:
        pages = {}
        for line in open(p, encoding="utf-8"):
            d = json.loads(line)
            pages[d["page"]] = d["rows"]
        runs.append(pages)
    out = {}
    for pg in sorted({p for r in runs for p in r}):
        runs_rows = [run.get(pg) or [] for run in runs]
        scales = estimate_scales(runs_rows)
        base = max((max((r["y"] for r in rows), default=0) * sc
                    for rows, sc in zip(runs_rows, scales)), default=0) or 1.0
        items = []
        for ri, rows in enumerate(runs_rows):
            sc = scales[ri] * 1000.0 / base
            for x in rows:
                items.append({"ri": ri, "yn": x["y"] * sc, "text": x["text"]})
        items.sort(key=lambda i: i["yn"])
        clusters = []
        for it in items:
            if clusters and it["yn"] - clusters[-1]["yn"] < 12:
                clusters[-1]["items"].append(it)
            else:
                clusters.append({"yn": it["yn"], "items": [it]})
        rows = []
        for c in clusters:
            best = max(c["items"], key=lambda i: (-i["ri"], len(norm(i["text"]))))
            rows.append(best["text"])
        dedup = []
        for t in rows:
            if dedup and norm(dedup[-1]) == norm(t):
                continue
            dedup.append(t)
        out[pg] = dedup
    return out


def main():
    pages = load_merged(sys.argv[1:])
    sets = {i: {"expl": {}, "ref": {}} for i in range(1, 9)}
    mat_by_set = {i: [] for i in range(1, 9)}
    cur_set = None
    mode = None
    cur_num = None
    expect = 1
    last_mark = 0
    buf = []

    def flush():
        nonlocal buf, cur_num, mode
        if cur_num is not None and buf and mode == "expl":
            text = JIANXI.sub("", "\n".join(buf)).strip()
            if text:
                sets[cur_set]["expl"][cur_num] = text
        buf = []

    for pg in sorted(pages):
        s = PAGE_SET.get(pg)
        if s is None:
            continue
        if s != cur_set:
            flush()
            cur_set, expect, mode, cur_num, last_mark = s, 1, None, None, 0
        for t in pages[pg]:
            t = t.strip()
            if not t:
                continue
            if NOISE.search(t):
                continue
            if re.fullmatch(r"\d{1,3}", t):
                continue
            if t in ("答案速查", "答案速查表"):
                flush()
                mode, cur_num = None, None
                continue
            if MAT_HDR.match(t) or REF_LINE.match(t):
                flush()
                mode = "mat"
                mat_by_set[cur_set].append(t)
                continue
            ma = ANS_MARK.match(t)
            if ma:
                n = int(re.sub(r"\s", "", ma.group(1)))
                # 题号只会递增；倒退说明 OCR 把数字认错了
                # （第4套第15题的标记被读成 `13．答案D`），按顺序推回正确题号。
                if n <= last_mark:
                    n = expect
                flush()
                mode, cur_num, last_mark = "expl", n, n
                expect = n + 1
                continue
            jx = JIANXI.match(t)
            if jx:
                if mode == "expl" and buf:
                    flush()
                    cur_num, expect = expect, expect + 1
                elif mode != "expl":
                    flush()
                    mode, cur_num = "expl", expect
                    expect += 1
                rest = t[jx.end():].strip()
                buf = [rest] if rest else []
                continue
            if mode == "expl":
                buf.append(t)
            elif mode == "mat":
                mat_by_set[cur_set].append(t)
    flush()

    # 材料区按 (1) 切块
    for s in range(1, 9):
        blocks, cur = [], None
        for ln in mat_by_set[s]:
            m = REF_START.match(ln)
            if m:
                n = int(re.sub(r"\s", "", m.group(1))) if m.group(1) else None
                rest = ln[m.end():]
                # 同 `_x8_parse_answers.py`：REF_START 把 `(1)` 一起吃了，补回来
                if re.search(r"[（(]\s*1\s*[)）]\s*$", ln[:m.end()]):
                    rest = "（1）" + rest
                cur = [n, [rest]]
                blocks.append(cur)
                continue
            m2 = PLAIN1.match(ln)
            if m2:
                rest = "（1）" + ln[m2.end():]
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
                sets[s]["ref"][num] = text
            nextn = num + 1

    json.dump({"sets": {str(k): {"expl": {str(a): b for a, b in v["expl"].items()},
                                 "ref": {str(a): b for a, b in v["ref"].items()}}
                        for k, v in sets.items()}},
              sys.stdout, ensure_ascii=False, indent=1)
    print("=== OCR 补出来的内容 ===", file=sys.stderr)
    for s in range(1, 9):
        print(f"  第{s}套：解析 {sorted(sets[s]['expl'])}  材料参考 {sorted(sets[s]['ref'])}", file=sys.stderr)


main()
