<script setup lang="ts">
/**
 * 单词页：今日新词 / 今日复习两张卡、开始学习、单词本与计划设定两个入口。
 *
 * 为什么主按钮默认是「开始学习」：之前是「已完成 / 未完成」二分，一进来就落在
 * 未完成那一侧，显示成补进度的话术。现在按真实进度三分支——没开始说「开始学习」，
 * 进行中说「还剩几个」，全达标才说「已完成」。
 */
import { computed } from 'vue'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'
import { startReview } from '../../stores/review'

const { currentGoal, todayWords, todayNewWords, todayReviewWords, wordTargets } = useLearning()

const targets = computed(() => wordTargets.value)
const newDone = computed(() => Math.min(targets.value.newWords, todayNewWords.value))
const reviewDone = computed(() => Math.min(targets.value.review, todayReviewWords.value))
const newLeft = computed(() => Math.max(0, targets.value.newWords - newDone.value))
const reviewLeft = computed(() => Math.max(0, targets.value.review - reviewDone.value))
const left = computed(() => newLeft.value + reviewLeft.value)
const started = computed(() => todayWords.value > 0)
const finished = computed(() => started.value && left.value === 0)

const primaryLabel = computed(() => {
  if (!started.value) return '开始学习'
  if (finished.value) return '今日已完成 · 再练一轮'
  return `继续学习 · 还剩 ${left.value} 个`
})

const quota = computed(() => currentGoal.value.dailyWords)

function goReview() {
  if (!startReview('today')) {
    uni.showToast({ title: '暂时没有需要复习的单词', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages-words/review/review' })
}

function goWordbook() {
  uni.navigateTo({ url: '/pages-words/wordbook/wordbook' })
}

function goWordPlan() {
  uni.navigateTo({ url: '/pages-words/word-plan/word-plan' })
}
</script>

<template>
  <view class="page words-page">
    <AppHeader />

    <view class="viewport fade-in">
      <text class="eyebrow">考研英语 · 核心词汇</text>
      <text class="page-title">让每个单词，留得更久。</text>

      <!-- 今日进度：新词 / 复习各一张，分母来自「计划设定」 -->
      <view class="learning-grid mt20">
        <view class="study-card">
          <view class="row">
            <image class="card-icon" src="/static/icons/logo-primary.png" mode="aspectFit" />
            <text class="card-kicker">今日计划</text>
          </view>
          <text class="card-title">今日新词</text>
          <text class="study-numbers">
            <text class="num">{{ newDone }}</text>
            / {{ targets.newWords }} 个
          </text>
          <view class="small-progress">
            <view class="bar" :style="`width:${Math.round((newDone / targets.newWords) * 100)}%`" />
          </view>
          <view class="card-link">
            <text>{{ newLeft ? `还剩 ${newLeft} 个` : '今日新词已完成' }}</text>
          </view>
        </view>

        <view class="study-card">
          <view class="row">
            <image class="card-icon" src="/static/icons/refresh-primary.png" mode="aspectFit" />
            <text class="card-kicker">温故知新</text>
          </view>
          <text class="card-title">今日复习</text>
          <text class="study-numbers">
            <text class="num">{{ reviewDone }}</text>
            / {{ targets.review }} 个
          </text>
          <view class="small-progress">
            <view class="bar" :style="`width:${Math.round((reviewDone / Math.max(1, targets.review)) * 100)}%`" />
          </view>
          <view class="card-link">
            <text>{{ reviewLeft ? `还剩 ${reviewLeft} 个` : '今日复习已完成' }}</text>
          </view>
        </view>
      </view>

      <button class="primary-button mt20" hover-class="hover-press" @tap="goReview">
        <text>{{ primaryLabel }}</text>
        <image src="/static/icons/arrow-on.png" mode="aspectFit" />
      </button>
      <text class="quiet-note">不必一次记住，重要的是一次次相遇。</text>

      <view class="section-head">
        <text class="head-title">单词工具</text>
        <text class="head-note">按自己的节奏来</text>
      </view>

      <view class="learning-grid">
        <button class="study-card" hover-class="hover-press" @tap="goWordbook">
          <view class="row">
            <image class="card-icon" src="/static/icons/logo-primary.png" mode="aspectFit" />
            <text class="card-kicker">考研英语</text>
          </view>
          <text class="card-title">单词本</text>
          <text class="study-numbers">查看每个单词的学习状态</text>
          <view class="card-link">
            <image src="/static/icons/chevron.png" mode="aspectFit" />
          </view>
        </button>

        <button class="study-card" hover-class="hover-press" @tap="goWordPlan">
          <view class="row">
            <image class="card-icon" src="/static/icons/target-primary.png" mode="aspectFit" />
            <text class="card-kicker">每天 {{ quota }} 个</text>
          </view>
          <text class="card-title">计划设定</text>
          <text class="study-numbers">新学 {{ targets.newWords }} 个 · 复习 {{ targets.review }} 个</text>
          <view class="card-link">
            <image src="/static/icons/chevron.png" mode="aspectFit" />
          </view>
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* 单词页内容整体往下移：只在单词页加顶部留白（.viewport 全局是 19px，这里补到 39px），
   不动 App.vue 里 .viewport 的公共定义，其它页面不受影响。 */
.words-page .viewport {
  padding-top: 39px;
}
</style>
