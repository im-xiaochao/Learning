/**
 * 单词深度内容（**人工撰写，不是生成物**）。
 *
 * 为什么单独放一个文件：`words.ts` 是自动生成的纯词表（word / ipa / pos / meaning），
 * 没有例句、词根、助记和搭配。这四类内容需要逐条撰写，因此按**小写词形**单独索引，
 * 由 `tools/build-content.ts` 在构建时并入词库。
 *
 * 约定：
 *   - 键必须是小写词形，且必须能在 words.ts 里找到；找不到构建会直接报错（不静默忽略）。
 *   - 四个字段（examples / root / mnemonic / collocations）都要写全，
 *     缺一项在详情页就是空态（已有自检脚本会断言）。
 *   - 每次扩充一批，把词清单登记到 `BATCHES`，构建和校验都会打印覆盖率。
 *
 * 本文件由恢复脚本从构建产物重建，字段与原文一一对应。
 */

export interface WordExample {
  sentence: string
  translationZh: string
}

export interface WordRoot {
  display: string
  explanation: string
}

export interface WordCollocation {
  phrase: string
  meaningZh: string
}

export interface WordContent {
  root?: WordRoot
  mnemonic?: string
  examples: WordExample[]
  collocations: WordCollocation[]
}

/** 已完成的批次。构建与校验会读取它打印覆盖率。 */
export const BATCHES: { id: string; label: string; words: string[] }[] = [
  {
    id: 'batch-1',
    label: '设计稿原型 18 词（transcribed from 设计稿）',
    words: [
    'persist', 'acquire', 'crucial', 'derive', 'evaluate', 'facilitate',
    'imply', 'maintain', 'perceive', 'relevant', 'retain', 'substantial',
    'demonstrate', 'emerge', 'contribute', 'assess', 'consistent', 'approach'
    ],
  },
  {
    id: 'batch-2',
    label: '高频核心词（阅读/写作最常遇到）',
    words: [
    'achieve', 'adapt', 'adopt', 'advantage', 'analysis', 'apply',
    'appropriate', 'argue', 'assume', 'attempt', 'attitude', 'available',
    'aware', 'behavior', 'benefit', 'challenge', 'claim', 'compare',
    'concept', 'conclude', 'consequence', 'consider', 'decline', 'decrease',
    'determine', 'effective', 'efficient', 'emphasize', 'enhance', 'essential',
    'establish', 'evidence', 'examine', 'factor', 'function', 'identify',
    'impact', 'important', 'improve', 'increase', 'indicate', 'influence',
    'method', 'necessary', 'observe', 'obtain', 'opportunity', 'potential',
    'predict', 'prevent', 'principle', 'process', 'promote', 'protect',
    'provide', 'pursue', 'recognize', 'reduce', 'reflect', 'reject',
    'release', 'replace', 'represent', 'require', 'research', 'respond',
    'reveal', 'significant', 'similar', 'specific', 'stable', 'strategy',
    'structure', 'sufficient', 'suggest', 'theory', 'transform'
    ],
  },
  {
    id: 'batch-3',
    label: '高频词第二批（阅读 / 写作高频动词与学术词）',
    words: [
    'abandon', 'absorb', 'abstract', 'accompany', 'accomplish', 'account',
    'accumulate', 'accurate', 'acknowledge', 'adjust', 'admit', 'advocate',
    'allocate', 'ambiguous', 'anticipate', 'apparent', 'appeal', 'appreciate',
    'approve', 'assign', 'assist', 'assure', 'attain', 'attribute',
    'capacity', 'category', 'cite', 'coherent', 'coincide', 'commence',
    'commit', 'compensate', 'compile', 'complicate', 'comprise', 'concede',
    'concentrate', 'conduct', 'confer', 'confirm', 'conflict', 'conform',
    'consent', 'consist', 'constant', 'constitute', 'constrain', 'consume',
    'contain', 'contradict', 'convert', 'convince', 'cooperate', 'correspond',
    'deduce', 'define', 'deliberate', 'denote', 'depend', 'deserve',
    'detect', 'diminish', 'distinguish', 'distribute', 'diverse', 'elaborate',
    'eliminate', 'equivalent',
    ],
  },  {
    id: 'batch-4',
    label: '高频词第三批（动词与学术常用词）',
    words: [
    'enforce', 'engage', 'ensure', 'estimate', 'evolve', 'exaggerate',
    'exceed', 'exclude', 'exert', 'exhibit', 'expand', 'expend',
    'explicit', 'explore', 'expose', 'extend', 'extract', 'fluctuate',
    'formulate', 'fulfill', 'fundamental', 'generate', 'gradual', 'hypothesis',
    'ignore', 'illustrate', 'imitate', 'immense', 'implement', 'impose',
    'impress', 'incentive', 'incline', 'incorporate', 'induce', 'inevitable',
    'infer', 'inherit', 'initiate', 'install', 'institute', 'insulate',
    'integrate', 'intense', 'interpret', 'intervene', 'isolate', 'justify',
    'manipulate', 'motivate', 'negotiate', 'occupy', 'occur', 'oppose',
    'participate', 'persuade', 'precede', 'precise', 'prefer', 'prejudice',
    'premise', 'prevail', 'proceed', 'prohibit', 'provoke', 'qualify',
    'reinforce', 'sustain', 'tolerate',
    ],
  },
]

export const WORD_CONTENT: Record<string, WordContent> = {
  accurate: {
    root: { display: "ac-（朝向）+ cur（照料、用心）+ -ate", explanation: "cur 表「用心照料」（如 cure）：用心做到位，才准确。" },
    mnemonic: "accurate 强调「与事实相符」，precise 强调「细致到小数点」。",
    examples: [
      { sentence: "The survey gives an accurate picture of local spending.", translationZh: "这项调查准确反映了当地的消费情况。" },
    ],
    collocations: [
      { phrase: "accurate data", meaningZh: "准确的数据" },
    ],
  },
  accumulate: {
    root: { display: "ac-（朝向）+ cumul（堆积）+ -ate", explanation: "cumulus 是拉丁语「堆积、云堆」，accumulate 即一点点堆起来。" },
    mnemonic: "accumulate 强调「日积月累」，不用于一次性的增加。",
    examples: [
      { sentence: "Small errors accumulate and eventually break the system.", translationZh: "小错误不断累积，最终拖垮系统。" },
    ],
    collocations: [
      { phrase: "accumulate experience", meaningZh: "积累经验" },
    ],
  },
  account: {
    root: { display: "ac-（朝向）+ count（计算）", explanation: "count 源自 computare「计算」：算出来的说明，即账户、解释。" },
    mnemonic: "account for 既译「解释」，也译「占（比例）」，看后面接什么。",
    examples: [
      { sentence: "Exports account for nearly a third of the country’s income.", translationZh: "出口约占该国收入的三分之一。" },
    ],
    collocations: [
      { phrase: "account for", meaningZh: "解释／占比" },
    ],
  },
  accomplish: {
    root: { display: "ac-（朝向）+ com-（完全）+ ple（填满）", explanation: "与 complete 同源：把事情填满做完，即完成。" },
    mnemonic: "accomplish 接 task / goal，强调「做成了」而不是「做完了」。",
    examples: [
      { sentence: "They accomplished the task two days ahead of schedule.", translationZh: "他们提前两天完成了任务。" },
    ],
    collocations: [
      { phrase: "accomplish a task", meaningZh: "完成任务" },
    ],
  },
  accompany: {
    root: { display: "ac-（朝向）+ company（同伴）", explanation: "company 本义是「一起吃面包的人」（com- 共同 + panis 面包），陪伴即成为同伴。" },
    mnemonic: "accompany 是及物动词：accompany sb.，不加 with。",
    examples: [
      { sentence: "Children under twelve must be accompanied by an adult.", translationZh: "十二岁以下儿童必须由成人陪同。" },
    ],
    collocations: [
      { phrase: "be accompanied by", meaningZh: "由……陪同／伴随" },
    ],
  },
  abstract: {
    root: { display: "abs-（离开）+ tract（拉）", explanation: "tract 表「拉」（如 extract、attract）：从具体事物里抽离出来，即抽象。" },
    mnemonic: "abstract 作名词是论文前的「摘要」，考研阅读里高频。",
    examples: [
      { sentence: "The author opens with an abstract of the whole argument.", translationZh: "作者开篇给出整段论证的摘要。" },
    ],
    collocations: [
      { phrase: "abstract concept", meaningZh: "抽象概念" },
    ],
  },
  absorb: {
    root: { display: "ab-（从、离开）+ sorb（吸）", explanation: "sorb 来自拉丁语 sorbere「吸吮」，absorb 即「吸进去」。" },
    mnemonic: "be absorbed in 是「专心于」，被动形式表状态，不是「被吸收」。",
    examples: [
      { sentence: "Plants absorb carbon dioxide from the air.", translationZh: "植物从空气中吸收二氧化碳。" },
    ],
    collocations: [
      { phrase: "absorb nutrients", meaningZh: "吸收养分" },
      { phrase: "be absorbed in", meaningZh: "专心于" },
    ],
  },
  abandon: {
    root: { display: "a-（进入）+ bandon（支配、管辖）", explanation: "古法语 abandoner 意为「交到他人支配之下」，放弃就是交出控制权。" },
    mnemonic: "abandon oneself to 是「沉溺于」，不是单纯的「放弃」。",
    examples: [
      { sentence: "He abandoned the plan after the first field test failed.", translationZh: "第一次实地试验失败后，他放弃了那个方案。" },
    ],
    collocations: [
      { phrase: "abandon a plan", meaningZh: "放弃计划" },
      { phrase: "abandon oneself to", meaningZh: "沉溺于" },
    ],
  },
  achieve: {
    root: { display: "a-（朝向）+ chief（头、终点）", explanation: "chief 是「头、首要」，achieve 本义「到达顶点」，引申为达成。" },
    mnemonic: "achieve 接目标（goal）、结果（result），不接「过程」。",
    examples: [
      { sentence: "She achieved her goal through years of steady effort.", translationZh: "她通过多年稳定的努力达成了目标。" },
    ],
    collocations: [
      { phrase: "achieve a goal", meaningZh: "达成目标" },
    ],
  },
  acknowledge: {
    root: { display: "ac-（朝向）+ knowledge（知晓）", explanation: "由「使知道」发展出「承认」与「致谢」两个常用义。" },
    mnemonic: "acknowledge 后接名词或 that 从句，不接不定式。",
    examples: [
      { sentence: "She acknowledged that the result was far from ideal.", translationZh: "她承认结果远不理想。" },
    ],
    collocations: [
      { phrase: "acknowledge a mistake", meaningZh: "承认错误" },
    ],
  },
  acquire: {
    root: { display: "ac-（趋向）+ quir（寻求）", explanation: "与 require、inquire 中表示「寻求」的词根相关。" },
    mnemonic: "主动去寻找，才会真正获得。把 acquire 与「逐步习得」一起记。",
    examples: [
      { sentence: "We acquire new skills through practice.", translationZh: "我们通过练习掌握新的技能。" },
    ],
    collocations: [
      { phrase: "acquire knowledge", meaningZh: "获取知识" },
    ],
  },
  adapt: {
    root: { display: "ad-（朝向）+ apt（适合）", explanation: "apt 表「适合」（如 aptitude）：使朝向适合，即适应、改编。" },
    mnemonic: "adapt to（适应环境）/ adapt sth. for（为……改编）。",
    examples: [
      { sentence: "Children adapt to new environments more quickly than adults.", translationZh: "孩子比成年人更快适应新环境。" },
    ],
    collocations: [
      { phrase: "adapt to", meaningZh: "适应" },
    ],
  },
  admit: {
    root: { display: "ad-（朝向）+ mit（送、放）", explanation: "mit / miss 表「送」（如 permit、submit）：放进去，即准许进入、承认。" },
    mnemonic: "admit 后接 doing，不接 to do（admit making a mistake）。",
    examples: [
      { sentence: "He admitted making a serious error in the report.", translationZh: "他承认在报告里犯了严重错误。" },
    ],
    collocations: [
      { phrase: "admit a mistake", meaningZh: "承认错误" },
    ],
  },
  adjust: {
    root: { display: "ad-（朝向）+ just（正确、合乎规范）", explanation: "just 本义「合乎规范」（如 justice）：朝正确方向调，即调整。" },
    mnemonic: "adjust to 后面接的是「变化后的环境或状态」。",
    examples: [
      { sentence: "It took him a month to adjust to the new schedule.", translationZh: "他花了一个月才适应新的作息。" },
    ],
    collocations: [
      { phrase: "adjust to", meaningZh: "适应／调整到" },
    ],
  },
  adopt: {
    root: { display: "ad-（朝向）+ opt（选择）", explanation: "opt 表「选择」（如 option、opt）：主动挑过来用，即采纳。" },
    mnemonic: "adopt（采纳/收养）vs adapt（适应/改编）——差一个字母，别写混。",
    examples: [
      { sentence: "Many schools have adopted a new teaching method.", translationZh: "许多学校采用了新的教学方法。" },
    ],
    collocations: [
      { phrase: "adopt an approach", meaningZh: "采用某种方法" },
    ],
  },
  advantage: {
    root: { display: "advant（在前）+ -age（名词后缀）", explanation: "源自 avant（在前），advantage 即「处于前面的位置」。" },
    mnemonic: "take advantage of 是「利用」，但也可指「占便宜」——看语境。",
    examples: [
      { sentence: "One advantage of online courses is that you can study at your own pace.", translationZh: "在线课程的一个优势是你可以按自己的节奏学习。" },
    ],
    collocations: [
      { phrase: "take advantage of", meaningZh: "利用" },
    ],
  },
  ambiguous: {
    root: { display: "ambi-（两边）+ ag（走、驱动）+ -ous", explanation: "ambi 表「两者」（如 ambition 原义「两边奔走拉票」）：两边都说得通，即含糊。" },
    mnemonic: "ambiguous 指「意思有歧义」，vague 指「说得不清楚、不具体」。",
    examples: [
      { sentence: "His answer was ambiguous enough to be read two ways.", translationZh: "他的回答含糊到可以有两种理解。" },
    ],
    collocations: [
      { phrase: "ambiguous statement", meaningZh: "含糊的表述" },
    ],
  },
  allocate: {
    root: { display: "al-（= ad-，朝向）+ loc（位置）+ -ate", explanation: "loc 表「位置」（如 local、locate）：安排到具体位置上，即分配。" },
    mnemonic: "allocate 多用于资金、时间、资源这类正式分配。",
    examples: [
      { sentence: "The government allocated more funds to rural schools.", translationZh: "政府向乡村学校拨了更多资金。" },
    ],
    collocations: [
      { phrase: "allocate resources", meaningZh: "分配资源" },
    ],
  },
  advocate: {
    root: { display: "ad-（朝向）+ voc（呼喊）+ -ate", explanation: "voc 表「声音、呼喊」（如 vocal、vocation）：为某事发声，即提倡。" },
    mnemonic: "advocate doing sth.；名词读 /ˈædvəkət/，动词读 /ˈædvəkeɪt/。",
    examples: [
      { sentence: "Many experts advocate reading widely before choosing a topic.", translationZh: "许多专家主张先广泛阅读再定选题。" },
    ],
    collocations: [
      { phrase: "advocate a policy", meaningZh: "提倡某项政策" },
    ],
  },
  analysis: {
    root: { display: "ana-（向上、拆开）+ lys（松开）", explanation: "lys 表「松开」（如 analysis 分解），本义「拆开来看」。" },
    mnemonic: "复数 analyses，动词是 analyze——三姐妹一起记。",
    examples: [
      { sentence: "The analysis of the data took several weeks.", translationZh: "数据分析花了好几周。" },
    ],
    collocations: [
      { phrase: "a careful analysis of", meaningZh: "对……的仔细分析" },
    ],
  },
  appeal: {
    root: { display: "ap-（朝向）+ pel（推、驱）", explanation: "pel 表「推」（如 compel、repel）：把人推向自己，即吸引、呼吁。" },
    mnemonic: "appeal to 后面既能接「人」，也能接「理性 / 情感」。",
    examples: [
      { sentence: "The campaign appeals to younger readers.", translationZh: "这个活动对年轻读者有吸引力。" },
    ],
    collocations: [
      { phrase: "appeal to", meaningZh: "吸引／呼吁" },
    ],
  },
  apparent: {
    root: { display: "ap-（= ad-，朝向）+ par（出现）+ -ent", explanation: "par 表「出现」（如 appear）：显现出来的，即明显的。" },
    mnemonic: "apparent 常指「看起来如此」，未必就是事实，阅读里常作干扰项。",
    examples: [
      { sentence: "It soon became apparent that the data were incomplete.", translationZh: "很快就看得出数据并不完整。" },
    ],
    collocations: [
      { phrase: "for no apparent reason", meaningZh: "无明显原因" },
    ],
  },
  anticipate: {
    root: { display: "anti-（= ante-，在前）+ cip（取）+ -ate", explanation: "cip / cap 表「拿」（如 capture、accept）：提前拿到，即预料。" },
    mnemonic: "anticipate 后接名词或 doing，不接不定式。",
    examples: [
      { sentence: "Nobody anticipated how quickly the market would change.", translationZh: "没人预料到市场变化得这么快。" },
    ],
    collocations: [
      { phrase: "anticipate a problem", meaningZh: "预见问题" },
    ],
  },
  apply: {
    root: { display: "ap-（朝向）+ ply（折叠、贴合）", explanation: "ply 表「贴合」（如 ply 层）：把某物贴上去用，即应用；贴上申请，即申请。" },
    mnemonic: "apply for（申请职位/机会）/ apply to（适用于）/ apply A to B（把 A 用于 B）。",
    examples: [
      { sentence: "She applied for a scholarship last month.", translationZh: "她上个月申请了奖学金。" },
    ],
    collocations: [
      { phrase: "apply for", meaningZh: "申请" },
    ],
  },
  appreciate: {
    root: { display: "ap-（朝向）+ preci（价值）+ -ate", explanation: "preci 表「价格、价值」（如 price、precious）：看出价值，即欣赏、感激。" },
    mnemonic: "I would appreciate it if… 后面用过去式表委婉，不是时态错误。",
    examples: [
      { sentence: "I would appreciate it if you could reply by Friday.", translationZh: "如能在周五前回复，我将不胜感激。" },
    ],
    collocations: [
      { phrase: "appreciate your help", meaningZh: "感谢你的帮助" },
    ],
  },
  approach: {
    root: { display: "approach → approachable", explanation: "approachable 表示「平易近人的」；通过「容易接近」记住核心含义。" },
    mnemonic: "走近一个目标的路线，也就是解决它的方法。",
    examples: [
      { sentence: "A different approach may make the process clearer.", translationZh: "换一种方法也许会让过程更清晰。" },
    ],
    collocations: [
      { phrase: "an approach to", meaningZh: "……的方法" },
    ],
  },
  appropriate: {
    root: { display: "ap-（朝向）+ propri（自己的）+ -ate", explanation: "propri 表「自己的」，appropriate 本义「使成为自己的」，引申为「恰如其分的」。" },
    mnemonic: "合适 = 属于这个场合。问一句「这里该用什么」。",
    examples: [
      { sentence: "Choose a tone that is appropriate for your audience.", translationZh: "选择适合你读者的语气。" },
    ],
    collocations: [
      { phrase: "be appropriate for/to", meaningZh: "适合……" },
    ],
  },
  approve: {
    root: { display: "ap-（朝向）+ prove（检验、证明）", explanation: "prove 本义「检验」：检验通过即批准。" },
    mnemonic: "approve of 是「赞成（人或做法）」，approve sth. 是「批准（方案）」。",
    examples: [
      { sentence: "The committee approved the budget without debate.", translationZh: "委员会未经辩论就批准了预算。" },
    ],
    collocations: [
      { phrase: "approve a proposal", meaningZh: "批准提案" },
    ],
  },
  argue: {
    root: { display: "argu（使清楚、证明）→ argue", explanation: "源自拉丁语 arguere（使明白），本义是通过论证把事情说清楚。" },
    mnemonic: "argue 既可「争论」，也可「论证」——学术写作里多取后者。",
    examples: [
      { sentence: "The author argues that technology has changed how we read.", translationZh: "作者论证说技术改变了我们的阅读方式。" },
    ],
    collocations: [
      { phrase: "argue that…", meaningZh: "主张……" },
    ],
  },
  assess: {
    root: { display: "as-（朝向）+ sess（坐）", explanation: "历史词源与「坐在旁边协助判断」相关，现代常用义是评估。" },
    mnemonic: "坐下来，依据证据给出判断。",
    examples: [
      { sentence: "The test is designed to assess your understanding.", translationZh: "这项测试旨在评估你的理解程度。" },
    ],
    collocations: [
      { phrase: "assess the situation", meaningZh: "评估形势" },
    ],
  },
  assist: {
    root: { display: "as-（朝向）+ sist（站立）", explanation: "sist 表「站」（如 persist、resist）：站到旁边帮忙，即协助。" },
    mnemonic: "assist 比 help 正式，常见 assist sb. with sth.。",
    examples: [
      { sentence: "A teaching assistant assists students with their projects.", translationZh: "助教协助学生完成项目。" },
    ],
    collocations: [
      { phrase: "assist with", meaningZh: "协助（某事）" },
    ],
  },
  assign: {
    root: { display: "as-（= ad-，朝向）+ sign（标记）", explanation: "sign 表「记号」（如 signal、design）：打上记号指定给某人，即分配、布置。" },
    mnemonic: "assign sb. sth. / assign sth. to sb.，两个语序都对。",
    examples: [
      { sentence: "Each student was assigned a short passage to summarise.", translationZh: "每个学生都分到一小段文章来做摘要。" },
    ],
    collocations: [
      { phrase: "assign a task", meaningZh: "布置任务" },
    ],
  },
  assume: {
    root: { display: "as-（朝向）+ sum（拿取）", explanation: "sum 表「拿取」（如 consume）：先把某个前提拿过来用，就是假定。" },
    mnemonic: "assume 三义相通：假定（拿来当前提）、承担（揽下责任）、呈现（披上外表）。",
    examples: [
      { sentence: "We should not assume that everyone has the same background.", translationZh: "我们不应假定每个人都有相同的背景。" },
    ],
    collocations: [
      { phrase: "assume that…", meaningZh: "假定……" },
    ],
  },
  attain: {
    root: { display: "at-（= ad-，朝向）+ tain（触到、握住）", explanation: "tain 表「触碰、拿住」（如 obtain、maintain）：触到目标，即达到。" },
    mnemonic: "attain 比 reach 正式，宾语多是目标、水平、分数。",
    examples: [
      { sentence: "Few students attain a high score without daily practice.", translationZh: "不每天练习，很少有学生能拿到高分。" },
    ],
    collocations: [
      { phrase: "attain a goal", meaningZh: "达到目标" },
    ],
  },
  assure: {
    root: { display: "as-（朝向）+ sure（确定）", explanation: "使某人确定下来，即向……保证。" },
    mnemonic: "assure sb. that…（向人保证）；ensure 是「确保某事发生」，别混。",
    examples: [
      { sentence: "He assured us that the data had been checked twice.", translationZh: "他向我们保证数据已核对过两遍。" },
    ],
    collocations: [
      { phrase: "assure sb. that", meaningZh: "向某人保证" },
    ],
  },
  attempt: {
    root: { display: "at-（朝向）+ tempt（尝试）", explanation: "tempt 本义「试探」，attempt 即「试着去做」。" },
    mnemonic: "attempt to do sth.（试图做某事），比 try 正式。",
    examples: [
      { sentence: "He attempted to solve the problem on his own.", translationZh: "他试图独自解决这个问题。" },
    ],
    collocations: [
      { phrase: "make an attempt to", meaningZh: "尝试做……" },
    ],
  },
  attitude: {
    root: { display: "apt（适合、姿态）→ attitude", explanation: "与 aptitude（才能）、adapt（适应）同源，本义是「身体姿态」，引申为态度。" },
    mnemonic: "attitude 后接 to / toward / about，不用 of。",
    examples: [
      { sentence: "His attitude toward failure changed after that experience.", translationZh: "那次经历之后，他对失败的态度变了。" },
    ],
    collocations: [
      { phrase: "attitude toward", meaningZh: "对……的态度" },
    ],
  },
  attribute: {
    root: { display: "at-（朝向）+ tribute（给予、分配）", explanation: "tribute 表「给予」（如 contribute、distribute）：把某物归给……" },
    mnemonic: "attribute A to B = 把 A 归因于 B，写作里很好用。",
    examples: [
      { sentence: "She attributes her progress to a strict study schedule.", translationZh: "她把自己的进步归因于严格的学习计划。" },
    ],
    collocations: [
      { phrase: "attribute A to B", meaningZh: "把 A 归因于 B" },
    ],
  },
  available: {
    root: { display: "avail（有用、胜任）+ -able（能够）", explanation: "avail 有「派得上用场」的意思，-able 表「能够」，合起来是「能取用的」。" },
    mnemonic: "能拿到手、能派上用场的，才是 available，不等于「存在」。",
    examples: [
      { sentence: "More resources are now available to students online.", translationZh: "现在学生能在网上获得更多资源。" },
    ],
    collocations: [
      { phrase: "be available to sb.", meaningZh: "可供某人使用" },
    ],
  },
  aware: {
    root: { display: "a-（加强）+ ware（警觉）", explanation: "ware 与 wary（警惕的）同源，aware 即「心里有数、有警觉」。" },
    mnemonic: "be aware of（知道某事）/ be aware that…；aware 是表语形容词，不放在名词前。",
    examples: [
      { sentence: "Students should be aware of the risks of sharing personal data.", translationZh: "学生应当意识到分享个人数据的风险。" },
    ],
    collocations: [
      { phrase: "be aware of", meaningZh: "意识到" },
    ],
  },
  behavior: {
    root: { display: "be-（加强）+ hav（持有）+ -ior", explanation: "本义「持有自己的样子」，引申为举止、行为。英式拼写 behaviour。" },
    mnemonic: "behavior 泛指行为模式，act 指单个动作。",
    examples: [
      { sentence: "Small changes in behavior can lead to big results.", translationZh: "行为上的小改变能带来大结果。" },
    ],
    collocations: [
      { phrase: "human behavior", meaningZh: "人类行为" },
    ],
  },
  benefit: {
    root: { display: "bene-（好）+ fit（做）", explanation: "bene 表「好」（如 benevolent 仁慈的）：做好事，即为有益。" },
    mnemonic: "benefit from 是「受益」，benefit sb. 是「使某人受益」——方向相反。",
    examples: [
      { sentence: "Both mind and body benefit from regular rest.", translationZh: "身心都能从规律休息中获益。" },
    ],
    collocations: [
      { phrase: "benefit from", meaningZh: "从……中受益" },
    ],
  },
  category: {
    root: { display: "cata-（向下）+ agora（公开讲说）", explanation: "源自希腊语 kategoria「在集会上公开陈述」，后引申为「把事物归入某一类」。" },
    mnemonic: "fall into a category 是阅读里常见的分类表达。",
    examples: [
      { sentence: "These problems fall into three broad categories.", translationZh: "这些问题可以归入三大类。" },
    ],
    collocations: [
      { phrase: "fall into a category", meaningZh: "属于某一类" },
    ],
  },
  capacity: {
    root: { display: "cap（拿、容纳）+ -acity", explanation: "cap 表「拿、装」（如 capable、capture）：能装多少，即容量、能力。" },
    mnemonic: "the capacity to do sth. 指「做某事的能力」，不接 of doing。",
    examples: [
      { sentence: "The hall has a seating capacity of eight hundred.", translationZh: "这个礼堂可容纳八百个座位。" },
    ],
    collocations: [
      { phrase: "the capacity to", meaningZh: "……的能力" },
    ],
  },
  challenge: {
    root: { display: "chal（指控、质疑）→ challenge", explanation: "源自拉丁语 calumnia（诬告），本义是「提出质疑」，后引申为挑战。" },
    mnemonic: "challenge 既是「难题」，也是「质疑」——同源于「当面提出」。",
    examples: [
      { sentence: "Learning to write well is a challenge worth taking on.", translationZh: "学会写好文章是一项值得接受的挑战。" },
    ],
    collocations: [
      { phrase: "face a challenge", meaningZh: "面临挑战" },
    ],
  },
  cite: {
    root: { display: "cit（召唤、唤起）", explanation: "cit 表「召唤」（如 excite、incite）：把别人的话召来作证，即引用。" },
    mnemonic: "cite 强调「举出出处」，quote 强调「照抄原话」。",
    examples: [
      { sentence: "The author cites two field studies to support her claim.", translationZh: "作者引用两项实地研究来支持她的观点。" },
    ],
    collocations: [
      { phrase: "cite an example", meaningZh: "举例引证" },
    ],
  },
  claim: {
    root: { display: "clam（喊、叫）→ claim", explanation: "clam 表「呼喊」（如 exclaim 惊呼）：喊出主张，即为宣称。" },
    mnemonic: "claim 强调「单方面声称」，未必有证据支撑。",
    examples: [
      { sentence: "The study claims that the drug is safe, but more tests are needed.", translationZh: "该研究声称这种药是安全的，但还需要更多测试。" },
    ],
    collocations: [
      { phrase: "claim responsibility for", meaningZh: "声称对……负责" },
    ],
  },
  commit: {
    root: { display: "com-（加强）+ mit（送）", explanation: "把事情送出去、交出去，于是有了「承诺」与「犯（错、罪）」两义。" },
    mnemonic: "commit oneself to（致力于／承诺）；commit a crime（犯罪）。",
    examples: [
      { sentence: "She committed herself to finishing the thesis this year.", translationZh: "她下定决心今年完成论文。" },
    ],
    collocations: [
      { phrase: "commit oneself to", meaningZh: "致力于／承诺" },
    ],
  },
  commence: {
    root: { display: "com-（加强）+ initiare（开始）", explanation: "与 initiate 同源，是 begin 的正式说法。" },
    mnemonic: "commence 多用于会议、工程、学期等正式场合。",
    examples: [
      { sentence: "Construction will commence early next month.", translationZh: "工程将于下月初开工。" },
    ],
    collocations: [
      { phrase: "commence with", meaningZh: "以……开始" },
    ],
  },
  coincide: {
    root: { display: "co-（共同）+ in-（进入）+ cid（落下）", explanation: "cid / cas 表「落下」（如 accident、decide）：一起落下，即重合、同时发生。" },
    mnemonic: "coincide with 后接时间点或另一事件。",
    examples: [
      { sentence: "The conference coincides with the start of the new term.", translationZh: "会议正好和开学撞在一起。" },
    ],
    collocations: [
      { phrase: "coincide with", meaningZh: "与……同时发生／一致" },
    ],
  },
  coherent: {
    root: { display: "co-（共同）+ her（粘住）+ -ent", explanation: "her / hes 表「粘住」（如 adhere、hesitate）：粘在一起的，即连贯的。" },
    mnemonic: "coherent 常修饰 argument、essay、explanation。",
    examples: [
      { sentence: "Her essay is coherent even when the argument is complex.", translationZh: "即便论证复杂，她的文章依然连贯。" },
    ],
    collocations: [
      { phrase: "coherent argument", meaningZh: "连贯的论证" },
    ],
  },
  compare: {
    root: { display: "com-（一起）+ par（相等）", explanation: "par 表「相等」（如 parity）：把两个放一起看是否对等。" },
    mnemonic: "compare A with B（比较差异）/ compare A to B（比作）。",
    examples: [
      { sentence: "It is useful to compare the two approaches before choosing.", translationZh: "选择之前比较这两种方法是有用的。" },
    ],
    collocations: [
      { phrase: "compared with", meaningZh: "与……相比" },
    ],
  },
  concentrate: {
    root: { display: "con-（共同）+ centr（中心）+ -ate", explanation: "centr 表「中心」（如 central）：聚到一个点上，即集中。" },
    mnemonic: "concentrate on 后接名词或 doing。",
    examples: [
      { sentence: "It is hard to concentrate when your phone keeps buzzing.", translationZh: "手机一直震动时很难集中注意力。" },
    ],
    collocations: [
      { phrase: "concentrate on", meaningZh: "专注于" },
    ],
  },
  concede: {
    root: { display: "con-（加强）+ ced（走、让步）", explanation: "ced / cess 表「走」（如 proceed、access）：让开一步，即承认、让步。" },
    mnemonic: "concede that… 常用于「勉强承认对方有道理」。",
    examples: [
      { sentence: "He conceded that the method had clear limits.", translationZh: "他承认这种方法有明显局限。" },
    ],
    collocations: [
      { phrase: "concede defeat", meaningZh: "认输" },
    ],
  },
  comprise: {
    root: { display: "com-（加强）+ pris（抓住）", explanation: "pris / prehend 表「抓」（如 prison、comprehend）：整体把部分抓进去，即包含。" },
    mnemonic: "be comprised of 已经是被动，后面不再加 by。",
    examples: [
      { sentence: "The book comprises twelve chapters and two appendices.", translationZh: "这本书由十二章和两个附录组成。" },
    ],
    collocations: [
      { phrase: "be comprised of", meaningZh: "由……组成" },
    ],
  },
  complicate: {
    root: { display: "com-（共同）+ plic（折叠）+ -ate", explanation: "plic 表「折」（如 apply、imply）：折在一起理不清，即复杂化。" },
    mnemonic: "complicate matters / things 是固定说法，不加冠词以外的修饰。",
    examples: [
      { sentence: "Adding one more variable complicates the whole model.", translationZh: "再多一个变量就会让整个模型变复杂。" },
    ],
    collocations: [
      { phrase: "complicate matters", meaningZh: "使事情复杂化" },
    ],
  },
  compile: {
    root: { display: "com-（共同）+ pil（堆积）", explanation: "把材料堆到一起，即汇编、编纂。" },
    mnemonic: "compile 的宾语多是 list、report、dictionary 这类集合物。",
    examples: [
      { sentence: "She compiled a list of every source she used.", translationZh: "她把用过的所有资料编成了一份清单。" },
    ],
    collocations: [
      { phrase: "compile a list", meaningZh: "汇编清单" },
    ],
  },
  compensate: {
    root: { display: "com-（加强）+ pens（称量、偿付）+ -ate", explanation: "pens 表「称重」（如 expensive、pension）：称着补齐差额，即补偿。" },
    mnemonic: "compensate for 后面接的是「被弥补的损失」。",
    examples: [
      { sentence: "Nothing can fully compensate for the lost time.", translationZh: "没有什么能完全弥补失去的时间。" },
    ],
    collocations: [
      { phrase: "compensate for", meaningZh: "弥补" },
    ],
  },
  concept: {
    root: { display: "con-（一起）+ cept（拿取）", explanation: "cept 表「拿取」（如 accept、receive）：把经验归拢起来形成的东西，就是概念。" },
    mnemonic: "concept 是抽象的想法， conception 可指「构想」或「受孕」——同根异义。",
    examples: [
      { sentence: "The concept is easy to state but hard to apply.", translationZh: "这个概念说起来容易，用起来难。" },
    ],
    collocations: [
      { phrase: "the concept of", meaningZh: "……的概念" },
    ],
  },
  conclude: {
    root: { display: "con-（完全）+ clud（关闭）", explanation: "clud 表「关闭」（如 include、exclude）：全部闭合，即结束、下结论。" },
    mnemonic: "conclude 可指「结束」（演讲）或「推断出」（结论），看宾语。",
    examples: [
      { sentence: "The researchers concluded that the method was reliable.", translationZh: "研究者得出结论：这个方法是可靠的。" },
    ],
    collocations: [
      { phrase: "conclude that…", meaningZh: "得出结论……" },
    ],
  },
  consent: {
    root: { display: "con-（共同）+ sent（感觉）", explanation: "sent 表「感觉」（如 sense、sentiment）：感觉一致，即同意。" },
    mnemonic: "consent to 后接名词或 doing：consent to taking part。",
    examples: [
      { sentence: "He gave his consent without reading the details.", translationZh: "他没看细节就同意了。" },
    ],
    collocations: [
      { phrase: "give consent", meaningZh: "表示同意" },
    ],
  },
  conform: {
    root: { display: "con-（共同）+ form（形状）", explanation: "做成同样的形状，即符合、遵守。" },
    mnemonic: "conform to 后面接规则、标准、期望。",
    examples: [
      { sentence: "All entries must conform to the stated rules.", translationZh: "所有参赛作品都必须符合公布的规则。" },
    ],
    collocations: [
      { phrase: "conform to", meaningZh: "符合／遵守" },
    ],
  },
  conflict: {
    root: { display: "con-（共同）+ flict（打击）", explanation: "flict 表「打」（如 inflict）：打在一处，即冲突。" },
    mnemonic: "conflict with（与……冲突）；名词 conflict 读 /ˈkɒnflɪkt/。",
    examples: [
      { sentence: "Her findings conflict with the earlier report.", translationZh: "她的发现与早前的报告相冲突。" },
    ],
    collocations: [
      { phrase: "conflict with", meaningZh: "与……冲突" },
    ],
  },
  confirm: {
    root: { display: "con-（加强）+ firm（坚固）", explanation: "firm 表「结实、确定」（如 firm、affirm）：使确定下来，即确认。" },
    mnemonic: "confirm 后接名词或 that 从句，不接 to do。",
    examples: [
      { sentence: "Please confirm your reservation by email.", translationZh: "请用邮件确认你的预约。" },
    ],
    collocations: [
      { phrase: "confirm a booking", meaningZh: "确认预订" },
    ],
  },
  confer: {
    root: { display: "con-（共同）+ fer（带来）", explanation: "fer 表「携带」（如 refer、transfer）：把意见带到一起，即商议；也指授予。" },
    mnemonic: "confer with sb.（商议）；confer sth. on sb.（授予）。",
    examples: [
      { sentence: "The degree was conferred on her last June.", translationZh: "去年六月她被授予该学位。" },
    ],
    collocations: [
      { phrase: "confer with sb.", meaningZh: "与某人商议" },
    ],
  },
  conduct: {
    root: { display: "con-（加强）+ duct（引导）", explanation: "duct 表「引导」（如 educate、produce）：引导事情进行，即实施；也指行为举止。" },
    mnemonic: "conduct a study / survey；conduct oneself（举止）是阅读常见两义。",
    examples: [
      { sentence: "They conducted a survey across twenty schools.", translationZh: "他们在二十所学校做了一项调查。" },
    ],
    collocations: [
      { phrase: "conduct a survey", meaningZh: "开展调查" },
    ],
  },
  consequence: {
    root: { display: "con-（一起）+ sequ（跟随）+ -ence", explanation: "sequ 表「跟随」（如 sequence、subsequent）：跟着来的结果。" },
    mnemonic: "consequence 常指「不良后果」，result 中性；as a consequence 是常用连接语。",
    examples: [
      { sentence: "Skipping breakfast can have long-term consequences for health.", translationZh: "不吃早餐可能对健康产生长期影响。" },
    ],
    collocations: [
      { phrase: "as a consequence of", meaningZh: "由于……的结果" },
    ],
  },
  consider: {
    root: { display: "con-（一起）+ sider（星）", explanation: "sider 与 sidereal（恒星的）同源：古人观星以定事，故为「细想」。" },
    mnemonic: "consider A (as) B（把 A 视为 B）/ consider doing sth.（考虑做某事）。",
    examples: [
      { sentence: "You should consider all the options before deciding.", translationZh: "做决定前你应该考虑所有选项。" },
    ],
    collocations: [
      { phrase: "consider doing sth.", meaningZh: "考虑做某事" },
    ],
  },
  consist: {
    root: { display: "con-（共同）+ sist（站立）", explanation: "站在一起构成整体，即由……组成。" },
    mnemonic: "consist of 只有主动形式，没有进行时，也没有被动。",
    examples: [
      { sentence: "The exam consists of three sections.", translationZh: "考试由三部分组成。" },
    ],
    collocations: [
      { phrase: "consist of", meaningZh: "由……组成" },
    ],
  },
  consistent: {
    root: { display: "con-（一起）+ sist（站立）", explanation: "与 persist 共享 sist 词根；一起站稳，联想到一致与稳定。" },
    mnemonic: "让今天和明天的行动朝着同一个方向。",
    examples: [
      { sentence: "Consistent effort matters more than a perfect start.", translationZh: "持续的努力比完美的开始更重要。" },
    ],
    collocations: [
      { phrase: "be consistent with", meaningZh: "与……一致" },
    ],
  },
  contradict: {
    root: { display: "contra-（相反）+ dict（说）", explanation: "dict 表「说」（如 predict、dictate）：说相反的话，即反驳、与……矛盾。" },
    mnemonic: "contradict oneself 是「自相矛盾」，写作扣分点。",
    examples: [
      { sentence: "The new evidence contradicts the earlier conclusion.", translationZh: "新证据与此前的结论相矛盾。" },
    ],
    collocations: [
      { phrase: "contradict oneself", meaningZh: "自相矛盾" },
    ],
  },
  contain: {
    root: { display: "con-（共同）+ tain（握持）", explanation: "tain 表「拿住」（如 maintain、obtain）：装在里面，即包含、控制。" },
    mnemonic: "contain 强调「整体里有」，include 强调「举出其中一部分」。",
    examples: [
      { sentence: "The chapter contains all the formulas you need.", translationZh: "这一章包含你需要的所有公式。" },
    ],
    collocations: [
      { phrase: "contain information", meaningZh: "包含信息" },
    ],
  },
  consume: {
    root: { display: "con-（完全）+ sum（拿、取）", explanation: "sum 表「拿走」（如 assume、resume）：彻底拿走，即消耗。" },
    mnemonic: "consume 的宾语是能源、时间、食物，不用于「消费商品」以外的抽象花钱。",
    examples: [
      { sentence: "The printer consumes far more paper than we expected.", translationZh: "这台打印机耗纸远超预期。" },
    ],
    collocations: [
      { phrase: "consume energy", meaningZh: "消耗能源" },
    ],
  },
  constrain: {
    root: { display: "con-（加强）+ strain（拉紧）", explanation: "拉紧使其受限，即限制、约束。" },
    mnemonic: "be constrained by 后面接「限制来自哪里」。",
    examples: [
      { sentence: "A tight budget constrained their choice of method.", translationZh: "预算紧张限制了他们对方法的选择。" },
    ],
    collocations: [
      { phrase: "be constrained by", meaningZh: "受……限制" },
    ],
  },
  constitute: {
    root: { display: "con-（共同）+ stit（设立、放置）", explanation: "stit 表「设立」（如 institution、substitute）：设立起来，即构成、成立。" },
    mnemonic: "constitute 不用于进行时，也不用被动。",
    examples: [
      { sentence: "Women constitute half of the teaching staff.", translationZh: "女性占教师人数的一半。" },
    ],
    collocations: [
      { phrase: "constitute a threat", meaningZh: "构成威胁" },
    ],
  },
  constant: {
    root: { display: "con-（加强）+ st（站立）+ -ant", explanation: "一直站在那里不动，即持续的、恒定的。" },
    mnemonic: "constant 修饰「反复出现、不间断」的事物，如 pressure、change。",
    examples: [
      { sentence: "Constant revision matters more than one long session.", translationZh: "持续复习比一次长时间学习更重要。" },
    ],
    collocations: [
      { phrase: "constant pressure", meaningZh: "持续的压力" },
    ],
  },
  contribute: {
    root: { display: "con-（一起）+ tribut（给予）", explanation: "表示共同给予，既可贡献资源，也可促成一种结果。" },
    mnemonic: "每个人添上一点，就能共同完成一件事。",
    examples: [
      { sentence: "Small habits contribute to lasting change.", translationZh: "小习惯有助于带来持久的改变。" },
    ],
    collocations: [
      { phrase: "contribute to", meaningZh: "有助于；促成" },
    ],
  },
  correspond: {
    root: { display: "cor-（共同）+ respond（回应）", explanation: "互相回应，于是有了「相符合」与「通信」两义。" },
    mnemonic: "correspond to（对应于）；correspond with sb.（与某人通信）。",
    examples: [
      { sentence: "The figures do not correspond to the ones in the table.", translationZh: "这些数字与表里的对不上。" },
    ],
    collocations: [
      { phrase: "correspond to", meaningZh: "对应于" },
    ],
  },
  cooperate: {
    root: { display: "co-（共同）+ oper（工作）+ -ate", explanation: "oper 表「工作」（如 operate、operation）：一起工作，即合作。" },
    mnemonic: "cooperate with sb. on sth.，两个介词都别漏。",
    examples: [
      { sentence: "The two teams cooperated on the field experiment.", translationZh: "两个团队合作完成了实地实验。" },
    ],
    collocations: [
      { phrase: "cooperate with", meaningZh: "与……合作" },
    ],
  },
  convince: {
    root: { display: "con-（加强）+ vinc（征服）", explanation: "vinc 表「战胜」（如 victory、convict）：用道理征服对方，即说服。" },
    mnemonic: "convince sb. of sth. / convince sb. that…，宾语必须是「人」。",
    examples: [
      { sentence: "He convinced me that the plan was worth trying.", translationZh: "他说服我相信这个计划值得一试。" },
    ],
    collocations: [
      { phrase: "convince sb. of", meaningZh: "使某人相信" },
    ],
  },
  convert: {
    root: { display: "con-（加强）+ vert（转）", explanation: "vert / vers 表「转」（如 reverse、diverse）：转变。" },
    mnemonic: "convert A into B；名词 conversion 同理接 into。",
    examples: [
      { sentence: "The plant converts sunlight into electric power.", translationZh: "这家工厂把阳光转化为电力。" },
    ],
    collocations: [
      { phrase: "convert A into B", meaningZh: "把 A 转化为 B" },
    ],
  },
  crucial: {
    root: { display: "cruc（十字）+ -ial（形容词后缀）", explanation: "词源与「十字」相关，可联想决定方向的十字路口。" },
    mnemonic: "站在十字路口，需要做出关键选择。",
    examples: [
      { sentence: "Regular revision is crucial to long-term learning.", translationZh: "定期复习对长期学习至关重要。" },
    ],
    collocations: [
      { phrase: "be crucial to", meaningZh: "对……至关重要" },
    ],
  },
  decline: {
    root: { display: "de-（向下）+ clin（倾斜）", explanation: "clin 表「倾斜」（如 incline、climate）：向下倾，即下降。" },
    mnemonic: "decline 既是「下降」，也是「婉拒」——都从「往后退」来。",
    examples: [
      { sentence: "Birth rates have declined steadily over the past decade.", translationZh: "过去十年里出生率持续下降。" },
    ],
    collocations: [
      { phrase: "a decline in", meaningZh: "……的下降" },
    ],
  },
  decrease: {
    root: { display: "de-（向下）+ creas（生长）", explanation: "与 increase 共享 creas（生长），前缀 de- 表向下：往下长。" },
    mnemonic: "increase 的反面。看清 by（幅度）和 to（到某值）的区别。",
    examples: [
      { sentence: "The cost of solar panels has decreased sharply.", translationZh: "太阳能电池板的成本大幅下降。" },
    ],
    collocations: [
      { phrase: "a decrease in", meaningZh: "……的减少" },
    ],
  },
  deliberate: {
    root: { display: "de-（加强）+ libr（天平）", explanation: "libra 是拉丁语「天平」，deliberate 本义「放到天平上反复称量」，引申为深思熟虑。" },
    mnemonic: "形容词读 /dɪˈlɪbərət/，动词读 /dɪˈlɪbəreɪt/，重音不同。",
    examples: [
      { sentence: "The change was deliberate, not an accident.", translationZh: "这个改动是刻意为之，不是意外。" },
    ],
    collocations: [
      { phrase: "a deliberate choice", meaningZh: "深思熟虑的选择" },
    ],
  },
  define: {
    root: { display: "de-（彻底）+ fin（边界）", explanation: "fin 表「界限」（如 final、confine）：划清边界，即下定义。" },
    mnemonic: "define A as B 是写作里下定义的标准句式。",
    examples: [
      { sentence: "The report defines success as steady progress, not speed.", translationZh: "报告把成功定义为稳步前进，而不是速度。" },
    ],
    collocations: [
      { phrase: "define A as B", meaningZh: "把 A 定义为 B" },
    ],
  },
  deduce: {
    root: { display: "de-（向下、从）+ duc（引导）", explanation: "duc 表「引导」（如 conduct、educate）：从已知引导出来，即推断。" },
    mnemonic: "deduce A from B；阅读里常与 infer 互换。",
    examples: [
      { sentence: "From the data we can deduce how the system behaves.", translationZh: "从这些数据我们能推断系统的行为方式。" },
    ],
    collocations: [
      { phrase: "deduce from", meaningZh: "从……推断" },
    ],
  },
  demonstrate: {
    root: { display: "de-（强调）+ monstr（展示）", explanation: "核心含义是把事物清晰展示出来，可引申为证明。" },
    mnemonic: "只说还不够，把过程演示出来。",
    examples: [
      { sentence: "The experiment demonstrates the effect of temperature.", translationZh: "这项实验展示了温度产生的影响。" },
    ],
    collocations: [
      { phrase: "demonstrate the ability", meaningZh: "展示能力" },
    ],
  },
  depend: {
    root: { display: "de-（向下）+ pend（悬挂）", explanation: "pend 表「挂」（如 suspend、pending）：挂在……下面，即依靠、取决于。" },
    mnemonic: "depend on 是状态动词，一般不用于进行时。",
    examples: [
      { sentence: "Whether we go tomorrow depends on the weather.", translationZh: "明天去不去取决于天气。" },
    ],
    collocations: [
      { phrase: "depend on", meaningZh: "取决于／依赖" },
    ],
  },
  denote: {
    root: { display: "de-（向下）+ not（标记）", explanation: "not 表「记号」（如 note、notice）：用记号指出，即表示。" },
    mnemonic: "denote 多用于图表、符号「代表什么」。",
    examples: [
      { sentence: "In this chart, red denotes a failed test.", translationZh: "在这张图里，红色表示测试未通过。" },
    ],
    collocations: [
      { phrase: "denote a change", meaningZh: "表示变化" },
    ],
  },
  derive: {
    root: { display: "de-（从）+ riv（水流）", explanation: "词源中的意象是「引出水流」，引申为从某处获得或起源。" },
    mnemonic: "沿着河流向上找，就能找到事物的来源。",
    examples: [
      { sentence: "Many English words derive from Latin.", translationZh: "许多英语单词源自拉丁语。" },
    ],
    collocations: [
      { phrase: "derive from", meaningZh: "源于" },
    ],
  },
  detect: {
    root: { display: "de-（去掉）+ tect（遮盖）", explanation: "tect 表「盖」（如 protect、detective）：揭开盖子，即察觉、探测。" },
    mnemonic: "detect 强调「发现了隐藏的东西」，notice 只是「注意到」。",
    examples: [
      { sentence: "The sensor detects even tiny changes in temperature.", translationZh: "这个传感器连微小的温度变化都能测到。" },
    ],
    collocations: [
      { phrase: "detect a change", meaningZh: "察觉变化" },
    ],
  },
  deserve: {
    root: { display: "de-（加强）+ serv（服务、保持）", explanation: "serv 表「服务」（如 serve、preserve）：因付出而配得上，即值得。" },
    mnemonic: "deserve 后接名词或 to do；「值得被……」要说 deserve to be done。",
    examples: [
      { sentence: "Her careful work deserves a second look.", translationZh: "她细致的工作值得再看一遍。" },
    ],
    collocations: [
      { phrase: "deserve attention", meaningZh: "值得关注" },
    ],
  },
  determine: {
    root: { display: "de-（完全）+ termin（界限）", explanation: "termin 表「界限」（如 terminal 终点），determine 本义「划定界限」，引申为决定。" },
    mnemonic: "把边界划清楚，结果就定下来了——这就是 determine。",
    examples: [
      { sentence: "Several factors determine how quickly a language is learned.", translationZh: "有几个因素决定了一门语言学得多快。" },
    ],
    collocations: [
      { phrase: "determine whether", meaningZh: "决定是否" },
    ],
  },
  diverse: {
    root: { display: "di-（= dis-，分开）+ vers（转）", explanation: "vers / vert 表「转」（如 convert、reverse）：转向不同方向，即多样的。" },
    mnemonic: "diverse 强调「彼此不同」，various 强调「种类繁多」。",
    examples: [
      { sentence: "The class is diverse in both age and background.", translationZh: "这个班在年龄和背景上都很不一样。" },
    ],
    collocations: [
      { phrase: "diverse backgrounds", meaningZh: "多样的背景" },
    ],
  },
  distribute: {
    root: { display: "dis-（分开）+ tribute（给予）", explanation: "tribute 表「分配」（如 attribute、contribute）：分着给出去，即分发。" },
    mnemonic: "distribute sth. among / to sb.，不接 for。",
    examples: [
      { sentence: "Volunteers distributed the textbooks before class.", translationZh: "志愿者在课前分发了教材。" },
    ],
    collocations: [
      { phrase: "distribute resources", meaningZh: "分配资源" },
    ],
  },
  distinguish: {
    root: { display: "dis-（分开）+ stingu（刺、分开）", explanation: "把事物刺着分开来，即区分、辨别。" },
    mnemonic: "distinguish A from B 与 distinguish between A and B 都对。",
    examples: [
      { sentence: "Learners must distinguish fact from opinion.", translationZh: "学习者必须区分事实与观点。" },
    ],
    collocations: [
      { phrase: "distinguish between", meaningZh: "区分" },
    ],
  },
  diminish: {
    root: { display: "de-（向下）+ min（小）+ -ish", explanation: "min 表「小」（如 minor、minus）：一点点变小，即减少、削弱。" },
    mnemonic: "diminish 强调「价值或影响被削弱」，不只是数量变少。",
    examples: [
      { sentence: "Nothing diminishes the value of daily review.", translationZh: "没有什么能削弱每天复习的价值。" },
    ],
    collocations: [
      { phrase: "diminish the impact", meaningZh: "削弱影响" },
    ],
  },
  effective: {
    root: { display: "effect（效果）+ -ive（形容词后缀）", explanation: "词根 effect 就是「效果」：能产生预期效果的，就是有效。" },
    mnemonic: "effective 看结果（做成了），efficient 看过程（省力）——别混。",
    examples: [
      { sentence: "The most effective way to learn a word is to use it.", translationZh: "学一个单词最有效的办法是去用它。" },
    ],
    collocations: [
      { phrase: "take effective measures", meaningZh: "采取有效措施" },
    ],
  },
  efficient: {
    root: { display: "ef-（向外）+ fic（做）+ -ient（形容词后缀）", explanation: "与 efficient 同族的 efficacy 指「功效」，-fic 是「做」，强调「做出来而不浪费」。" },
    mnemonic: "同样的结果用时更少，就是 efficient——比的是投入产出。",
    examples: [
      { sentence: "The new engine is more efficient than the old one.", translationZh: "新发动机比旧的更高效。" },
    ],
    collocations: [
      { phrase: "an efficient use of time", meaningZh: "对时间的有效利用" },
    ],
  },
  eliminate: {
    root: { display: "e-（= ex-，出去）+ limin（门槛）", explanation: "limin 表「门槛」（如 preliminary）：赶出门槛之外，即排除、消除。" },
    mnemonic: "eliminate 强调「彻底去掉」，remove 只是「拿走」。",
    examples: [
      { sentence: "One revision round eliminated most of the typos.", translationZh: "一轮修订消除了大部分笔误。" },
    ],
    collocations: [
      { phrase: "eliminate errors", meaningZh: "消除错误" },
    ],
  },
  elaborate: {
    root: { display: "e-（= ex-，出来）+ labor（劳作）+ -ate", explanation: "花了力气做出来的，即精心制作的；引申为「详细说明」。" },
    mnemonic: "elaborate on sth. 是「就某事展开说明」，on 不能省。",
    examples: [
      { sentence: "Could you elaborate on the second point?", translationZh: "能否详细说明一下第二点？" },
    ],
    collocations: [
      { phrase: "elaborate on", meaningZh: "详述" },
    ],
  },
  emerge: {
    root: { display: "e-（向外）+ merg（浸入）", explanation: "与 immerse 的词根相关，词源意象是从水中浮出。" },
    mnemonic: "答案像水中的石头，随着水位下降逐渐显现。",
    examples: [
      { sentence: "New insights emerged during the discussion.", translationZh: "讨论中出现了新的见解。" },
    ],
    collocations: [
      { phrase: "emerge from", meaningZh: "从……中出现" },
    ],
  },
  emphasize: {
    root: { display: "em-（使……）+ phas（显示）+ -ize", explanation: "phas 与 phase、phenomenon 同源，指「显现出来」：使它显眼，即强调。" },
    mnemonic: "英式 emphasise；名词 emphasis，常用 place/lay emphasis on。",
    examples: [
      { sentence: "The teacher emphasized the importance of reading aloud.", translationZh: "老师强调了朗读的重要性。" },
    ],
    collocations: [
      { phrase: "emphasize the need for", meaningZh: "强调……的必要性" },
    ],
  },
  engage: {
    root: { display: "en-（使）+ gage（抵押、承诺）", explanation: "gage 有「质押、担保」之意；把自己押进去，即参与、投入。" },
    mnemonic: "engage in（参与）；be engaged in（正忙于）；engaged 还有「已订婚」。",
    examples: [
      { sentence: "Students who engage in discussion remember more.", translationZh: "参与讨论的学生记得更牢。" },
    ],
    collocations: [
      { phrase: "engage in", meaningZh: "参与" },
    ],
  },
  enforce: {
    root: { display: "en-（使）+ force（力量）", explanation: "使规则带上力量，即强制执行。" },
    mnemonic: "enforce 是「强制执行（规定）」，reinforce 是「加强」——前缀不同，别混。",
    examples: [
      { sentence: "The school enforces a strict deadline for every assignment.", translationZh: "学校对每份作业都执行严格的截止时间。" },
    ],
    collocations: [
      { phrase: "enforce a rule", meaningZh: "执行规定" },
    ],
  },
  enhance: {
    root: { display: "en-（使……）+ hance（高）", explanation: "hance 源自拉丁语 altus（高），enhance 即「使更高」——提升已有之物。" },
    mnemonic: "enhance 是「锦上添花」，在原有基础上加值，不是从无到有。",
    examples: [
      { sentence: "Good lighting can enhance the mood of a room.", translationZh: "好的灯光能提升房间的氛围。" },
    ],
    collocations: [
      { phrase: "enhance the quality of", meaningZh: "提升……的质量" },
    ],
  },
  ensure: {
    root: { display: "en-（使）+ sure（确定）", explanation: "使某事确定下来，即确保。" },
    mnemonic: "ensure that…（确保某事）；assure 的宾语必须是人（assure sb. that…）。",
    examples: [
      { sentence: "Set a fixed time to ensure that review actually happens.", translationZh: "固定一个时间，确保复习真的发生。" },
    ],
    collocations: [
      { phrase: "ensure that", meaningZh: "确保" },
    ],
  },
  equivalent: {
    root: { display: "equi-（相等）+ val（价值）+ -ent", explanation: "val 表「价值、力量」（如 value、valid）：价值相等，即等同的。" },
    mnemonic: "be equivalent to 后接名词或 doing，to 是介词。",
    examples: [
      { sentence: "One credit here is equivalent to two hours of lab work.", translationZh: "这里一个学分相当于两小时实验。" },
    ],
    collocations: [
      { phrase: "equivalent to", meaningZh: "相当于" },
    ],
  },
  essential: {
    root: { display: "ess（存在）+ -ential（形容词后缀）", explanation: "essence 是「本质」，essential 即「关乎本质的」——缺了就不成立。" },
    mnemonic: "去掉它整件事就散了，那就是 essential，比 important 更硬。",
    examples: [
      { sentence: "Daily practice is essential if you want to improve quickly.", translationZh: "想快速进步，每天练习是必不可少的。" },
    ],
    collocations: [
      { phrase: "be essential to/for", meaningZh: "对……必不可少" },
    ],
  },
  establish: {
    root: { display: "e-（出）+ stabl（站立）", explanation: "stabl 与 stand、stable 同源：使某物稳稳立起来。" },
    mnemonic: "既可以是「建立机构」，也可以是「确证事实」——两义都从「立稳」来。",
    examples: [
      { sentence: "Researchers have established a link between sleep and memory.", translationZh: "研究者已确认睡眠与记忆之间存在关联。" },
    ],
    collocations: [
      { phrase: "establish a relationship", meaningZh: "建立关系" },
    ],
  },
  estimate: {
    root: { display: "aestim（估价）", explanation: "源自拉丁语 aestimare「估价」，即估计、估算。" },
    mnemonic: "estimate 后接名词或 that 从句，不接 to do。",
    examples: [
      { sentence: "Experts estimate the cost at around two million.", translationZh: "专家估计成本在两百万左右。" },
    ],
    collocations: [
      { phrase: "estimate the cost", meaningZh: "估算成本" },
    ],
  },
  evaluate: {
    root: { display: "value（价值）→ evaluate", explanation: "通过 value 这一词形关联，记住「判断价值」的核心含义。" },
    mnemonic: "先看事实，再判断价值，就是 evaluate。",
    examples: [
      { sentence: "We need to evaluate the results carefully.", translationZh: "我们需要仔细评估这些结果。" },
    ],
    collocations: [
      { phrase: "evaluate the impact", meaningZh: "评估影响" },
    ],
  },
  evidence: {
    root: { display: "e-（向外）+ vid（看）+ -ence", explanation: "vid 表「看」，evidence 本义「看得见的东西」，引申为证据。" },
    mnemonic: "不可数名词，别说 an evidence——要说得用 a piece of evidence。",
    examples: [
      { sentence: "There is little evidence to support that claim.", translationZh: "几乎没有证据支持那个说法。" },
    ],
    collocations: [
      { phrase: "evidence for/of", meaningZh: "……的证据" },
    ],
  },
  exaggerate: {
    root: { display: "ex-（加强）+ agger（堆积）+ -ate", explanation: "agger 表「堆」（如 exaggerate 本义「往上堆」），即夸大。" },
    mnemonic: "exaggerate 是「说得比事实大」，overstate 是「说得比事实重」。",
    examples: [
      { sentence: "The report exaggerates the benefits of the new method.", translationZh: "报告夸大了新方法的好处。" },
    ],
    collocations: [
      { phrase: "exaggerate the effect", meaningZh: "夸大效果" },
    ],
  },
  evolve: {
    root: { display: "e-（向外）+ volv（滚、转）", explanation: "volv 表「滚动」（如 revolve、involve）：向外滚开，即逐渐展开、演变。" },
    mnemonic: "evolve from（由……演变而来）；evolve into（演变成）。",
    examples: [
      { sentence: "The method evolved from a much older technique.", translationZh: "这种方法由一种更古老的技术演变而来。" },
    ],
    collocations: [
      { phrase: "evolve into", meaningZh: "演变成" },
    ],
  },
  examine: {
    root: { display: "exam（秤、衡量）→ examine", explanation: "源自 examen（天平），本义「称量」，引申为仔细检查。" },
    mnemonic: "examine 是「细看、体检、考问」，比 check 更深入。",
    examples: [
      { sentence: "The report examines why so many students drop out.", translationZh: "这份报告审视了为什么有这么多学生辍学。" },
    ],
    collocations: [
      { phrase: "examine the evidence", meaningZh: "审查证据" },
    ],
  },
  extract: {
    root: { display: "ex-（向外）+ tract（拉）", explanation: "tract 表「拉」（如 attract、abstract）：拉出来，即提取。" },
    mnemonic: "extract A from B；名词 extraction 同理。",
    examples: [
      { sentence: "Researchers extracted DNA from the samples.", translationZh: "研究人员从样本中提取了 DNA。" },
    ],
    collocations: [
      { phrase: "extract from", meaningZh: "从……提取" },
    ],
  },
  extend: {
    root: { display: "ex-（向外）+ tend（伸展）", explanation: "tend / tens 表「拉、伸」（如 intend、intense）：向外拉长，即延长。" },
    mnemonic: "extend a deadline（延长期限）；extend thanks（致谢）。",
    examples: [
      { sentence: "The deadline was extended by two weeks.", translationZh: "截止日期延长了两周。" },
    ],
    collocations: [
      { phrase: "extend a deadline", meaningZh: "延长期限" },
    ],
  },
  expose: {
    root: { display: "ex-（向外）+ pose（放置）", explanation: "pos / pon 表「放」（如 propose、expose）：放在外面，即暴露、使接触。" },
    mnemonic: "be exposed to 后接「接触到的东西」，to 是介词。",
    examples: [
      { sentence: "Children exposed to two languages switch tasks faster.", translationZh: "接触两种语言的孩子转换任务更快。" },
    ],
    collocations: [
      { phrase: "be exposed to", meaningZh: "接触到" },
    ],
  },
  explore: {
    root: { display: "ex-（向外）+ plor（探查、呼喊）", explanation: "源自拉丁语 explorare「搜索、探查」（猎人呼喊着搜寻猎物），即探索。" },
    mnemonic: "explore 后可接「问题、可能性」，不一定是真的地理探索。",
    examples: [
      { sentence: "The chapter explores how memory actually works.", translationZh: "这一章探讨记忆究竟如何运作。" },
    ],
    collocations: [
      { phrase: "explore a possibility", meaningZh: "探索可能性" },
    ],
  },
  explicit: {
    root: { display: "ex-（向外）+ plic（折叠）", explanation: "plic 表「折」（如 imply、complicate）：把折着的部分摊开，即明确的。" },
    mnemonic: "explicit（明说的）对 implicit（隐含的），阅读题常考这对。",
    examples: [
      { sentence: "The instructions are explicit about the word limit.", translationZh: "说明对字数限制讲得很明确。" },
    ],
    collocations: [
      { phrase: "explicit instructions", meaningZh: "明确的指示" },
    ],
  },
  expend: {
    root: { display: "ex-（出去）+ pend（称量、支付）", explanation: "pend / pens 表「称量、付出」（如 compensate、expensive）：称出去，即花费。" },
    mnemonic: "expend 多用于时间、精力等正式语境；日常用 spend。",
    examples: [
      { sentence: "They expended enormous effort on a single experiment.", translationZh: "他们在一个实验上投入了巨大精力。" },
    ],
    collocations: [
      { phrase: "expend energy", meaningZh: "耗费精力" },
    ],
  },
  expand: {
    root: { display: "ex-（向外）+ pand（展开）", explanation: "pand 表「铺开」（如 expand 本义「摊开」），即扩大、扩张。" },
    mnemonic: "expand on sth. 是「就某事展开说明」，不是「扩大某物」。",
    examples: [
      { sentence: "The company plans to expand into three new cities.", translationZh: "公司计划扩张到三座新城市。" },
    ],
    collocations: [
      { phrase: "expand into", meaningZh: "扩展到" },
    ],
  },
  exhibit: {
    root: { display: "ex-（向外）+ hibit（拿、持有）", explanation: "hibit 表「持有」（如 prohibit、inhibit）：拿出来给人看，即展出、表现出。" },
    mnemonic: "exhibit 作动词常接「特征、模式」；作名词是「展品」。",
    examples: [
      { sentence: "The samples exhibit the same pattern.", translationZh: "这些样本表现出同样的模式。" },
    ],
    collocations: [
      { phrase: "exhibit a pattern", meaningZh: "表现出某种模式" },
    ],
  },
  exert: {
    root: { display: "ex-（向外）+ sert（加入、施加）", explanation: "sert 表「加入、排列」（如 insert、assert）：把力量加出去，即施加。" },
    mnemonic: "exert influence / pressure on sb.，介词用 on。",
    examples: [
      { sentence: "Parents exert a strong influence on reading habits.", translationZh: "父母对阅读习惯有很大影响。" },
    ],
    collocations: [
      { phrase: "exert influence on", meaningZh: "对……施加影响" },
    ],
  },
  exclude: {
    root: { display: "ex-（向外）+ clud（关闭）", explanation: "clud / clus 表「关」（如 include、conclude）：关在门外，即排除。" },
    mnemonic: "exclude A from B；名词 exclusion 同样接 from。",
    examples: [
      { sentence: "Two studies were excluded from the final analysis.", translationZh: "两项研究被排除在最终分析之外。" },
    ],
    collocations: [
      { phrase: "exclude from", meaningZh: "把……排除在外" },
    ],
  },
  exceed: {
    root: { display: "ex-（超出）+ ceed（走）", explanation: "ceed / cess 表「走」（如 proceed、access）：走出界，即超过。" },
    mnemonic: "exceed 是及物动词，后面直接接宾语，不加 than。",
    examples: [
      { sentence: "The result exceeded all our expectations.", translationZh: "结果超出了我们所有的预期。" },
    ],
    collocations: [
      { phrase: "exceed expectations", meaningZh: "超出预期" },
    ],
  },
  facilitate: {
    root: { display: "facil（容易）+ -itate（动词后缀）", explanation: "源自表示「容易」的词形，核心含义是让事情更容易。" },
    mnemonic: "好的工具不替你走路，却让这条路更好走。",
    examples: [
      { sentence: "Clear instructions facilitate learning.", translationZh: "清晰的指引有助于学习。" },
    ],
    collocations: [
      { phrase: "facilitate communication", meaningZh: "促进沟通" },
    ],
  },
  factor: {
    root: { display: "fact（做、造成）+ -or（施动者）", explanation: "fact 表「做成」，加 -or 指「起作用的那一方」，即因素。" },
    mnemonic: "factor 是「变量之一」，不是唯一原因——常与 among others 连用。",
    examples: [
      { sentence: "Motivation is a key factor in learning success.", translationZh: "动机是学习成功的关键因素。" },
    ],
    collocations: [
      { phrase: "a key factor in", meaningZh: "……的关键因素" },
    ],
  },
  fulfill: {
    root: { display: "full（满）+ fill（填满）", explanation: "两个「满」叠在一起：把要求填满，即实现、履行。" },
    mnemonic: "fulfil（英式）与 fulfill（美式）都对，别写成 fullfill。",
    examples: [
      { sentence: "The programme fulfils the requirements of most majors.", translationZh: "这个项目满足多数专业的要求。" },
    ],
    collocations: [
      { phrase: "fulfil a requirement", meaningZh: "满足要求" },
    ],
  },
  formulate: {
    root: { display: "form（形式、模型）+ -ulate", explanation: "给想法一个成形的外壳，即制定、系统表述。" },
    mnemonic: "formulate 比 make 正式，宾语多是 plan、rule、theory。",
    examples: [
      { sentence: "She formulated the rule in one clear sentence.", translationZh: "她用一句清楚的话把规则表述出来。" },
    ],
    collocations: [
      { phrase: "formulate a plan", meaningZh: "制定计划" },
    ],
  },
  fluctuate: {
    root: { display: "fluct（波动）+ -ate", explanation: "fluctus 是拉丁语「波浪」，即起伏、波动。" },
    mnemonic: "fluctuate between A and B；主语通常是价格、数量、成绩。",
    examples: [
      { sentence: "Prices fluctuated wildly during the first quarter.", translationZh: "第一季度价格剧烈波动。" },
    ],
    collocations: [
      { phrase: "fluctuate between", meaningZh: "在……之间波动" },
    ],
  },
  function: {
    root: { display: "funct（履行、执行）+ -ion（名词后缀）", explanation: "源自 fungi（履行）：事物所履行的职责，即功能。" },
    mnemonic: "function as（充当）/ a function of（是……的函数）——数学与日常义通用。",
    examples: [
      { sentence: "The heart’s main function is to pump blood.", translationZh: "心脏的主要功能是泵血。" },
    ],
    collocations: [
      { phrase: "function as", meaningZh: "起……的作用" },
    ],
  },
  hypothesis: {
    root: { display: "hypo-（在下）+ thesis（放置）", explanation: "thesis 表「放置、命题」（如 thesis、synthesis）：垫在下面的命题，即假说。" },
    mnemonic: "复数是 hypotheses，不是 hypothesises。",
    examples: [
      { sentence: "The data support the hypothesis rather than disprove it.", translationZh: "数据支持这个假说，而不是推翻它。" },
    ],
    collocations: [
      { phrase: "test a hypothesis", meaningZh: "检验假说" },
    ],
  },
  gradual: {
    root: { display: "grad（台阶、级）+ -ual", explanation: "grad 表「步、级」（如 grade、graduate）：一级一级的，即逐渐的。" },
    mnemonic: "gradual 强调「慢而有过程」，不用于突然的变化。",
    examples: [
      { sentence: "Progress is gradual, but it is still progress.", translationZh: "进步是渐进的，但它依然是进步。" },
    ],
    collocations: [
      { phrase: "a gradual change", meaningZh: "渐进的变化" },
    ],
  },
  generate: {
    root: { display: "gener（产生、种类）+ -ate", explanation: "gen 表「生」（如 gene、genius）：生出来，即产生。" },
    mnemonic: "generate 多用于「产生数据、收入、想法」，不用于「制造实物」。",
    examples: [
      { sentence: "The model generates a score for each answer.", translationZh: "模型为每份答案生成一个分数。" },
    ],
    collocations: [
      { phrase: "generate income", meaningZh: "产生收入" },
    ],
  },
  fundamental: {
    root: { display: "fund（底部、基础）+ -amental", explanation: "fund 表「基底」（如 fund、found、profound）：打底的，即根本的。" },
    mnemonic: "fundamental to 后接名词或 doing，to 是介词。",
    examples: [
      { sentence: "Reading is fundamental to every other skill.", translationZh: "阅读是其他一切技能的根本。" },
    ],
    collocations: [
      { phrase: "fundamental to", meaningZh: "对……至关重要" },
    ],
  },
  identify: {
    root: { display: "ident（同一）+ -ify（使……）", explanation: "ident 表「同一」（如 identical），identify 本义「确认是同一个」，引申为识别。" },
    mnemonic: "认出「这就是它」——identify 的重点在确认身份。",
    examples: [
      { sentence: "The first step is to identify the real problem.", translationZh: "第一步是找出真正的问题。" },
    ],
    collocations: [
      { phrase: "identify with", meaningZh: "认同；与……有同感" },
    ],
  },
  immense: {
    root: { display: "im-（不）+ mens（测量）", explanation: "mens / meter 表「测量」（如 measure、dimension）：大到量不出来，即巨大的。" },
    mnemonic: "immense 修饰程度（an immense amount of），不修饰具体尺寸。",
    examples: [
      { sentence: "The change required an immense amount of revision.", translationZh: "这个改动需要极大量的修订。" },
    ],
    collocations: [
      { phrase: "an immense amount of", meaningZh: "大量的" },
    ],
  },
  imitate: {
    root: { display: "im（相像、模仿）+ -itate", explanation: "im 表「像」（如 image、imitate）：照着样子来，即模仿。" },
    mnemonic: "imitate 中性；mimic 常带「滑稽地学样」的意味。",
    examples: [
      { sentence: "Children imitate the way adults speak.", translationZh: "孩子模仿大人说话的方式。" },
    ],
    collocations: [
      { phrase: "imitate a style", meaningZh: "模仿风格" },
    ],
  },
  illustrate: {
    root: { display: "il-（进入）+ lustr（照亮）", explanation: "lustr 表「光」（如 illustrate 本义「照亮」）：照亮道理，即说明。" },
    mnemonic: "illustrate with 后接「用什么例子说明」。",
    examples: [
      { sentence: "Let me illustrate this with a simple example.", translationZh: "让我用一个简单的例子说明这一点。" },
    ],
    collocations: [
      { phrase: "illustrate with", meaningZh: "用……说明" },
    ],
  },
  ignore: {
    root: { display: "i-（= in-，不）+ gnor（知道）", explanation: "gn / gno 表「知道」（如 know、recognize）：不去知道，即忽视。" },
    mnemonic: "ignore 是「明知而有意不理」；be ignorant of 是「压根不知道」。",
    examples: [
      { sentence: "Do not ignore the words you keep forgetting.", translationZh: "别忽略那些你总记不住的词。" },
    ],
    collocations: [
      { phrase: "ignore a warning", meaningZh: "无视警告" },
    ],
  },
  impact: {
    root: { display: "im-（向内）+ pact（压紧）", explanation: "pact 表「压紧」（如 compact 紧凑），本义「撞击、压入」，引申为冲击与影响。" },
    mnemonic: "impact 比 influence 更「重」——强调冲击力和力度。",
    examples: [
      { sentence: "Plastic waste has a lasting impact on marine life.", translationZh: "塑料垃圾对海洋生物有持久的影响。" },
    ],
    collocations: [
      { phrase: "have an impact on", meaningZh: "对……产生影响" },
    ],
  },
  implement: {
    root: { display: "im-（进入）+ ple（填满）", explanation: "ple 表「填满」（如 complete、supplement）：把计划填上细节去做，即实施。" },
    mnemonic: "名词「工具」和动词「实施」同形，看句子里缺的是「物」还是「动作」。",
    examples: [
      { sentence: "The school implemented the new timetable in September.", translationZh: "学校在九月实施了新的课表。" },
    ],
    collocations: [
      { phrase: "implement a policy", meaningZh: "执行政策" },
    ],
  },
  imply: {
    root: { display: "im-（向内）+ ply（折叠）", explanation: "词源意象是「折在里面」，意思藏在话里，没有直接说出。" },
    mnemonic: "把意思折进句子里，让听者自己展开。",
    examples: [
      { sentence: "Silence does not always imply agreement.", translationZh: "沉默并不总是意味着同意。" },
    ],
    collocations: [
      { phrase: "imply that…", meaningZh: "暗示……" },
    ],
  },
  important: {
    root: { display: "import（带入）+ -ant（形容词后缀）", explanation: "词源与「带进来、有分量」相关：有分量的事物自然重要。" },
    mnemonic: "能影响结果的，就是 important——先问「它改变了什么」。",
    examples: [
      { sentence: "It is important to read the question carefully before answering.", translationZh: "答题前仔细读题很重要。" },
    ],
    collocations: [
      { phrase: "it is important to do sth.", meaningZh: "做某事很重要" },
      { phrase: "play an important role in", meaningZh: "在……中起重要作用" },
    ],
  },
  impress: {
    root: { display: "im-（在上）+ press（压）", explanation: "press 表「压」（如 pressure、compress）：压上印记，即使印象深刻。" },
    mnemonic: "be impressed by / with；impress sth. on sb. 是「使某人铭记」。",
    examples: [
      { sentence: "She impressed the examiners with a clear structure.", translationZh: "她以清晰的结构给考官留下印象。" },
    ],
    collocations: [
      { phrase: "be impressed by", meaningZh: "对……印象深刻" },
    ],
  },
  impose: {
    root: { display: "im-（在……上）+ pose（放置）", explanation: "pos / pon 表「放」（如 compose、oppose）：放到别人身上，即强加。" },
    mnemonic: "impose sth. on sb.；impose on sb. 也有「打扰」的意思。",
    examples: [
      { sentence: "The rule imposes a heavy burden on new students.", translationZh: "这条规定给新生带来沉重负担。" },
    ],
    collocations: [
      { phrase: "impose on", meaningZh: "把……强加于" },
    ],
  },
  improve: {
    root: { display: "im-（进入）+ prove（检验、证明）", explanation: "prove 古义有「检验」，improve 原指「耕作使土地变好」，后泛指改善。" },
    mnemonic: "improve 是「变得更好」，对象可以是能力、条件、关系。",
    examples: [
      { sentence: "Reading widely will improve your writing.", translationZh: "广泛阅读会提升你的写作水平。" },
    ],
    collocations: [
      { phrase: "improve on/upon", meaningZh: "对……加以改进" },
    ],
  },
  incorporate: {
    root: { display: "in-（进入）+ corpor（身体）+ -ate", explanation: "corpor 表「身体」（如 corporation）：纳入同一个身体，即包含、合并。" },
    mnemonic: "incorporate A into B；形容词 incorporated 常缩写为 Inc.（公司）。",
    examples: [
      { sentence: "The final version incorporates three of her suggestions.", translationZh: "最终版本吸收了她的三条建议。" },
    ],
    collocations: [
      { phrase: "incorporate into", meaningZh: "并入" },
    ],
  },
  incline: {
    root: { display: "in-（朝向）+ clin（倾斜）", explanation: "clin 表「倾斜」（如 decline、climate）：朝某方向倾斜，即倾向。" },
    mnemonic: "be inclined to do sth.（倾向于），to 是不定式符号。",
    examples: [
      { sentence: "Examiners are inclined to reward clear structure.", translationZh: "考官往往会给结构清晰的答案更高分。" },
    ],
    collocations: [
      { phrase: "be inclined to", meaningZh: "倾向于" },
    ],
  },
  incentive: {
    root: { display: "in-（进入）+ cant（歌唱）+ -ive", explanation: "cant / cent 表「唱」（如 chant、accent）：原指「唱歌招徕、激励」，即动机、激励。" },
    mnemonic: "an incentive to do sth.；tax incentive 是「税收优惠」。",
    examples: [
      { sentence: "Small rewards give students an incentive to keep going.", translationZh: "小小的奖励给学生继续下去的动力。" },
    ],
    collocations: [
      { phrase: "an incentive to", meaningZh: "……的动力" },
    ],
  },
  increase: {
    root: { display: "in-（向内）+ creas（生长）", explanation: "creas 与 create、crescent（新月，渐长）同源，本义是「长起来」。" },
    mnemonic: "increase 强调「变多」这个动作；数量往上走就用它。",
    examples: [
      { sentence: "Demand for skilled workers continues to increase.", translationZh: "对熟练工人的需求持续增加。" },
    ],
    collocations: [
      { phrase: "increase by 20%", meaningZh: "增长了 20%" },
    ],
  },
  indicate: {
    root: { display: "in-（朝向）+ dic（说、指）", explanation: "dic 表「说」（如 dictate、predict）：指向并说出，即表明。" },
    mnemonic: "indicate 是「客观显示」，suggest 是「暗示」，语气强弱不同。",
    examples: [
      { sentence: "The figures indicate a steady rise in enrollment.", translationZh: "这些数字表明入学人数在稳步上升。" },
    ],
    collocations: [
      { phrase: "indicate that…", meaningZh: "表明……" },
    ],
  },
  infer: {
    root: { display: "in-（向内）+ fer（带来）", explanation: "fer 表「携带」（如 refer、transfer）：把意思带进来，即推断。" },
    mnemonic: "infer（读者推断出）对 imply（作者暗示）——阅读题高频考点。",
    examples: [
      { sentence: "From the tone we can infer that the author disagrees.", translationZh: "从语气可以推断作者不同意。" },
    ],
    collocations: [
      { phrase: "infer from", meaningZh: "从……推断" },
    ],
  },
  inevitable: {
    root: { display: "in-（不）+ evit（避免）+ -able", explanation: "evit 表「躲开」（与 avoid 同源）：躲不开的，即不可避免的。" },
    mnemonic: "It is inevitable that…；注意 inevitable 没有「必然正确」的意思。",
    examples: [
      { sentence: "Some forgetting is inevitable; review is the answer.", translationZh: "遗忘不可避免，复习才是解药。" },
    ],
    collocations: [
      { phrase: "it is inevitable that", meaningZh: "……不可避免" },
    ],
  },
  induce: {
    root: { display: "in-（向内）+ duc（引导）", explanation: "duc 表「引导」（如 conduct、deduce）：引导进来，即引起、诱导。" },
    mnemonic: "induce sb. to do sth.（劝使）；induce a change（引起变化）。",
    examples: [
      { sentence: "Poor sleep induces errors even in simple tasks.", translationZh: "睡眠不足连简单任务都会出错。" },
    ],
    collocations: [
      { phrase: "induce a change", meaningZh: "引起变化" },
    ],
  },
  influence: {
    root: { display: "in-（流入）+ flu（流）+ -ence", explanation: "flu 表「流」（如 fluent），本义是「流进来」——像水一样渗入并改变。" },
    mnemonic: "influence 是潜移默化的影响，effect 是已经发生的结果。",
    examples: [
      { sentence: "Peer pressure can strongly influence a teenager’s decisions.", translationZh: "同伴压力会强烈影响青少年的决定。" },
    ],
    collocations: [
      { phrase: "have an influence on", meaningZh: "对……有影响" },
    ],
  },
  justify: {
    root: { display: "just（公正）+ -ify（使……化）", explanation: "使变得正当，即证明……有理、为……辩护。" },
    mnemonic: "justify doing sth.（不接 to do）；排版里「两端对齐」也是这个词。",
    examples: [
      { sentence: "Nothing justifies skipping the review session.", translationZh: "没有什么能为跳过复习开脱。" },
    ],
    collocations: [
      { phrase: "justify a decision", meaningZh: "为决定辩护" },
    ],
  },
  isolate: {
    root: { display: "isol（岛屿）+ -ate", explanation: "与 insulate 同源：变成一座岛，即孤立、隔离。" },
    mnemonic: "isolate A from B；实验语境里指「把变量单独拿出来」。",
    examples: [
      { sentence: "Isolate the variable you want to test.", translationZh: "把你要检验的变量单独隔离出来。" },
    ],
    collocations: [
      { phrase: "isolate from", meaningZh: "把……与……隔离" },
    ],
  },
  intervene: {
    root: { display: "inter-（在……之间）+ ven（来）", explanation: "ven / vent 表「来」（如 prevent、event）：来到中间，即干预、介入。" },
    mnemonic: "intervene in sth.（介入某事）；名词 intervention。",
    examples: [
      { sentence: "Teachers intervened before the gap widened.", translationZh: "差距扩大之前，老师就介入了。" },
    ],
    collocations: [
      { phrase: "intervene in", meaningZh: "干预" },
    ],
  },
  interpret: {
    root: { display: "inter-（在……之间）+ pret（传递、价值）", explanation: "在双方之间传话，于是有了「口译」与「解释」两义。" },
    mnemonic: "interpret A as B（把 A 理解为 B）；口译员也叫 interpreter。",
    examples: [
      { sentence: "Different readers interpret the ending differently.", translationZh: "不同读者对结尾有不同解读。" },
    ],
    collocations: [
      { phrase: "interpret as", meaningZh: "把……理解为" },
    ],
  },
  intense: {
    root: { display: "in-（加强）+ tens（拉紧）", explanation: "tend / tens 表「拉」（如 extend、tension）：拉到很紧，即强烈的。" },
    mnemonic: "intense 修饰「程度高」的事物（heat、pressure、competition）。",
    examples: [
      { sentence: "Intense revision works only if you sleep enough.", translationZh: "只有睡够了，高强度复习才有效。" },
    ],
    collocations: [
      { phrase: "intense pressure", meaningZh: "巨大的压力" },
    ],
  },
  integrate: {
    root: { display: "integer（完整、未触碰）", explanation: "in-（不）+ tang（触碰）：没被碰破的、完整的，即使成一体、整合。" },
    mnemonic: "integrate A into / with B；形容词 integrated 是「融合的」。",
    examples: [
      { sentence: "Try to integrate new words into sentences you actually use.", translationZh: "试着把新词用到你真会说的句子里。" },
    ],
    collocations: [
      { phrase: "integrate into", meaningZh: "融入" },
    ],
  },
  insulate: {
    root: { display: "insul（岛屿）+ -ate", explanation: "insula 是拉丁语「岛」：变成孤岛，即隔离、使隔绝。" },
    mnemonic: "insulate A from B（使 A 免受 B 影响）；物理义是「绝缘」。",
    examples: [
      { sentence: "Good habits insulate you from last-minute panic.", translationZh: "好习惯能让你免于临考前的慌乱。" },
    ],
    collocations: [
      { phrase: "insulate from", meaningZh: "使免于" },
    ],
  },
  institute: {
    root: { display: "in-（在上）+ stit（设立、站立）", explanation: "stit 表「设立」（如 constitute、substitute）：立起来，即设立、制定。" },
    mnemonic: "institute 是动词「设立」；institution 是名词「机构/制度」。",
    examples: [
      { sentence: "The university instituted a new reading requirement last year.", translationZh: "这所大学去年设立了新的阅读要求。" },
    ],
    collocations: [
      { phrase: "institute a rule", meaningZh: "制定规则" },
    ],
  },
  install: {
    root: { display: "in-（在内）+ stall（位置）", explanation: "stall 表「位置、摊位」（如 stall）：放到位置上安置好，即安装、安置。" },
    mnemonic: "install software（装软件）；install sb. in office（使就职）。",
    examples: [
      { sentence: "Install the app before the first class.", translationZh: "第一次课前装好这个应用。" },
    ],
    collocations: [
      { phrase: "install software", meaningZh: "安装软件" },
    ],
  },
  initiate: {
    root: { display: "in-（进入）+ it（走）+ -iate", explanation: "it 表「走」（如 initial、exit）：走进去开头，即发起、开始。" },
    mnemonic: "initiate 比 start 正式，宾语多是 programme、talks、process。",
    examples: [
      { sentence: "She initiated a weekly review session for the class.", translationZh: "她为班级发起了一个每周一次的复习。" },
    ],
    collocations: [
      { phrase: "initiate a programme", meaningZh: "启动项目" },
    ],
  },
  inherit: {
    root: { display: "in-（在内）+ her（继承人）", explanation: "her 表「继承」（如 heritage、heir）：接过来成为自己的，即继承。" },
    mnemonic: "inherit sth. from sb.；计算机语境里指「继承父类特性」。",
    examples: [
      { sentence: "The system inherits several features from the old design.", translationZh: "这个系统继承了旧设计的若干特性。" },
    ],
    collocations: [
      { phrase: "inherit a feature", meaningZh: "继承特性" },
    ],
  },
  maintain: {
    root: { display: "main（手）+ tain（保持）", explanation: "词源意象为「用手保持」，引申为维持与维护。" },
    mnemonic: "用手稳稳托住一种状态，让它保持下去。",
    examples: [
      { sentence: "It is important to maintain a healthy routine.", translationZh: "保持健康的作息很重要。" },
    ],
    collocations: [
      { phrase: "maintain a balance", meaningZh: "保持平衡" },
    ],
  },
  manipulate: {
    root: { display: "man（手）+ pul（填充、操作）+ -ate", explanation: "man 表「手」（如 manual、manufacture）：用手摆弄，即操作、操纵。" },
    mnemonic: "manipulate 作「操纵」时多带贬义（manipulate data / public opinion）。",
    examples: [
      { sentence: "The study manipulated two variables at a time.", translationZh: "该研究一次操纵两个变量。" },
    ],
    collocations: [
      { phrase: "manipulate data", meaningZh: "操纵数据" },
    ],
  },
  method: {
    root: { display: "meta-（沿着）+ hod（路）", explanation: "源自希腊语 methodos（追寻之路）：通往目标的路径，即方法。" },
    mnemonic: "method 偏「系统化的做法」，way 更口语。",
    examples: [
      { sentence: "This method works well for students who learn by doing.", translationZh: "这个方法对「边做边学」的学生很有效。" },
    ],
    collocations: [
      { phrase: "a method of doing", meaningZh: "做……的方法" },
    ],
  },
  motivate: {
    root: { display: "mot（移动）+ -ivate", explanation: "mot / mov 表「动」（如 motion、move）：让人动起来，即激励。" },
    mnemonic: "motivate sb. to do sth.；名词 motivation 常与 lose / lack 搭配。",
    examples: [
      { sentence: "Clear progress motivates students more than praise.", translationZh: "明确的进步比表扬更能激励学生。" },
    ],
    collocations: [
      { phrase: "motivate sb. to", meaningZh: "激励某人做" },
    ],
  },
  necessary: {
    root: { display: "necess（不可避免）+ -ary（形容词后缀）", explanation: "necessity 是「必然性、必需」，necessary 即「不得不有的」。" },
    mnemonic: "necessary 说的是「非有不可」，比 important 强、跟 essential 近。",
    examples: [
      { sentence: "If necessary, we can review the plan before Friday.", translationZh: "如果有必要，我们可以在周五前复查这个计划。" },
    ],
    collocations: [
      { phrase: "if necessary", meaningZh: "如果有必要" },
    ],
  },
  negotiate: {
    root: { display: "neg-（不）+ oti（闲暇）", explanation: "negotium 本是「没有闲暇（即忙于事务）」，后指「谈生意、协商」。" },
    mnemonic: "negotiate with sb. over / for sth.；不加 about。",
    examples: [
      { sentence: "They negotiated a longer deadline with the supervisor.", translationZh: "他们和导师谈成了更长的期限。" },
    ],
    collocations: [
      { phrase: "negotiate with", meaningZh: "与……协商" },
    ],
  },
  observe: {
    root: { display: "ob-（朝向）+ serv（守护、注视）", explanation: "serv 表「看守」（如 preserve 保存）：盯着看，即观察；也指「遵守」。" },
    mnemonic: "observe 双义：观察（看） / 遵守（守规则）——都由「守着」来。",
    examples: [
      { sentence: "Scientists observed a slow change in the local climate.", translationZh: "科学家观察到当地气候的缓慢变化。" },
    ],
    collocations: [
      { phrase: "observe that…", meaningZh: "观察到……" },
    ],
  },
  obtain: {
    root: { display: "ob-（朝向、对着）+ tain（保持）", explanation: "tain 表「保持」，ob- 表朝向：伸手抓住并留住，就是获得。" },
    mnemonic: "obtain 偏正式，多用于「取得数据、许可、学位」。",
    examples: [
      { sentence: "You must obtain permission before using these images.", translationZh: "使用这些图片前必须先获得许可。" },
    ],
    collocations: [
      { phrase: "obtain information", meaningZh: "获取信息" },
    ],
  },
  occur: {
    root: { display: "oc-（朝向）+ cur（跑）", explanation: "cur / curs 表「跑」（如 current、recur）：跑过来出现，即发生。" },
    mnemonic: "occur 没有被动语态；it occurs to sb. that… 是「某人想到」。",
    examples: [
      { sentence: "The same error occurs in three of her essays.", translationZh: "同样的错误在她三篇作文里出现。" },
    ],
    collocations: [
      { phrase: "occur to", meaningZh: "被想到" },
    ],
  },
  occupy: {
    root: { display: "oc-（= ob-，朝向）+ cup（抓取）", explanation: "cap / cup 表「抓、拿」（如 capture、accept）：抓住不放，即占据、占用。" },
    mnemonic: "be occupied with sth.（忙于某事）；occupy 不用于进行时被动。",
    examples: [
      { sentence: "Revision occupies most of my weekends.", translationZh: "复习占了我周末的大部分时间。" },
    ],
    collocations: [
      { phrase: "occupy a position", meaningZh: "占据位置" },
    ],
  },
  opportunity: {
    root: { display: "opportun（顺风入港）+ -ity", explanation: "ob-（朝向）+ port（港口）：船顺风进港，正是「好时机」。" },
    mnemonic: "opportunity 强调「时机恰当」，chance 更偏「偶然」。",
    examples: [
      { sentence: "Studying abroad gave her the opportunity to see another culture.", translationZh: "留学让她有机会了解另一种文化。" },
    ],
    collocations: [
      { phrase: "take the opportunity to", meaningZh: "借机做某事" },
    ],
  },
  participate: {
    root: { display: "part（部分）+ cip（取）+ -ate", explanation: "cip / cap 表「拿」（如 accept、anticipate）：拿走一份，即参与。" },
    mnemonic: "participate in，不加 to；名词 participation 也接 in。",
    examples: [
      { sentence: "Students who participate in class retain more.", translationZh: "课上参与的学生记得更多。" },
    ],
    collocations: [
      { phrase: "participate in", meaningZh: "参与" },
    ],
  },
  oppose: {
    root: { display: "op-（= ob-，相对）+ pose（放置）", explanation: "pos / pon 表「放」（如 propose、expose）：放在对立面，即反对。" },
    mnemonic: "be opposed to 里 to 是介词，后接 doing，不是 to do。",
    examples: [
      { sentence: "She opposed changing the exam format.", translationZh: "她反对改变考试形式。" },
    ],
    collocations: [
      { phrase: "oppose a plan", meaningZh: "反对计划" },
    ],
  },
  perceive: {
    root: { display: "per-（完全）+ ceive（拿取）", explanation: "与 receive 共享表示「拿取」的词根；可理解为用感官捕捉。" },
    mnemonic: "感官先捕捉到信息，头脑才形成理解。",
    examples: [
      { sentence: "People may perceive the same event differently.", translationZh: "人们对同一事件可能有不同的看法。" },
    ],
    collocations: [
      { phrase: "perceive…as…", meaningZh: "将……视为……" },
    ],
  },
  persist: {
    root: { display: "per-（贯穿）+ sist（站立）", explanation: "源自拉丁语 persistere，有「持续站立、坚持」的含义。" },
    mnemonic: "把自己想成一棵站稳的树：风会来，但你依然坚持。",
    examples: [
      { sentence: "If you persist in your efforts, you will make progress.", translationZh: "如果坚持努力，你就会取得进步。" },
    ],
    collocations: [
      { phrase: "persist in doing sth.", meaningZh: "坚持做某事" },
    ],
  },
  persuade: {
    root: { display: "per-（彻底）+ suad（劝说）", explanation: "suad / suas 表「劝」（如 persuasion、dissuade）：劝到对方点头，即说服。" },
    mnemonic: "persuade sb. to do / into doing；劝阻是 dissuade sb. from doing。",
    examples: [
      { sentence: "No one persuaded him to change his method.", translationZh: "没人说服他改变方法。" },
    ],
    collocations: [
      { phrase: "persuade sb. to", meaningZh: "说服某人做" },
    ],
  },
  potential: {
    root: { display: "potent（有力量的）+ -ial（形容词后缀）", explanation: "potent 是「强有力的」，potential 指力量尚未释放出来的状态。" },
    mnemonic: "潜力是「还没发生的力量」——所以它既可能是收益，也可能是风险。",
    examples: [
      { sentence: "The new policy has the potential to benefit small businesses.", translationZh: "这项新政策有让小企业受益的可能。" },
    ],
    collocations: [
      { phrase: "have the potential to", meaningZh: "有……的可能" },
    ],
  },
  precise: {
    root: { display: "pre-（预先）+ cis（切）", explanation: "cis / cid 表「切」（如 decide、concise）：预先切得整齐，即精确的。" },
    mnemonic: "precise 强调「分毫不差」，accurate 强调「与事实相符」。",
    examples: [
      { sentence: "Give precise figures, not rounded ones.", translationZh: "给出精确数字，不要取整。" },
    ],
    collocations: [
      { phrase: "precise figures", meaningZh: "精确的数字" },
    ],
  },
  precede: {
    root: { display: "pre-（在前）+ cede（走）", explanation: "ced / cess 表「走」（如 proceed、exceed）：走在前面，即先于。" },
    mnemonic: "precede（先于）与 proceed（继续）只差一个字母，写作时最易写混。",
    examples: [
      { sentence: "A short outline precedes the main argument.", translationZh: "主要论证之前有一段简短提纲。" },
    ],
    collocations: [
      { phrase: "precede with", meaningZh: "以……开头" },
    ],
  },
  predict: {
    root: { display: "pre-（预先）+ dict（说）", explanation: "dict 表「说」（如 dictate）：预先说出，即预测。" },
    mnemonic: "predict 是「基于依据的预判」，forecast 多用于天气、经济数据。",
    examples: [
      { sentence: "It is hard to predict the outcome of the election.", translationZh: "很难预测这次选举的结果。" },
    ],
    collocations: [
      { phrase: "predict that…", meaningZh: "预测……" },
    ],
  },
  prevail: {
    root: { display: "pre-（在前）+ vail（力量）", explanation: "val / vail 表「强、有价值」（如 value、valid）：力量占先，即盛行、获胜。" },
    mnemonic: "prevail over（胜过）；prevail on sb.（说服某人）。",
    examples: [
      { sentence: "Common sense prevailed over the original plan.", translationZh: "常识最终胜过了原定计划。" },
    ],
    collocations: [
      { phrase: "prevail over", meaningZh: "战胜／压过" },
    ],
  },
  premise: {
    root: { display: "pre-（在前）+ mis（送、放）", explanation: "mit / mis 表「送」（如 promise、submit）：先送出来的那句话，即前提。" },
    mnemonic: "on the premise that…（在……前提下）；注意与 premises（房屋）区分。",
    examples: [
      { sentence: "The whole argument rests on a single premise.", translationZh: "整个论证建立在一个前提上。" },
    ],
    collocations: [
      { phrase: "on the premise that", meaningZh: "在……前提下" },
    ],
  },
  prejudice: {
    root: { display: "pre-（预先）+ judic（判断）", explanation: "judic 表「判断」（如 judge、judicial）：在了解之前就下了判断，即偏见。" },
    mnemonic: "prejudice against（对……的偏见）；without prejudice to（不影响）。",
    examples: [
      { sentence: "Prejudice against new methods slows everything down.", translationZh: "对新方法的偏见让一切都变慢。" },
    ],
    collocations: [
      { phrase: "prejudice against", meaningZh: "对……的偏见" },
    ],
  },
  prefer: {
    root: { display: "pre-（在前）+ fer（携带）", explanation: "fer 表「带」（如 refer、transfer）：优先带到前面，即更喜欢。" },
    mnemonic: "prefer doing A to doing B；prefer to do rather than do。",
    examples: [
      { sentence: "Most learners prefer short sessions to long ones.", translationZh: "多数学习者宁可短学多次，也不要一次学很久。" },
    ],
    collocations: [
      { phrase: "prefer A to B", meaningZh: "比起 B 更喜欢 A" },
    ],
  },
  prevent: {
    root: { display: "pre-（预先）+ vent（来）", explanation: "vent 表「来」（如 invent、event）：预先来到并挡住，即阻止。" },
    mnemonic: "prevent sb. from doing sth. —— from 不能省。",
    examples: [
      { sentence: "Washing hands often can prevent the spread of illness.", translationZh: "勤洗手可以防止疾病传播。" },
    ],
    collocations: [
      { phrase: "prevent sb. from doing", meaningZh: "阻止某人做某事" },
    ],
  },
  principle: {
    root: { display: "prin（第一）+ cip（拿取）+ -le", explanation: "prin 表「第一、首要」（如 prince、principal）：最根本的那一条。" },
    mnemonic: "in principle 是「原则上」，principal 是「主要的/校长」——拼写差一个字母。",
    examples: [
      { sentence: "Fairness is a basic principle of any good system.", translationZh: "公平是任何好制度的基本原则。" },
    ],
    collocations: [
      { phrase: "in principle", meaningZh: "原则上" },
    ],
  },
  proceed: {
    root: { display: "pro-（向前）+ ceed（走）", explanation: "ceed / cess 表「走」（如 exceed、access）：往前走，即继续进行。" },
    mnemonic: "proceed to do / proceed with sth.；名词 process 与它不同源但同源族。",
    examples: [
      { sentence: "Once the outline is ready, proceed to the first draft.", translationZh: "提纲一准备好，就继续写初稿。" },
    ],
    collocations: [
      { phrase: "proceed with", meaningZh: "继续进行" },
    ],
  },
  process: {
    root: { display: "pro-（向前）+ cess（走）", explanation: "cess 表「走」（如 proceed、excess）：一步一步往前走，即为过程。" },
    mnemonic: "in the process of（在……过程中）；动词义是「处理（数据/申请）」。",
    examples: [
      { sentence: "Learning a language is a slow process.", translationZh: "学一门语言是个缓慢的过程。" },
    ],
    collocations: [
      { phrase: "in the process of", meaningZh: "在……的过程中" },
    ],
  },
  prohibit: {
    root: { display: "pro-（在前）+ hibit（持有）", explanation: "hibit 表「持有」（如 exhibit、inhibit）：在前面拦住不让你持有，即禁止。" },
    mnemonic: "prohibit sb. from doing；名词 prohibition 也接 against。",
    examples: [
      { sentence: "The rules prohibit students from using phones in class.", translationZh: "规定禁止学生在课堂上使用手机。" },
    ],
    collocations: [
      { phrase: "prohibit from", meaningZh: "禁止做" },
    ],
  },
  promote: {
    root: { display: "pro-（向前）+ mot（移动）", explanation: "mot 与 move、motion 同源，promote 即「向前推动」。" },
    mnemonic: "三义相通：推动事物（促进）、推人向上（晋升）、推向市场（推销）。",
    examples: [
      { sentence: "The campaign aims to promote healthy eating among teenagers.", translationZh: "这项活动旨在促进青少年的健康饮食。" },
    ],
    collocations: [
      { phrase: "promote cooperation", meaningZh: "促进合作" },
    ],
  },
  protect: {
    root: { display: "pro-（在前）+ tect（覆盖）", explanation: "tect 表「覆盖」（如 detect 揭开、protect 覆盖）：在前面盖住，即保护。" },
    mnemonic: "protect A from B（保护 A 免受 B）——from 是关键。",
    examples: [
      { sentence: "We must protect the forest from further damage.", translationZh: "我们必须保护森林免遭进一步破坏。" },
    ],
    collocations: [
      { phrase: "protect sb. from", meaningZh: "保护某人免受" },
    ],
  },
  provide: {
    root: { display: "pro-（向前）+ vid（看）+ -e", explanation: "vid 表「看」，provide 本义「预先看到、事先准备」，引申为提供。" },
    mnemonic: "provide sb. with sth. = provide sth. for sb.，两种搭配都要记。",
    examples: [
      { sentence: "The university provides students with free access to the library.", translationZh: "这所大学为学生免费开放图书馆。" },
    ],
    collocations: [
      { phrase: "provide sb. with sth.", meaningZh: "向某人提供某物" },
    ],
  },
  provoke: {
    root: { display: "pro-（向前）+ vok（呼喊）", explanation: "voc / vok 表「声音、叫」（如 advocate、vocal）：朝前喊出来，即激起、引发。" },
    mnemonic: "provoke 多接 reaction、discussion、anger，常带负面结果。",
    examples: [
      { sentence: "His question provoked a long discussion.", translationZh: "他的问题引发了一场长讨论。" },
    ],
    collocations: [
      { phrase: "provoke a reaction", meaningZh: "引起反应" },
    ],
  },
  pursue: {
    root: { display: "pur-（向前）+ sue（跟随）", explanation: "sue 表「跟随」（如 sue 起诉、ensue 接着发生）：一路跟上去，即追求。" },
    mnemonic: "pursue 的对象常是「目标、事业、学位」这类长期之物。",
    examples: [
      { sentence: "She decided to pursue a career in teaching.", translationZh: "她决定从事教师职业。" },
    ],
    collocations: [
      { phrase: "pursue a goal", meaningZh: "追求目标" },
    ],
  },
  qualify: {
    root: { display: "qual（性质、种类）+ -ify（使……化）", explanation: "qual 表「什么样」（如 quality）：使具备某种性质，即取得资格。" },
    mnemonic: "qualify for（有资格获得）；qualify as（取得……资格）。",
    examples: [
      { sentence: "Two more credits qualify you for the advanced class.", translationZh: "再修两个学分你就有资格上高级班。" },
    ],
    collocations: [
      { phrase: "qualify for", meaningZh: "有资格获得" },
    ],
  },
  recognize: {
    root: { display: "re-（再次）+ cogn（知道）", explanation: "cogn 表「知道」（如 cognition 认知），认出即「再次知道」。" },
    mnemonic: "recognize 是「认出来」，不是「承认」——后者是 admit/acknowledge。",
    examples: [
      { sentence: "Employers increasingly recognize the value of soft skills.", translationZh: "雇主越来越认识到软技能的价值。" },
    ],
    collocations: [
      { phrase: "recognize sb. as", meaningZh: "承认某人是……" },
    ],
  },
  reduce: {
    root: { display: "re-（向回）+ duc（引导）", explanation: "duc 表「引导」，reduce 本义「引回来」，引申为减少、降低。" },
    mnemonic: "reduce 常接 to（降到某值）/ by（降了多少），两个介词别混。",
    examples: [
      { sentence: "Regular exercise can reduce the risk of heart disease.", translationZh: "规律运动可以降低患心脏病的风险。" },
    ],
    collocations: [
      { phrase: "reduce sth. to", meaningZh: "把……降到" },
    ],
  },
  reflect: {
    root: { display: "re-（向后）+ flect（弯折）", explanation: "flect 表「弯折」（如 flexible）：光折回来是反射，思绪折回来是反思。" },
    mnemonic: "reflect on（反思）/ reflect（反映）——一个向内，一个向外。",
    examples: [
      { sentence: "Take a moment to reflect on what you have learned.", translationZh: "花点时间反思你学到的东西。" },
    ],
    collocations: [
      { phrase: "reflect on", meaningZh: "反思；思考" },
    ],
  },
  reinforce: {
    root: { display: "re-（再）+ in-（使）+ force（力量）", explanation: "再次给它加上力量，即加强、强化。" },
    mnemonic: "reinforce 是「加强」，enforce 是「强制执行」——前缀决定意思。",
    examples: [
      { sentence: "Weekly tests reinforce what you revised on Sunday.", translationZh: "每周测验能强化你周日复习的内容。" },
    ],
    collocations: [
      { phrase: "reinforce a habit", meaningZh: "强化习惯" },
    ],
  },
  reject: {
    root: { display: "re-（向后）+ ject（扔）", explanation: "ject 表「扔」（如 project、inject）：扔回去，即拒绝。" },
    mnemonic: "reject 语气强、直接；refuse 相对中性。",
    examples: [
      { sentence: "The committee rejected the proposal without discussion.", translationZh: "委员会未经讨论就否决了这项提议。" },
    ],
    collocations: [
      { phrase: "reject an offer", meaningZh: "拒绝一项提议" },
    ],
  },
  release: {
    root: { display: "re-（向后）+ lease（松开）", explanation: "lease 表「松」（如 lease 租约、loose 松）：松开让它走，即释放。" },
    mnemonic: "三义：释放（人/能量）、发布（作品/数据）、发行（影片）。",
    examples: [
      { sentence: "The company will release its annual report next week.", translationZh: "公司下周将发布年度报告。" },
    ],
    collocations: [
      { phrase: "release a report", meaningZh: "发布报告" },
    ],
  },
  relevant: {
    root: { display: "relevant → relevance", explanation: "以词形关联记忆：relevance 是「相关性」，irrelevant 是「不相关的」。" },
    mnemonic: "写论证时留下与主题有联系的内容，就是 relevant。",
    examples: [
      { sentence: "Choose evidence that is relevant to your argument.", translationZh: "选择与你的论点相关的证据。" },
    ],
    collocations: [
      { phrase: "be relevant to", meaningZh: "与……相关" },
    ],
  },
  replace: {
    root: { display: "re-（再）+ place（放置）", explanation: "重新放一个到原位，即替换。" },
    mnemonic: "replace A with B（用 B 替换 A）——with 引出「新的那个」。",
    examples: [
      { sentence: "Online maps have largely replaced paper maps.", translationZh: "在线地图已在很大程度上取代了纸质地图。" },
    ],
    collocations: [
      { phrase: "replace A with B", meaningZh: "用 B 取代 A" },
    ],
  },
  represent: {
    root: { display: "re-（再）+ present（呈现）", explanation: "使它再次呈现出来，即代表、象征。" },
    mnemonic: "represent 三义：代表（人）、象征（符号）、相当于（比例）。",
    examples: [
      { sentence: "Women represent over half of the workforce.", translationZh: "女性占劳动力的一半以上。" },
    ],
    collocations: [
      { phrase: "represent a change", meaningZh: "代表一种变化" },
    ],
  },
  require: {
    root: { display: "re-（再、加强）+ quir（寻求）", explanation: "quir 表「寻求」，与 acquire、inquire 同根：要求就是「索要」。" },
    mnemonic: "require 比 need 正式，常出现在规则、说明里。",
    examples: [
      { sentence: "This task requires close attention to detail.", translationZh: "这项任务需要密切关注细节。" },
    ],
    collocations: [
      { phrase: "require sb. to do sth.", meaningZh: "要求某人做某事" },
    ],
  },
  research: {
    root: { display: "re-（再、反复）+ search（搜寻）", explanation: "反复搜寻，就是研究。" },
    mnemonic: "作名词不可数（do research），作动词可直接接宾语（research the topic）。",
    examples: [
      { sentence: "Recent research suggests that sleep affects memory.", translationZh: "近期研究表明睡眠会影响记忆。" },
    ],
    collocations: [
      { phrase: "conduct research on", meaningZh: "对……开展研究" },
    ],
  },
  respond: {
    root: { display: "re-（向后）+ spond（承诺、许诺）", explanation: "spond 表「许诺」（如 sponsor、spouse）：作出回应，即答应。" },
    mnemonic: "respond to（对……作出回应）；名词 response，形容词 responsible（负责任的）。",
    examples: [
      { sentence: "She responded to the question without hesitation.", translationZh: "她毫不犹豫地回答了这个问题。" },
    ],
    collocations: [
      { phrase: "respond to", meaningZh: "回应；对……作出反应" },
    ],
  },
  retain: {
    root: { display: "re-（向后）+ tain（保持）", explanation: "与 contain、maintain 的词根相关，强调把事物保留下来。" },
    mnemonic: "知识走过脑海时，伸手把它留下。",
    examples: [
      { sentence: "Spaced practice helps us retain information.", translationZh: "间隔练习帮助我们记住信息。" },
    ],
    collocations: [
      { phrase: "retain information", meaningZh: "记住信息" },
    ],
  },
  reveal: {
    root: { display: "re-（向后）+ veal（帷幕）", explanation: "veil 是「面纱」，reveal 即「揭开面纱」——使显露。" },
    mnemonic: "reveal 是「让本来存在的东西被看见」，不是「创造」。",
    examples: [
      { sentence: "The survey revealed that most readers prefer paper books.", translationZh: "调查显示大多数读者更偏爱纸质书。" },
    ],
    collocations: [
      { phrase: "reveal that…", meaningZh: "揭示出……" },
    ],
  },
  significant: {
    root: { display: "sign（记号）+ -ificant（做出……的）", explanation: "本义是「做出记号的」，引申为值得被记下、值得注意的。" },
    mnemonic: "值得记一笔的差别，才是 significant，不只是「有点大」。",
    examples: [
      { sentence: "There is a significant difference between the two methods.", translationZh: "这两种方法之间存在显著差异。" },
    ],
    collocations: [
      { phrase: "a significant increase in", meaningZh: "……的显著增长" },
    ],
  },
  similar: {
    root: { display: "simil（相似）+ -ar（形容词后缀）", explanation: "源自 similis（相像），与 simulate（模拟）、assemble（聚合）同根。" },
    mnemonic: "be similar to（与……相似）——用 to，不用 with。",
    examples: [
      { sentence: "The two studies reached similar conclusions.", translationZh: "这两项研究得出了相似的结论。" },
    ],
    collocations: [
      { phrase: "be similar to", meaningZh: "与……相似" },
    ],
  },
  specific: {
    root: { display: "spec（看）+ -ific（使……的）", explanation: "spec 表「看」（如 inspect、spectacle）：看得清、指向明确的，即具体的。" },
    mnemonic: "specific 是「明确指向某个」，比 particular 更强调「不含糊」。",
    examples: [
      { sentence: "Could you give a specific example to support your point?", translationZh: "你能举一个具体的例子支持你的观点吗？" },
    ],
    collocations: [
      { phrase: "be specific about", meaningZh: "对……有明确说明" },
    ],
  },
  stable: {
    root: { display: "sta（站立）+ -ble（能够）", explanation: "sta 表「站立」（如 stand、status）：站得住，即稳定。" },
    mnemonic: "stable 强调「不动摇」；steady 强调「持续均匀」。",
    examples: [
      { sentence: "The patient is now in a stable condition.", translationZh: "病人目前情况稳定。" },
    ],
    collocations: [
      { phrase: "a stable environment", meaningZh: "稳定的环境" },
    ],
  },
  strategy: {
    root: { display: "strat（军队）+ -egy（领导）", explanation: "源自希腊语 strategos（将军）：带兵打过仗的谋划，即战略。" },
    mnemonic: "strategy 是「总方针」，tactic 是「具体手段」——层次不同。",
    examples: [
      { sentence: "Good learners have strategies for dealing with unknown words.", translationZh: "好的学习者有应对生词的策略。" },
    ],
    collocations: [
      { phrase: "a strategy for doing", meaningZh: "做……的策略" },
    ],
  },
  structure: {
    root: { display: "stru（建造）+ -ure（名词后缀）", explanation: "stru 与 construct、instrument 同源，指「搭建起来的东西」。" },
    mnemonic: "structure 既是「结构」（名词），也是「组织安排」（动词）。",
    examples: [
      { sentence: "A clear structure makes an essay easier to follow.", translationZh: "清晰的结构让文章更容易读懂。" },
    ],
    collocations: [
      { phrase: "the structure of", meaningZh: "……的结构" },
    ],
  },
  substantial: {
    root: { display: "substance（实质）+ -ial", explanation: "从名词 substance 联想，既可以形容有实质，也可以表示数量可观。" },
    mnemonic: "不是薄薄一层，而是有分量、可观的内容。",
    examples: [
      { sentence: "The project requires a substantial amount of time.", translationZh: "这项工作需要大量时间。" },
    ],
    collocations: [
      { phrase: "substantial progress", meaningZh: "显著进步" },
    ],
  },
  sufficient: {
    root: { display: "suf-（在下面）+ fic（做）+ -ient", explanation: "suf- 表示「在下托住」，-fic 是「做」：托得住，就是够了。" },
    mnemonic: "sufficient 只要求「够用」，不要求「多」——别把它当 abundant。",
    examples: [
      { sentence: "The evidence is not sufficient to support the conclusion.", translationZh: "这些证据不足以支持这个结论。" },
    ],
    collocations: [
      { phrase: "sufficient evidence", meaningZh: "充分的证据" },
    ],
  },
  suggest: {
    root: { display: "sug-（在下面）+ gest（带、运）", explanation: "gest 表「携带」（如 digest 消化）：从底下递上来，即暗示、提议。" },
    mnemonic: "suggest 后接 that 从句常用虚拟（should + 动词原形）；也可表「表明」。",
    examples: [
      { sentence: "The results suggest that the treatment works.", translationZh: "结果表明这种治疗是有效的。" },
    ],
    collocations: [
      { phrase: "suggest doing sth.", meaningZh: "建议做某事" },
    ],
  },
  sustain: {
    root: { display: "sus-（= sub-，在下）+ tain（握住）", explanation: "tain 表「拿住」（如 maintain、retain）：在下面托住，即维持、支撑。" },
    mnemonic: "sustain 强调「长时间撑住」，maintain 强调「保持原状」。",
    examples: [
      { sentence: "Few students sustain that pace for a whole term.", translationZh: "很少有学生能整个学期保持那个节奏。" },
    ],
    collocations: [
      { phrase: "sustain growth", meaningZh: "维持增长" },
    ],
  },
  theory: {
    root: { display: "theor（观看、思辨）+ -y（名词后缀）", explanation: "源自希腊语 theoria（观看、思辨），指系统化的看法。" },
    mnemonic: "in theory 是「理论上」——常与 in practice 对照出现。",
    examples: [
      { sentence: "In theory the plan works, but in practice it may fail.", translationZh: "这个计划理论上可行，但实践中可能失败。" },
    ],
    collocations: [
      { phrase: "in theory", meaningZh: "理论上" },
    ],
  },
  tolerate: {
    root: { display: "toler（忍受、承担）+ -ate", explanation: "源自拉丁语 tolerare「承受、忍耐」，即容忍、容许。" },
    mnemonic: "tolerate 后接名词或 doing，不接 to do。",
    examples: [
      { sentence: "The system tolerates small errors but not big ones.", translationZh: "这个系统容许小错误，但不能有大错。" },
    ],
    collocations: [
      { phrase: "tolerate errors", meaningZh: "容许错误" },
    ],
  },
  transform: {
    root: { display: "trans-（横过、改变）+ form（形状）", explanation: "改变形状本身，即彻底转变。" },
    mnemonic: "transform 是「形变」，比 change 更彻底、更结构性。",
    examples: [
      { sentence: "The internet has transformed the way we work.", translationZh: "互联网改变了我们的工作方式。" },
    ],
    collocations: [
      { phrase: "transform sth. into", meaningZh: "把……转变为" },
    ],
  },
}
