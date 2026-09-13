import { computed, ref, watch } from 'vue'
import { words } from '../data/words'
import { storageGet, storageSet } from '../utils/storage'

/**
 * 学习进度（单例）：分组完成情况、错词本、活跃日期，持久化到本地存储。
 * 学习模型：词库按顺序学习，`learnedCount` 表示「前 N 个词已掌握」。
 * 完成一组需：认词连续 3 轮全对 + 拼写 1 轮全对。
 */
const KEY = 'memorize-words-progress-v3'

export interface ProgressState {
  learnedCount: number
  wrongWordIds: number[]
  activeDays: string[]
}

function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function numberArray(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number') : []
}

function load(): ProgressState {
  const p = storageGet<Partial<ProgressState>>(KEY, {})
  return {
    learnedCount: typeof p.learnedCount === 'number' ? Math.max(0, p.learnedCount) : 0,
    wrongWordIds: numberArray(p.wrongWordIds),
    activeDays: Array.isArray(p.activeDays) ? p.activeDays.filter((s): s is string => typeof s === 'string') : [],
  }
}

/* 模块级单例：所有页面共享同一份响应式状态 */
const state = ref<ProgressState>(load())

watch(
  state,
  (v) => storageSet(KEY, v),
  { deep: true },
)

const learnedCount = computed(() => state.value.learnedCount)
const wrongWordIds = computed(() => state.value.wrongWordIds)

/** 连续打卡天数（今天未学则从昨天起算） */
const streakDays = computed(() => {
  const days = new Set(state.value.activeDays)
  let streak = 0
  const d = new Date()
  if (!days.has(todayStr(d))) d.setDate(d.getDate() - 1)
  while (days.has(todayStr(d))) {
    streak += 1
    d.setDate(d.getDate() - 1)
  }
  return streak
})

export function useProgress() {
  function addLearned(n: number): void {
    state.value = {
      ...state.value,
      learnedCount: Math.min(words.length, state.value.learnedCount + n),
    }
  }

  function recordWrong(id: number): void {
    if (!state.value.wrongWordIds.includes(id)) {
      state.value = { ...state.value, wrongWordIds: [...state.value.wrongWordIds, id] }
    }
  }

  function removeWrong(id: number): void {
    state.value = {
      ...state.value,
      wrongWordIds: state.value.wrongWordIds.filter((x) => x !== id),
    }
  }

  /** 通过整组学习后，将该组单词移出错词本 */
  function clearWrongOfGroup(ids: number[]): void {
    const set = new Set(ids)
    const next = state.value.wrongWordIds.filter((x) => !set.has(x))
    if (next.length !== state.value.wrongWordIds.length) {
      state.value = { ...state.value, wrongWordIds: next }
    }
  }

  function touchToday(): void {
    const t = todayStr()
    if (!state.value.activeDays.includes(t)) {
      state.value = { ...state.value, activeDays: [...state.value.activeDays, t] }
    }
  }

  return {
    state,
    learnedCount,
    wrongWordIds,
    streakDays,
    addLearned,
    recordWrong,
    removeWrong,
    clearWrongOfGroup,
    touchToday,
  }
}
