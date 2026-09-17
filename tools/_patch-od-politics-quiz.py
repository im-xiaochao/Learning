#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
在设计稿 ci-shu-tong-xing.html 里把「政治」从知识点讲解改造成刷题模块。

改什么
------
1. 政治学科定义：topics/notes 清空（暂无可发布知识点），total=0，
   新增 questions 数量标注；chapter 改成「选择题 · 材料题」。
2. 新增 `politicsQuestions` 题库常量（选择题 + 材料题）。
3. 新增刷题相关页面/状态：
   - `politicsQuizPage()`   题库列表（按模块分组，显示已答/正确率）
   - `politicsQuestionPage()` 答题页（选择题：选项作答 + 提交判对错；材料题：看参考答案）
   - `quizResultPage()`     刷题结果页
   - `state.quizAnswers`    答题记录（qid -> {picked, correct}）
4. 资料库 tab 选中政治时走刷题分支，而不是知识点列表。
5. 路由表、titles、extraPages、activeTab 补上三个新路由。
6. 顶部标题、空态文案相应调整。

设计原则
--------
- 用**整行精确匹配 + anchor 断言**，改不到就抛错，绝不静默改错。
- 只改政治，数学与四门计算机专业课的行为一律不动。
- 幂等：重复跑会因 anchor 已变而报错（这是有意的，防止重复插入）。

用法
----
    python tools/_patch-od-politics-quiz.py <src.html> <out.html>
"""
import io
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


class PatchError(Exception):
    pass


def apply_once(text: str, old: str, new: str, label: str) -> str:
    """整行替换，必须恰好命中一次。"""
    n = text.count(old)
    if n != 1:
        raise PatchError(f'[{label}] 期望命中 1 次，实际 {n} 次\n  锚点: {old[:150]}')
    return text.replace(old, new)


def insert_before(text: str, anchor: str, block: str, label: str) -> str:
    idx = text.find(anchor)
    if idx < 0:
        raise PatchError(f'[{label}] 找不到锚点: {anchor[:150]}')
    if text.count(anchor) != 1:
        raise PatchError(f'[{label}] 锚点命中 {text.count(anchor)} 次，不唯一: {anchor[:150]}')
    return text[:idx] + block + text[idx:]


def main() -> int:
    src, out = sys.argv[1], sys.argv[2]
    text = io.open(src, encoding='utf-8').read()

    # ──────────────────────────────────────────────────────────────
    # 1) 政治学科定义：清空 topics/notes，改成题库学科
    # ──────────────────────────────────────────────────────────────
    old_politics = (
        "{id:'politics', kind:'politics', name:'思想政治理论', short:'政治', "
        "chapter:'政治基础框架', progress:0, total:3, intro:'把理论放回时代与生活', "
        "topics:['马克思主义基本原理','毛泽东思想和中国特色社会主义理论体系','思想道德与法治'], "
        "notes:['理解世界如何变化、社会如何发展以及我们怎样认识问题','从中国实践出发，理解理论如何回应道路与制度选择','把理想信念、道德实践和法治意识落到日常行动']},"
    )
    new_politics = (
        "{id:'politics', kind:'politics', name:'思想政治理论', short:'政治', "
        "chapter:'选择题 · 材料题', progress:0, total:0, intro:'先刷题，再回头看理论', "
        "topics:[], notes:[], quiz:true},"
    )
    text = apply_once(text, old_politics, new_politics, '政治学科定义')

    # ──────────────────────────────────────────────────────────────
    # 2) 新增政治题库常量（插在 concepts 定义之前）
    # ──────────────────────────────────────────────────────────────
    questions_js = r"""
// ── 政治题库（原型示意数据）──────────────────────────────────────────
// 政治暂无可发布的知识点讲解，手上只有题目，因此政治模块做刷题。
// 两种题型：
//   choice   选择题：options[{key,text}] + answerKey + explanation
//   material 材料题：material{title,paragraphs} + answerPoints[] + explanation
const politicsQuestions = [
{id:'q-mayuan-1', type:'choice', module:'马克思主义基本原理', difficulty:1, tags:['实践','认识论'],
 stem:'辩证唯物主义认识论认为，检验认识真理性的唯一标准是（　　）',
 options:[{key:'A',text:'多数人的意见'},{key:'B',text:'社会实践'},{key:'C',text:'科学理论'},{key:'D',text:'逻辑推理'}],
 answerKey:'B',
 explanation:'真理是主观与客观相符合，只有把认识拿到实践中检验，才能判定它是否与客观实际相符。多数人的意见可能错（A 错）；科学理论与逻辑推理都是认识本身，不能自己检验自己（C、D 错）。'},
{id:'q-mayuan-2', type:'material', module:'马克思主义基本原理', difficulty:2, tags:['实践与认识','材料分析题'],
 stem:'结合材料，说明实践与认识的辩证关系。',
 material:{title:'材料', paragraphs:['某地在推进乡村产业调整时，最初照搬外地经验引种经济作物，结果因气候与土壤条件不符而减产。当地随后组织技术人员驻村调查，重新测土配方、调整品种，并逐年根据市场行情修正种植结构，收益才逐步稳定下来。']},
 answerPoints:['实践是认识的来源和基础。该地一开始不了解本地条件，只有在实际种植失败后，才通过调查获得对气候、土壤的真实认识。','实践是认识发展的动力。减产暴露了原有认识的不足，推动当地去测土配方、重新选种，使认识不断深化。','实践是检验认识真理性的唯一标准。方案是否可行，最终要靠当年的收成和收益来判定，而不是靠事先的设想。','认识对实践具有反作用。修正后的种植方案指导了后续生产并取得稳定收益，说明正确认识能推动实践发展。'],
 explanation:'作答要「材料 + 原理」对应着写：每一条原理后面都要挂上材料中的具体情节（照搬失败 → 驻村调查 → 测土配方 → 收益稳定），不能只背原理而不结合材料。'},
{id:'q-maozhongte-1', type:'choice', module:'毛泽东思想和中国特色社会主义理论体系', difficulty:1, tags:['实事求是'],
 stem:'我们党的思想路线的核心是（　　）',
 options:[{key:'A',text:'一切从实际出发'},{key:'B',text:'理论联系实际'},{key:'C',text:'实事求是'},{key:'D',text:'在实践中检验和发展真理'}],
 answerKey:'C',
 explanation:'党的思想路线可概括为「一切从实际出发，理论联系实际，实事求是，在实践中检验和发展真理」，其中实事求是是核心与精髓。A、B、D 都是这条路线的一部分，但不是核心。'},
{id:'q-maozhongte-2', type:'material', module:'毛泽东思想和中国特色社会主义理论体系', difficulty:2, tags:['理论联系实际','材料分析题'],
 stem:'结合材料，说明为什么必须坚持理论联系实际。',
 material:{title:'材料', paragraphs:['某社区在推进数字化便民服务时，起初直接采购了一套通用系统，但老年人使用困难、实际办事率不高。社区随后组织居民座谈，按需求精简功能、保留线下窗口并安排志愿者帮办，服务使用率明显提升。']},
 answerPoints:['理论来自实践，也必须回到实践中去接受检验。通用系统在别处可行，不代表在本社区直接可行。','实际条件决定具体做法。社区的人口结构、办事习惯和资源条件，是制定方案时必须考虑的出发点。','要坚持问题导向，在实践中修正方案。座谈、精简功能、保留线下窗口，都是根据实际反馈作出的调整。','坚持以人民为中心。衡量方案好坏的标准是居民是否真正用得上、办得成，而不是系统本身是否先进。'],
 explanation:'这类题容易写成「口号 + 空话」。要抓住材料里的转折点（从「直接采购」到「组织座谈、精简功能」）来说明「一般理论必须结合具体实际」。'},
{id:'q-sixiu-1', type:'choice', module:'思想道德与法治', difficulty:1, tags:['法治意识'],
 stem:'关于法律与道德的关系，下列说法正确的是（　　）',
 options:[{key:'A',text:'法律调整的范围比道德更广'},{key:'B',text:'道德靠国家强制力保证实施'},{key:'C',text:'法律与道德相互支撑，共同维护社会秩序'},{key:'D',text:'凡是法律禁止的，道德也一定谴责'}],
 answerKey:'C',
 explanation:'道德调整的范围比法律更广（A 反了）；靠国家强制力保证实施的是法律，道德靠内心信念、社会舆论和传统习惯（B 错）；两者调整范围有交叉但不等同（D 太绝对）。法律与道德相辅相成，C 正确。'},
{id:'q-sixiu-2', type:'material', module:'思想道德与法治', difficulty:2, tags:['理想信念','道德实践','材料分析题'],
 stem:'结合材料，谈谈如何在日常学习生活中把道德要求与法治意识落到实处。',
 material:{title:'材料', paragraphs:['在某高校的一个小组作业中，有同学直接复制了网络上的资料却未标注来源，组内对此出现分歧：有人认为「只要结果对就行」，也有人坚持应当注明出处并重新整理。最终小组决定逐条核对来源、补齐引用，并在提交前统一检查。']},
 answerPoints:['道德要求要落在具体行动上。诚实守信不是抽象口号，体现在如实标注来源、不把他人成果当作自己的。','法治意识要求尊重规则与权利。学术规范、著作权规则属于必须遵守的边界，不能以「结果对」为由绕过。','面对分歧要走正当程序。先沟通、再按规则处理，而不是靠多数压服或放任不管。','坚守需要内在支撑。理想信念提供长期方向，让人在「别人都这么做」时仍能做出正确选择。'],
 explanation:'材料题答题要「观点 + 材料依据」成对出现。这里每个采分点都能在材料里找到落点（未标注来源、出现分歧、逐条核对、统一检查），不要脱离材料空谈道德与法治的关系。'}
];
const POLITICS_MODULES = ['马克思主义基本原理','毛泽东思想和中国特色社会主义理论体系','中国近现代史纲要','思想道德与法治','形势与政策'];
"""
    text = insert_before(text, '\nconst concepts = [', questions_js, '插入题库常量')

    # ──────────────────────────────────────────────────────────────
    # 3) state 增加答题记录 + 题库游标
    # ──────────────────────────────────────────────────────────────
    text = apply_once(
        text,
        "const defaults = {answered:{}, favorites:[], planned:[], readTopics:[], lastTopic:'calculus-2', goals:{words:50, knowledge:3, english:'英语一', subject:'数学一', year:'2027'}};",
        "const defaults = {answered:{}, quizAnswers:{}, favorites:[], planned:[], readTopics:[], lastTopic:'calculus-2', goals:{words:50, knowledge:3, english:'英语一', subject:'数学一', year:'2027'}};",
        'defaults 增加 quizAnswers',
    )
    text = apply_once(
        text,
        "if (!state.answered || typeof state.answered !== 'object' || Array.isArray(state.answered)) state.answered={};",
        "if (!state.answered || typeof state.answered !== 'object' || Array.isArray(state.answered)) state.answered={};\n"
        "if (!state.quizAnswers || typeof state.quizAnswers !== 'object' || Array.isArray(state.quizAnswers)) state.quizAnswers={};",
        'state.quizAnswers 兜底',
    )
    text = apply_once(
        text,
        "let reviewQueue=[], reviewIndex=0, reviewGrade=null, revealMeaning=true, detailWord=0, detailTopic=2;",
        "let reviewQueue=[], reviewIndex=0, reviewGrade=null, revealMeaning=true, detailWord=0, detailTopic=2;\n"
        "let quizModule='all', quizCursor=0, quizRevealed=false, quizPicked='';",
        '刷题游标状态',
    )

    # ──────────────────────────────────────────────────────────────
    # 4) 新增刷题工具函数与页面（插在 topicPage 之前）
    # ──────────────────────────────────────────────────────────────
    quiz_js = r"""
// ── 政治刷题 ────────────────────────────────────────────────────────

/** 按模块筛选后的题目（'all' 表示全部） */
function quizPool() {
  return quizModule === 'all' ? politicsQuestions : politicsQuestions.filter(q => q.module === quizModule);
}

/** 各模块的已答 / 正确数 */
function quizStats() {
  const map = {};
  for (const q of politicsQuestions) {
    if (!map[q.module]) map[q.module] = {total:0, done:0, correct:0};
    map[q.module].total++;
    const a = state.quizAnswers[q.id];
    if (a) { map[q.module].done++; if (a.correct) map[q.module].correct++; }
  }
  return map;
}

function quizDoneCount() { return politicsQuestions.filter(q => state.quizAnswers[q.id]).length; }
function quizCorrectCount() { return politicsQuestions.filter(q => state.quizAnswers[q.id] && state.quizAnswers[q.id].correct).length; }
function quizArt() { return `<svg viewBox="0 0 100 82" fill="none"><path d="M16 71h68M20 65V23l30-15 30 15v42" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M29 65V36h42v29M38 65V45h24v20M46 45v20M54 45v20" stroke="currentColor" stroke-width="1.7"/><path d="M50 8v-4M14 27h-4M86 27h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`; }

/** 政治模块首页：题库总览 + 按模块分组的题目列表 */
function politicsQuizPage() {
  const total = politicsQuestions.length;
  const done = quizDoneCount();
  const correct = quizCorrectCount();
  const rate = done ? Math.round(correct / done * 100) : 0;
  const stats = quizStats();
  const typeLabel = q => q.type === 'choice' ? '选择题' : '材料题';

  const rows = quizPool().map((q, i) => {
    const a = state.quizAnswers[q.id];
    const mark = a ? (a.correct ? icon('circleCheck') : icon('refresh')) : icon('chevron');
    const tone = a ? (a.correct ? ' ok' : ' bad') : '';
    return `<button class="quiz-row${tone}" data-action="quiz-open" data-qid="${q.id}" data-od-id="quiz-${q.id}"><span class="knowledge-number">${String(i+1).padStart(2,'0')}</span><span class="knowledge-content"><h3>${q.stem.length>26?q.stem.slice(0,26)+'…':q.stem}</h3><p>${q.module} · ${typeLabel(q)} · ${'★'.repeat(q.difficulty)}${a?(a.correct?' · 已答对':' · 答错了'):''}</p></span>${mark}</button>`;
  }).join('');

  const moduleChips = [`<button class="chip ${quizModule==='all'?'active':''}" data-action="quiz-module" data-module="all" data-od-id="quiz-module-all">全部 ${total}</button>`]
    .concat(POLITICS_MODULES.filter(m => stats[m]).map(m => `<button class="chip ${quizModule===m?'active':''}" data-action="quiz-module" data-module="${m}" data-od-id="quiz-module-${m}">${m.length>6?m.slice(0,6)+'…':m} ${stats[m].done}/${stats[m].total}</button>`))
    .join('');

  if (!total) return `<section class="page" data-od-id="politics-quiz-empty"><p class="eyebrow">考研政治 · 题库</p><h1 class="page-title">题目还在录入。</h1><div class="panel mt20"><p class="subtext">这个模块暂时没有可练习的题目。题库补充后会自动出现在这里。</p></div></section>`;

  return `<section class="page" data-od-id="politics-quiz-home"><p class="eyebrow">考研政治 · 题库</p><h1 class="page-title" data-od-id="politics-quiz-title">先刷题，再回头看理论。</h1>
<div class="panel mt20" data-od-id="politics-quiz-progress"><div class="row"><div><p class="eyebrow">练习进度</p><p class="big-number">${done} <small>/ ${total}</small></p></div><span class="pill">${icon(done===total?'check':'clock')}${done===total?'已全部练过':`还剩 ${total-done} 题`}</span></div>${progressBar(total?done/total*100:0)}<p class="quiet-note" style="margin-top:10px">已答对 ${correct} 题，正确率 ${rate}%</p></div>
<div class="section-head"><h2 data-od-id="politics-quiz-list-heading">按模块练习</h2><span>选择题 · 材料题</span></div>
<div class="chip-row">${moduleChips}</div>
<div class="quiz-list">${rows || '<div class="panel"><p class="subtext">这个模块下暂时没有题目。</p></div>'}</div>
<button class="primary-button mt20" data-action="quiz-start" data-od-id="start-politics-quiz">${done?'继续练习':'开始刷题'}${icon('arrow')}</button>
<p class="quiet-note">政治暂无可发布的知识点讲解，先做题，讲解之后会补上。</p></section>`;
}

/** 答题页：选择题作答判对错，材料题看采分点 */
function politicsQuestionPage() {
  const pool = quizPool();
  if (!pool.length) return emptyPage('book','这个模块还没有题目','换一个模块，或者稍后再来。','library','返回资料库','quiz-empty-return');
  if (quizCursor >= pool.length) quizCursor = pool.length - 1;
  const q = pool[quizCursor];
  const a = state.quizAnswers[q.id];
  const picked = quizPicked || (a ? a.picked : '');
  const revealed = quizRevealed || Boolean(a);
  const isChoice = q.type === 'choice';
  const correctKey = isChoice ? q.answerKey : '';
  const isRight = Boolean(a && a.correct);

  const options = isChoice ? q.options.map(o => {
    const pickedThis = picked === o.key;
    const isAnswer = o.key === correctKey;
    let tone = '';
    let mark = '';
    if (revealed) {
      if (isAnswer) { tone = ' ok'; mark = icon('circleCheck'); }
      else if (pickedThis) { tone = ' bad'; mark = icon('refresh'); }
    } else if (pickedThis) { tone = ' picked'; mark = icon('check'); }
    return `<button class="option-row${tone}" data-action="quiz-pick" data-key="${o.key}" data-od-id="option-${o.key}" ${revealed?'disabled':''}><span class="option-key">${o.key}</span><span class="option-text">${o.text}</span>${mark}</button>`;
  }).join('') : '';

  const materialBlock = !isChoice ? `<section class="detail-section" data-od-id="quiz-material"><h2>${q.material.title}</h2>${q.material.paragraphs.map(p=>`<p class="material-para">${p}</p>`).join('')}</section>` : '';

  const answerBlock = revealed ? (isChoice
    ? `<section class="detail-section quiz-explain" data-od-id="quiz-explanation"><h2>${isRight?'答对了':'正确答案是 '+correctKey}</h2><p class="subtext">${q.explanation}</p></section>`
    : `<section class="detail-section quiz-explain" data-od-id="quiz-answer-points"><h2>参考答案 · 采分点</h2><ol class="point-ol">${q.answerPoints.map(p=>`<li>${p}</li>`).join('')}</ol><p class="subtext mt12">${q.explanation}</p></section>`
  ) : '';

  const tools = isChoice
    ? (revealed
        ? `<button class="primary-button mt20" data-action="quiz-next" data-od-id="quiz-next">${quizCursor>=pool.length-1?'查看练习结果':'下一题'}${icon('arrow')}</button>`
        : `<button class="primary-button mt20" data-action="quiz-submit" data-od-id="quiz-submit" ${picked?'':'disabled'}>${picked?'提交答案':'请先选择一个选项'}${icon('arrow')}</button>`)
    : `<button class="primary-button mt20" data-action="quiz-show" data-od-id="quiz-show" ${revealed?'hidden':''}>${icon('eye')}${revealed?'':'查看参考答案'}</button><button class="primary-button mt20" data-action="quiz-next" data-od-id="quiz-next" ${revealed?'':'hidden'}>${quizCursor>=pool.length-1?'查看练习结果':'下一题'}${icon('arrow')}</button>`;

  return `<section class="page" data-od-id="politics-question"><p class="eyebrow">${q.module} / ${isChoice?'选择题':'材料题'} / 第 ${quizCursor+1} 题</p><h1 class="page-title" data-od-id="politics-question-stem">${q.stem}</h1>
${progressBar((quizCursor+1)/pool.length*100)}
${materialBlock}
${isChoice?`<div class="option-list" data-od-id="quiz-options">${options}</div>`:''}
${answerBlock}
${tools}
<button class="text-button mt20" style="width:100%" data-action="quiz-back" data-od-id="quiz-back">${icon('back')}返回题库</button></section>`;
}

/** 刷题结果页 */
function quizResultPage() {
  const done = quizDoneCount();
  const correct = quizCorrectCount();
  const total = politicsQuestions.length;
  const rate = done ? Math.round(correct/done*100) : 0;
  const weak = done - correct;
  const wrongItems = politicsQuestions.filter(q => state.quizAnswers[q.id] && !state.quizAnswers[q.id].correct);
  const weakBlock = wrongItems.length
    ? `<div class="section-head"><h2>值得再看一遍</h2><span>${wrongItems.length} 题</span></div><div class="quiz-list">${wrongItems.map(q=>`<button class="quiz-row bad" data-action="quiz-open" data-qid="${q.id}" data-od-id="result-${q.id}"><span class="knowledge-number">${icon('refresh')}</span><span class="knowledge-content"><h3>${q.stem.length>24?q.stem.slice(0,24)+'…':q.stem}</h3><p>${q.module} · ${q.type==='choice'?'选择题':'材料题'}</p></span>${icon('chevron')}</button>`).join('')}</div>`
    : `<div class="panel mt20"><h3>这一组都答对了。</h3><p class="subtext mt12">保持节奏，明天再来一组。</p></div>`;
  return `<section class="page" data-od-id="politics-quiz-result"><div class="result-hero"><div class="result-mark">${icon('check')}</div><h1 data-od-id="politics-quiz-result-title">${weak?'再练一遍，就稳了。':'这一组，拿下了。'}</h1><p class="subtext">已练习 ${done} / ${total} 题，答对 ${correct} 题。<br>${weak?`还有 ${weak} 题值得再见一面。`:'全部答对，保持你的节奏。'}</p></div><div class="result-counts" data-od-id="politics-quiz-summary"><div class="result-count"><strong>${correct}</strong><span>答对</span></div><div class="result-count"><strong>${weak}</strong><span>待巩固</span></div><div class="result-count"><strong>${rate}%</strong><span>正确率</span></div></div><button class="primary-button mt20" data-action="quiz-start" data-od-id="quiz-restart">再练一组${icon('arrow')}</button>
<button class="text-button mt20" style="width:100%" data-action="quiz-back" data-od-id="quiz-result-back">${icon('back')}返回题库</button>
${weakBlock}</section>`;
}
"""
    text = insert_before(text, '\nfunction topicPage() {', quiz_js, '插入刷题页面函数')

    # ──────────────────────────────────────────────────────────────
    # 4b) 把刷题动作接进 handleLearningAction
    # ──────────────────────────────────────────────────────────────
    quiz_actions = r"""  else if(action==='quiz') { quizModule='all'; quizCursor=0; quizPicked=''; quizRevealed=false; navigate('quiz'); }
  else if(action==='quiz-start') { quizModule='all'; quizCursor=0; quizPicked=''; quizRevealed=false; navigate('quiz-question'); }
  else if(action==='quiz-module') { quizModule=el.dataset.module||'all'; quizCursor=0; render(); main.scrollTop=0; }
  else if(action==='quiz-open') { const qid=el.dataset.qid, pool=quizPool(), k=pool.findIndex(q=>q.id===qid); quizModule='all'; const all=politicsQuestions.findIndex(q=>q.id===qid); quizCursor=all<0?0:all; quizPicked=''; quizRevealed=false; navigate('quiz-question'); }
  else if(action==='quiz-pick') { if(quizRevealed) return; quizPicked=el.dataset.key||''; render(); main.scrollTop=main.scrollTop; }
  else if(action==='quiz-submit') {
    const pool=quizPool(), q=pool[quizCursor]; if(!q || q.type!=='choice' || !quizPicked || state.quizAnswers[q.id]) return;
    state.quizAnswers[q.id]={picked:quizPicked, correct:quizPicked===q.answerKey}; quizRevealed=true; persist(); render();
  }
  else if(action==='quiz-show') { const pool=quizPool(), q=pool[quizCursor]; if(!q) return; quizRevealed=true; if(q.type==='material' && !state.quizAnswers[q.id]) { state.quizAnswers[q.id]={picked:'', correct:false}; persist(); } render(); }
  else if(action==='quiz-next') { const pool=quizPool(); if(quizCursor>=pool.length-1) { navigate('quiz-result',false); return; } quizCursor++; quizPicked=''; quizRevealed=false; render(); main.scrollTop=0; }
  else if(action==='quiz-back') navigate('quiz',false);
"""
    text = insert_before(
        text,
        "  else if(action==='topic') { subjectIndex=Number(el.dataset.subject); detailTopic=Number(el.dataset.topic); markTopicRead(subjectIndex,detailTopic); navigate('topic'); }",
        quiz_actions,
        '接线刷题动作',
    )

    # ──────────────────────────────────────────────────────────────
    # 5) knowledgePage：政治走刷题分支
    # ──────────────────────────────────────────────────────────────
    old_kp_head = "function knowledgePage() {"
    if text.count(old_kp_head) != 1:
        raise PatchError('knowledgePage 定义不唯一')
    text = apply_once(
        text,
        old_kp_head,
        "function knowledgePage() {\n"
        "  // 政治走刷题：暂无可发布的知识点讲解，题库才是它当下的形态\n"
        "  if (subjects[subjectIndex] && subjects[subjectIndex].quiz) return politicsQuizPage();",
        'knowledgePage 政治分支',
    )

    # ──────────────────────────────────────────────────────────────
    # 6) 路由表 / titles / extraPages / activeTab
    # ──────────────────────────────────────────────────────────────
    text = apply_once(
        text,
        "if(route==='topic') return tabOf(subjectIndex);",
        "if(route==='topic') return tabOf(subjectIndex);\n"
        " if(['quiz','quiz-question','quiz-result'].includes(route)) return 'library';",
        'activeTab 刷题路由',
    )
    text = apply_once(
        text,
        "const tab=activeTab(), titles={'review':'单词复习','result':'复习结果','word-detail':'单词详情','topic':'知识点讲解','goals':'学习目标','favorites':'收藏单词','plan':'学习计划'};",
        "const tab=activeTab(), titles={'review':'单词复习','result':'复习结果','word-detail':'单词详情','topic':'知识点讲解','goals':'学习目标','favorites':'收藏单词','plan':'学习计划','quiz':'政治题库','quiz-question':'答题','quiz-result':'练习结果'};",
        'titles 刷题标题',
    )
    text = apply_once(
        text,
        "const extraPages={'review':reviewPage,'word-detail':wordDetailPage,'result':resultPage,'favorites':favoritesPage,'topic':topicPage,'plan':planPage,'goals':goalsPage};",
        "const extraPages={'review':reviewPage,'word-detail':wordDetailPage,'result':resultPage,'favorites':favoritesPage,'topic':topicPage,'plan':planPage,'goals':goalsPage,'quiz':politicsQuizPage,'quiz-question':politicsQuestionPage,'quiz-result':quizResultPage};",
        'extraPages 刷题页面',
    )

    # ──────────────────────────────────────────────────────────────
    # 7) 首页「接着上次学」：政治卡片改成刷题入口
    # ──────────────────────────────────────────────────────────────
    text = apply_once(
        text,
        "<button class=\"recent-card\" data-action=\"topic\" data-subject=\"${last.subject}\" data-topic=\"${last.topic}\" data-od-id=\"recent-topic\"><span class=\"recent-formula\">${recentSubject.kind==='politics'?'政':'lim'}</span><span class=\"recent-text\"><strong>${recentSubject.topics[last.topic]}</strong><small>${recentSubject.name} · 第一章 · 上次读到知识点</small></span>",
        "<button class=\"recent-card\" data-action=\"${recentSubject.quiz?'quiz':'topic'}\" data-subject=\"${last.subject}\" data-topic=\"${last.topic}\" data-od-id=\"recent-topic\"><span class=\"recent-formula\">${recentSubject.kind==='politics'?'政':'lim'}</span><span class=\"recent-text\"><strong>${recentSubject.quiz?recentSubject.name:recentSubject.topics[last.topic]}</strong><small>${recentSubject.name} · ${recentSubject.quiz?'题库待练 · 先刷题，再回头看理论':'第一章 · 上次读到知识点'}</small></span>",
        '首页 recent-card 政治分支',
    )

    # ──────────────────────────────────────────────────────────────
    # 7b) topicFromKey：题库学科（topics 为空）也要能定位自己
    #     否则 lastTopic='politics-0' 会因 topics[0] 不存在而回退成数学
    # ──────────────────────────────────────────────────────────────
    text = apply_once(
        text,
        "function topicFromKey(key) { const [id,index]=String(key||'').split('-'), subject=subjects.findIndex(s=>s.id===id), topic=Number(index); return subject>=0 && Number.isInteger(topic) && subjects[subject].topics[topic] ? {subject,topic} : {subject:0,topic:2}; }",
        "function topicFromKey(key) { const [id,index]=String(key||'').split('-'), subject=subjects.findIndex(s=>s.id===id), topic=Number(index); if(subject<0||!Number.isInteger(topic)) return {subject:0,topic:2}; if(subjects[subject].quiz) return {subject,topic:0}; return subjects[subject].topics[topic] ? {subject,topic} : {subject:0,topic:2}; }",
        'topicFromKey 支持题库学科',
    )

    # ──────────────────────────────────────────────────────────────
    # 8) 空态文案：章节与知识点讲解 → 题目
    # ──────────────────────────────────────────────────────────────
    text = apply_once(
        text,
        "<p class=\"quiet-note\" style=\"margin-top:10px\">${s.chapter}<br>章节与知识点讲解正在整理中。</p>",
        "<p class=\"quiet-note\" style=\"margin-top:10px\">${s.chapter}<br>题库与讲解正在整理中。</p>",
        '空态文案',
    )

    # ──────────────────────────────────────────────────────────────
    # 9) 刷题样式（复用 .knowledge-row / .result-counts 的视觉语言）
    # ──────────────────────────────────────────────────────────────
    quiz_css = """
/* ── 政治刷题 ─────────────────────────────────────────── */
.quiz-list { display: flex; flex-direction: column; gap: 9px; margin-top: 12px; }
.quiz-row { width: 100%; display: flex; align-items: center; gap: 11px; text-align: left; padding: 11px 12px; min-height: 67px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface); }
.quiz-row.ok { border-color: oklch(0.86 0.06 160); background: var(--primary-soft); }
.quiz-row.bad { border-color: oklch(0.87 0.05 40); }
.quiz-row h3 { font-size: 12.5px; font-weight: 600; line-height: 1.55; margin-bottom: 4px; }
.quiz-row p { font-size: 10px; color: var(--muted); }
.quiz-row svg { width: 16px; height: 16px; color: var(--muted); flex: 0 0 auto; }
.quiz-row.ok svg { color: var(--primary); }

.chip-row { display: flex; flex-wrap: wrap; gap: 7px; margin: 4px 0 2px; }
.chip { padding: 6px 11px; border-radius: 15px; border: 1px solid var(--border); background: var(--surface); color: var(--muted); font-size: 11px; line-height: 1.45; }
.chip.active { background: var(--primary); border-color: var(--primary); color: #fff; }

.option-list { display: flex; flex-direction: column; gap: 9px; margin: 16px 0 4px; }
.option-row { width: 100%; display: flex; align-items: center; gap: 11px; text-align: left; padding: 12px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface); min-height: 52px; }
.option-row.picked { border-color: var(--primary); background: var(--primary-soft); }
.option-row.ok { border-color: oklch(0.86 0.06 160); background: var(--primary-soft); }
.option-row.bad { border-color: oklch(0.87 0.05 40); background: oklch(0.97 0.015 40); }
.option-row[disabled] { opacity: 1; }
.option-key { flex: 0 0 auto; width: 26px; height: 26px; border-radius: 9px; display: grid; place-items: center; background: var(--surface-2, #f2efe9); color: var(--muted); font-size: 12px; font-weight: 650; }
.option-row.picked .option-key, .option-row.ok .option-key { background: var(--primary); color: #fff; }
.option-row.bad .option-key { background: oklch(0.72 0.11 40); color: #fff; }
.option-text { flex: 1; min-width: 0; font-size: 12.5px; line-height: 1.6; }
.option-row svg { width: 16px; height: 16px; flex: 0 0 auto; color: var(--primary); }
.option-row.bad svg { color: oklch(0.6 0.12 40); }

.quiz-explain ol.point-ol { margin: 4px 0 0; padding-left: 19px; }
.quiz-explain ol.point-ol li { font-size: 12px; line-height: 1.9; margin-bottom: 8px; }
.material-para { font-size: 12px; line-height: 1.95; margin-bottom: 8px; }
.material-para:last-child { margin-bottom: 0; }

.primary-button[hidden] { display: none; }
"""
    text = apply_once(
        text,
        '.recent-card { display: flex;',
        quiz_css + '\n.recent-card { display: flex;',
        '插入刷题样式',
    )

    io.open(out, 'w', encoding='utf-8', newline='\n').write(text)
    print(f'✅ 补丁完成 → {out}')
    print(f'   字数 {len(text)}')
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    try:
        sys.exit(main())
    except PatchError as e:
        print(f'❌ 补丁失败：{e}', file=sys.stderr)
        sys.exit(1)
