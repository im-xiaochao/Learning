import { ref } from 'vue'
import { words } from '../data/words'
import type { Word } from '../data/words'
import { useProgress } from '../composables/useProgress'
import { useSettings } from '../composables/useSettings'

export type SessionMode = 'learn' | 'review' | 'wrongbook'

/** 会话状态（模块级单例，跨页面共享） */
const sessionWords = ref<Word[]>([])
const sessionMode = ref<SessionMode>('learn')
const sessionKey = ref(0)
const sessionIndex = ref(1)

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 学新词：词库顺序取一组 */
export function startLearn(): boolean {
  const { learnedCount } = useProgress()
  const { groupSize } = useSettings()
  const slice = words.slice(learnedCount.value, learnedCount.value + groupSize.value)
  if (slice.length === 0) return false
  sessionWords.value = slice
  sessionMode.value = 'learn'
  sessionIndex.value = Math.floor(learnedCount.value / groupSize.value) + 1
  sessionKey.value += 1
  uni.navigateTo({ url: '/pages/learn/learn' })
  return true
}

/** 复习：已学词抽样，错词优先 */
export function startReview(): boolean {
  const { learnedCount, wrongWordIds } = useProgress()
  const { groupSize } = useSettings()
  if (learnedCount.value === 0) return false
  const learned = words.slice(0, learnedCount.value)
  const wrongSet = new Set(wrongWordIds.value)
  const wrongFirst = shuffle(learned.filter((w) => wrongSet.has(w.id)))
  const rest = shuffle(learned.filter((w) => !wrongSet.has(w.id)))
  const pick = [...wrongFirst, ...rest].slice(0, groupSize.value)
  if (pick.length === 0) return false
  sessionWords.value = pick
  sessionMode.value = 'review'
  sessionKey.value += 1
  uni.navigateTo({ url: '/pages/learn/learn' })
  return true
}

/** 错词本学习：只含错词，数量跟随设置 */
export function startWrongBook(): boolean {
  const { wrongWordIds } = useProgress()
  const { groupSize } = useSettings()
  if (wrongWordIds.value.length === 0) return false
  const pool = wrongWordIds.value
    .map((id) => words.find((w) => w.id === id))
    .filter((w): w is Word => Boolean(w))
  const pick = shuffle(pool).slice(0, groupSize.value)
  if (pick.length === 0) return false
  sessionWords.value = pick
  sessionMode.value = 'wrongbook'
  sessionKey.value += 1
  uni.navigateTo({ url: '/pages/learn/learn' })
  return true
}

/** 完成页「下一组」：学习开新组 / 复习再来一轮 / 错词本继续消灭 */
export function nextSession(): void {
  const { wrongWordIds } = useProgress()
  if (sessionMode.value === 'review') {
    if (!startReview()) uni.navigateBack()
    else uni.redirectTo({ url: '/pages/learn/learn' })
    return
  }
  if (sessionMode.value === 'wrongbook') {
    if (wrongWordIds.value.length === 0) {
      uni.navigateBack()
      return
    }
    if (startWrongBook()) uni.redirectTo({ url: '/pages/learn/learn' })
    else uni.navigateBack()
    return
  }
  if (startLearn()) uni.redirectTo({ url: '/pages/learn/learn' })
  else uni.navigateBack()
}

export function getSession() {
  return { sessionWords, sessionMode, sessionKey, sessionIndex }
}
