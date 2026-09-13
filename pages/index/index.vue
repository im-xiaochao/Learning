<script setup lang="ts">
import { computed } from 'vue'
import { words } from '../../data/words'
import type { Word } from '../../data/words'
import { GROUP_SIZE_MIN, GROUP_SIZE_MAX, clampSize, useSettings } from '../../composables/useSettings'
import { useProgress } from '../../composables/useProgress'
import { startLearn, startReview } from '../../stores/session'

const { groupSize } = useSettings()
const { learnedCount, wrongWordIds } = useProgress()

const total = words.length
const remaining = computed(() => total - learnedCount.value)
const percent = computed(() => Math.round((learnedCount.value / total) * 100))
const allDone = computed(() => remaining.value <= 0)
const sessionSize = computed(() => Math.min(groupSize.value, remaining.value))

/** 今日一词：按日期轮换 */
const todayWord = computed<Word | null>(() => {
  if (total === 0) return null
  const day = Math.floor(Date.now() / 86400000)
  return words[day % total]!
})

function adjust(delta: number): void {
  groupSize.value = clampSize(groupSize.value + delta)
}

function onSizeInput(e: { detail: { value: string } }): void {
  const v = Number.parseInt(e.detail.value, 10)
  if (Number.isNaN(v)) return
  groupSize.value = clampSize(v)
}

function goWrong(): void {
  uni.navigateTo({ url: '/pages/wrong/wrong' })
}

function goStats(): void {
  uni.navigateTo({ url: '/pages/stats/stats' })
}
</script>

<template>
  <view class="page">
    <view class="home">
      <!-- 顶栏：尊重顶部安全区，右侧留空给微信胶囊 -->
      <view class="home-top">
        <view class="home-heading">
          <text class="home-kicker">考研英语 · 今日学习</text>
          <view class="home-title-row">
            <text class="home-title">背单词</text>
            <text class="home-status">{{ allDone ? '今日已完成' : '还剩 ' + remaining + ' 词' }}</text>
          </view>
        </view>
      </view>

      <!-- 今日一词 -->
      <view v-if="todayWord" class="daily card">
        <view class="daily-top">
          <text class="daily-label">今日一词</text>
          <text class="daily-mark">专注 1 词</text>
        </view>
        <view class="daily-main">
          <view class="daily-word">
            <text class="daily-word-text">{{ todayWord.word }}</text>
            <text class="daily-phonetic">{{ todayWord.phonetic }}</text>
          </view>
          <text class="daily-meaning">{{ todayWord.meaning }}</text>
        </view>
      </view>

      <!-- 学习进度 -->
      <view class="progress-card card">
        <view class="progress-top">
          <text class="progress-label">学习进度</text>
          <text class="progress-percent">{{ percent }}%</text>
        </view>
        <view class="progress-track">
          <view class="progress-fill" :style="{ width: percent + '%' }" />
        </view>
        <view class="progress-bottom">
          <text class="progress-num"><text class="progress-num-b">{{ learnedCount }}</text> / {{ total }} 词</text>
          <text class="progress-tip">认词 3 轮 + 拼写 1 轮</text>
        </view>
      </view>

      <!-- 每组词数设置 -->
      <view class="settings-card card">
        <view class="settings-copy">
          <text class="settings-label">每次学习</text>
          <text class="settings-helper">{{ GROUP_SIZE_MIN }}–{{ GROUP_SIZE_MAX }} 词 / 组</text>
        </view>
        <view class="size-stepper">
          <view
            class="step-btn"
            :class="{ disabled: groupSize <= GROUP_SIZE_MIN }"
            role="button"
            :aria-label="`减少到 ${Math.max(GROUP_SIZE_MIN, groupSize - 1)} 词`"
            @click="adjust(-1)"
          >
            <text>−</text>
          </view>
          <input
            class="size-input"
            type="number"
            :value="String(groupSize)"
            aria-label="每组学习词数"
            @blur="onSizeInput"
            @confirm="onSizeInput"
          />
          <view
            class="step-btn"
            :class="{ disabled: groupSize >= GROUP_SIZE_MAX }"
            role="button"
            :aria-label="`增加到 ${Math.min(GROUP_SIZE_MAX, groupSize + 1)} 词`"
            @click="adjust(1)"
          >
            <text>+</text>
          </view>
        </view>
      </view>

      <!-- 快捷入口 -->
      <view class="quick-row">
        <view class="quick-btn card" role="button" aria-label="打开错词本" @click="goWrong">
          <text class="quick-mark quick-mark-wrong">错</text>
          <view class="quick-copy">
            <text class="quick-main">错词本</text>
            <text class="quick-sub">{{ wrongWordIds.length > 0 ? wrongWordIds.length + ' 个待消灭' : '暂无错词' }}</text>
          </view>
        </view>
        <view class="quick-btn card" hover-class="hover-press" role="button" aria-label="打开学习数据" @click="goStats">
          <text class="quick-mark quick-mark-stats">数</text>
          <view class="quick-copy">
            <text class="quick-main">学习数据</text>
            <text class="quick-sub">{{ percent }}% 已掌握</text>
          </view>
        </view>
      </view>

      <!-- 主行动按钮 -->
      <view v-if="allDone" class="all-done card">
        <text class="all-done-icon">✓</text>
        <text>全部 {{ total }} 个单词已掌握！</text>
      </view>

      <view v-else class="learn-btn" hover-class="hover-press" role="button" :aria-label="learnedCount > 0 ? '继续学习' : '开始学习'" @click="startLearn()">
        <view class="learn-btn-copy">
          <text class="learn-main">{{ learnedCount > 0 ? '继续学习' : '开始学习' }}</text>
          <text class="learn-sub">{{ sessionSize }} 词 · 认词 + 拼写</text>
        </view>
        <text class="learn-arrow">→</text>
      </view>

      <view v-if="learnedCount > 0 && !allDone" class="review-btn card" role="button" aria-label="开始复习" @click="startReview()">
        <view class="review-copy">
          <text class="review-main">复习已学词</text>
          <text class="review-sub">抽 {{ Math.min(groupSize, learnedCount) }} 词 · 错词优先</text>
        </view>
        <text class="review-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* 首页纵向布局：顶部尊重状态栏，底部主行动贴近原生 TabBar。 */
.home {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  gap: 10px;
  padding: calc(env(safe-area-inset-top, 0px) + var(--status-bar-height, 0px) + 24px) 16px calc(12px + env(safe-area-inset-bottom, 0px));
  overflow: visible;
  box-sizing: border-box;
}

/* #ifdef H5 */
.home {
  padding-bottom: calc(58px + env(safe-area-inset-bottom, 0px));
}
/* #endif */

/* 顶栏全部左对齐，右侧为微信胶囊保留安全空间。 */
.home-top {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
}

.home-heading {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}

.home-title-row {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 8px;
}

.home-kicker {
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
}

.home-title {
  color: var(--text);
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.5px;
  line-height: 1.2;
}

.home-status {
  overflow: hidden;
  flex-shrink: 1;
  color: var(--muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 今日一词：固定为更舒展的视觉重点，不参与剩余空间分配。 */
.daily {
  display: flex;
  flex: 0 0 230px;
  flex-direction: column;
  gap: 6px;
  padding: 12px 16px;
  overflow: hidden;
  border-left: 4px solid var(--accent);
  background: var(--card-raised);
}

.daily-top {
  display: flex;
  flex-shrink: 0;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.daily-label {
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
}

.daily-mark {
  padding: 3px 7px;
  border-radius: 7px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 10px;
  font-weight: 700;
}

.daily-main {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.daily-word {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.daily-word-text {
  color: var(--accent-strong);
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.2px;
  line-height: 1.2;
}

.daily-phonetic {
  color: var(--accent);
  font-size: 13px;
}

.daily-meaning {
  color: var(--text);
  font-size: 14px;
  line-height: 1.45;
}

/* 进度卡 */
.progress-card {
  display: flex;
  flex: 0 0 102px;
  min-height: 102px;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px 16px 11px;
}

.progress-top,
.progress-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.progress-label {
  color: var(--text);
  font-size: 15px;
  font-weight: 700;
}

.progress-percent {
  color: var(--accent-strong);
  font-size: 20px;
  font-weight: 800;
}

.progress-track {
  height: 8px;
  margin-top: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--card-soft);
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--accent-strong);
  transition: width 0.3s ease;
}

.progress-bottom {
  margin-top: 8px;
}

.progress-num {
  color: var(--muted);
  font-size: 13px;
}

.progress-num-b {
  color: var(--text);
  font-size: 18px;
  font-weight: 800;
}

.progress-tip {
  color: var(--muted);
  font-size: 11px;
}

/* 每组词数设置 */
.settings-card {
  display: flex;
  flex: 0 0 70px;
  min-height: 70px;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  padding: 10px 16px;
}

.settings-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.settings-label {
  color: var(--text);
  font-size: 15px;
  font-weight: 700;
}

.settings-helper {
  color: var(--muted);
  font-size: 11px;
}

.size-stepper {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 7px;
}

.step-btn {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card-soft);
  color: var(--accent-strong);
  font-size: 21px;
  font-weight: 700;
}

.step-btn.disabled {
  opacity: 0.35;
}

.size-input {
  width: 54px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
  color: var(--text);
  font-size: 16px;
  font-weight: 700;
  text-align: center;
}

/* 快捷入口 */
.quick-row {
  display: flex;
  flex: 0 0 110px;
  min-height: 110px;
  align-items: stretch;
  gap: 10px;
}

.quick-btn {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
}

.quick-mark {
  display: flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 800;
}

.quick-mark-wrong {
  background: var(--danger-soft);
  color: var(--danger);
}

.quick-mark-stats {
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.quick-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.quick-main {
  color: var(--text);
  font-size: 14px;
  font-weight: 700;
}

.quick-sub {
  overflow: hidden;
  color: var(--muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 学习主行动 */
.learn-btn {
  display: flex;
  flex-shrink: 0;
  min-height: 60px;
  margin-top: auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px 10px 18px;
  border-radius: var(--radius);
  background: var(--accent-strong);
  box-shadow: var(--shadow-lg);
}

.learn-btn-copy,
.review-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.learn-main {
  color: var(--on-accent);
  font-size: 19px;
  font-weight: 800;
}

.learn-sub {
  color: var(--on-accent-muted);
  font-size: 11px;
}

.learn-arrow,
.review-arrow {
  flex-shrink: 0;
  font-size: 26px;
  line-height: 1;
}

.learn-arrow {
  color: var(--on-accent);
}

/* 复习入口 */
.review-btn {
  display: flex;
  flex-shrink: 0;
  min-height: 50px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 16px;
}

.review-main {
  color: var(--accent-strong);
  font-size: 15px;
  font-weight: 800;
}

.review-sub {
  overflow: hidden;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-arrow {
  color: var(--accent-strong);
}

.all-done {
  display: flex;
  flex-shrink: 0;
  margin-top: auto;
  align-items: center;
  gap: 10px;
  padding: 16px;
  color: var(--text);
  font-size: 15px;
  font-weight: 700;
}

.all-done-icon {
  display: flex;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--success-soft);
  color: var(--success);
  font-size: 18px;
  font-weight: 800;
}

.quick-btn:active,
.review-btn:active,
.learn-btn:active,
.step-btn:active {
  opacity: 0.76;
  transform: scale(0.98);
}

/* 小屏进一步压缩，优先保证主要内容可见 */
@media (max-height: 660px) {
  .home { gap: 7px; }

  .daily {
    flex-basis: 170px;
  }

  .home-title {
    font-size: 20px;
  }

  .daily-word-text {
    font-size: 26px;
  }

  .progress-card {
    flex-basis: 86px;
    min-height: 86px;
    padding: 10px 14px 9px;
  }

  .progress-track {
    margin-top: 8px;
  }

  .progress-bottom {
    margin-top: 6px;
  }

  .settings-card {
    flex-basis: 56px;
    min-height: 56px;
    padding: 8px 14px;
  }

  .quick-row {
    flex-basis: 86px;
    min-height: 86px;
  }

  .quick-btn {
    padding: 8px 10px;
  }

  .quick-mark {
    width: 24px;
    height: 24px;
  }

  .learn-btn {
    min-height: 54px;
  }

  .review-btn {
    min-height: 46px;
  }
}

@media (max-width: 340px) {
  .home {
    padding-right: 12px;
    padding-left: 12px;
  }

  .size-stepper {
    gap: 4px;
  }

  .step-btn {
    width: 36px;
  }

  .size-input {
    width: 48px;
  }
}
</style>
