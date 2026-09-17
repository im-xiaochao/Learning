"""设计稿：材料题的「查看参考答案」改成可收起的开关（查看 / 隐藏）。

三处改动：
  1. `revealed` 按题型分别计算 —— 材料题只认 `quizRevealed`。
     原来 `revealed = quizRevealed || Boolean(a)`，而材料题一点「查看」就会写入
     `state.quizAnswers`（用来在题库列表里标「已读参考答案」），于是 `a` 永远为真、
     `revealed` 再也回不到 false —— 这就是「只能看、不能藏」的根因。
  2. 按钮文案随状态切换：未揭示「查看参考答案」/ 已揭示「隐藏参考答案」，不再隐藏按钮。
  3. 点击处理改成 toggle；仍然只在**首次**揭示时写入作答记录（收起不撤销记录）。

选择题保持原样：交卷后展示结果，不提供收起。

用法：python tools/_patch-od-quiz-hide-answer.py <输入.html> <输出.html>
"""
import sys

src_path, out_path = sys.argv[1], sys.argv[2]
s = open(src_path, encoding="utf-8").read()

HITS = {}


def apply_once(label, old, new, expect=1):
    global s
    n = s.count(old)
    if n != expect:
        raise SystemExit(f"[{label}] 期望命中 {expect} 次，实际 {n} 次")
    s = s.replace(old, new)
    HITS[label] = n


# ── 1. revealed 按题型计算 ──
A_REVEAL = (
    "  const picked = quizPicked || (a ? a.picked : '');\n"
    "  const revealed = quizRevealed || Boolean(a);\n"
    "  const isChoice = q.type === 'choice';"
)
NEW_REVEAL = (
    "  const isChoice = q.type === 'choice';\n"
    "  const picked = quizPicked || (a ? a.picked : '');\n"
    "  // 选择题：交卷后（有作答记录）就展示结果，不提供收起；\n"
    "  // 材料题：只认 quizRevealed —— 否则一旦看过参考答案、作答记录写入后，\n"
    "  // revealed 会永远为真，「隐藏参考答案」就收不起来了。\n"
    "  const revealed = isChoice ? (quizRevealed || Boolean(a)) : quizRevealed;"
)
apply_once("revealed 计算", A_REVEAL, NEW_REVEAL)

# ── 2. 材料题按钮：常显 + 文案随状态切换 ──
A_BTN = (
    "<button class=\"primary-button mt20\" data-action=\"quiz-show\" data-od-id=\"quiz-show\" "
    "${revealed?'hidden':''}>${icon('eye')}${revealed?'':'查看参考答案'}</button>"
)
NEW_BTN = (
    "<button class=\"primary-button mt20\" data-action=\"quiz-show\" data-od-id=\"quiz-show\">"
    "${icon('eye')}${revealed?'隐藏参考答案':'查看参考答案'}</button>"
)
apply_once("按钮文案", A_BTN, NEW_BTN)

# ── 3. 点击处理改成 toggle ──
A_ACTION = (
    "else if(action==='quiz-show') { const pool=quizPool(), q=pool[quizCursor]; if(!q) return; "
    "quizRevealed=true; if(q.type==='material' && !state.quizAnswers[q.id]) "
    "{ state.quizAnswers[q.id]={picked:'', correct:false}; persist(); } render(); }"
)
NEW_ACTION = (
    "else if(action==='quiz-show') { const pool=quizPool(), q=pool[quizCursor]; if(!q) return; "
    "const firstReveal=!quizRevealed; quizRevealed=firstReveal; "
    "if(firstReveal && q.type==='material' && !state.quizAnswers[q.id]) "
    "{ state.quizAnswers[q.id]={picked:'', correct:false}; persist(); } render(); }"
)
apply_once("点击处理", A_ACTION, NEW_ACTION)

open(out_path, "w", encoding="utf-8", newline="").write(s)
print("补丁完成，各锚点命中：")
for k, v in HITS.items():
    print(f"  {k}: {v}")
print(f"输出 {out_path}（{len(s)} 字符）")
