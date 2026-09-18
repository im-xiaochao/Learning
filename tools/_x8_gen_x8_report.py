"""生成 `肖八修复明细.md`。

数据源：`tools/_x8-manual.json`（人工补丁表）、`tools/_x8-matlines.json`（人工补行表）。
用法：
    python tools/_x8_gen_x8_report.py
"""
import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "肖八修复明细.md")

HEADER = """# 肖八修复明细

> 肖八（肖秀荣《8 套卷》，304 题）的**逐条修复记录**。
> 与肖四不同，肖八没有在既有文本上打补丁，而是**换源整体重转档**——
> 原转档用的《答案解析》PDF 文本层质量太差（163 题无解析、47 题无题干、
> 64 题答案与解析矛盾、第 6 套 16 道单选整块丢失），补丁会越打越多。

## 一、三份源，各管一段

| 源 | 文件 | 提供什么 | 质量 |
|---|---|---|---|
| 排版稿（干净文本层） | `26肖八选择题速刷刷题本.pdf` | 客观题题干 + 选项 | 好，直接用 |
| 答案解析（有 OCR 文本层） | `26肖秀荣《8套卷》答案解析.pdf` | 答案速查表 + 逐题解析 + 材料题参考答案 | 差，只能取答案表与解析正文 |
| 试卷（纯扫描） | `26肖秀荣《8套卷》.pdf` | 材料题材料正文 | 需多 DPI OCR 合并 |

中间产物：

- `tools/_x8-suashua.txt` / `_x8-suashua.json` —— 速刷本文本层（客观题题干/选项）
- `tools/_x8-answers.txt` / `_x8-answers.json` —— 答案解析文本层（解析/参考答案）
- `tools/_x8-answers-patch.json` —— 补文本层**整行丢失**的解析/参考答案（`_x8_fill.py` 用 RapidOCR 多 dpi 补）
- `tools/_x8-material.json` —— 材料段落
- `.workbuddy-ai/tmp/rows/x8-{d120,d160,d250}.jsonl` —— 试卷三次不同 DPI 的 OCR 行
- `.workbuddy-ai/tmp/rows/x8a-{d120,d160,d250}.jsonl` —— 答案解析三次不同 DPI 的 OCR 行

> ⚠️ `_x8-answers-patch.json` 是**必需输入**，不是可丢的中间产物。没有它，《答案解析》
> 文本层整行丢失的那几处（尤其 8 道材料题的参考答案）会是空串，`ref_prefix` 补丁会直接
> 报 `第4-34题参考答案为空，无法加前缀` 并中止。重生成（命令较长，写成一行）：

```bash
python tools/_x8_fill.py .workbuddy-ai/tmp/rows/x8a-d250.jsonl .workbuddy-ai/tmp/rows/x8a-d160.jsonl .workbuddy-ai/tmp/rows/x8a-d120.jsonl > tools/_x8-answers-patch.json
```

## 二、管线

```
tools/_x8_material.py    # x8-d*.jsonl → tools/_x8-material.json（材料段落抽取）
tools/_x8_fill.py        # x8a-d*.jsonl → tools/_x8-answers-patch.json（补文本层整行丢失）
tools/_x8_build.py       # 上面全部 + _x8-manual.json → questions-x8.ts（**手工步骤**，输出到 stdout）
tools/_x8-manual.json    # 人工补丁表：typos / stem_fix / ref_cut / ref_prefix / ref_suffix
tools/_x8-matlines.json  # 人工补行表（三跑都漏检的整行）
```

**`data/politics/questions-x8.ts` 是生成物，别手改。** 改完源数据后：

```bash
python tools/_x8_material.py .workbuddy-ai/tmp/rows/x8-d250.jsonl \\
                             .workbuddy-ai/tmp/rows/x8-d160.jsonl \\
                             .workbuddy-ai/tmp/rows/x8-d120.jsonl > tools/_x8-material.json
python tools/_x8_build.py > data/politics/questions-x8.ts
cd tools && npm run build:content
```

## 三、修复量级

| 阶段 | 内容 | 量级 |
|---|---|---|
| 换源重转档 | 重建题干/选项/答案/解析；材料题材料走多 DPI OCR 合并 | 252 → 62 |
| 标点规范化 | 半角 `,;:?!()` → 全角（只在含汉字的串上动手） | 1225 处 |
| 形近字与结构补丁 | 见下表 + 人工补头/切尾 | 62 → 0 |
| 段落切分修复 | 逐页估基线（见 §五） | 225 段重切 |
| 整行漏检补回 | 三跑都丢的行（见 §五） | 3 处 |
| 全量校读 | 材料正文 22.8k 字逐字人眼过一遍 | 约 30 处 |

## 四、人工补丁表（`_x8-manual.json` 的 `typos`，共 %(N)s 条）

每条都到原 PDF 逐字核对过（多 DPI 裁图 + 单字级超倍放大）。

| # | 原文（错） | 改为（对） |
|---|---|---|
%(TABLE)s

"""

TAIL = """
## 五、三个非「错字」的根因

### ① 段落切分用全局 x0 阈值 → 每行都成了独立段落

材料段落的段首判据原本拿**整页**的 x0 众数当基线，但每页的横向偏移不同：

- 第 8 页续行 x0 ≈ 164、第 9 页续行 ≈ 192，而第 8 页段首 ≈ 194

第 9 页的续行因此被误判成段首，整页每行都成了独立段落。
**改成逐页估基线**，且只用「去标点后 ≥ 12 字」的正文行（排除题号行与右对齐的出处注——
题号行的 x0 是版心左边距、出处注的 x0 大得离谱，都会把低分位拉低）。

效果：`1-34` 从 11 段收敛到 4 段；跨页续行也正确接上了。

### ② 合并策略「取最高 dpi」会整行漏检

三次 OCR 各会随机丢行（实测 d250 在 p52 丢了 2 行、d160/d120 有）。
`load_merged` 原本按 y 聚类后取**最高 dpi**那份，丢的行没人补。
改成聚类内**取最长文本**（多数情况下最长 = 最完整），并对「三跑都丢」的槽位
用人工补行表 `tools/_x8-matlines.json` 兜底。

实测整行漏检 3 处，全部从原书逐字读出补回：

| 题 | 补回的内容 |
|---|---|
| `5-34` | `问题到底出在哪？骑手们去哪里充电了？` / `长河街道党群服务中心组织的研讨会` |
| `5-37` | `财富"要把红色资源利用好、把红色传统发扬好、把红色基因传承好"。` |
| `8-37` | `《关于健全新时代志愿服务体系的意见》` / `志愿服务成为社会主义文化强国的重要标志` |

### ③ 「扫描全能王」水印是独立 image 对象

答案解析 PDF 每页 = 扫描图层（大 image xref，如 190/294/174）+ 右下角二维码（小 image xref，如 192）。
**渲染整页会把水印画上**，盖住页脚文字（肖四修 `q-shigang-16` / `q-maozhongte-48` 时踩过）。
直接取**大 image** 的像素即可绕开——水印是独立对象，不在扫描图层里。
工具：`tools/_unwatermark.py`。

## 六、构建期的自动归一（不用逐条进补丁表）

`tools/_x8_build.py` 的 `norm_punct()` / `jstr()` 在写文件前统一处理，只在**含汉字的串**上动手
（避免误伤 `1.5亿元`、`3D打印` 这类）：

| 规则 | 说明 |
|---|---|
| 半角 → 全角 | `,` `;` `:` `?` `!` `(` `)` → `，` `；` `：` `？` `！` `（` `）` |
| 省略号归一 | `[….·．]{2,}` → `……`（源里出现过 `….……`、`······`、`.………` 三种乱写法） |
| 全角标点前后空格 | 抹掉 |
| 数字与单位之间的空格 | 抹掉（`1954 年` → `1954年`、`50 多名党员` → `50多名党员`，实测 19 处） |
| 汉字与数字之间的空格 | 抹掉（`从 1934年` → `从1934年`、`拥有了 121 万名` → `拥有了121万名`） |
| `材料N` | 统一成 `材料 N`（源里 27 : 2 混用） |
| 出处注括号 | 「材料」与右对齐的「摘编自…（日期）」合并成一段，不再拆成两段 |

## 七、人工补头 / 切尾（`ref_prefix` / `ref_cut` / `ref_suffix`）

《答案解析》PDF 的 `N. 参考答案` 行首有一个**绿标**，它是**图片**不是文字，
文本层因此整行丢弃。表现是参考答案**缺开头**（`（1）` 前缀丢失）或**串到上一题**。

| 题 | 补丁 | 原因 |
|---|---|---|
| `4-34` | `ref_prefix` | 源丢前缀，补 `（1）实践是认识的目的。…` |
| `5-34` | `ref_prefix` | 同上 |
| `6-35` | `ref_prefix` + `ref_suffix` | 同上，另补句末 `。` |
| `6-38` | `ref_prefix` | 同上 |
| `7-35` | `ref_prefix` | 同上 |
| `7-38` | `ref_prefix` | 同上 |
| `8-36` | `ref_prefix` | 同上 |
| `6-34` / `6-37` / `7-34` / `7-37` / `8-35` | `ref_cut` | 参考答案尾部**串进了下一题**，按锚点切尾 |

这 7 处「补头」在 `tools/_verify-x8.ts` 里被显式标为**预期差异**并跳过
（源文本层不可用，只能手工重建），所以比对输出才是干净的 0 / 0。

`stem_fix` 另有 2 条：`6-38` 与 `8-34` 的题干尾部被 OCR 打坏
（`一国中,，一国二（)` / `。，（)`），替换成从原书读出的第 (2) 小问。

## 八、验证（8 个探测器 + 3 套独立源）

| 探测器 | 判据 | 结果 |
|---|---|---|
| `_audit-politics.ts` | 21 类结构/内容规则 | 21 类全 0 |
| `_verify-x8.ts` | 题干/选项 vs 速刷本文本层、解析 vs 答案解析文本层，全量 n-gram 比对 | 0 / 0 |
| `_x8_content_check.py` | 生成文件上的 6 类内容体检 | 6 类全 0 |
| `_x8_gap_scan.py` | 行间距 > 1.6 倍 → 疑似整行漏检 | 0 |
| `_x8_split_scan.py` | 疑似从词中间切开 | 0 |
| `_x8_merge_check.py` | 三跑多数票不一致 | 19 处，全部已被补丁覆盖 |
| `_x8_mdcmp.py` | 与 `111/26肖秀荣《8套卷》.md`（独立第三套 OCR）逐套字符级对齐 | 81 处，**全部是 md 侧读错** |
| `_x8_lexcheck.py` | jieba 词频异常 | 剩余候选全是专有名词 |

**为什么还要人眼全量校读**：`_misschar` 的删字启发式（「词对齐短语删掉一字仍是高频词」）
抓不到**形近字替换**——`抗白`→`抗日`、`踏厉奋发`→`踔厉奋发`、`资源票赋`→`资源禀赋`、
`伤人害已`→`害己`、`严于律已`→`律己`、`螨珊`→`蹒跚`，都是字形相近、字数不变。
这类只能把材料正文 225 段 / 22.8k 字全量打印出来逐字读。实测这一轮贡献了约 30 处修复。

## 九、回归

```
check-syntax.mjs            47 文件通过
check-template.mjs          19 个 .vue，通过 4 / 失败 0
check-style.mjs             通过 4 / 失败 0
npm run build:content       政治题库 462 题
npm run validate:content    ✅ 结构校验全部通过
_quiz-harness.mjs           通过 33 / 失败 0
_route-harness.mjs          通过 25 / 失败 0
_library-tabs-harness.mjs   通过 19 / 失败 0
```

> 唯一残留的「采分点=解析（页面已自动隐藏）60」是**良性**：那 60 道材料题的采分点与解析
> 内容一致，`pages-politics/question/question.vue` 在渲染时已经去重，不再重复显示两遍。

## 十、复现

```bash
cd tools && npx tsx _audit-politics.ts          # 21 类审计
cd tools && npx tsx _verify-x8.ts               # 全量源文比对
python tools/_x8_content_check.py               # 生成文件内容体检
python tools/_x8_gap_scan.py                    # 整行漏检
python tools/_x8_split_scan.py                  # 段落切分
python tools/_x8_merge_check.py                 # 三跑多数票
python tools/_x8_lexcheck.py tools/_x8-material.json
python tools/_x8_mdcmp.py "C:/Users/imxia/Downloads/2026考研政治肖4肖8(1)/111/26肖秀荣《8套卷》.md" tools/_x8-material.json
```

裁原图核对（多 DPI）：

```bash
# 定位某串在哪一页哪一行（输出「页 y dpi」三列）
python tools/_x8_find.py --list out.txt <待查串> ...
# 把多行竖向拼成一张长图（每行带 15 倍放大）
python tools/_stack_crops.py out.txt "C:/Users/imxia/Downloads/2026考研政治肖4肖8(1)/26肖秀荣《8套卷》.pdf" .workbuddy-ai/tmp/crops/x 10 15
```
"""


def main():
    man = json.load(io.open(os.path.join(HERE, "_x8-manual.json"), encoding="utf-8"))
    typos = man["typos"]
    table = "\n".join(f"| {i} | `{b}` | `{g}` |" for i, (b, g) in enumerate(typos, 1))
    body = HEADER % {"N": len(typos), "TABLE": table} + TAIL
    io.open(OUT, "w", encoding="utf-8").write(body)
    print(f"已写入 {OUT}（{len(body)} 字符，{len(typos)} 条补丁）")


if __name__ == "__main__":
    main()
