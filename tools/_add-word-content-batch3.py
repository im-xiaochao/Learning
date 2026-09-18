"""
往 data/english/word-content.ts 里加 batch-3（考研高频词的词根 / 助记 / 例句 / 搭配）。

口径（用户 2026-09-18 确认「我按高频词再写一批」）：
  - 只写**词源有把握**的词；拿不准的词根不写，宁可少一条，也不编一个看起来合理的解释。
  - 每个词四块齐全：root / mnemonic / examples / collocations（缺一块详情页就是空态）。
  - 助记优先写**中国学生真会踩的坑**（介词搭配、不定式 vs. 动名词、形近词），
    不写「努力就能记住」这类正确的废话。

用法：python tools/_add-word-content-batch3.py
（幂等：已经收录过的词会跳过；改完记得 cd tools && npm run build:content）
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'data' / 'english' / 'word-content.ts'
WORDS = ROOT / 'pages-words' / 'words.ts'

BATCH_ID = 'batch-3'
BATCH_LABEL = '高频词第二批（阅读 / 写作高频动词与学术词）'

# word: (词根拆解, 词根说明, 助记, [(例句, 译文)], [(搭配, 释义)])
ENTRIES = {
    'abandon': (
        'a-（进入）+ bandon（支配、管辖）',
        '古法语 abandoner 意为「交到他人支配之下」，放弃就是交出控制权。',
        'abandon oneself to 是「沉溺于」，不是单纯的「放弃」。',
        [('He abandoned the plan after the first field test failed.', '第一次实地试验失败后，他放弃了那个方案。')],
        [('abandon a plan', '放弃计划'), ('abandon oneself to', '沉溺于')],
    ),
    'absorb': (
        'ab-（从、离开）+ sorb（吸）',
        'sorb 来自拉丁语 sorbere「吸吮」，absorb 即「吸进去」。',
        'be absorbed in 是「专心于」，被动形式表状态，不是「被吸收」。',
        [('Plants absorb carbon dioxide from the air.', '植物从空气中吸收二氧化碳。')],
        [('absorb nutrients', '吸收养分'), ('be absorbed in', '专心于')],
    ),
    'abstract': (
        'abs-（离开）+ tract（拉）',
        'tract 表「拉」（如 extract、attract）：从具体事物里抽离出来，即抽象。',
        'abstract 作名词是论文前的「摘要」，考研阅读里高频。',
        [('The author opens with an abstract of the whole argument.', '作者开篇给出整段论证的摘要。')],
        [('abstract concept', '抽象概念')],
    ),
    'accompany': (
        'ac-（朝向）+ company（同伴）',
        'company 本义是「一起吃面包的人」（com- 共同 + panis 面包），陪伴即成为同伴。',
        'accompany 是及物动词：accompany sb.，不加 with。',
        [('Children under twelve must be accompanied by an adult.', '十二岁以下儿童必须由成人陪同。')],
        [('be accompanied by', '由……陪同／伴随')],
    ),
    'accomplish': (
        'ac-（朝向）+ com-（完全）+ ple（填满）',
        '与 complete 同源：把事情填满做完，即完成。',
        'accomplish 接 task / goal，强调「做成了」而不是「做完了」。',
        [('They accomplished the task two days ahead of schedule.', '他们提前两天完成了任务。')],
        [('accomplish a task', '完成任务')],
    ),
    'account': (
        'ac-（朝向）+ count（计算）',
        'count 源自 computare「计算」：算出来的说明，即账户、解释。',
        'account for 既译「解释」，也译「占（比例）」，看后面接什么。',
        [('Exports account for nearly a third of the country’s income.', '出口约占该国收入的三分之一。')],
        [('account for', '解释／占比')],
    ),
    'accumulate': (
        'ac-（朝向）+ cumul（堆积）+ -ate',
        'cumulus 是拉丁语「堆积、云堆」，accumulate 即一点点堆起来。',
        'accumulate 强调「日积月累」，不用于一次性的增加。',
        [('Small errors accumulate and eventually break the system.', '小错误不断累积，最终拖垮系统。')],
        [('accumulate experience', '积累经验')],
    ),
    'accurate': (
        'ac-（朝向）+ cur（照料、用心）+ -ate',
        'cur 表「用心照料」（如 cure）：用心做到位，才准确。',
        'accurate 强调「与事实相符」，precise 强调「细致到小数点」。',
        [('The survey gives an accurate picture of local spending.', '这项调查准确反映了当地的消费情况。')],
        [('accurate data', '准确的数据')],
    ),
    'acknowledge': (
        'ac-（朝向）+ knowledge（知晓）',
        '由「使知道」发展出「承认」与「致谢」两个常用义。',
        'acknowledge 后接名词或 that 从句，不接不定式。',
        [('She acknowledged that the result was far from ideal.', '她承认结果远不理想。')],
        [('acknowledge a mistake', '承认错误')],
    ),
    'adjust': (
        'ad-（朝向）+ just（正确、合乎规范）',
        'just 本义「合乎规范」（如 justice）：朝正确方向调，即调整。',
        'adjust to 后面接的是「变化后的环境或状态」。',
        [('It took him a month to adjust to the new schedule.', '他花了一个月才适应新的作息。')],
        [('adjust to', '适应／调整到')],
    ),
    'admit': (
        'ad-（朝向）+ mit（送、放）',
        'mit / miss 表「送」（如 permit、submit）：放进去，即准许进入、承认。',
        'admit 后接 doing，不接 to do（admit making a mistake）。',
        [('He admitted making a serious error in the report.', '他承认在报告里犯了严重错误。')],
        [('admit a mistake', '承认错误')],
    ),
    'advocate': (
        'ad-（朝向）+ voc（呼喊）+ -ate',
        'voc 表「声音、呼喊」（如 vocal、vocation）：为某事发声，即提倡。',
        'advocate doing sth.；名词读 /ˈædvəkət/，动词读 /ˈædvəkeɪt/。',
        [('Many experts advocate reading widely before choosing a topic.', '许多专家主张先广泛阅读再定选题。')],
        [('advocate a policy', '提倡某项政策')],
    ),
    'allocate': (
        'al-（= ad-，朝向）+ loc（位置）+ -ate',
        'loc 表「位置」（如 local、locate）：安排到具体位置上，即分配。',
        'allocate 多用于资金、时间、资源这类正式分配。',
        [('The government allocated more funds to rural schools.', '政府向乡村学校拨了更多资金。')],
        [('allocate resources', '分配资源')],
    ),
    'ambiguous': (
        'ambi-（两边）+ ag（走、驱动）+ -ous',
        'ambi 表「两者」（如 ambition 原义「两边奔走拉票」）：两边都说得通，即含糊。',
        'ambiguous 指「意思有歧义」，vague 指「说得不清楚、不具体」。',
        [('His answer was ambiguous enough to be read two ways.', '他的回答含糊到可以有两种理解。')],
        [('ambiguous statement', '含糊的表述')],
    ),
    'anticipate': (
        'anti-（= ante-，在前）+ cip（取）+ -ate',
        'cip / cap 表「拿」（如 capture、accept）：提前拿到，即预料。',
        'anticipate 后接名词或 doing，不接不定式。',
        [('Nobody anticipated how quickly the market would change.', '没人预料到市场变化得这么快。')],
        [('anticipate a problem', '预见问题')],
    ),
    'apparent': (
        'ap-（= ad-，朝向）+ par（出现）+ -ent',
        'par 表「出现」（如 appear）：显现出来的，即明显的。',
        'apparent 常指「看起来如此」，未必就是事实，阅读里常作干扰项。',
        [('It soon became apparent that the data were incomplete.', '很快就看得出数据并不完整。')],
        [('for no apparent reason', '无明显原因')],
    ),
    'appeal': (
        'ap-（朝向）+ pel（推、驱）',
        'pel 表「推」（如 compel、repel）：把人推向自己，即吸引、呼吁。',
        'appeal to 后面既能接「人」，也能接「理性 / 情感」。',
        [('The campaign appeals to younger readers.', '这个活动对年轻读者有吸引力。')],
        [('appeal to', '吸引／呼吁')],
    ),
    'appreciate': (
        'ap-（朝向）+ preci（价值）+ -ate',
        'preci 表「价格、价值」（如 price、precious）：看出价值，即欣赏、感激。',
        'I would appreciate it if… 后面用过去式表委婉，不是时态错误。',
        [('I would appreciate it if you could reply by Friday.', '如能在周五前回复，我将不胜感激。')],
        [('appreciate your help', '感谢你的帮助')],
    ),
    'approve': (
        'ap-（朝向）+ prove（检验、证明）',
        'prove 本义「检验」：检验通过即批准。',
        'approve of 是「赞成（人或做法）」，approve sth. 是「批准（方案）」。',
        [('The committee approved the budget without debate.', '委员会未经辩论就批准了预算。')],
        [('approve a proposal', '批准提案')],
    ),
    'assign': (
        'as-（= ad-，朝向）+ sign（标记）',
        'sign 表「记号」（如 signal、design）：打上记号指定给某人，即分配、布置。',
        'assign sb. sth. / assign sth. to sb.，两个语序都对。',
        [('Each student was assigned a short passage to summarise.', '每个学生都分到一小段文章来做摘要。')],
        [('assign a task', '布置任务')],
    ),
    'assist': (
        'as-（朝向）+ sist（站立）',
        'sist 表「站」（如 persist、resist）：站到旁边帮忙，即协助。',
        'assist 比 help 正式，常见 assist sb. with sth.。',
        [('A teaching assistant assists students with their projects.', '助教协助学生完成项目。')],
        [('assist with', '协助（某事）')],
    ),
    'assure': (
        'as-（朝向）+ sure（确定）',
        '使某人确定下来，即向……保证。',
        'assure sb. that…（向人保证）；ensure 是「确保某事发生」，别混。',
        [('He assured us that the data had been checked twice.', '他向我们保证数据已核对过两遍。')],
        [('assure sb. that', '向某人保证')],
    ),
    'attain': (
        'at-（= ad-，朝向）+ tain（触到、握住）',
        'tain 表「触碰、拿住」（如 obtain、maintain）：触到目标，即达到。',
        'attain 比 reach 正式，宾语多是目标、水平、分数。',
        [('Few students attain a high score without daily practice.', '不每天练习，很少有学生能拿到高分。')],
        [('attain a goal', '达到目标')],
    ),
    'attribute': (
        'at-（朝向）+ tribute（给予、分配）',
        'tribute 表「给予」（如 contribute、distribute）：把某物归给……',
        'attribute A to B = 把 A 归因于 B，写作里很好用。',
        [('She attributes her progress to a strict study schedule.', '她把自己的进步归因于严格的学习计划。')],
        [('attribute A to B', '把 A 归因于 B')],
    ),
    'capacity': (
        'cap（拿、容纳）+ -acity',
        'cap 表「拿、装」（如 capable、capture）：能装多少，即容量、能力。',
        'the capacity to do sth. 指「做某事的能力」，不接 of doing。',
        [('The hall has a seating capacity of eight hundred.', '这个礼堂可容纳八百个座位。')],
        [('the capacity to', '……的能力')],
    ),
    'category': (
        'cata-（向下）+ agora（公开讲说）',
        '源自希腊语 kategoria「在集会上公开陈述」，后引申为「把事物归入某一类」。',
        'fall into a category 是阅读里常见的分类表达。',
        [('These problems fall into three broad categories.', '这些问题可以归入三大类。')],
        [('fall into a category', '属于某一类')],
    ),
    'cite': (
        'cit（召唤、唤起）',
        'cit 表「召唤」（如 excite、incite）：把别人的话召来作证，即引用。',
        'cite 强调「举出出处」，quote 强调「照抄原话」。',
        [('The author cites two field studies to support her claim.', '作者引用两项实地研究来支持她的观点。')],
        [('cite an example', '举例引证')],
    ),
    'coherent': (
        'co-（共同）+ her（粘住）+ -ent',
        'her / hes 表「粘住」（如 adhere、hesitate）：粘在一起的，即连贯的。',
        'coherent 常修饰 argument、essay、explanation。',
        [('Her essay is coherent even when the argument is complex.', '即便论证复杂，她的文章依然连贯。')],
        [('coherent argument', '连贯的论证')],
    ),
    'coincide': (
        'co-（共同）+ in-（进入）+ cid（落下）',
        'cid / cas 表「落下」（如 accident、decide）：一起落下，即重合、同时发生。',
        'coincide with 后接时间点或另一事件。',
        [('The conference coincides with the start of the new term.', '会议正好和开学撞在一起。')],
        [('coincide with', '与……同时发生／一致')],
    ),
    'commence': (
        'com-（加强）+ initiare（开始）',
        '与 initiate 同源，是 begin 的正式说法。',
        'commence 多用于会议、工程、学期等正式场合。',
        [('Construction will commence early next month.', '工程将于下月初开工。')],
        [('commence with', '以……开始')],
    ),
    'commit': (
        'com-（加强）+ mit（送）',
        '把事情送出去、交出去，于是有了「承诺」与「犯（错、罪）」两义。',
        'commit oneself to（致力于／承诺）；commit a crime（犯罪）。',
        [('She committed herself to finishing the thesis this year.', '她下定决心今年完成论文。')],
        [('commit oneself to', '致力于／承诺')],
    ),
    'compensate': (
        'com-（加强）+ pens（称量、偿付）+ -ate',
        'pens 表「称重」（如 expensive、pension）：称着补齐差额，即补偿。',
        'compensate for 后面接的是「被弥补的损失」。',
        [('Nothing can fully compensate for the lost time.', '没有什么能完全弥补失去的时间。')],
        [('compensate for', '弥补')],
    ),
    'compile': (
        'com-（共同）+ pil（堆积）',
        '把材料堆到一起，即汇编、编纂。',
        'compile 的宾语多是 list、report、dictionary 这类集合物。',
        [('She compiled a list of every source she used.', '她把用过的所有资料编成了一份清单。')],
        [('compile a list', '汇编清单')],
    ),
    'complicate': (
        'com-（共同）+ plic（折叠）+ -ate',
        'plic 表「折」（如 apply、imply）：折在一起理不清，即复杂化。',
        'complicate matters / things 是固定说法，不加冠词以外的修饰。',
        [('Adding one more variable complicates the whole model.', '再多一个变量就会让整个模型变复杂。')],
        [('complicate matters', '使事情复杂化')],
    ),
    'comprise': (
        'com-（加强）+ pris（抓住）',
        'pris / prehend 表「抓」（如 prison、comprehend）：整体把部分抓进去，即包含。',
        'be comprised of 已经是被动，后面不再加 by。',
        [('The book comprises twelve chapters and two appendices.', '这本书由十二章和两个附录组成。')],
        [('be comprised of', '由……组成')],
    ),
    'concede': (
        'con-（加强）+ ced（走、让步）',
        'ced / cess 表「走」（如 proceed、access）：让开一步，即承认、让步。',
        'concede that… 常用于「勉强承认对方有道理」。',
        [('He conceded that the method had clear limits.', '他承认这种方法有明显局限。')],
        [('concede defeat', '认输')],
    ),
    'concentrate': (
        'con-（共同）+ centr（中心）+ -ate',
        'centr 表「中心」（如 central）：聚到一个点上，即集中。',
        'concentrate on 后接名词或 doing。',
        [('It is hard to concentrate when your phone keeps buzzing.', '手机一直震动时很难集中注意力。')],
        [('concentrate on', '专注于')],
    ),
    'conduct': (
        'con-（加强）+ duct（引导）',
        'duct 表「引导」（如 educate、produce）：引导事情进行，即实施；也指行为举止。',
        'conduct a study / survey；conduct oneself（举止）是阅读常见两义。',
        [('They conducted a survey across twenty schools.', '他们在二十所学校做了一项调查。')],
        [('conduct a survey', '开展调查')],
    ),
    'confer': (
        'con-（共同）+ fer（带来）',
        'fer 表「携带」（如 refer、transfer）：把意见带到一起，即商议；也指授予。',
        'confer with sb.（商议）；confer sth. on sb.（授予）。',
        [('The degree was conferred on her last June.', '去年六月她被授予该学位。')],
        [('confer with sb.', '与某人商议')],
    ),
    'confirm': (
        'con-（加强）+ firm（坚固）',
        'firm 表「结实、确定」（如 firm、affirm）：使确定下来，即确认。',
        'confirm 后接名词或 that 从句，不接 to do。',
        [('Please confirm your reservation by email.', '请用邮件确认你的预约。')],
        [('confirm a booking', '确认预订')],
    ),
    'conflict': (
        'con-（共同）+ flict（打击）',
        'flict 表「打」（如 inflict）：打在一处，即冲突。',
        'conflict with（与……冲突）；名词 conflict 读 /ˈkɒnflɪkt/。',
        [('Her findings conflict with the earlier report.', '她的发现与早前的报告相冲突。')],
        [('conflict with', '与……冲突')],
    ),
    'conform': (
        'con-（共同）+ form（形状）',
        '做成同样的形状，即符合、遵守。',
        'conform to 后面接规则、标准、期望。',
        [('All entries must conform to the stated rules.', '所有参赛作品都必须符合公布的规则。')],
        [('conform to', '符合／遵守')],
    ),
    'consent': (
        'con-（共同）+ sent（感觉）',
        'sent 表「感觉」（如 sense、sentiment）：感觉一致，即同意。',
        'consent to 后接名词或 doing：consent to taking part。',
        [('He gave his consent without reading the details.', '他没看细节就同意了。')],
        [('give consent', '表示同意')],
    ),
    'consist': (
        'con-（共同）+ sist（站立）',
        '站在一起构成整体，即由……组成。',
        'consist of 只有主动形式，没有进行时，也没有被动。',
        [('The exam consists of three sections.', '考试由三部分组成。')],
        [('consist of', '由……组成')],
    ),
    'constant': (
        'con-（加强）+ st（站立）+ -ant',
        '一直站在那里不动，即持续的、恒定的。',
        'constant 修饰「反复出现、不间断」的事物，如 pressure、change。',
        [('Constant revision matters more than one long session.', '持续复习比一次长时间学习更重要。')],
        [('constant pressure', '持续的压力')],
    ),
    'constitute': (
        'con-（共同）+ stit（设立、放置）',
        'stit 表「设立」（如 institution、substitute）：设立起来，即构成、成立。',
        'constitute 不用于进行时，也不用被动。',
        [('Women constitute half of the teaching staff.', '女性占教师人数的一半。')],
        [('constitute a threat', '构成威胁')],
    ),
    'constrain': (
        'con-（加强）+ strain（拉紧）',
        '拉紧使其受限，即限制、约束。',
        'be constrained by 后面接「限制来自哪里」。',
        [('A tight budget constrained their choice of method.', '预算紧张限制了他们对方法的选择。')],
        [('be constrained by', '受……限制')],
    ),
    'consume': (
        'con-（完全）+ sum（拿、取）',
        'sum 表「拿走」（如 assume、resume）：彻底拿走，即消耗。',
        'consume 的宾语是能源、时间、食物，不用于「消费商品」以外的抽象花钱。',
        [('The printer consumes far more paper than we expected.', '这台打印机耗纸远超预期。')],
        [('consume energy', '消耗能源')],
    ),
    'contain': (
        'con-（共同）+ tain（握持）',
        'tain 表「拿住」（如 maintain、obtain）：装在里面，即包含、控制。',
        'contain 强调「整体里有」，include 强调「举出其中一部分」。',
        [('The chapter contains all the formulas you need.', '这一章包含你需要的所有公式。')],
        [('contain information', '包含信息')],
    ),
    'contradict': (
        'contra-（相反）+ dict（说）',
        'dict 表「说」（如 predict、dictate）：说相反的话，即反驳、与……矛盾。',
        'contradict oneself 是「自相矛盾」，写作扣分点。',
        [('The new evidence contradicts the earlier conclusion.', '新证据与此前的结论相矛盾。')],
        [('contradict oneself', '自相矛盾')],
    ),
    'convert': (
        'con-（加强）+ vert（转）',
        'vert / vers 表「转」（如 reverse、diverse）：转变。',
        'convert A into B；名词 conversion 同理接 into。',
        [('The plant converts sunlight into electric power.', '这家工厂把阳光转化为电力。')],
        [('convert A into B', '把 A 转化为 B')],
    ),
    'convince': (
        'con-（加强）+ vinc（征服）',
        'vinc 表「战胜」（如 victory、convict）：用道理征服对方，即说服。',
        'convince sb. of sth. / convince sb. that…，宾语必须是「人」。',
        [('He convinced me that the plan was worth trying.', '他说服我相信这个计划值得一试。')],
        [('convince sb. of', '使某人相信')],
    ),
    'cooperate': (
        'co-（共同）+ oper（工作）+ -ate',
        'oper 表「工作」（如 operate、operation）：一起工作，即合作。',
        'cooperate with sb. on sth.，两个介词都别漏。',
        [('The two teams cooperated on the field experiment.', '两个团队合作完成了实地实验。')],
        [('cooperate with', '与……合作')],
    ),
    'correspond': (
        'cor-（共同）+ respond（回应）',
        '互相回应，于是有了「相符合」与「通信」两义。',
        'correspond to（对应于）；correspond with sb.（与某人通信）。',
        [('The figures do not correspond to the ones in the table.', '这些数字与表里的对不上。')],
        [('correspond to', '对应于')],
    ),
    'deduce': (
        'de-（向下、从）+ duc（引导）',
        'duc 表「引导」（如 conduct、educate）：从已知引导出来，即推断。',
        'deduce A from B；阅读里常与 infer 互换。',
        [('From the data we can deduce how the system behaves.', '从这些数据我们能推断系统的行为方式。')],
        [('deduce from', '从……推断')],
    ),
    'define': (
        'de-（彻底）+ fin（边界）',
        'fin 表「界限」（如 final、confine）：划清边界，即下定义。',
        'define A as B 是写作里下定义的标准句式。',
        [('The report defines success as steady progress, not speed.', '报告把成功定义为稳步前进，而不是速度。')],
        [('define A as B', '把 A 定义为 B')],
    ),
    'deliberate': (
        'de-（加强）+ libr（天平）',
        'libra 是拉丁语「天平」，deliberate 本义「放到天平上反复称量」，引申为深思熟虑。',
        '形容词读 /dɪˈlɪbərət/，动词读 /dɪˈlɪbəreɪt/，重音不同。',
        [('The change was deliberate, not an accident.', '这个改动是刻意为之，不是意外。')],
        [('a deliberate choice', '深思熟虑的选择')],
    ),
    'denote': (
        'de-（向下）+ not（标记）',
        'not 表「记号」（如 note、notice）：用记号指出，即表示。',
        'denote 多用于图表、符号「代表什么」。',
        [('In this chart, red denotes a failed test.', '在这张图里，红色表示测试未通过。')],
        [('denote a change', '表示变化')],
    ),
    'depend': (
        'de-（向下）+ pend（悬挂）',
        'pend 表「挂」（如 suspend、pending）：挂在……下面，即依靠、取决于。',
        'depend on 是状态动词，一般不用于进行时。',
        [('Whether we go tomorrow depends on the weather.', '明天去不去取决于天气。')],
        [('depend on', '取决于／依赖')],
    ),
    'deserve': (
        'de-（加强）+ serv（服务、保持）',
        'serv 表「服务」（如 serve、preserve）：因付出而配得上，即值得。',
        'deserve 后接名词或 to do；「值得被……」要说 deserve to be done。',
        [('Her careful work deserves a second look.', '她细致的工作值得再看一遍。')],
        [('deserve attention', '值得关注')],
    ),
    'detect': (
        'de-（去掉）+ tect（遮盖）',
        'tect 表「盖」（如 protect、detective）：揭开盖子，即察觉、探测。',
        'detect 强调「发现了隐藏的东西」，notice 只是「注意到」。',
        [('The sensor detects even tiny changes in temperature.', '这个传感器连微小的温度变化都能测到。')],
        [('detect a change', '察觉变化')],
    ),
    'diminish': (
        'de-（向下）+ min（小）+ -ish',
        'min 表「小」（如 minor、minus）：一点点变小，即减少、削弱。',
        'diminish 强调「价值或影响被削弱」，不只是数量变少。',
        [('Nothing diminishes the value of daily review.', '没有什么能削弱每天复习的价值。')],
        [('diminish the impact', '削弱影响')],
    ),
    'distinguish': (
        'dis-（分开）+ stingu（刺、分开）',
        '把事物刺着分开来，即区分、辨别。',
        'distinguish A from B 与 distinguish between A and B 都对。',
        [('Learners must distinguish fact from opinion.', '学习者必须区分事实与观点。')],
        [('distinguish between', '区分')],
    ),
    'distribute': (
        'dis-（分开）+ tribute（给予）',
        'tribute 表「分配」（如 attribute、contribute）：分着给出去，即分发。',
        'distribute sth. among / to sb.，不接 for。',
        [('Volunteers distributed the textbooks before class.', '志愿者在课前分发了教材。')],
        [('distribute resources', '分配资源')],
    ),
    'diverse': (
        'di-（= dis-，分开）+ vers（转）',
        'vers / vert 表「转」（如 convert、reverse）：转向不同方向，即多样的。',
        'diverse 强调「彼此不同」，various 强调「种类繁多」。',
        [('The class is diverse in both age and background.', '这个班在年龄和背景上都很不一样。')],
        [('diverse backgrounds', '多样的背景')],
    ),
    'eliminate': (
        'e-（= ex-，出去）+ limin（门槛）',
        'limin 表「门槛」（如 preliminary）：赶出门槛之外，即排除、消除。',
        'eliminate 强调「彻底去掉」，remove 只是「拿走」。',
        [('One revision round eliminated most of the typos.', '一轮修订消除了大部分笔误。')],
        [('eliminate errors', '消除错误')],
    ),
    'elaborate': (
        'e-（= ex-，出来）+ labor（劳作）+ -ate',
        '花了力气做出来的，即精心制作的；引申为「详细说明」。',
        'elaborate on sth. 是「就某事展开说明」，on 不能省。',
        [('Could you elaborate on the second point?', '能否详细说明一下第二点？')],
        [('elaborate on', '详述')],
    ),
    'equivalent': (
        'equi-（相等）+ val（价值）+ -ent',
        'val 表「价值、力量」（如 value、valid）：价值相等，即等同的。',
        'be equivalent to 后接名词或 doing，to 是介词。',
        [('One credit here is equivalent to two hours of lab work.', '这里一个学分相当于两小时实验。')],
        [('equivalent to', '相当于')],
    ),
}

# ── 写入 ────────────────────────────────────────────────────────────
src = CONTENT.read_text(encoding='utf-8')
words_src = WORDS.read_text(encoding='utf-8')

vocab = set(re.findall(r'\{"id":"word-[^"]*","word":"([^"]+)"', words_src))
existing = re.findall(r'^  ([a-z]+): \{$', src, re.M)
existing_set = set(existing)

todo = [w for w in sorted(ENTRIES) if w not in existing_set]
skipped = [w for w in sorted(ENTRIES) if w in existing_set]
not_in_vocab = [w for w in todo if w not in vocab]

if not_in_vocab:
    sys.exit(f'❌ 这些词不在词库里，写了构建会报错：{not_in_vocab}')
if not todo:
    print('全部已收录，无需改动')
    raise SystemExit(0)


def esc(s: str) -> str:
    return s.replace('\\', '\\\\').replace('"', '\\"')


def render(word: str) -> str:
    root, note, mnemonic, examples, collocations = ENTRIES[word]
    out = [f'  {word}: {{']
    out.append(f'    root: {{ display: "{esc(root)}", explanation: "{esc(note)}" }},')
    out.append(f'    mnemonic: "{esc(mnemonic)}",')
    out.append('    examples: [')
    for en, zh in examples:
        out.append(f'      {{ sentence: "{esc(en)}", translationZh: "{esc(zh)}" }},')
    out.append('    ],')
    out.append('    collocations: [')
    for phrase, meaning in collocations:
        out.append(f'      {{ phrase: "{esc(phrase)}", meaningZh: "{esc(meaning)}" }},')
    out.append('    ],')
    out.append('  },')
    return '\n'.join(out) + '\n'


# 已有条目的位置（按 key 排序后逐个找「第一个字母序更大的键」插到它前面）
positions = [(m.group(1), m.start()) for m in re.finditer(r'^  ([a-z]+): \{$', src, re.M)]
tail = src.rindex('\n}\n') + 1  # WORD_CONTENT 的收尾大括号
inserts = []
for word in todo:
    pos = next((start for key, start in positions if key > word), tail)
    inserts.append((pos, render(word)))

# 从后往前插，前面的偏移量才不会失效
for pos, text in sorted(inserts, key=lambda x: -x[0]):
    src = src[:pos] + text + src[pos:]

# BATCHES 里登记这一批
anchor = "'structure', 'sufficient', 'suggest', 'theory', 'transform'\n    ],\n  },\n]"
if src.count(anchor) != 1:
    sys.exit(f'❌ BATCHES 锚点命中 {src.count(anchor)} 次，不敢乱插')
lines = ', '.join(f"'{w}'" for w in todo)
# 每行 6 个，和现有批次的排版一致
rows = [', '.join(f"'{w}'" for w in todo[i:i + 6]) for i in range(0, len(todo), 6)]
body = '\n'.join(f'    {r},' for r in rows)
new_batch = (
    "'structure', 'sufficient', 'suggest', 'theory', 'transform'\n    ],\n  },\n"
    "  {\n"
    f"    id: '{BATCH_ID}',\n"
    f"    label: '{BATCH_LABEL}',\n"
    "    words: [\n"
    f"{body}\n"
    "    ],\n"
    "  },\n]"
)
src = src.replace(anchor, new_batch)

CONTENT.write_text(src, encoding='utf-8')
print(f'✅ 新增 {len(todo)} 条 → {CONTENT.name}')
if skipped:
    print(f'   跳过（已收录）：{skipped}')
print(f'   累计应收录 {len(existing) + len(todo)} 条')
print('下一步：cd tools && npm run build:content && npm run validate:content')
