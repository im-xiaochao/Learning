# -*- coding: utf-8 -*-
"""由三个已核实的源生成 `data/politics/questions-x8.ts`。

源（全部来自排版稿/文本层，不经 OCR 猜字）：
  _x8-suashua.json          客观题题干 + 选项（来自「选择题速刷刷题本」，排版稿文本层）
  _x8-answers.json          答案速查表 + 逐题解析 + 材料题参考答案（来自《答案解析》文本层）
  _x8-answers-patch.json    补《答案解析》文本层整行丢失的解析/参考答案（RapidOCR 多 dpi 补）
  _x8-material.json         材料题的材料 + 小问（来自试卷扫描件 OCR，多 dpi 合并）
  _x8-manual.json           人工补丁表：typos / stem_fix / ref_cut / ref_prefix / ref_suffix

⚠️ `_x8-answers-patch.json` 是**必需输入**，不是可丢的中间产物——没有它，
   《答案解析》文本层整行丢失的那几处（尤其 8 道材料题的参考答案）会是空串，
   `ref_prefix` 补丁会直接 `SystemExit`（`第4-34题参考答案为空，无法加前缀`）。
   丢了就用 `_x8_fill.py` 重生成：
     python tools/_x8_fill.py .workbuddy-ai/tmp/rows/x8a-d250.jsonl \\
            .workbuddy-ai/tmp/rows/x8a-d160.jsonl .workbuddy-ai/tmp/rows/x8a-d120.jsonl \\
            > tools/_x8-answers-patch.json

id 规则：`q-x8-s<套号>-<两位题号>`，例如 `q-x8-s1-01`。
  **不用 `q-<模块拼音>-<序号>`**：`module` 是推断出来的，把它写进主键会让
  「重新判定模块」变成「用户答题记录错位」。套号+题号才是题目的稳定身份。

用法：python tools/_x8_build.py > data/politics/questions-x8.ts
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

# —— 半角 → 全角标点（见 norm_punct） ——
HALF2FULL = {",": "，", ";": "；", ":": "：", "?": "？", "!": "！", "(": "（", ")": "）"}
CJK_RE = re.compile(r"[\u4e00-\u9fff]")

SUASHUA = os.path.join(HERE, "_x8-suashua.json")
ANSWERS = os.path.join(HERE, "_x8-answers.json")
PATCH = os.path.join(HERE, "_x8-answers-patch.json")
MATERIAL = os.path.join(HERE, "_x8-material.json")
MANUAL = os.path.join(HERE, "_x8-manual.json")

MODULES = [
    "马克思主义基本原理",
    "毛泽东思想和中国特色社会主义理论体系",
    "中国近现代史纲要",
    "思想道德与法治",
    "形势与政策",
]

# —— 模块判定关键词表 ——
# 命中数**按词长加权**（长词更专有，`剩余价值` 比 `价值` 可信得多），取最高分。
# **这是推断**：卷面不标模块，边界题（毛中特 vs 时政）换个判法也说得通。
# 已经刻意剔掉了歧义词（`价值` / `运动` / `发展` / `制度` 之类到哪个模块都能凑）。
KW = [
    ("中国近现代史纲要", [
        "鸦片战争", "太平天国", "洋务运动", "戊戌维新", "辛亥革命", "孙中山", "五四运动",
        "新文化运动", "中共一大", "井冈山", "长征", "遵义会议", "古田会议", "洛川会议",
        "瓦窑堡", "抗日战争", "抗战", "解放战争", "三大战役", "渡江战役", "政治协商会议",
        "中华人民共和国成立", "社会主义改造", "一五计划", "过渡时期总路线", "论十大关系",
        "七届二中全会", "六届六中全会", "半殖民地", "不平等条约", "南京条约", "马关条约",
        "辛丑条约", "义和团", "维新派", "革命派", "北伐战争", "南昌起义", "秋收起义",
        "农村包围城市", "工农武装割据", "统一战线", "党的七大", "双十协定", "共同纲领",
        "抗美援朝", "十月革命", "新民主主义革命", "民族独立", "人民解放", "清政府",
        "民国", "国民党", "军阀", "反法西斯", "近代", "外国资本主义",
    ]),
    ("思想道德与法治", [
        "人生价值", "人生观", "理想信念", "社会公德", "职业道德", "家庭美德", "个人品德",
        "中华传统美德", "社会主义核心价值观", "民族精神", "时代精神", "爱国主义",
        "诚实守信", "公平正义", "法律权威", "法治思维", "法治素养", "依法治国",
        "以德治国", "宪法", "民法典", "刑法", "诉讼", "公民权利", "法定义务",
        "革命道德", "志愿服务", "网络道德", "道德", "法治", "法律", "廉洁",
    ]),
    ("马克思主义基本原理", [
        "剩余价值", "价值评价", "经济基础", "上层建筑", "社会存在", "社会意识",
        "生产力", "生产关系", "唯物", "唯心", "辩证法", "空想社会主义", "科学社会主义",
        "共产主义", "经济危机", "垄断资本", "金融资本", "利润率", "劳动力商品",
        "质量互变", "否定之否定", "感性认识", "理性认识", "社会形态", "人民群众",
        "物质", "意识", "实践", "认识", "真理", "矛盾", "规律", "范畴", "商品",
        "货币", "资本", "阶级", "时空",
    ]),
    ("形势与政策", [
        "二十届四中全会", "政府工作报告", "全国两会", "上海合作组织", "上合组织",
        "联合国", "G20", "金砖", "博鳌", "亚太经合", "全球治理", "全球发展倡议",
        "全球安全倡议", "全球文明倡议", "高峰论坛", "美国总统", "俄乌", "巴以",
        "中东", "欧盟", "北约", "世界贸易组织", "国际货币基金组织", "气候大会",
        "COP", "十五五", "十四五", "台湾光复", "关税", "贸易战", "多极化",
        "南南合作", "万隆", "一带一路", "人类命运共同体", "全球南方", "2025年", "2024年",
    ]),
    ("毛泽东思想和中国特色社会主义理论体系", [
        "毛泽东思想", "邓小平理论", "三个代表", "科学发展观", "习近平新时代",
        "中国特色社会主义", "中国式现代化", "新质生产力", "新发展理念", "新发展格局",
        "全面深化改革", "全面依法治国", "全面从严治党", "五位一体", "四个全面",
        "乡村振兴", "共同富裕", "生态文明", "绿水青山", "文化强国", "文化自信",
        "科技自立自强", "供给侧结构性改革", "市场经济", "民营经济", "一国两制",
        "新时代", "高质量发展", "党的领导", "统战", "民族", "宗教", "民生",
    ]),
]


# 模块权重：思修 / 时政 的关键词更"专属"，但词短、容易被马原的长词（上层建筑、社会意识）
# 压过去（典型误判：`道德属于上层建筑的范畴…` 被判成马原），所以给这两个模块加权。
MOD_W = {
    "思想道德与法治": 2.0,
    "形势与政策": 1.3,
    "马克思主义基本原理": 1.0,
    "中国近现代史纲要": 1.0,
    "毛泽东思想和中国特色社会主义理论体系": 1.0,
}
# 同分时的优先级（越靠前越优先）
TIE_ORDER = [
    "思想道德与法治",
    "形势与政策",
    "中国近现代史纲要",
    "马克思主义基本原理",
    "毛泽东思想和中国特色社会主义理论体系",
]


def classify(stem: str, expl: str) -> tuple:
    """返回 (module, best_score, runner_up_score)。题干权重 2、解析权重 1；命中词按词长加权。"""
    text = (stem or "") * 2 + (expl or "")
    scores = []
    for mod, words in KW:
        s = sum(text.count(w) * len(w) for w in words) * MOD_W[mod]
        scores.append((s, mod))
    scores.sort(key=lambda x: (-x[0], TIE_ORDER.index(x[1])))
    best, bs = scores[0][1], scores[0][0]
    second = scores[1][0] if len(scores) > 1 else 0
    return best, bs, second


def norm_punct(s: str) -> str:
    """把中文语境里的半角标点改成全角。

    速刷本 PDF 的**文本层用的是半角** `,;:?!()`，直接落库会让刷题页上「,」比
    「，」窄一截，和肖四部分（手工整理、全角）风格不一致。实测 1225 处。

    只在**含汉字的串**上动手：id / key / 模块名都是纯 ASCII，原样返回。
    """
    if not s or not CJK_RE.search(s):
        return s
    s = "".join(HALF2FULL.get(ch, ch) for ch in s)
    # 省略号归一：中文里的「≥2 个点／间隔号连续」只可能是省略号，但 OCR 读出了
    # `···` / `....` / `….……` / `.………` / `…………·` 等一堆花样（实测 9 种、27 处）。
    # 统一成标准的中文省略号 `……`。`1.5亿元`、`3D打印` 这类单个 `.` 不受影响。
    s = re.sub(r"[….·．]{2,}", "……", s)
    # 数字与单位之间的空格是扫描件 OCR 的**切分产物**（`1954 年`、`50 多名党员`、
    # `175 家政校行企`，实测 19 处），中文排版不该有。`1.5亿元`、`3D打印` 没有空格，
    # 不受影响。只吃空格与制表符，不吃换行——段落里的 `\n` 是「材料 N」标题的分隔。
    s = re.sub(r"([0-9])[ \t]+(?=[0-9年月日名万个家多元岁])", r"\1", s)
    # 汉字与数字之间的空格同理（`从 1934年`、`拥有了 121 万名`、`当地时间 6 月`）。
    s = re.sub(r"([\u4e00-\u9fff])[ \t]+(?=[0-9])", r"\1", s)
    # `材料1` 与 `材料 1` 混用（实测 27 : 2），统一成带空格的写法。
    # 必须放在上一条**之后**：否则 `材料 1` 会先被上一条吃成 `材料1`。
    s = re.sub(r"材料[ \t]*([0-9])", r"材料 \1", s)
    s = re.sub(r" +([，。；：？！）】》”’])", r"\1", s)   # 全角标点前的空格
    s = re.sub(r"([，。；：？！（【《“‘]) +", r"\1", s)   # 全角标点后的空格
    return s


def jstr(s: str) -> str:
    """生成 TS 字符串字面量：转义反斜杠、双引号，换行写成 \\n。"""
    out = norm_punct(s).replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    return '"' + out + '"'


def jarr(items, indent: int) -> str:
    pad = " " * indent
    inner = " " * (indent + 2)
    if not items:
        return "[]"
    body = ",\n".join(f"{inner}{jstr(x)}" for x in items)
    return "[\n" + body + "\n" + pad + "]"


def split_points(ref: str) -> list:
    """材料题的参考答案按「(2)」切成两问，作为采分点列表。"""
    m = re.search(r"[（(]\s*2\s*[)）]", ref)
    if m and m.start() > 0:
        a, b = ref[:m.start()].strip(), ref[m.start():].strip()
        if a and b:
            return [a, b]
    return [ref]


def main():
    suashua = json.load(open(SUASHUA, encoding="utf-8"))["sets"]
    answers = json.load(open(ANSWERS, encoding="utf-8"))["sets"]
    material = {}
    if os.path.exists(MATERIAL):
        material = json.load(open(MATERIAL, encoding="utf-8"))["sets"]
    # 文本层整行丢失的解析/材料参考答案，用 RapidOCR 补（_x8_fill.py 产出）
    patch = {}
    if os.path.exists(PATCH):
        patch = json.load(open(PATCH, encoding="utf-8"))["sets"]
    # 人工补丁表：源书缺字/乱码定点修补 + OCR 形近字 + 缺标点 + 串档截断
    manual = {"typos": [], "stem_fix": {}, "ref_cut": {}, "ref_prefix": {}, "ref_suffix": {}}
    if os.path.exists(MANUAL):
        manual.update(json.load(open(MANUAL, encoding="utf-8")))
    fixed = []
    filled = []
    for s in answers:
        p = patch.get(s) or {}
        for key in ("expl", "ref"):
            for n, txt in (p.get(key) or {}).items():
                if not (answers[s][key].get(n) or "").strip() and txt.strip():
                    answers[s][key][n] = txt
                    filled.append(f"第{s}套 {key}[{n}]")

    # —— 人工补丁：先定点修，再统一跑形近字表 ——
    for tag, rules in (manual.get("stem_fix") or {}).items():
        s, n = tag.split("-")
        # 34~38 是材料题，题干在 `material` 里（`suashua` 只有 1~33 的客观题）
        q = (material.get(s) or {}).get(n)
        if not q:
            raise SystemExit(f"[manual] 第{tag}题不在材料题里，补丁失效")
        for old, new in rules:
            if old not in q["stem"]:
                raise SystemExit(f"[manual] 第{tag}题题干里找不到 {old!r}，补丁失效")
            q["stem"] = q["stem"].replace(old, new)
            fixed.append(f"第{tag}题题干：{old!r} → {new!r}")
    for tag, anchor in (manual.get("ref_cut") or {}).items():
        s, n = tag.split("-")
        cur = answers[s]["ref"].get(n) or ""
        i = cur.find(anchor)
        if i <= 0:
            raise SystemExit(f"[manual] 第{tag}题参考答案里找不到切割锚点 {anchor!r}，补丁失效")
        answers[s]["ref"][n] = cur[:i]
        fixed.append(f"第{tag}题参考答案截断：删去 {len(cur) - i} 字（锚点 {anchor[:14]!r}）")
    for tag, pre in (manual.get("ref_prefix") or {}).items():
        s, n = tag.split("-")
        cur = answers[s]["ref"].get(n) or ""
        if not cur.strip():
            raise SystemExit(f"[manual] 第{tag}题参考答案为空，无法加前缀")
        answers[s]["ref"][n] = pre + cur
        fixed.append(f"第{tag}题参考答案补头：{pre!r}")
    for tag, suf in (manual.get("ref_suffix") or {}).items():
        s, n = tag.split("-")
        cur = answers[s]["ref"].get(n) or ""
        if not cur.strip():
            raise SystemExit(f"[manual] 第{tag}题参考答案为空，无法加后缀")
        answers[s]["ref"][n] = cur + suf
        fixed.append(f"第{tag}题参考答案补尾：{suf!r}")

    def apply_typos(t: str) -> str:
        # 两类条目，幂等方式不同：
        #
        # ① 替换型（正形**不以**坏形开头，如 ["续绵延","赓续绵延"]）：
        #    用「负向后顾」保证幂等——残形前一个字已经是正写首字时不再替换。
        #    否则 ["续绵延","赓续绵延"] 会把已经正确的「赓续绵延」改成「赓赓续绵延」。
        #
        # ② 后缀型（正形**以**坏形开头，如 ["两次重要宣示","两次重要宣示——"]）：
        #    替换型那招在这里失效（`两次重要宣示` 永远出现在 `两次重要宣示——` 里，
        #    且前面一个字不是「两」），会反复追加。改成「后面已经跟着补的那截就不动」。
        for bad, good in manual.get("typos") or []:
            if bad not in t:
                continue
            if good.startswith(bad):
                suf = good[len(bad):]
                t = re.sub(re.escape(bad) + r"(?!" + re.escape(suf) + ")", good, t)
            else:
                t = re.sub(r"(?<!" + re.escape(good[0]) + ")" + re.escape(bad), good, t)
        return t

    chunks = []
    stats = {"choice": 0, "multi": 0, "material": 0}
    problems = []
    mod_count = {}

    for s in range(1, 9):
        sk = str(s)
        sq = {q["num"]: q for q in suashua[sk]}
        table = answers[sk]["table"]
        expl = answers[sk]["expl"]
        ref = answers[sk]["ref"]
        mk = material.get(sk, {})

        for num in range(1, 39):
            qid = f"q-x8-s{s}-{num:02d}"
            if num <= 33:
                if num not in sq:
                    problems.append(f"{qid} 速刷本缺题干")
                    continue
                q = sq[num]
                stem = apply_typos(q["stem"])
                options = [{"key": o["key"], "text": apply_typos(o["text"])} for o in q["options"]]
                ans = table.get(str(num))
                if not ans:
                    problems.append(f"{qid} 答案速查缺答案")
                    continue
                typ = "choice" if num <= 16 else "multi"
                e = apply_typos(expl.get(str(num), ""))
                if not e:
                    problems.append(f"{qid} 缺解析")
                    e = ""
                # —— 校验 ——
                if len(options) != 4:
                    problems.append(f"{qid} 选项 {len(options)} 个")
                keys = {o["key"] for o in options}
                for k in ans:
                    if k not in keys:
                        problems.append(f"{qid} 答案 {ans} 不在选项里")
                if typ == "multi" and len(ans) < 2:
                    problems.append(f"{qid} 多选答案只有 {len(ans)} 项")
                mod, sc, sc2 = classify(stem, e)
                mod_count[mod] = mod_count.get(mod, 0) + 1
                stats[typ] += 1
                lines = [
                    "{",
                    f"  id: {jstr(qid)},",
                    f"  type: {jstr(typ)},",
                    f"  module: {jstr(mod)},",
                    f"  difficulty: {1 if typ == 'choice' else 2},",
                    f"  stem: {jstr(stem)},",
                    "  options: [",
                ]
                for i, o in enumerate(options):
                    lines.append("    {")
                    lines.append(f"      \"key\": {jstr(o['key'])},")
                    lines.append(f"      \"text\": {jstr(o['text'])}")
                    lines.append("    }" + ("," if i < len(options) - 1 else ""))
                lines.append("  ],")
                if typ == "choice":
                    lines.append(f"  answerKey: {jstr(ans)},")
                else:
                    lines.append(f"  answerKeys: {jarr(list(ans), 2)},")
                lines.append(f"  explanation: {jstr(e)},")
                lines.append("  tags: " + jarr(
                    ["肖八", f"第{s}套", "单选题" if typ == "choice" else "多选题"], 2) + "")
                lines.append("}")
                chunks.append("\n".join(lines))
            else:
                m = mk.get(str(num))
                if not m or not m.get("paragraphs"):
                    problems.append(f"{qid} 材料题缺材料（需 OCR）")
                    continue
                r = apply_typos(ref.get(str(num), ""))
                if not r:
                    problems.append(f"{qid} 材料题缺参考答案")
                    continue
                stem = apply_typos(m.get("stem") or "结合材料回答问题：")
                paras = [apply_typos(p) for p in (m.get("paragraphs") or [])]
                mod, sc, sc2 = classify(stem + (paras or [""])[0], r)
                mod_count[mod] = mod_count.get(mod, 0) + 1
                stats["material"] += 1
                lines = [
                    "{",
                    f"  id: {jstr(qid)},",
                    "  type: \"material\",",
                    f"  module: {jstr(mod)},",
                    "  difficulty: 3,",
                    f"  stem: {jstr(stem)},",
                    "  material: {",
                    f"    title: {jstr('材料')},",
                    "    paragraphs: " + jarr(paras, 4),
                    "  },",
                    "  answerPoints: " + jarr(split_points(r), 2) + ",",
                    f"  explanation: {jstr(r)},",
                    "  tags: " + jarr(["肖八", f"第{s}套", "材料分析题"], 2),
                    "}",
                ]
                chunks.append("\n".join(lines))

    header = '''/**
 * 2026 肖秀荣《8套卷》题库（**生成物，不是手工编写的**）。
 *
 * 内容：肖八 8 套 × 38 题 = 304 题（单选 128 / 多选 136 / 材料 40）。
 * 由 `tools/_x8_build.py` 从三个源重建：
 *
 *   | 内容 | 来源 | 质量 |
 *   |---|---|---|
 *   | 客观题题干 + 选项 | `26肖八选择题速刷刷题本.pdf`（**排版稿，有文本层**） | 无 OCR 猜字 |
 *   | 答案 + 解析 + 材料题参考答案 | `26肖秀荣《8套卷》答案解析.pdf`（文本层） | 无 OCR 猜字 |
 *   | 材料题的材料 + 小问 | `26肖秀荣《8套卷》.pdf`（扫描件） | 多 dpi OCR 合并 |
 *
 * 与旧版的区别（旧版 304 题里 252 题有硬伤，已整体废弃重建）：
 *  - 题干 / 选项不再缺失：旧版 47 题无题干、49 题无选项、28 题选项串到下一题，
 *    根因是只用了扫描件的单次 OCR；现在客观题改用排版稿，这些问题不存在。
 *  - 解析不再缺失：旧版 163 题无解析，现在全部来自答案解析文本层。
 *  - 答案键经「答案速查表 × 逐题标记」双读数交叉验证，0 冲突。
 *
 * 约定：
 *  - `id` = `q-x8-s<套号>-<两位题号>`。**刻意不用 `q-<模块拼音>-<序号>`**：
 *    `module` 是推断的，写进主键会让「重新判定模块」等于「用户答题记录错位」；
 *    套号 + 题号才是题目的稳定身份。
 *  - `module` 是**推断的**（卷面只按题型分块、不标考纲模块），按题干 + 解析的关键词加权判定，
 *    边界题（毛中特 vs 时政）换个判法也说得通。
 *  - `difficulty` 按题型给固定档位：单选 1 / 多选 2 / 材料 3。
 *  - 多选存 `answerKeys`、单选存 `answerKey`，两者互斥。
 */

import type { PoliticsQuestion } from './questions'

export const POLITICS_QUESTIONS_X8: PoliticsQuestion[] = [
'''
    body = ",\n".join(chunks)
    sys.stdout.write(header + body + ",\n]\n")

    print("\n=== 生成统计 ===", file=sys.stderr)
    print(f"  单选 {stats['choice']} / 多选 {stats['multi']} / 材料 {stats['material']}"
          f"  合计 {sum(stats.values())}（期望 128/136/40 = 304）", file=sys.stderr)
    print("\n=== 模块分布 ===", file=sys.stderr)
    for m, c in sorted(mod_count.items(), key=lambda x: -x[1]):
        print(f"  {m}  {c}", file=sys.stderr)
    if filled:
        print(f"\n=== OCR 补入 {len(filled)} 处 ===", file=sys.stderr)
        for f in filled:
            print("   " + f, file=sys.stderr)
    if fixed:
        print(f"\n=== 人工补丁 {len(fixed)} 处 ===", file=sys.stderr)
        for f in fixed:
            print("   " + f, file=sys.stderr)
    if problems:
        print(f"\n⚠️ {len(problems)} 项待处理：", file=sys.stderr)
        for p in problems[:40]:
            print("   " + p, file=sys.stderr)
        if len(problems) > 40:
            print(f"   …另有 {len(problems) - 40} 项", file=sys.stderr)
    else:
        print("\n✅ 无待处理项", file=sys.stderr)


main()
