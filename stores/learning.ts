/**
 * 个人学习数据（单例，本地持久化）。
 *
 * 字段严格按《知识点数据存放格式与实例》第 7 节「个人学习数据格式」组织：
 * settings / goalHistory / readingProgress / wordProgress / favoriteWordIds / planItems / learningEvents。
 * 现在存本地存储；接入账号后换成按用户入库，业务字段不用动。
 */
import { computed, ref, watch } from 'vue'
import { storageGet, storageSet } from '../utils/storage'
import { appWords } from '../data/generated/app/words'
import { knowledgeEntries } from '../composables/useContent'

const KEY = 'cishu:user:local:v1'
const SCHEMA_VERSION = '1.0'
const TIMEZONE = 'Asia/Shanghai'

export type Familiarity = 'unknown' | 'fuzzy' | 'familiar'
export type ReadingStatus = 'reading' | 'completed'
export type PlanStatus = 'pending' | 'completed'

export interface GoalEntry {
  effectiveFrom: string
  dailyWords: number
  dailyKnowledgePoints: number
}

export interface ReadingProgress {
  knowledgeId: string
  status: ReadingStatus
  lastSectionId: string | null
  startedAt: string
  lastOpenedAt: string
  completedAt: string | null
  completedContentVersion: number | null
}

export interface WordProgress {
  wordId: string
  familiarity: Familiarity
  lastReviewedAt: string
}

export interface PlanItem {
  id: string
  knowledgeId: string
  status: PlanStatus
  sortOrder: number
  addedAt: string
  completedAt: string | null
}

export interface LearningEvent {
  id: string
  type: 'word_reviewed' | 'knowledge_completed'
  contentId: string
  contentVersion: number
  occurredAt: string
  localDate: string
  timezone: string
  familiarity?: Familiarity
}

export interface LearningState {
  schemaVersion: string
  userId: string
  timezone: string
  settings: { examYear: number; englishExam: string; mathExam: string }
  goalHistory: GoalEntry[]
  readingProgress: ReadingProgress[]
  wordProgress: WordProgress[]
  favoriteWordIds: string[]
  planItems: PlanItem[]
  learningEvents: LearningEvent[]
  updatedAt: string
}

export const DAILY_WORD_OPTIONS = [20, 30, 50, 80]
export const DAILY_KNOWLEDGE_OPTIONS = [1, 2, 3, 5]
export const EXAM_YEARS = [2027, 2028, 2029]
export const ENGLISH_EXAMS = ['英语一', '英语二']
export const MATH_EXAMS = ['数学一', '数学二', '数学三']

/* ── 时间工具 ── */
function pad(n: number): string {
  return String(n).padStart(2, '0')
}
/** 本地日期 YYYY-MM-DD（文档要求按用户时区计算） */
export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function isoNow(d = new Date()): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}
function eventId(): string {
  return `event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/* ── 默认值 ── */
function defaultState(): LearningState {
  return {
    schemaVersion: SCHEMA_VERSION,
    userId: 'local-user',
    timezone: TIMEZONE,
    settings: { examYear: EXAM_YEARS[0], englishExam: ENGLISH_EXAMS[0], mathExam: MATH_EXAMS[0] },
    goalHistory: [{ effectiveFrom: localDate(), dailyWords: DAILY_WORD_OPTIONS[2], dailyKnowledgePoints: DAILY_KNOWLEDGE_OPTIONS[2] }],
    readingProgress: [],
    wordProgress: [],
    favoriteWordIds: [],
    planItems: [],
    learningEvents: [],
    updatedAt: isoNow(),
  }
}

function load(): LearningState {
  const raw = storageGet<Partial<LearningState> | null>(KEY, null)
  const base = defaultState()
  if (!raw || typeof raw !== 'object') return base
  return {
    ...base,
    ...raw,
    settings: { ...base.settings, ...(raw.settings || {}) },
    goalHistory: Array.isArray(raw.goalHistory) && raw.goalHistory.length ? raw.goalHistory : base.goalHistory,
    readingProgress: Array.isArray(raw.readingProgress) ? raw.readingProgress : [],
    wordProgress: Array.isArray(raw.wordProgress) ? raw.wordProgress : [],
    favoriteWordIds: Array.isArray(raw.favoriteWordIds) ? raw.favoriteWordIds : [],
    planItems: Array.isArray(raw.planItems) ? raw.planItems : [],
    learningEvents: Array.isArray(raw.learningEvents) ? raw.learningEvents : [],
  }
}

/* 模块级单例：所有页面共享同一份响应式状态 */
const state = ref<LearningState>(load())

watch(
  state,
  (v) => storageSet(KEY, v),
  { deep: true },
)

/* ── 派生数据 ── */

/** 当前生效的目标：effectiveFrom 不晚于今天的最近一条 */
export const currentGoal = computed<GoalEntry>(() => {
  const today = localDate()
  const applicable = state.value.goalHistory.filter((g) => g.effectiveFrom <= today).sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))
  return applicable[0] || state.value.goalHistory[state.value.goalHistory.length - 1]
})

const readingById = computed(() => new Map(state.value.readingProgress.map((r) => [r.knowledgeId, r])))
const wordProgressById = computed(() => new Map(state.value.wordProgress.map((w) => [w.wordId, w])))

export function getReading(knowledgeId: string): ReadingProgress | undefined {
  return readingById.value.get(knowledgeId)
}

export function getFamiliarity(wordId: string): Familiarity | undefined {
  return wordProgressById.value.get(wordId)?.familiarity
}

export function isFavorite(wordId: string): boolean {
  return state.value.favoriteWordIds.includes(wordId)
}

export function isPlanned(knowledgeId: string): boolean {
  return state.value.planItems.some((p) => p.knowledgeId === knowledgeId && p.status === 'pending')
}

/** 今日某类事件去重后的内容数（同一内容当天重复只计一次） */
function todayDistinct(type: LearningEvent['type']): number {
  const today = localDate()
  const ids = new Set<string>()
  for (const e of state.value.learningEvents) {
    if (e.type === type && e.localDate === today) ids.add(e.contentId)
  }
  return ids.size
}

export const todayWords = computed(() => todayDistinct('word_reviewed'))
export const todayKnowledge = computed(() => todayDistinct('knowledge_completed'))

/** 累计学习量：全部历史事件按内容 ID 去重 */
export const totalWords = computed(() => new Set(state.value.learningEvents.filter((e) => e.type === 'word_reviewed').map((e) => e.contentId)).size)
export const totalKnowledge = computed(
  () => new Set(state.value.learningEvents.filter((e) => e.type === 'knowledge_completed').map((e) => e.contentId)).size,
)

/** 已读知识点数（含进行中） */
export const readKnowledgeCount = computed(() => state.value.readingProgress.length)

/** 连续学习天数：今天没学则从昨天往前算 */
export const streakDays = computed(() => {
  const days = new Set(state.value.learningEvents.map((e) => e.localDate))
  const d = new Date()
  if (!days.has(localDate(d))) d.setDate(d.getDate() - 1)
  let streak = 0
  while (days.has(localDate(d))) {
    streak += 1
    d.setDate(d.getDate() - 1)
  }
  return streak
})

/** 最近 7 天每日去重内容数（无事件补 0），最后一项是今天 */
export function weeklyValues(mode: 'words' | 'knowledge'): number[] {
  const type = mode === 'words' ? 'word_reviewed' : 'knowledge_completed'
  const out: number[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const day = localDate(d)
    const ids = new Set<string>()
    for (const e of state.value.learningEvents) {
      if (e.type === type && e.localDate === day) ids.add(e.contentId)
    }
    out.push(ids.size)
  }
  return out
}

/** 今日待办类别数（单词 / 知识点），范围 0~2 */
export const todayPending = computed(() => {
  const goal = currentGoal.value
  return (todayWords.value < goal.dailyWords ? 1 : 0) + (todayKnowledge.value < goal.dailyKnowledgePoints ? 1 : 0)
})

/** 今日进度环：两项达成率的平均，各自最高 100% */
export const todayPercent = computed(() => {
  const goal = currentGoal.value
  const w = Math.min(1, todayWords.value / goal.dailyWords)
  const k = Math.min(1, todayKnowledge.value / goal.dailyKnowledgePoints)
  return Math.round(((w + k) / 2) * 100)
})

/** 计划项（按 sortOrder） */
export const planEntries = computed(() =>
  [...state.value.planItems]
    .filter((p) => p.status === 'pending')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({ item: p, entry: knowledgeEntries.find((e) => e.point.id === p.knowledgeId) }))
    .filter((x) => x.entry),
)

/** 收藏单词 */
export const favoriteWords = computed(() =>
  state.value.favoriteWordIds.map((id) => appWords.find((w) => w.id === id)).filter((w): w is (typeof appWords)[number] => Boolean(w)),
)

/** 接着上次学：最近打开的阅读记录 */
export const lastReading = computed<ReadingProgress | undefined>(() => {
  return [...state.value.readingProgress].sort((a, b) => (a.lastOpenedAt < b.lastOpenedAt ? 1 : -1))[0]
})

/* ── 写入操作 ── */

function touch() {
  state.value = { ...state.value, updatedAt: isoNow() }
}

/** 记录一次单词复习；返回本次是否首次复习该词（用于学习事件） */
export function reviewWord(wordId: string, familiarity: Familiarity): void {
  const now = isoNow()
  const rest = state.value.wordProgress.filter((w) => w.wordId !== wordId)
  state.value.wordProgress = [...rest, { wordId, familiarity, lastReviewedAt: now }]
  state.value.learningEvents = [
    ...state.value.learningEvents,
    { id: eventId(), type: 'word_reviewed', contentId: wordId, contentVersion: 1, occurredAt: now, localDate: localDate(), timezone: TIMEZONE, familiarity },
  ]
  touch()
}

/** 打开知识点详情：写入「正在阅读」，不算完成（文档：避免一打开就计为完成） */
export function openKnowledge(knowledgeId: string, sectionId: string | null): void {
  const now = isoNow()
  const existing = state.value.readingProgress.find((r) => r.knowledgeId === knowledgeId)
  if (existing) {
    existing.lastOpenedAt = now
    if (sectionId) existing.lastSectionId = sectionId
    state.value.readingProgress = [...state.value.readingProgress]
  } else {
    state.value.readingProgress = [
      ...state.value.readingProgress,
      { knowledgeId, status: 'reading', lastSectionId: sectionId, startedAt: now, lastOpenedAt: now, completedAt: null, completedContentVersion: null },
    ]
  }
  touch()
}

/** 标记已读：写入完成事件；内容已读完则重复调用不重复计数 */
export function completeKnowledge(knowledgeId: string, contentVersion = 1): void {
  const now = isoNow()
  const target = state.value.readingProgress.find((r) => r.knowledgeId === knowledgeId)
  if (target) {
    target.status = 'completed'
    target.completedAt = now
    target.lastOpenedAt = now
    target.completedContentVersion = contentVersion
    state.value.readingProgress = [...state.value.readingProgress]
  } else {
    state.value.readingProgress = [
      ...state.value.readingProgress,
      { knowledgeId, status: 'completed', lastSectionId: null, startedAt: now, lastOpenedAt: now, completedAt: now, completedContentVersion: contentVersion },
    ]
  }
  const alreadyToday = state.value.learningEvents.some(
    (e) => e.type === 'knowledge_completed' && e.contentId === knowledgeId && e.localDate === localDate(),
  )
  if (!alreadyToday) {
    state.value.learningEvents = [
      ...state.value.learningEvents,
      { id: eventId(), type: 'knowledge_completed', contentId: knowledgeId, contentVersion, occurredAt: now, localDate: localDate(), timezone: TIMEZONE },
    ]
  }
  // 阅读完成时同步完成计划项
  const plan = state.value.planItems.find((p) => p.knowledgeId === knowledgeId && p.status === 'pending')
  if (plan) {
    plan.status = 'completed'
    plan.completedAt = now
    state.value.planItems = [...state.value.planItems]
  }
  touch()
}

export function toggleFavorite(wordId: string): boolean {
  const exists = state.value.favoriteWordIds.includes(wordId)
  state.value.favoriteWordIds = exists
    ? state.value.favoriteWordIds.filter((id) => id !== wordId)
    : [...state.value.favoriteWordIds, wordId]
  touch()
  return !exists
}

export function togglePlan(knowledgeId: string): boolean {
  const existing = state.value.planItems.find((p) => p.knowledgeId === knowledgeId && p.status === 'pending')
  if (existing) {
    state.value.planItems = state.value.planItems.filter((p) => p !== existing)
    touch()
    return false
  }
  const maxOrder = state.value.planItems.reduce((m, p) => Math.max(m, p.sortOrder), 0)
  state.value.planItems = [
    ...state.value.planItems,
    { id: `plan-${Date.now().toString(36)}`, knowledgeId, status: 'pending', sortOrder: maxOrder + 10, addedAt: isoNow(), completedAt: null },
  ]
  touch()
  return true
}

/** 保存目标：同一生效日只保留一条；新目标从次日生效（文档约定） */
export function saveGoals(input: { examYear: number; englishExam: string; mathExam: string; dailyWords: number; dailyKnowledgePoints: number }): void {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const effectiveFrom = localDate(tomorrow)
  state.value.settings = { examYear: input.examYear, englishExam: input.englishExam, mathExam: input.mathExam }
  state.value.goalHistory = [
    ...state.value.goalHistory.filter((g) => g.effectiveFrom !== effectiveFrom),
    { effectiveFrom, dailyWords: input.dailyWords, dailyKnowledgePoints: input.dailyKnowledgePoints },
  ]
  touch()
}

export function useLearning() {
  return {
    state,
    currentGoal,
    todayWords,
    todayKnowledge,
    todayPending,
    todayPercent,
    totalWords,
    totalKnowledge,
    readKnowledgeCount,
    streakDays,
    weeklyValues,
    planEntries,
    favoriteWords,
    lastReading,
    getReading,
    getFamiliarity,
    isFavorite,
    isPlanned,
    reviewWord,
    openKnowledge,
    completeKnowledge,
    toggleFavorite,
    togglePlan,
    saveGoals,
  }
}
