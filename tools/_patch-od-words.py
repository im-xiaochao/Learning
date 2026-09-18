"""改设计稿的「背单词」模块 + 删数学「我的计划」+ 去掉单词读音。

用户口径（2026-09-18）：
  1. 背单词页一进来就显示「继续复习」是逻辑错误 → 应显示「开始学习」；
     上方两张卡：今日新词（已背/总数）、今日复习（已复习/总数）。
  2. 取消所有单词的读音图标（现在没有读音功能）。
  3. 「开始学习」下方 + 底部 tab 之间加两张卡：单词本（所有单词 + 学习状态）、
     计划设定（每天学多少个单词）。
  4. 数学模块的「我的计划」删掉。

数据来源统一到 state.goals：words=每天新学量（默认 20），review=每天复习量（默认 30），
与「学习目标」页的「单词目标」是同一个值；今日进度存在 state.wordToday，跨天自动归零。
每个锚点都要求精确命中指定次数，命中数不对就抛错，不静默改错。

用法：python tools/_patch-od-words.py <输入.html> <输出.html>
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


def replace_between(label, start_marker, end_marker, new_text):
    """替换 start_marker 起点到 end_marker 起点之间的内容（两端 marker 本身保留在外部）。"""
    global s
    a = s.find(start_marker)
    if a < 0:
        raise SystemExit(f"[{label}] 找不到起点 {start_marker!r}")
    b = s.find(end_marker, a)
    if b < 0:
        raise SystemExit(f"[{label}] 找不到终点 {end_marker!r}")
    s = s[:a] + new_text + s[b:]
    HITS[label] = 1


# ── 1. 默认值：单词目标 20（每天新学）+ 新增每天复习量 30 ────────────────
A_DEFAULTS = (
    "goals:{words:50, knowledge:3, english:'英语一', subject:'数学一', year:'2027'}"
)
NEW_DEFAULTS = (
    "goals:{words:20, review:30, knowledge:3, english:'英语一', subject:'数学一', year:'2027'}"
)
apply_once("默认值", A_DEFAULTS, NEW_DEFAULTS)

# ── 2. 顶层状态：reviewMode（新词/复习两种组）+ 单词本筛选 ────────────────
A_LET = "let route='home', historyStack=[], subjectIndex=0, chartMode='words', searchTerm='';"
NEW_LET = "let route='home', historyStack=[], subjectIndex=0, chartMode='words', searchTerm='', wordFilter='all';"
apply_once("顶层状态-筛选", A_LET, NEW_LET)

A_QUEUE = "let reviewQueue=[], reviewIndex=0, reviewGrade=null, revealMeaning=true, detailWord=0, detailTopic=2;"
NEW_QUEUE = "let reviewQueue=[], reviewIndex=0, reviewGrade=null, revealMeaning=true, detailWord=0, detailTopic=2, reviewMode='new';"
apply_once("顶层状态-组类型", A_QUEUE, NEW_QUEUE)

# ── 3. 单词计划 / 今日进度 / wordCount ──────────────────────────────────
A_WORDC = "function wordCount() { return Math.min(50,32 + Object.keys(state.answered).length); }"
NEW_WORDC = """/**
 * 每日单词计划。newTotal=每天新学多少个，reviewTotal=每天复习多少个，
 * 与「学习目标」页的「单词目标」共用 state.goals.words，避免两个地方各说一套。
 */
function wordPlan() { const g=state.goals||{}; const pick=(v,fallback,allowed)=>allowed.includes(Number(v))?Number(v):fallback; return {newTotal:pick(g.words,20,[10,20,30,50]), reviewTotal:pick(g.review,30,[20,30,50,80])}; }
function wordPlanTotal() { const p=wordPlan(); return p.newTotal+p.reviewTotal; }
function todayKey() { const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
/** 今日进度：跨天自动归零。learned=今天新学的词，reviewed=今天复习的词 */
function wordToday() { const t=state.wordToday; if(!t || typeof t!=='object' || t.date!==todayKey()) { state.wordToday={date:todayKey(), learned:0, reviewed:0}; persist(); } return state.wordToday; }
/** 答完一个词：第一次见计入新词，之后再答计入复习 */
function wordProgress(firstTime) { const t=wordToday(), p=wordPlan(); if(firstTime) t.learned=Math.min(p.newTotal,(Number(t.learned)||0)+1); else t.reviewed=Math.min(p.reviewTotal,(Number(t.reviewed)||0)+1); }
function wordCount() { const t=wordToday(), p=wordPlan(); return Math.min(wordPlanTotal(), Math.min(p.newTotal,Number(t.learned)||0)+Math.min(p.reviewTotal,Number(t.reviewed)||0)); }"""
apply_once("单词计划函数", A_WORDC, NEW_WORDC)

# ── 4. 首页：今日单词卡跟着计划走，0 进度时说「开始背词」 ─────────────────
A_HOME = "pct=Math.round((wc/50*100+knowledgePct)/2), pending=(wc<50?1:0)+"
NEW_HOME = "pct=Math.round((wc/wordPlanTotal()*100+knowledgePct)/2), pending=(wc<wordPlanTotal()?1:0)+"
apply_once("首页进度计算", A_HOME, NEW_HOME)

A_HOMECARD = (
    '<p class="study-numbers"><strong>${wc}</strong> / 50 个</p>${progressBar(wc*2)}'
    "<span class=\"card-link\">${wc===50?'查看复习成果':'继续背词'}${icon(wc===50?'check':'arrow')}</span></button>"
)
NEW_HOMECARD = (
    '<p class="study-numbers"><strong>${wc}</strong> / ${wordPlanTotal()} 个</p>'
    "${progressBar(wordPlanTotal()?wc/wordPlanTotal()*100:0)}"
    "<span class=\"card-link\">${wc>=wordPlanTotal()?'查看复习成果':wc?'继续背词':'开始背词'}"
    "${icon(wc>=wordPlanTotal()?'check':'arrow')}</span></button>"
)
apply_once("首页单词卡", A_HOMECARD, NEW_HOMECARD)

# ── 5. 背单词页整页重写 ────────────────────────────────────────────────
NEW_WORDSPAGE = """function wordsPage() {
  const plan=wordPlan(), today=wordToday();
  const learned=Math.min(plan.newTotal,Number(today.learned)||0), reviewed=Math.min(plan.reviewTotal,Number(today.reviewed)||0);
  const newLeft=plan.newTotal-learned, reviewLeft=plan.reviewTotal-reviewed, left=newLeft+reviewLeft, started=learned+reviewed>0;
  const statCard=(id,iconName,kicker,title,done,total,rest,doneNote)=>`<div class="study-card" data-od-id="${id}"><div class="row">${icon(iconName,'card-icon')}<span class="card-kicker">${kicker}</span></div><h3>${title}</h3><p class="study-numbers"><strong>${done}</strong> / ${total} 个</p>${progressBar(total?done/total*100:0)}<span class="card-link">${rest?`还剩 ${rest} 个`:doneNote}</span></div>`;
  return `<section class="page" data-od-id="vocabulary-home"><p class="eyebrow">考研英语 · 核心词汇</p><h1 class="page-title" data-od-id="vocabulary-title">让每个单词，留得更久。</h1>
  <div class="learning-grid mt20" data-od-id="vocabulary-today">${statCard('today-new-words','book','今日计划','今日新词',learned,plan.newTotal,newLeft,'今日新词已完成')}${statCard('today-review-words','refresh','温故知新','今日复习',reviewed,plan.reviewTotal,reviewLeft,'今日复习已完成')}</div>
  <button class="primary-button mt20" data-action="review-start" data-od-id="start-word-review">${started?(left?`继续学习 · 还剩 ${left} 个`:'今日已完成 · 再练一组'):'开始学习'}${icon('arrow')}</button><p class="quiet-note">不必一次记住，重要的是一次次相遇。</p>
  <div class="section-head"><h2 data-od-id="vocabulary-tools-heading">单词工具</h2><span>按自己的节奏来</span></div>
  <div class="learning-grid" data-od-id="vocabulary-tools"><button class="study-card" data-action="nav" data-route="wordbook" data-od-id="vocabulary-wordbook"><div class="row">${icon('book','card-icon')}<span class="card-kicker">共 ${vocabulary.length} 个单词</span></div><h3>单词本</h3><p class="study-numbers">查看每个单词的学习状态</p><span class="card-link">${icon('chevron')}</span></button>
  <button class="study-card" data-action="nav" data-route="word-plan" data-od-id="vocabulary-plan"><div class="row">${icon('target','card-icon')}<span class="card-kicker">每天 ${wordPlanTotal()} 个</span></div><h3>计划设定</h3><p class="study-numbers">新学 ${plan.newTotal} 个 · 复习 ${plan.reviewTotal} 个</p><span class="card-link">${icon('chevron')}</span></button></div>
  <div class="menu-list"><button class="menu-row" data-action="nav" data-route="favorites" data-od-id="vocabulary-favorites">${icon('star')}<strong>我的收藏</strong><small>${state.favorites.length} 个单词</small>${icon('chevron')}</button></div></section>`;
}
"""
replace_between("背单词页", "function wordsPage() {", "function knowledgeArt(kind)", NEW_WORDSPAGE)

# ── 6. 单词本 / 计划设定两个新页面（插在 favoritesPage 之后） ─────────────
A_FAV_END = (
    "<div class=\"word-list mt20\">${items.map(i=>`<button class=\"word-list-row\" data-action=\"word-detail\" "
    "data-word=\"${i}\" data-od-id=\"favorite-${vocabulary[i].word}\">"
    "<span><strong lang=\"en\">${vocabulary[i].word}</strong><small>${vocabulary[i].meaning}</small></span>"
    "${icon('chevron')}</button>`).join('')}</div></section>`;\n}\n"
)
NEW_PAGES = A_FAV_END + """function wordbookPage() {
  const items=vocabulary.map((w,i)=>({w,i,g:state.answered[w.word]||''}));
  const status=g=>g?{familiar:'熟悉',fuzzy:'模糊',unknown:'不认识'}[g]:'未学习';
  const match=x=>wordFilter==='all'||(wordFilter==='new'?!x.g:wordFilter==='familiar'?x.g==='familiar':!!x.g && x.g!=='familiar');
  const list=items.filter(match), learned=items.filter(x=>x.g).length, weak=items.filter(x=>x.g && x.g!=='familiar').length;
  return `<section class="page" data-od-id="word-book"><p class="eyebrow">考研英语 · 核心词汇</p><h1 class="page-title" data-od-id="word-book-title">每个词，都有自己的位置。</h1><p class="subtext mt12">共 ${items.length} 个单词 · 已学 ${learned} 个 · 待巩固 ${weak} 个</p>
  <div class="src-switch mt20" role="tablist" aria-label="按学习状态筛选" data-od-id="word-book-filter">${[['all','全部'],['new','未学习'],['familiar','已熟悉'],['weak','需巩固']].map(([v,t])=>`<button class="src-chip ${wordFilter===v?'active':''}" role="tab" aria-selected="${wordFilter===v}" data-action="word-filter" data-value="${v}" data-od-id="word-filter-${v}">${t}</button>`).join('')}</div>
  <div class="word-list mt20" data-od-id="word-book-list">${list.length?list.map(({w,i,g})=>`<button class="word-list-row" data-action="word-detail" data-word="${i}" data-od-id="wordbook-${w.word}"><span><strong lang="en">${w.word}</strong><small>${w.part} ${w.meaning}</small></span><span class="pill ${g==='familiar'?'':'orange'}">${status(g)}</span></button>`).join(''):'<p class="subtext" style="padding:18px 0">这个分类下还没有单词。</p>'}</div><p class="quiet-note">点开单词，可以看到词根与助记。</p></section>`;
}
function wordPlanPage() {
  const plan=wordPlan();
  const row=(field,label,options,current)=>`<div class="panel mt16" data-od-id="word-plan-${field}"><h2 style="font-size:14px">${label}</h2><div class="src-switch" role="group" aria-label="${label}">${options.map(v=>`<button class="src-chip ${v===current?'active':''}" aria-pressed="${v===current}" data-action="word-plan" data-field="${field}" data-value="${v}" data-od-id="word-plan-${field}-${v}">${v}<small>个 / 天</small></button>`).join('')}</div></div>`;
  return `<section class="page" data-od-id="word-plan-settings"><p class="eyebrow">按自己的节奏来</p><h1 class="page-title" data-od-id="word-plan-title">目标刚刚好，才走得远。</h1><p class="subtext mt12">现在每天新学 ${plan.newTotal} 个、复习 ${plan.reviewTotal} 个，共 ${wordPlanTotal()} 个。</p>
  ${row('newTotal','每天新学多少个单词',[10,20,30,50],plan.newTotal)}${row('reviewTotal','每天复习多少个单词',[20,30,50,80],plan.reviewTotal)}
  <p class="quiet-note">修改后立即生效，今日进度会按新的目标重新计算。<br>复习量不少于新词量，记得更牢。</p><button class="primary-button mt20" data-action="back" data-od-id="word-plan-back">返回背单词${icon('arrow')}</button></section>`;
}
"""
apply_once("新页面", A_FAV_END, NEW_PAGES)

# ── 7. 路由注册：额外页面 / 标题 / 单词 tab ─────────────────────────────
A_EXTRA = "const extraPages={'review':reviewPage,'word-detail':wordDetailPage,'result':resultPage,'favorites':favoritesPage,'topic':topicPage,'plan':planPage,'goals':goalsPage,"
NEW_EXTRA = "const extraPages={'review':reviewPage,'word-detail':wordDetailPage,'result':resultPage,'favorites':favoritesPage,'wordbook':wordbookPage,'word-plan':wordPlanPage,'topic':topicPage,'plan':planPage,'goals':goalsPage,"
apply_once("路由表", A_EXTRA, NEW_EXTRA)

A_TITLES = "'favorites':'收藏单词','plan':'学习计划',"
NEW_TITLES = "'favorites':'收藏单词','wordbook':'单词本','word-plan':'计划设定','plan':'学习计划',"
apply_once("页面标题", A_TITLES, NEW_TITLES)

A_TAB = "if(['words','review','result','word-detail'].includes(route)) return 'words';"
NEW_TAB = "if(['words','review','result','word-detail','wordbook','word-plan'].includes(route)) return 'words';"
apply_once("单词 tab 归属", A_TAB, NEW_TAB)

# ── 8. 动作：单词本筛选 + 计划设定 ────────────────────────────────────
A_QUIZ = "  else if(action==='quiz') { quizSource='x4';"
NEW_QUIZ = """  else if(action==='word-filter') { wordFilter=el.dataset.value||'all'; render(); }
  else if(action==='word-plan') { const field=el.dataset.field, value=Number(el.dataset.value), allowed=field==='newTotal'?[10,20,30,50]:[20,30,50,80]; if(!allowed.includes(value)) return; state.goals=field==='newTotal'?{...state.goals,words:value}:{...state.goals,review:value}; persist(); render(); showToast(field==='newTotal'?`每天新学 ${value} 个单词`:`每天复习 ${value} 个单词`); }
""" + A_QUIZ
apply_once("新动作", A_QUIZ, NEW_QUIZ)

# ── 9. 答题计分：区分新词 / 复习 ──────────────────────────────────────
A_GRADE = "    reviewGrade=el.dataset.value; state.answered[w.word]=reviewGrade; revealMeaning=true; persist(); render();"
NEW_GRADE = "    reviewGrade=el.dataset.value; const firstTime=!state.answered[w.word]; state.answered[w.word]=reviewGrade; wordProgress(firstTime); revealMeaning=true; persist(); render();"
apply_once("计分", A_GRADE, NEW_GRADE)

# ── 10. 开始学习：先新词，新词达标后转复习 ──────────────────────────────
replace_between(
    "开始学习",
    "function startReview(weak=false) {",
    "function handleLearningAction(action,el) {",
    """function startReview(weak=false) {
  if(!weak && reviewQueue.length && reviewIndex<reviewQueue.length) { navigate('review'); return; }
  const plan=wordPlan(), today=wordToday();
  const due=vocabulary.map((w,i)=>({w,i})).filter(({w})=>state.answered[w.word] && state.answered[w.word]!=='familiar');
  const fresh=vocabulary.map((w,i)=>({w,i})).filter(({w})=>!state.answered[w.word]);
  const newDone=(Number(today.learned)||0)>=plan.newTotal;
  reviewMode=(weak||newDone)?'review':'new';
  let queue=reviewMode==='review'?due:fresh;
  if(!queue.length) queue=reviewMode==='review'?fresh:due;
  reviewQueue=queue.map(x=>x.i); reviewIndex=0; reviewGrade=null; revealMeaning=true;
  if(!reviewQueue.length) navigate('result'); else navigate('review',route!=='result');
}
""",
)

# ── 11. 取消读音：按钮、动作、函数、图标 ───────────────────────────────
apply_once("复习页读音", "${speakButton(index)}", "")
apply_once("详情页读音", "${speakButton(detailWord)}", "")
apply_once("读音动作", "  else if(action==='pronounce') pronounce(Number(el.dataset.word));\n", "")
apply_once(
    "读音图标",
    "  sound:'<path d=\"M11 4 5 9H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14\"/>',\n",
    "",
)
replace_between("读音按钮函数", "function speakButton(index) {", "function reviewPage() {", "")
# pronounce() 正好夹在 startReview() 和 handleLearningAction() 之间，已在第 10 步随
# startReview 整段替换一起删掉，这里只做断言，别再删一次（删了会静默误伤）。
if "function pronounce" in s:
    raise SystemExit("[朗读函数] 仍在稿件里，第 10 步的整段替换没覆盖到它")
HITS["朗读函数"] = 1

# ── 12. 数学模块：删掉「我的计划」 ─────────────────────────────────────
A_MYPLAN = (
    '<div class="section-head"><h2 data-od-id="knowledge-section-heading">知识点讲解</h2>'
    '<button class="text-button" data-action="nav" data-route="plan" data-od-id="open-knowledge-plan">'
    "我的计划${icon('chevron')}</button></div>"
)
NEW_MYPLAN = (
    '<div class="section-head"><h2 data-od-id="knowledge-section-heading">知识点讲解</h2>'
    "<span>已读 ${progress} / ${s.total} 节</span></div>"
)
apply_once("删我的计划", A_MYPLAN, NEW_MYPLAN)

# ── 13. 复习结果页：完成判据跟着计划走 ─────────────────────────────────
A_RESULT = "wordCount()===50?'今天的单词，拿下了。':'这一组，记得更牢了。'"
NEW_RESULT = "wordCount()>=wordPlanTotal()?'今天的单词，拿下了。':'这一组，记得更牢了。'"
apply_once("结果页判据", A_RESULT, NEW_RESULT)

# ── 14. 学习目标页：单词目标选项与计划设定统一，保存时保留复习量 ──────────
A_GOALOPT = "select('words','单词目标',[[20,'20 个'],[30,'30 个'],[50,'50 个'],[80,'80 个']])"
NEW_GOALOPT = "select('words','单词目标',[[10,'10 个'],[20,'20 个'],[30,'30 个'],[50,'50 个']])"
apply_once("目标页选项", A_GOALOPT, NEW_GOALOPT)

A_SAVE1 = "if(![20,30,50,80].includes(Number(data.words))"
NEW_SAVE1 = "if(![10,20,30,50].includes(Number(data.words))"
apply_once("目标校验", A_SAVE1, NEW_SAVE1)

A_SAVE2 = "state.goals={words:Number(data.words),knowledge:Number(data.knowledge),english:data.english,subject:data.subject,year:data.year}; persist();"
NEW_SAVE2 = "state.goals={...state.goals,words:Number(data.words),review:wordPlan().reviewTotal,knowledge:Number(data.knowledge),english:data.english,subject:data.subject,year:data.year}; persist();"
apply_once("保存目标", A_SAVE2, NEW_SAVE2)

open(out_path, "w", encoding="utf-8", newline="").write(s)
print("补丁完成，各锚点命中：")
for k, v in HITS.items():
    print(f"  {k}: {v}")
print(f"输出 {out_path}（{len(s)} 字符）")
