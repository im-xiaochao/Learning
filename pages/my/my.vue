<script setup lang="ts">
/** 我的：学习总量、近七天柱状图、收藏 / 计划 / 目标入口 */
import { computed, ref } from 'vue'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'

const { state, currentGoal, totalWords, totalKnowledge, favoriteWords, planEntries, streakDays, weeklyValues } = useLearning()

const chartMode = ref<'words' | 'knowledge'>('words')
const values = computed(() => weeklyValues(chartMode.value))
const maxValue = computed(() => Math.max(1, ...values.value))
const sum = computed(() => values.value.reduce((a, b) => a + b, 0))

/** 最近七天标签：最后一天是「今天」 */
const dayLabels = computed(() => {
  const names = ['日', '一', '二', '三', '四', '五', '六']
  const out: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push(i === 0 ? '今天' : names[d.getDay()])
  }
  return out
})

function barHeight(n: number): string {
  return `${Math.round((n / maxValue.value) * 72) + (n > 0 ? 6 : 2)}px`
}

function goPage(url: string) {
  uni.navigateTo({ url })
}

function goPlan() {
  uni.switchTab({ url: '/pages/plan/plan' })
}
</script>

<template>
  <view class="page">
    <AppHeader />

    <view class="viewport fade-in">
      <view class="profile-head">
        <view class="avatar"><text>同</text></view>
        <view>
          <text class="profile-name">同行同学</text>
          <text class="profile-sub">
            {{ state.settings.examYear }} 考研 · {{ state.settings.englishExam }} · {{ state.settings.mathExam }}
          </text>
        </view>
        <view class="demo-label"><text>本机账号</text></view>
      </view>

      <view class="stats-grid">
        <view class="stat-cell">
          <text class="stat-num">{{ totalWords.toLocaleString() }}</text>
          <text class="stat-label">已学习单词</text>
        </view>
        <view class="stat-cell">
          <text class="stat-num">{{ totalKnowledge }}</text>
          <text class="stat-label">已阅读知识点</text>
        </view>
      </view>

      <view class="panel mt20">
        <view class="row">
          <view>
            <text class="panel-title">每一天，都有收获</text>
            <text class="subtext" style="margin-top: 4px">连续学习 {{ streakDays }} 天</text>
          </view>
          <view class="chart-switch">
            <button
              class="cs-btn"
              :class="{ active: chartMode === 'words' }"
              hover-class="hover-press"
              @tap="chartMode = 'words'"
            >
              <text>单词</text>
            </button>
            <button
              class="cs-btn"
              :class="{ active: chartMode === 'knowledge' }"
              hover-class="hover-press"
              @tap="chartMode = 'knowledge'"
            >
              <text>知识点</text>
            </button>
          </view>
        </view>

        <view class="week-chart">
          <view v-for="(n, i) in values" :key="i" class="chart-day" :class="{ today: i === 6 }">
            <text class="day-num">{{ n }}</text>
            <view class="bar" :style="`height:${barHeight(n)}`" />
            <text class="day-label">{{ dayLabels[i] }}</text>
          </view>
        </view>

        <text class="chart-caption">
          近 7 天共{{ chartMode === 'words' ? '学习' : '阅读' }} {{ sum }} 个{{ chartMode === 'words' ? '单词' : '知识点' }}，坚持正在悄悄发生。
        </text>
      </view>

      <view class="menu-list">
        <button class="menu-row" hover-class="hover-press" @tap="goPage('/pages/favorites/favorites')">
          <image class="menu-icon" src="/static/icons/star.png" mode="aspectFit" />
          <text class="menu-label">收藏单词</text>
          <text class="menu-value">{{ favoriteWords.length }} 个单词</text>
          <image class="chev" src="/static/icons/chevron.png" mode="aspectFit" />
        </button>
        <button class="menu-row" hover-class="hover-press" @tap="goPlan">
          <image class="menu-icon" src="/static/icons/plan.png" mode="aspectFit" />
          <text class="menu-label">学习计划</text>
          <text class="menu-value">{{ planEntries.length }} 个知识点</text>
          <image class="chev" src="/static/icons/chevron.png" mode="aspectFit" />
        </button>
        <button class="menu-row" hover-class="hover-press" @tap="goPage('/pages/goals/goals')">
          <image class="menu-icon" src="/static/icons/target-primary.png" mode="aspectFit" />
          <text class="menu-label">学习目标</text>
          <text class="menu-value">{{ currentGoal.dailyWords }} 词 / {{ currentGoal.dailyKnowledgePoints }} 个知识点</text>
          <image class="chev" src="/static/icons/chevron.png" mode="aspectFit" />
        </button>
      </view>

      <text class="quiet-note">学习进度保存在本机 · 接入账号后可按用户同步</text>
    </view>
  </view>
</template>
