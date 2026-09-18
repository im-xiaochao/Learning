"""
清掉数学讲义正文里对具体课程/老师/例题编号的引用（展示内容里的合规风险）。

背景：`data/math/lectures.ts` 的部分正文是从《基础30讲》整理来的，正文里直接写着
「张宇强调…」「张宇特别提醒…」「（张宇例6.1）」。这些会随知识点渲染给用户看，
既是合规风险，也不该出现在产品文案里。

处理原则：
  - **只改展示内容**（summary / 要点 / 例句 / 讲评），保留数学本身；
  - `sources` 字段是内部溯源（详情页目前不渲染），**保留不动**，是否对外标注由产品决定；
  - 不引入任何新的事实陈述——只做人名与例题编号的剥离与语气中性化。

每个替换都要求命中指定次数，命中数不对就抛错，不静默改错。
用法：python tools/_clean-math-attribution.py
"""
import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / 'data' / 'math' / 'lectures.ts'

# (原片段, 替换为, 期望命中次数)
EDITS = [
    ('张宇强调的完整清单（x→0）', '需要记牢的完整清单（x→0）', 1),
    ('张宇给出的研究对象是三个量', '研究对象是三个量', 1),
    ('张宇把定积分性质整理成六条', '定积分性质可以整理成六条', 1),
    ('以下条目按张宇基础30讲的讲法整理，source 标注讲次', '以下条目按同一套讲法整理，source 标注讲次', 1),
    ('张宇的“脱帽法”把它和极限连成一体', '用“脱帽法”可以把它和极限连成一体', 1),
    ('张宇特别提醒：', '要注意：', 1),
    ('张宇从几何本质讲行列式：', '从几何本质看行列式：', 1),
    ('（张宇常举“一个村子和三个小偷”的例子）', '', 1),
    ('（张宇例6.1）', '', 1),
    ('（张宇例4.1）', '', 1),
    ('（张宇例6.11）', '', 1),
    ('（张宇例1.30，泰勒法）', '（泰勒法）', 1),
    ('（张宇书例题）', '', 1),
    ('张宇把这组定理放在中值定理一讲的开头，作为证明“存在性”的基本工具。',
     '这组定理是证明“存在性”的基本工具。', 1),
    ('/** 内容出处（对应张宇基础30讲的讲次），有出处时页面会在标签区展示。 */',
     '/** 内容出处（讲次对应），有出处时页面会在标签区展示。 */', 1),
]

# 展示内容里不允许出现的人名/机构（用于收尾自检）
FORBIDDEN = ['张宇', '武忠祥', '汤家凤', '李永乐', '基础30讲']

src = SRC.read_text(encoding='utf-8')
for old, new, expect in EDITS:
    n = src.count(old)
    if n != expect:
        sys.exit(f'❌ 期望「{old[:24]}…」命中 {expect} 次，实际 {n} 次')
    src = src.replace(old, new)

# 收尾自检：正文里不得再有人名。
# 例外：sources 的值是**单独一行**的字符串字面量（如 `    '张宇基础30讲·高数第1讲',`），
# 那是内部溯源、详情页不渲染，保留；以及 `source:` 标签行本身。
SRC_LITERAL = re.compile(r"^\s*'[^']*基础30讲[^']*',\s*$")
leftover = []
for i, line in enumerate(src.split('\n'), 1):
    if line.strip().startswith('source') or SRC_LITERAL.match(line):
        continue
    for name in FORBIDDEN:
        if name in line:
            leftover.append((i, name, line.strip()[:80]))
if leftover:
    print('⚠️ 仍有残留（请人工确认是否在 sources 里）：')
    for i, name, text in leftover:
        print(f'   L{i} [{name}] {text}')
    sys.exit(1)

SRC.write_text(src, encoding='utf-8')
print(f'✅ 已清理 {len(EDITS)} 处人名/例题编号引用（sources 字段保留不动）')
