# -*- coding: utf-8 -*-
"""从试卷扫描件的多 dpi OCR 结果里抽出 8 套的材料分析题（34~38）。

为什么单独写：
  1. `merge_rows.py` 只保留 y 和 text，丢掉了 x0；而 **段落切分要靠 x0**
     （续行 x0≈164、段首缩进 x0≈194，差 30 像素，非常好认）。所以这里自己合并，
     把 x0 一起带出来。
  2. 材料题的「材料」和「小问」要拆开：`（1）` 之前是材料，之后是小问。
  3. **x0 基线必须逐页算**：各页扫描的横向偏移不同，第 N+1 页的续行 x0 可能
     正好落在第 N 页的段首 x0 附近，全局阈值会把整页续行误判成段首。
     详见 `page_bases`。

用法：
  python tools/_x8_material.py rows/x8-d250.jsonl rows/x8-d160.jsonl rows/x8-d120.jsonl \
      > tools/_x8-material.json
"""
import json
import os
import re
import sys
from collections import Counter

SET_HDR = re.compile(r"冲刺\s*8\s*套卷\s*[（(]\s*([一二三四五六七八])\s*[)）]")
CN = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8}

# 材料分析题所在页段（PDF 页号）→ 套号。
# 为什么要写死：偶数页页眉是 `…冲刺8套卷（五）`（带套号），奇数页页眉是 `…冲刺8套卷试题分册`
# （**不带套号**）。材料题往往从奇数页开始，只靠页眉会认不出套号。
# 下面的区间来自原书目录（卷一 p1 / 卷二 p21 / … / 卷八 p83）与页眉交叉核对过。
PAGE_SET = {}
for _s, (_a, _b) in enumerate(
        [(8, 11), (18, 21), (28, 31), (38, 42), (49, 53), (60, 63), (70, 73), (80, 83)], start=1):
    for _p in range(_a, _b + 1):
        PAGE_SET[_p] = _s
# 页眉 / 页脚 / 分册名
NOISE = re.compile(r"考研政治冲刺|试题分册|答案及解析|肖秀荣|微信公众号")
# 材料题题号。卷面里真出现过这些分隔符：`.` `、` `．` `。`（全角句号）`，`（全角逗号）
QNUM = re.compile(r"^(\d{2})\s*[.．、。,，]")
# 小问起点
SUB1 = re.compile(r"^[（(]\s*[1lI]\s*[)）]")
# 材料分栏标记
MATN = re.compile(r"^材料\s*\d?\s*$")
# 答案/材料结束后的来源注（摘编自… / 摘自…）
SRC = re.compile(r"^(摘编自|摘自|选自)")

# 省略号字符（`norm()` 会抹掉 `.` `．`，但保留 `…` `·`，比对时另外处理）
ELL = re.compile(r"[….·．]")
# 「≥2 个点/间隔号连续」＝省略号；单个 `·`（人名间隔号）不算
ELL_RUN = re.compile(r"[….·．]{2,}")

# 人工补行表（`_x8-matlines.json`）。这些行**三次 OCR 全部漏检**，只能回原书逐字读。
# 结构：[{"page": 49, "after": "<锚点子串>", "text": "<补的行>", "note": "..."}]
# 注入的行用 x0 = CONT_X0 标记为「续行」，段落切分不会把它当段首。
CONT_X0 = -1.0


def load_manual_lines():
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_x8-matlines.json")
    if not os.path.exists(p):
        return []
    return json.load(open(p, encoding="utf-8"))


def norm(t):
    return re.sub(r"[\s。，、,．.；;：:！!？?（）()“”\"'《》\-—~～]", "", t)


def norm_noell(t):
    """`norm()` 之后再把省略号字符也抹掉。

    用于「内容是否同一行」的比对：d250 常把 `井冈……人们` 读成 `井冈人们`，
    而 `norm()` 不抹 `…`，直接比会判成两行不同的内容。
    """
    return ELL.sub("", norm(t))


def estimate_scales(runs_rows):
    """估算每个 OCR 运行相对参考运行的坐标缩放比。

    为什么需要：不同 dpi 的 OCR 结果各自是**独立像素空间**，不能直接比 y。
    早期实现按 `y / max(该页所有行的 y) * 1000` 归一化，但**页脚（页码）不是每次都被检出**，
    maxy 就不可比（第31页 d120 的 maxy=696，因为没检出页脚 `30`，而 d250 的 maxy=2437），
    归一化后同一行会落到两个不同的 yn 上 → 同一页出现两份内容、小问被切错。

    做法：以行数最多的那次 OCR 为参考，按**文本相等**配对，取 `y_ref / y_run` 的中位数。
    配对不足时退化成「首行 y 之比」（页眉每次都检得出来）。
    """
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
    """把多次 OCR 按「页 + 对齐后的坐标」聚成行，并保留 x0。

    坐标统一到「0~1000 的页内容高度」空间：
      - 每个 run 先乘 `scales[ri]`（对齐到参考 run 的像素空间）；
      - 再除以 `base`（各 run 的 maxy 换算到参考空间后的**最大值**）。
    早期实现按各 run 自己的 `maxy` 归一化，而页脚（页码）不是每次都被检出
    （第31页 d120 漏了页脚 `30`，maxy=696 而 d250 是 2437.5），
    导致同一行落到两个不同的 yn 上 → 同页出现两份内容、小问被切错。
    """
    runs = []
    for p in paths:
        pages = {}
        for line in open(p, encoding="utf-8"):
            d = json.loads(line)
            pages[d["page"]] = d["rows"]
        runs.append(pages)
    all_pages = sorted({pg for r in runs for pg in r})
    out = {}
    for pg in all_pages:
        runs_rows = [run.get(pg) or [] for run in runs]
        scales = estimate_scales(runs_rows)
        base = max((max((r["y"] for r in rows), default=0) * sc
                    for rows, sc in zip(runs_rows, scales)), default=0) or 1.0
        k = 1000.0 / base
        items = []
        for ri, rows in enumerate(runs_rows):
            sc = scales[ri] * k
            for x in rows:
                items.append({"ri": ri, "yn": x["y"] * sc,
                              "x0": x.get("x0", 0.0) * sc, "text": x["text"]})
        items.sort(key=lambda i: i["yn"])
        clusters = []
        for it in items:
            if clusters and it["yn"] - clusters[-1]["yn"] < 12:
                clusters[-1]["items"].append(it)
            else:
                clusters.append({"yn": it["yn"], "items": [it]})
        rows = []
        for c in clusters:
            best = min(c["items"], key=lambda i: i["ri"])      # 默认取最高 dpi
            # 例外：某低 dpi 跑与最高 dpi 的**去省略号内容完全一致**，但它保留了省略号。
            # 实测 d250 会把 `井冈……人们` 读成 `井冈人们`（省略号整个消失），
            # d160/d120 读成 `井冈...人们`——内容一样，只是标点更全，此时取低 dpi 那份。
            n0 = norm_noell(best["text"])
            alt = [i for i in c["items"]
                   if norm_noell(i["text"]) == n0
                   and ELL_RUN.search(i["text"]) and not ELL_RUN.search(best["text"])]
            if alt:
                best = min(alt, key=lambda i: i["ri"])
            rows.append({"y": round(c["yn"], 1), "x0": best["x0"], "text": best["text"]})
        dedup = []
        for r in rows:
            if dedup and norm(dedup[-1]["text"]) == norm(r["text"]):
                continue
            dedup.append(r)
        out[pg] = dedup
    return out


def inject_manual_lines(pages):
    """把人工补行插进合并结果。

    为什么要单列：`load_merged` 的聚簇能补回「只有某几跑检出的行」，但
    **三跑同时漏检**的行在合并结果里根本不存在，只能回原书逐字读出来再插回去。
    实测 3 处（5-34 / 5-37 / 8-37），症状都是段落里留下半截话
    （如 `…是最宝贵的精神` 后面直接接下一段）。

    插入位置：锚点行之后。y 取前后两行的中点，x0 用 `CONT_X0`（负数哨兵）
    标记为「续行」——段落切分只认 x0，负数永远不会被当成段首缩进。
    """
    rules = load_manual_lines()
    if not rules:
        return pages
    for rule in rules:
        pg = rule["page"]
        rows = pages.get(pg)
        if not rows:
            print("警告：补行锚点所在页 %d 不在合并结果里" % pg, file=sys.stderr)
            continue
        idx = next((i for i, r in enumerate(rows) if rule["after"] in r["text"]), None)
        if idx is None:
            print("警告：补行锚点 %r 在第 %d 页找不到" % (rule["after"], pg), file=sys.stderr)
            continue
        nxt = rows[idx + 1] if idx + 1 < len(rows) else None
        y = (rows[idx]["y"] + nxt["y"]) / 2 if nxt else rows[idx]["y"] + 1
        rows.insert(idx + 1, {"y": round(y, 1), "x0": CONT_X0, "text": rule["text"]})
    return pages


def page_bases(lines):
    """逐页算「续行 x0」基线。

    为什么必须逐页：每一页的扫描横向偏移不同，全局阈值会把整页读错。
    实测第 1 套材料区——第 8 页续行 x0≈164、段首≈194；第 9 页续行 x0≈192、段首≈227。
    第 9 页的**续行值（192）几乎等于第 8 页的段首值（194）**，混在一起算阈值时，
    第 9 页所有续行都被判成段首 → 材料从第 9 页起被按「行」切开，
    界面上一句话被拆成好几个段落（`制度体` / `系、伦理道德…`）。

    lines: [(pg, x0, text)]
    """
    bypg = {}
    for pg, x0, t in lines:
        ts = t.strip()
        # 只用**正文行**估基线。两类行必须排除，否则会把低分位拉低、
        # 让整页续行被误判成段首：
        #   ① 题号行（`34.结合材料回答问题：`）的 x0 是**版心左边距**，比正文小 30 像素；
        #   ② 「材料 N」只有 3 个字，右对齐的「摘编自…」x0 大得离谱。
        # 判据用「去标点后 >= 12 字」——正文一行通常 30~40 字，这两类都到不了 12。
        # 人工补行（x0 = CONT_X0）是「已知的续行」，不参与估基线。
        if x0 < 0 or len(norm(ts)) < 12 or SRC.match(ts):
            continue
        bypg.setdefault(pg, []).append(x0)
    bases = {}
    for pg, xs in bypg.items():
        xs = sorted(xs)
        if len(xs) < 3:
            # 行太少（通常是一道题的收尾页，只剩 1~2 行正文）时不能用分位数：
            # 分位数会被唯一的那个值顶住，而 `last_base`（上一页的基线）在这一页
            # 横向偏移不同时会把整页续行判成段首（实测 5-35 的 p51：正文 x0=168.8，
            # 上一页基线 150.0，于是 `布。这是…` 和 `盼的好事。` 各成一段）。
            # 页内最小值就是「续行 x0」，直接用。
            bases[pg] = min(xs)
            continue
        buckets = Counter(round(x / 5) * 5 for x in xs)
        mode = buckets.most_common(1)[0][0]
        p20 = xs[max(0, int(len(xs) * 0.2) - 1)]
        bases[pg] = min(mode, p20) or mode or 1.0
    return bases


def split_paragraphs(lines):
    """lines: [(pg, x0, text)]，x0 是归一化后的横向起点。

    段首判据用**相对**规则而不是绝对像素：续行 x0 与段首缩进 x0 之比在
    `1.01` 与 `1.12` 之间（实测续行 164~192、段首 194~227，尺度无关），
    取 1.06 作分界。基线**逐页**算（见 page_bases）。
    """
    if not lines:
        return []
    bases = page_bases(lines)
    paras, cur = [], []
    last_base = None
    in_src = False      # 是否正在拼一条「摘编自…」出处注
    for pg, x0, t in lines:
        ts = t.strip()
        base = bases.get(pg) or last_base
        if base is None:
            base = x0          # 首页就没有可用基线：退化成「一律不算段首」
        if pg in bases:
            last_base = bases[pg]
        if in_src:
            # 出处注**会折行**（右对齐 + 两端对齐），第二行的 x0 比第一行还大
            # （实测 p29：第一行 350.8、第二行 460.9），按缩进判会把它切成独立一段。
            # 所以一旦进入出处注，后续行一律并进来，直到注文收尾。
            cur.append(ts)
            if re.search(r"[）)。》”\"]$", ts) or len("".join(cur)) > 90:
                in_src = False
            continue
        # 「摘编自…／摘自…」是右对齐的出处注（x0 大得离谱），不能当成新段落
        if SRC.match(ts):
            in_src = True
            if re.search(r"[）)。》”\"]$", ts):
                in_src = False
            cur.append(ts)
            continue
        # 人工补行（x0 = CONT_X0）是已知的续行，永远不算段首
        start = (x0 >= 0 and x0 > base * 1.06) or MATN.match(ts)
        if start and cur:
            paras.append("".join(cur))
            cur = []
        cur.append(ts)
    if cur:
        paras.append("".join(cur))
    paras = [p.strip() for p in paras if p.strip()]
    # 清理：
    #  - 「结合材料回答问题：」是作答指令，不是材料，丢掉（小问本身就是 stem）
    #  - 「材料 1 / 材料 2」是分栏标签，并进紧随其后的那一段，别单独成段
    out, pending = [], None
    for p in paras:
        # 「结合材料回答问题：」是作答指令，不是材料，丢掉（小问本身就是 stem）。
        # `间题` 是 OCR 常犯的形近错（实测 p31 的 `38.结合材料回答间题：`），
        # 只写 `问题` 会让这一行变成材料的第一段（界面上一段莫名其妙的「结合材料回答间题：」）。
        if re.fullmatch(r"结合材料回答[问间]题[：:]?", p):
            continue
        if MATN.match(p):
            pending = p
            continue
        # 「（《求是》2024年第11期）」这类**只剩括号的短注**是上一条出处注的折行——
        # 出处注右对齐，第二行的 x0 反而更大，会被判成段首（实测 2 处：6-35、7-34）。
        # 不并回去，界面上就会多出一段孤零零的「（《求是》2024年第11期）」。
        if out and re.fullmatch(r"[（(][^（）()]{0,40}[）)]", p):
            out[-1] += p
            continue
        out.append((pending + "\n" + p) if pending else p)
        pending = None
    if pending:
        out.append(pending)
    return out


def main():
    pages = inject_manual_lines(load_merged(sys.argv[1:]))
    sets = {i: {} for i in range(1, 9)}
    cur_set = None
    cur_num = None
    mat_lines = []      # [(pg, x0, text)]  —— 带上页号，段落切分要逐页算基线
    q_lines = []        # [text]
    in_sub = False

    def flush():
        nonlocal cur_num, mat_lines, q_lines, in_sub
        if cur_set and cur_num and (mat_lines or q_lines):
            paras = split_paragraphs(mat_lines)
            stem = "".join(q_lines).strip()
            sets[cur_set][str(cur_num)] = {
                "paragraphs": paras,
                "stem": stem,
            }
        cur_num, mat_lines, q_lines, in_sub = None, [], [], False

    warn = []
    for pg in sorted(pages):
        # 套号以页段为准（奇数页页眉没有套号），页眉只用来交叉校验
        s = PAGE_SET.get(pg)
        if s is None:
            warn.append(f"第 {pg} 页不在已知页段内")
            continue
        if s != cur_set:
            flush()            # 跨套前先收尾，否则上一套最后一题会被记到下一套名下
            cur_set = s
        for r in pages[pg]:
            t = r["text"].strip()
            if not t:
                continue
            m = SET_HDR.search(t)
            if m and len(t) < 40:
                if CN[m.group(1)] != cur_set:
                    warn.append(f"第 {pg} 页页眉称第{CN[m.group(1)]}套，页段表说第{cur_set}套")
                continue
            if NOISE.search(t) and not QNUM.match(t):
                continue
            if re.fullmatch(r"\d{1,3}", t):
                continue
            qm = QNUM.match(t)
            if qm and 34 <= int(qm.group(1)) <= 38:
                flush()
                cur_num = int(qm.group(1))
                in_sub = False
                rest = t[qm.end():].strip()
                mat_lines = [(pg, r["x0"], rest)] if rest else []
                continue
            if cur_num is None:
                continue
            if not in_sub and SUB1.match(t):
                in_sub = True
                q_lines = [t.strip()]
                continue
            if in_sub:
                q_lines.append(t)
            else:
                mat_lines.append((pg, r["x0"], t))
    flush()

    json.dump({"sets": {str(k): v for k, v in sorted(sets.items())}}, sys.stdout,
              ensure_ascii=False, indent=1)

    print("\n=== 材料题自检 ===", file=sys.stderr)
    tot = 0
    for s in range(1, 9):
        d = sets[s]
        miss = [n for n in range(34, 39) if str(n) not in d]
        tot += len(d)
        short = [n for n, v in d.items() if len("".join(v["paragraphs"])) < 80]
        nosub = [n for n, v in d.items() if not v["stem"]]
        print(f"  第{s}套：{len(d)}/5  缺 {miss or '无'}  材料过短 {short or '无'}  缺小问 {nosub or '无'}", file=sys.stderr)
    print(f"  合计 {tot}/40", file=sys.stderr)
    if warn:
        print("\n⚠️ 页段/页眉不一致：", file=sys.stderr)
        for w in warn:
            print("   " + w, file=sys.stderr)


main()
