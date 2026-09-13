/** 本地存储适配层：统一使用 uni 存储 API（各端一致） */

export function storageGet<T>(key: string, fallback: T): T {
  try {
    const v = uni.getStorageSync(key)
    if (v === '' || v === null || v === undefined) return fallback
    return v as T
  } catch {
    return fallback
  }
}

export function storageSet(key: string, value: unknown): void {
  try {
    uni.setStorageSync(key, value)
  } catch {
    /* 存储不可用时忽略 */
  }
}

export function storageRemove(key: string): void {
  try {
    uni.removeStorageSync(key)
  } catch {
    /* ignore */
  }
}
