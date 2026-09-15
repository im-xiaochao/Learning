/**
 * 复习会话状态（模块级单例，跨页面共享）。
 * 队列只存单词 id，避免把整个词库对象塞进响应式状态。
 */
import { computed, ref } from 'vue'
import { appWords } from '../data/generated/app/words'
import { useLearning } from './learning'
import type { Familiarity } from './learning'

export type ReviewMode = 'today' | 'weak' | 'favorites'

const queue = ref<string[]>([])
const cursor = ref(0)
const grade = ref<Familiarity | null>(null)
const reveal = ref(true)
const mode = ref<ReviewMode>('today')

function pickIds(ids: string[], limit: number): string[] {
  // 打散后截取，保证每次复习顺序不同
  const a = [...ids]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, limit)
}

/** 组装复习队列；返回是否真的排上了内容 */
export function startReview(next: ReviewMode = 'today'): boolean {
  const { currentGoal, getFamiliarity, favoriteWords, state } = useLearning()
  mode.value = next

  if (next === 'favorites') {
    const ids = favoriteWords.value.map((w) => w.id)
    if (!ids.length) return false
    queue.value = pickIds(ids, ids.length)
  } else if (next === 'weak') {
    const ids = state.value.wordProgress
      .filter((w) => w.familiarity === 'unknown' || w.familiarity === 'fuzzy')
      .map((w) => w.wordId)
    if (!ids.length) return false
    queue.value = pickIds(ids, currentGoal.value.dailyWords)
  } else {
    // 今日复习：优先没学过的词，其次是模糊/不认识的
    const weak = state.value.wordProgress
      .filter((w) => w.familiarity === 'unknown' || w.familiarity === 'fuzzy')
      .map((w) => w.wordId)
    const untouched = appWords.map((w) => w.id).filter((id) => getFamiliarity(id) === undefined)
    const pool = [...pickIds(weak, currentGoal.value.dailyWords), ...pickIds(untouched, currentGoal.value.dailyWords)]
    const uniq = [...new Set(pool)].slice(0, currentGoal.value.dailyWords)
    if (!uniq.length) return false
    queue.value = uniq
  }

  cursor.value = 0
  grade.value = null
  reveal.value = true
  return queue.value.length > 0
}

export function useReview() {
  const currentId = computed(() => queue.value[cursor.value] || '')
  const currentWord = computed(() => appWords.find((w) => w.id === currentId.value))
  const isLast = computed(() => cursor.value >= queue.value.length - 1)
  const total = computed(() => queue.value.length)
  const position = computed(() => cursor.value + 1)

  function setGrade(next: Familiarity) {
    grade.value = next
  }
  function toggleReveal() {
    reveal.value = !reveal.value
  }
  function next() {
    if (cursor.value < queue.value.length) cursor.value += 1
    grade.value = null
    reveal.value = true
  }
  function reset() {
    queue.value = []
    cursor.value = 0
    grade.value = null
  }

  return { queue, cursor, grade, reveal, mode, currentId, currentWord, isLast, total, position, setGrade, toggleReveal, next, reset }
}
