/**
 * 政治刷题的会话状态（模块级单例，**只被 pages-politics 分包内的页面引用**）。
 *
 * 为什么放在分包里而不是 stores/：题库正文在 `pages-politics/questions.ts`（分包内），
 * 主包不能引用它。如果这个模块住在 stores/ 并 import 题库，主包的任何一个页面
 * 一引用它就等于把题库拉回主包，分包就白拆了。所以它必须待在分包内部。
 *
 * 队列只存题目 id；题目正文由页面从 `appPoliticsQuestions` 里查。
 */
import { computed, ref } from 'vue'
import { appPoliticsQuestions } from './questions'

/** 'all' 表示不筛选模块 */
export type QuizModuleFilter = 'all' | string

const queue = ref<string[]>([])
const cursor = ref(0)
/** 当前题已选中的选项 key（材料题恒为空）。单选至多 1 个，多选可多个 */
const pickedKeys = ref<string[]>([])
/**
 * 所选 key **排序后拼接**成的字符串，用于写作答记录与判分比对。
 * 单选得到 `"B"`，多选得到 `"ABD"`，材料题为 `""` —— 三种题型共用同一个 string 字段。
 */
const picked = computed(() => [...pickedKeys.value].sort().join(''))
/** 是否已揭示答案（选择题交卷后 / 材料题点「查看参考答案」后） */
const revealed = ref(false)
const moduleFilter = ref<QuizModuleFilter>('all')
/** 这一轮是从哪进来的，用于结果页文案 */
const fromWeak = ref(false)

function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function poolOf(filter: QuizModuleFilter): string[] {
  const pool = filter === 'all' ? appPoliticsQuestions : appPoliticsQuestions.filter((q) => q.module === filter)
  return pool.map((q) => q.id)
}

/**
 * 开始一轮刷题。
 * @param filter  模块筛选，'all' 为全部
 * @param ids     指定题目队列（答错重练用）；不传则按模块取全部
 * @param weak    是否是「只练错题」这一轮
 * @returns 是否排上了题（题库为空时返回 false）
 */
export function startQuiz(filter: QuizModuleFilter = 'all', ids?: string[], weak = false): boolean {
  moduleFilter.value = filter
  fromWeak.value = weak
  const target = ids && ids.length ? ids : poolOf(filter)
  // 打散，避免每次都是同一顺序（错题重练时保留给的顺序更自然，故只在全量时打散）
  queue.value = ids && ids.length ? [...target] : shuffle(target)
  cursor.value = 0
  pickedKeys.value = []
  revealed.value = false
  return queue.value.length > 0
}

/** 把当前题的正确选项 key 归一成「排序后拼接」的字符串，供判分比对 */
export function normalizeKeys(keys: string[]): string {
  return [...keys].sort().join('')
}

export function usePoliticsQuiz() {
  const currentId = computed(() => queue.value[cursor.value] || '')
  const current = computed(() => appPoliticsQuestions.find((q) => q.id === currentId.value))
  const total = computed(() => queue.value.length)
  const position = computed(() => Math.min(cursor.value + 1, Math.max(total.value, 1)))
  const isLast = computed(() => cursor.value >= queue.value.length - 1)

  /** 单选题：替换选择（再点别的选项就是换答案） */
  function select(key: string) {
    if (revealed.value) return
    pickedKeys.value = [key]
  }

  /** 多选题：切换该选项的选中状态 */
  function toggle(key: string) {
    if (revealed.value) return
    pickedKeys.value = pickedKeys.value.includes(key)
      ? pickedKeys.value.filter((k) => k !== key)
      : [...pickedKeys.value, key]
  }

  function isPicked(key: string): boolean {
    return pickedKeys.value.includes(key)
  }

  function reveal() {
    revealed.value = true
  }

  /** 切换答案的展开 / 收起（材料题的「查看 / 隐藏参考答案」） */
  function toggleReveal() {
    revealed.value = !revealed.value
  }

  function next() {
    if (cursor.value < queue.value.length) cursor.value += 1
    pickedKeys.value = []
    revealed.value = false
  }

  function reset() {
    queue.value = []
    cursor.value = 0
    pickedKeys.value = []
    revealed.value = false
  }

  return { queue, cursor, pickedKeys, picked, revealed, moduleFilter, fromWeak, currentId, current, total, position, isLast, select, toggle, isPicked, reveal, toggleReveal, next, reset }
}
