"""给设计稿加「政治刷题」的学习统计（首页卡片 + 我的页统计/图表）。

口径（与用户确认过）：
  - 首页「今日学习」加**第三张整行卡片**，走现有 .study-card 样式；
  - **刷题不算进今日目标**：进度环与「今日待办」仍是单词 + 知识点两项。

每个锚点都要求精确命中指定次数，命中数不对就抛错，不静默改错。
用法：python tools/_patch-od-quiz-stats.py <输入.html> <输出.html>
"""
import sys, re

src_path, out_path = sys.argv[1], sys.argv[2]
s = open(src_path, encoding="utf-8").read()

# 统计每处替换的命中数，便于断言
HITS = {}


def apply_once(label, old, new, expect=1):
    global s
    n = s.count(old)
    if n != expect:
        raise SystemExit(f"[{label}] 期望命中 {expect} 次，实际 {n} 次")
    s = s.replace(old, new)
    HITS[label] = n


# ── 1. 首页：在「知识点讲解」卡之后插入整行的「政治刷题」卡 ──
A_CARD = "<span class=\"card-link\">${state.lastTopic?'继续读知识点':'打开知识库'}${icon('arrow')}</span></button></div>"
NEW_CARD = (
    "<span class=\"card-link\">${state.lastTopic?'继续读知识点':'打开知识库'}${icon('arrow')}</span></button>\n"
    "    <button class=\"study-card wide\" data-action=\"quiz\" data-od-id=\"home-politics-card\">"
    "<div class=\"row\">${icon('book','card-icon')}<span class=\"card-kicker\">考研政治</span></div>"
    "<h3>政治刷题</h3>"
    "<p class=\"study-numbers\"><strong>${quizDoneCount()}</strong> / ${politicsQuestions.length} 题</p>"
    "${progressBar(politicsQuestions.length?quizDoneCount()/politicsQuestions.length*100:0)}"
    "<span class=\"card-link\">${quizDoneCount()?'继续刷题':'去刷题'}${icon('arrow')}</span></button></div>"
)
apply_once("首页政治卡", A_CARD, NEW_CARD)

# ── 2. 我的页：统计格加第三项「已练题目」 ──
A_STAT = "<div><strong>${knowledgeCount()}</strong><small>已阅读知识点</small></div></div>"
NEW_STAT = (
    "<div><strong>${knowledgeCount()}</strong><small>已阅读知识点</small></div>"
    "<div><strong>${quizDoneCount()}</strong><small>已练题目</small></div></div>"
)
apply_once("我的统计格", A_STAT, NEW_STAT)

# ── 3. 我的页：图表开关加「刷题」 ──
A_SWITCH = (
    "<button class=\"${chartMode==='knowledge'?'active':''}\" aria-pressed=\"${chartMode==='knowledge'}\" "
    "data-action=\"chart\" data-value=\"knowledge\" data-od-id=\"chart-knowledge\">知识点</button></div></div>"
)
NEW_SWITCH = (
    "<button class=\"${chartMode==='knowledge'?'active':''}\" aria-pressed=\"${chartMode==='knowledge'}\" "
    "data-action=\"chart\" data-value=\"knowledge\" data-od-id=\"chart-knowledge\">知识点</button>"
    "<button class=\"${chartMode==='quiz'?'active':''}\" aria-pressed=\"${chartMode==='quiz'}\" "
    "data-action=\"chart\" data-value=\"quiz\" data-od-id=\"chart-quiz\">刷题</button></div></div>"
)
apply_once("图表开关", A_SWITCH, NEW_SWITCH)

# ── 4. 我的页：values 增加 quiz 分支 ──
A_VALUES = (
    "  const values=chartMode==='words'?[38,50,42,50,46,50,wordCount()]:[4,5,4,6,5,6,knowledgeCount()], "
    "max=Math.max(...values), days=['二','三','四','五','六','日','一'];"
)
NEW_VALUES = (
    "  const chartBase=chartMode==='words'?[38,50,42,50,46,50]:chartMode==='knowledge'?[4,5,4,6,5,6]:[8,12,6,10,9,7];\n"
    "  const chartToday=chartMode==='words'?wordCount():chartMode==='knowledge'?knowledgeCount():quizDoneCount();\n"
    "  const values=[...chartBase,chartToday], max=Math.max(...values,1), days=['二','三','四','五','六','日','一'];"
)
apply_once("周图数据", A_VALUES, NEW_VALUES)

# ── 5. 我的页：图表的 aria-label / 文案支持三种模式 ──
A_ARIA = "aria-label=\"最近七天${chartMode==='words'?'单词学习量':'知识点阅读量'}：${values.join('、')}\""
NEW_ARIA = (
    "aria-label=\"最近七天${chartMode==='words'?'单词学习量':chartMode==='knowledge'?'知识点阅读量':'刷题量'}："
    "${values.join('、')}\""
)
apply_once("图表 aria", A_ARIA, NEW_ARIA)

A_CAP = (
    "<p class=\"chart-caption\">近 7 天共${chartMode==='words'?'学习':'阅读'} "
    "${values.reduce((a,b)=>a+b,0)} ${chartMode==='words'?'个单词':'个知识点'}，坚持正在悄悄发生。</p>"
)
NEW_CAP = (
    "<p class=\"chart-caption\">近 7 天共${chartMode==='words'?'学习':chartMode==='knowledge'?'阅读':'练习'} "
    "${values.reduce((a,b)=>a+b,0)} ${chartMode==='words'?'个单词':chartMode==='knowledge'?'个知识点':'道题'}，"
    "坚持正在悄悄发生。</p>"
)
apply_once("图表文案", A_CAP, NEW_CAP)

# ── 6. CSS：整行卡片 + 三列统计格 ──
A_GRID = ".learning-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 12px; }"
NEW_GRID = (
    A_GRID + "\n"
    ".study-card.wide { grid-column: 1 / -1; min-height: 0; }"
)
apply_once("CSS 学习栅格", A_GRID, NEW_GRID)

A_STATCSS = (
    ".stats-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); margin-top: 22px; "
    "padding: 18px 4px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }"
)
NEW_STATCSS = A_STATCSS.replace("repeat(2,minmax(0,1fr))", "repeat(3,minmax(0,1fr))")
apply_once("CSS 统计栅格", A_STATCSS, NEW_STATCSS)

open(out_path, "w", encoding="utf-8", newline="").write(s)
print("补丁完成，各锚点命中：")
for k, v in HITS.items():
    print(f"  {k}: {v}")
print(f"输出 {out_path}（{len(s)} 字符）")
