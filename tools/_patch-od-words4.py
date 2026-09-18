"""原型补丁（第四轮）：计划设定页支持自定义数量 + 设置时不再弹轻提示。

用户口径（2026-09-18）：
  - 计划设定要能自定义每天学多少个单词（预设之外）；
  - 设置单词量时**不要弹轻提示**（数字就在卡片上，看得见）；
  - 顺带把校验从「白名单」改成「范围 5~200」，否则自定义值会被 pick() 悄悄打回默认值。

两张卡（每天新学 / 每天复习）本来就在，这轮只加「自定义」chip + 内联输入表单。
用法：python tools/_patch-od-words4.py <输入.html> <输出.html>
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


# ── 1. 计划值校验：白名单 → 范围（自定义值不再被悄悄打回默认） ──────────
A_PLAN = (
    "function wordPlan() { const g=state.goals||{}; const pick=(v,fallback,allowed)=>"
    "allowed.includes(Number(v))?Number(v):fallback; return {newTotal:pick(g.words,20,[10,20,30,50]), "
    "reviewTotal:pick(g.review,30,[20,30,50,80])}; }"
)
NEW_PLAN = """/**
 * 每日单词计划。
 * 除了预设值，还支持自定义，所以这里按**范围**（5~200）校验，不再比对白名单——
 * 否则自定义填 35 会被 pick() 悄悄打回默认 20，界面上看不出任何异常。
 */
const WORD_PLAN_MIN = 5, WORD_PLAN_MAX = 200;
function wordPlanNum(value, fallback) { const n=Math.round(Number(value)); return Number.isFinite(n) && n>=WORD_PLAN_MIN && n<=WORD_PLAN_MAX ? n : fallback; }
function wordPlan() { const g=state.goals||{}; return {newTotal:wordPlanNum(g.words,20), reviewTotal:wordPlanNum(g.review,30)}; }"""
apply_once("计划值校验", A_PLAN, NEW_PLAN)

# ── 2. 顶层状态：记住哪一行的自定义输入是展开的 ────────────────────────
A_LET = "let route='home', historyStack=[], subjectIndex=0, chartMode='words', searchTerm='', wordFilter='all';"
NEW_LET = "let route='home', historyStack=[], subjectIndex=0, chartMode='words', searchTerm='', wordFilter='all', wordPlanCustom='';"
apply_once("自定义展开状态", A_LET, NEW_LET)

# ── 3. 计划设定页重写：两张卡 + 自定义 chip + 内联输入 ─────────────────
A_PAGE_START = "function wordPlanPage() {"
NEW_PAGE = """/** 设置每日单词量（预设 chip 与自定义输入共用）。不做轻提示：数字就在卡片上，用户看得到 */
function setWordPlan(field, value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return false;
  const clamped = Math.max(WORD_PLAN_MIN, Math.min(WORD_PLAN_MAX, n));
  state.goals = field === 'newTotal' ? { ...state.goals, words: clamped } : { ...state.goals, review: clamped };
  wordPlanCustom = '';
  persist();
  render();
  return true;
}
function wordPlanPage() {
  const plan = wordPlan();
  const row = (field, label, options, current) => {
    const custom = !options.includes(current);
    const form = `<form class="plan-custom" data-plan-field="${field}" data-od-id="word-plan-${field}-custom-form"><input type="number" inputmode="numeric" min="${WORD_PLAN_MIN}" max="${WORD_PLAN_MAX}" step="5" value="${current}" aria-label="${label}自定义数量" data-od-id="word-plan-${field}-input"><span class="plan-hint">${WORD_PLAN_MIN}~${WORD_PLAN_MAX} 个</span><button type="submit" class="secondary-button" data-od-id="word-plan-${field}-apply">确定</button><button type="button" class="text-button" data-action="word-plan-cancel" data-field="${field}" data-od-id="word-plan-${field}-cancel">取消</button></form>`;
    return `<div class="panel mt16" data-od-id="word-plan-${field}"><h2 style="font-size:14px">${label}</h2><div class="src-switch" role="group" aria-label="${label}">${options.map(v => `<button class="src-chip ${v === current ? 'active' : ''}" aria-pressed="${v === current}" data-action="word-plan" data-field="${field}" data-value="${v}" data-od-id="word-plan-${field}-${v}">${v}<small>个 / 天</small></button>`).join('')}<button class="src-chip ${custom ? 'active' : ''}" aria-pressed="${custom}" data-action="word-plan-custom" data-field="${field}" data-od-id="word-plan-${field}-custom">${custom ? current : '自定义'}<small>个 / 天</small></button></div>${wordPlanCustom === field ? form : ''}</div>`;
  };
  return `<section class="page" data-od-id="word-plan-settings"><p class="eyebrow">按自己的节奏来</p><h1 class="page-title" data-od-id="word-plan-title">目标刚刚好，才走得远。</h1><p class="subtext mt12">现在每天新学 ${plan.newTotal} 个、复习 ${plan.reviewTotal} 个，共 ${wordPlanTotal()} 个。</p>
  ${row('newTotal', '每天新学多少个单词', [10, 20, 30, 50], plan.newTotal)}${row('reviewTotal', '每天复习多少个单词', [20, 30, 50, 80], plan.reviewTotal)}
  <p class="quiet-note">修改后立即生效，今日进度会按新的目标重新计算。<br>复习量不少于新词量，记得更牢。</p><button class="primary-button mt20" data-action="back" data-od-id="word-plan-back">返回背单词${icon('arrow')}</button></section>`;
}
"""
def replace_between(label, start_marker, end_marker, new_text):
    """替换 start_marker 起点到 end_marker 起点之间的内容（两端 marker 本身保留在外部）。

    为什么不能只替换函数首行：整段函数体还在后面，会留下孤立的花括号（第一次就踩了，
    node --check 报 Unexpected token '}'）。
    """
    global s
    a = s.find(start_marker)
    if a < 0:
        raise SystemExit(f"[{label}] 找不到起点 {start_marker!r}")
    b = s.find(end_marker, a)
    if b < 0:
        raise SystemExit(f"[{label}] 找不到终点 {end_marker!r}")
    s = s[:a] + new_text + s[b:]
    HITS[label] = 1


replace_between("计划设定页", A_PAGE_START, "// ── 政治刷题", NEW_PAGE)

# ── 4. 动作：预设（无轻提示）/ 展开自定义 / 取消 ───────────────────────
A_ACTION = (
    "  else if(action==='word-plan') { const field=el.dataset.field, value=Number(el.dataset.value), "
    "allowed=field==='newTotal'?[10,20,30,50]:[20,30,50,80]; if(!allowed.includes(value)) return; "
    "state.goals=field==='newTotal'?{...state.goals,words:value}:{...state.goals,review:value}; persist(); "
    "render(); showToast(field==='newTotal'?`每天新学 ${value} 个单词`:`每天复习 ${value} 个单词`); }\n"
)
NEW_ACTION = (
    "  else if(action==='word-plan') { setWordPlan(el.dataset.field, el.dataset.value); }\n"
    "  else if(action==='word-plan-custom') { wordPlanCustom=el.dataset.field; render(); "
    "const input=document.getElementById('word-plan-'+el.dataset.field+'-input'); if(input) { input.focus(); if(input.select) input.select(); } }\n"
    "  else if(action==='word-plan-cancel') { wordPlanCustom=''; render(); }\n"
)
apply_once("计划设定动作", A_ACTION, NEW_ACTION)

# ── 5. 表单提交：自定义数量走这里（回车也能确定） ──────────────────────
A_SUBMIT = "document.addEventListener('submit',event=>{ if(event.target.id==='goal-form') { event.preventDefault(); saveGoals(event.target); } });"
NEW_SUBMIT = (
    "document.addEventListener('submit',event=>{ if(event.target.id==='goal-form') { event.preventDefault(); saveGoals(event.target); } "
    "else if(event.target.dataset.planField) { event.preventDefault(); const input=event.target.querySelector('input'); "
    "setWordPlan(event.target.dataset.planField, input ? input.value : ''); } });"
)
apply_once("自定义表单提交", A_SUBMIT, NEW_SUBMIT)

# ── 6. CSS：自定义输入行 ───────────────────────────────────────────────
A_CSS = ".src-chip.active small { opacity:.8; }"
NEW_CSS = A_CSS + """
/* 自定义数量：预设 chip 之外的内联输入行（输入框 + 范围提示 + 确定 / 取消） */
.plan-custom { display:flex; align-items:center; gap:8px; margin-top:12px; }
.plan-custom input { flex:1 1 80px; min-width:0; height:42px; padding:0 12px; border:1px solid var(--border); border-radius:10px; background:var(--surface); color:var(--fg); font:600 14px var(--body); }
.plan-custom .plan-hint { font-size:9px; color:var(--muted); flex:0 0 auto; }
.plan-custom .secondary-button { width:auto; min-height:42px; padding:0 14px; font-size:12px; }
.plan-custom .text-button { flex:0 0 auto; }"""
apply_once("自定义输入样式", A_CSS, NEW_CSS)

open(out_path, "w", encoding="utf-8", newline="").write(s)
print("补丁完成，各锚点命中：")
for k, v in HITS.items():
    print(f"  {k}: {v}")
print(f"输出 {out_path}（{len(s)} 字符）")
