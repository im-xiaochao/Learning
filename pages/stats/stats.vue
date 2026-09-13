<script setup lang="ts">
import { computed } from 'vue'
import { words } from '../../data/words'
import { useProgress } from '../../composables/useProgress'

const { learnedCount, wrongWordIds, streakDays, state } = useProgress()

const total = words.length
const remaining = computed(() => total - learnedCount.value)
const percent = computed(() => Math.round((learnedCount.value / total) * 100))

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const

const last7 = computed(() => {
  const days = new Set(state.value.activeDays)
  const out: { label: string; active: boolean; isToday: boolean }[] = []
  const d = new Date()
  d.setDate(d.getDate() - 6)
  for (let i = 0; i < 7; i++) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    out.push({
      label: WEEK_LABELS[d.getDay()] ?? '',
      active: days.has(`${y}-${m}-${day}`),
      isToday: i === 6,
    })
    d.setDate(d.getDate() + 1)
  }
  return out
})

function goBack(): void {
  uni.navigateBack()
}
</script>

<template>
  <view class="page">
    <view class="stats">
      <view class="stats-header">
        <view class="back-btn" role="button" aria-label="返回上一页" @click="goBack">
          <text class="back-text">‹</text>
        </view>
        <view class="page-title">
          <text class="title-text">学习数据</text>
          <text class="page-sub">看见每天多会一点</text>
        </view>
      </view>

      <view class="stats-main">
        <view class="stats-lead card">
          <view class="stats-lead-top">
            <view class="stats-lead-copy">
              <text class="stats-lead-kicker">整体进度</text>
              <text class="stats-lead-title">已经掌握 {{ learnedCount }} 个词</text>
            </view>
            <text class="stats-lead-percent">{{ percent }}%</text>
          </view>
          <view class="progress-track">
            <view class="progress-fill" :style="{ width: percent + '%' }" />
          </view>
          <text class="stats-lead-sub">还剩 {{ remaining }} 个词 · 每完成一组就会更新</text>
        </view>

        <view class="kpi-grid">
          <view class="kpi card">
            <text class="kpi-num">{{ learnedCount }}</text>
            <text class="kpi-label">已掌握单词</text>
          </view>
          <view class="kpi card">
            <text class="kpi-num">{{ remaining }}</text>
            <text class="kpi-label">剩余单词</text>
          </view>
          <view class="kpi card">
            <text class="kpi-num">{{ wrongWordIds.length }}</text>
            <text class="kpi-label">错词本</text>
          </view>
          <view class="kpi card">
            <text class="kpi-num">{{ streakDays }}</text>
            <text class="kpi-label">连续学习</text>
          </view>
        </view>

        <view class="chart-card card">
          <text class="card-title">最近 7 天</text>
          <view class="week-bars">
            <view v-for="(d, i) in last7" :key="i" class="week-col">
              <view class="bar" :class="{ on: d.active }" :aria-label="d.active ? '有学习记录' : '无学习记录'">
                <text v-if="d.active" class="bar-check">✓</text>
              </view>
              <text class="week-label" :class="{ today: d.isToday }">{{ d.label }}</text>
            </view>
          </view>
          <text class="chart-sub">有学习/答题记录的日子会点亮</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.stats {
  min-height: 100vh;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(env(safe-area-inset-top, 0px) + var(--status-bar-height, 0px) + 10px) 16px 12px;
}

.stats-main {
  padding: 8px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.stats-lead {
  padding: 17px 18px 15px;
}

.stats-lead-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stats-lead-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.stats-lead-kicker {
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 800;
}

.stats-lead-title {
  color: var(--text);
  font-size: 17px;
  font-weight: 700;
}

.stats-lead-percent {
  color: var(--accent-strong);
  font-size: 24px;
  font-weight: 800;
}

.stats-lead .progress-track {
  margin-top: 14px;
}

.stats-lead-sub {
  display: block;
  margin-top: 10px;
  color: var(--muted);
  font-size: 12px;
}

.kpi-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.kpi {
  width: calc(50% - 6px);
  box-sizing: border-box;
  min-height: 88px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.kpi-num {
  font-size: 28px;
  font-weight: 800;
  color: var(--accent-strong);
}

.kpi-label {
  font-size: 13px;
  color: var(--muted);
}

.chart-card {
  padding: 18px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--text);
  display: block;
}

.chart-sub {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
  display: block;
}

.progress-track {
  height: 10px;
  border-radius: 999px;
  background: var(--card-soft);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--accent-strong);
  transition: width 0.3s ease;
}

.week-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  height: 96px;
  padding: 0 4px;
}

.week-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  height: 100%;
  justify-content: flex-end;
}

/* 无记录日为低柱、有记录日为高柱点亮，一眼看出活跃节奏 */
.bar {
  display: flex;
  width: 100%;
  max-width: 26px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: var(--card-soft);
  transition: height 0.25s ease;
}

.bar.on {
  height: 56px;
  border: 1px solid var(--accent);
  background: var(--accent-soft);
}

.bar-check {
  color: var(--accent-strong);
  font-size: 16px;
  font-weight: 800;
}

.week-label {
  font-size: 12px;
  color: var(--muted);
}

.week-label.today {
  color: var(--accent-strong);
  font-weight: 700;
}
</style>
