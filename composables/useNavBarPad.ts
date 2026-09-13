import { ref } from 'vue'

/**
 * 自定义导航下移量（单例）：
 * 微信小程序端动态读取胶囊按钮底部位置，内容整体移到胶囊下方；
 * 其他端（H5 等）返回 -1，页面不绑定内联样式，走各自 CSS。
 */
const topPad = ref(-1)

export function useNavBarPad() {
  // #ifdef MP-WEIXIN
  if (topPad.value < 0) {
    try {
      const rect = uni.getMenuButtonBoundingClientRect()
      if (rect && rect.bottom > 0) {
        topPad.value = Math.round(rect.bottom + 8)
      }
    } catch {
      /* 获取失败时保持 -1，走 CSS 默认 */
    }
  }
  // #endif
  return { topPad }
}

/** 生成内联 padding-top 样式（topPad < 0 时返回 undefined，不覆盖 CSS） */
export function padStyle(pad: number): Record<string, string> | undefined {
  return pad >= 0 ? { paddingTop: pad + 'px' } : undefined
}
