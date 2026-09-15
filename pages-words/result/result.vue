<script setup lang="ts">
/** 复习结果：本轮分级统计 + 单词清单 */
import { computed } from 'vue'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'
import { useReview, startReview } from '../../stores/review'
import { appWords } from '../words'
import type { Familiarity } from '../../stores/learning'

const { todayWords, currentGoal, getFamiliarity } = useLearning()
const { queue } = useReview()

const reviewed = computed(() =>
  queue.value
    .map((id) => ({ word: appWords.find((w) => w.id === id), grade: getFamiliarity(id) }))
    .filter((x): x is { word: (typeof appWords)[number]; grade: Familiarity } => Boolean(x.word) && Boolean(x.grade)),
)

const counts = computed(() => ({
  familiar: reviewed.value.filter((x) => x.grade === 'familiar').length,
  fuzzy: reviewed.value.filter((x) => x.grade === 'fuzzy').length,
  unknown: reviewed.value.filter((x) => x.grade === 'unknown').length,
}))

const weak = computed(() => counts.value.fuzzy + counts.value.unknown)
const goalDone = computed(() => todayWords.value >= currentGoal.value.dailyWords)

const gradeLabel: Record<Familiarity, string> = { familiar: '熟悉', fuzzy: '模糊', unknown: '不认识' }

function practiceWeak() {
  if (!startReview('weak')) {
    uni.showToast({ title: '暂时没有薄弱单词', icon: 'none' })
    return
  }
  uni.redirectTo({ url: '/pages-words/review/review' })
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function openDetail(id: string) {
  uni.navigateTo({ url: `/pages-words/word-detail/word-detail?id=${id}` })
}
</script>

<template>
  <view class="page">
    <AppHeader title="复习结果" />

    <view class="viewport fade-in">
      <view class="result-hero">
        <view class="result-mark">
          <image src="/static/icons/check-primary.png" mode="aspectFit" />
        </view>
        <text class="result-title">{{ goalDone ? '今天的单词，拿下了。' : '这一组，记得更牢了。' }}</text>
        <text class="subtext mt12">
          已复习 {{ reviewed.length }} 个单词，每一次回想都算数。{{
            weak ? `还有 ${weak} 个词值得再见一面。` : '这一轮都记住了，保持你的学习节奏。'
          }}
        </text>
      </view>

      <view class="result-counts">
        <view class="count-cell">
          <text class="count-num">{{ counts.familiar }}</text>
          <text class="count-label">熟悉</text>
        </view>
        <view class="count-cell">
          <text class="count-num">{{ counts.fuzzy }}</text>
          <text class="count-label">模糊</text>
        </view>
        <view class="count-cell">
          <text class="count-num">{{ counts.unknown }}</text>
          <text class="count-label">不认识</text>
        </view>
      </view>

      <button v-if="weak" class="primary-button mt20" hover-class="hover-press" @tap="practiceWeak">
        <text>再练薄弱单词 · {{ weak }} 个</text>
        <image src="/static/icons/arrow-on.png" mode="aspectFit" />
      </button>
      <button v-else class="primary-button mt20" hover-class="hover-press" @tap="goHome">
        <text>回到学习首页</text>
        <image src="/static/icons/arrow-on.png" mode="aspectFit" />
      </button>
      <button v-if="weak" class="text-button" style="width: 100%" hover-class="hover-press" @tap="goHome">
        <text>今天先到这里</text>
      </button>

      <view class="section-head">
        <text class="head-title">这次复习的单词</text>
        <text class="head-note">点开查看详情</text>
      </view>

      <view class="word-list">
        <button
          v-for="item in reviewed"
          :key="item.word.id"
          class="word-list-row"
          hover-class="hover-press"
          @tap="openDetail(item.word.id)"
        >
          <view class="wl-main">
            <text class="wl-word">{{ item.word.word }}</text>
            <text class="wl-meaning">{{ item.word.meaning }}</text>
          </view>
          <view class="pill" :class="{ orange: item.grade !== 'familiar' }">
            <text>{{ gradeLabel[item.grade] }}</text>
          </view>
        </button>
      </view>
    </view>
  </view>
</template>
