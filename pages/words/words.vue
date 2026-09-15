<script setup lang="ts">
/** 单词页：今日单词进度、今日任务、进入复习、我的收藏 */
import { computed } from 'vue'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'
import { startReview } from '../../stores/review'
import { appWordIds } from '../../data/generated/app/word-ids'

const { currentGoal, todayWords, favoriteWordIds, getFamiliarity } = useLearning()

const goal = computed(() => currentGoal.value.dailyWords)
const done = computed(() => todayWords.value >= goal.value)
const left = computed(() => Math.max(0, goal.value - todayWords.value))
const percent = computed(() => Math.min(100, Math.round((todayWords.value / goal.value) * 100)))

/** 新词初识：今日新词额度（上限 20）是否已认完 */
const freshCount = computed(() => appWordIds.filter((id) => getFamiliarity(id) === undefined).length)
const newQuota = computed(() => Math.min(20, goal.value))
const newDone = computed(() => todayWords.value >= newQuota.value)
const reviewedToday = computed(() => Math.max(0, todayWords.value - Math.min(newQuota.value, todayWords.value)))

function goReview() {
  if (!startReview('today')) {
    uni.showToast({ title: '暂时没有需要复习的单词', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages-words/review/review' })
}

function goFavorites() {
  uni.navigateTo({ url: '/pages-words/favorites/favorites' })
}
</script>

<template>
  <view class="page">
    <AppHeader />

    <view class="viewport fade-in">
      <text class="eyebrow">考研英语 · 核心词汇</text>
      <text class="page-title">让每个单词，留得更久。</text>

      <view class="panel mt20">
        <view class="row">
          <view>
            <text class="eyebrow">今日单词</text>
            <text class="big-number">{{ todayWords }}<text class="unit"> / {{ goal }}</text></text>
          </view>
          <view class="pill">
            <image :src="done ? '/static/icons/check-primary.png' : '/static/icons/clock.png'" mode="aspectFit" />
            <text>{{ done ? '今日已完成' : `还剩 ${left} 个` }}</text>
          </view>
        </view>
        <view class="small-progress mt16"><view class="bar" :style="`width:${percent}%`" /></view>
        <view class="progress-split">
          <text>新词 {{ Math.min(20, todayWords) }} / 20</text>
          <text>复习 {{ reviewedToday }} / {{ Math.max(0, goal - 20) }}</text>
        </view>
      </view>

      <view class="section-head">
        <text class="head-title">今日任务</text>
        <text class="head-note">一点点，记得更牢</text>
      </view>

      <view class="task-list">
        <button class="task" hover-class="hover-press" @tap="goReview">
          <view class="task-icon">
            <image :src="done ? '/static/icons/circleCheck-primary.png' : '/static/icons/refresh-primary.png'" mode="aspectFit" />
          </view>
          <view class="task-content">
            <view class="task-title">
              <text>记忆巩固</text>
              <view class="pill">{{ done ? '已完成' : '进行中' }}</view>
            </view>
            <text class="task-sub">{{ done ? `${goal} 个单词，完成今天的复习` : `待复习 ${left} 个 · 按熟悉程度巩固` }}</text>
          </view>
          <image class="chev" src="/static/icons/chevron.png" mode="aspectFit" />
        </button>

        <view class="task">
          <view class="task-icon">
            <image src="/static/icons/check-primary.png" mode="aspectFit" />
          </view>
          <view class="task-content">
            <view class="task-title"><text>新词初识</text></view>
            <text class="task-sub">词库剩余 {{ freshCount }} 个未学单词</text>
          </view>
          <view class="pill">{{ newDone ? '已完成' : '待开始' }}</view>
        </view>
      </view>

      <button class="primary-button mt20" hover-class="hover-press" @tap="goReview">
        <text>{{ done ? '再复习一轮' : `继续复习 · ${left} 个单词` }}</text>
        <image src="/static/icons/arrow-on.png" mode="aspectFit" />
      </button>
      <text class="quiet-note">不必一次记住，重要的是一次次相遇。</text>

      <view class="menu-list">
        <button class="menu-row" hover-class="hover-press" @tap="goFavorites">
          <image class="menu-icon" src="/static/icons/star.png" mode="aspectFit" />
          <text class="menu-label">我的收藏</text>
          <text class="menu-value">{{ favoriteWordIds.length }} 个单词</text>
          <image class="chev" src="/static/icons/chevron.png" mode="aspectFit" />
        </button>
      </view>
    </view>
  </view>
</template>
