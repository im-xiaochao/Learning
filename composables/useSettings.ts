import { ref, watch } from 'vue'
import { storageGet, storageSet } from '../utils/storage'

/** 每组词数的合法范围（自定义输入） */
export const GROUP_SIZE_MIN = 1
export const GROUP_SIZE_MAX = 50
const DEFAULT_SIZE = 10
const KEY = 'memorize-words-settings'

export function clampSize(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_SIZE
  return Math.min(GROUP_SIZE_MAX, Math.max(GROUP_SIZE_MIN, Math.round(v)))
}

/* 单例 */
const groupSize = ref<number>(clampSize(storageGet<number | undefined>(KEY, undefined) ?? DEFAULT_SIZE))

watch(groupSize, (v) => {
  const clamped = clampSize(v)
  if (clamped !== v) groupSize.value = clamped
  storageSet(KEY, { groupSize: clamped })
})

export function useSettings() {
  return { groupSize, GROUP_SIZE_MIN, GROUP_SIZE_MAX, clampSize }
}
