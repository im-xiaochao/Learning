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
]

export const WORD_CONTENT: Record<string, WordContent> = {
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
