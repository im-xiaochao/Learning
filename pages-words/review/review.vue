<script setup lang="ts">
/**
 * 单词复习：先回想，再自评熟悉程度。
 * 设计稿在卡片里展示「语境例句」，但词库（data/content/vocabulary）没有例句字段，
 * 因此这里只渲染音标 / 词性 / 释义，例句位置留给后续补数据。
 */
import { computed } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'
import { useReview } from '../../stores/review'
import type { Familiarity } from '../../stores/learning'
import { appWords } from '../words'

const { reviewWord, isFavorite, toggleFavorite } = useLearning()
const { grade, reveal, currentId, isLast, total, position, setGrade, toggleReveal, next, reset } = useReview()

const feedbackText: Record<Familiarity, [string, string]> = {
  familiar: ['记住了，继续保持。', '本次已标记为熟悉，可以在复习结果中回看。'],
  fuzzy: ['有点印象，也是进步。', '已记入薄弱词，完成本组后可以再练一遍。'],
  unknown: ['没关系，再认识一次。', '先读一遍释义，再试着用自己的话记住它。'],
}

const word = computed(() => appWords.find((w) => w.id === currentId.value))
const saved = computed(() => (word.value ? isFavorite(word.value.id) : false))
const progress = computed(() => (total.value ? Math.round(((position.value - 1 + (grade.value ? 1 : 0)) / total.value) * 100) : 0))

function onFavorite() {
  const w = word.value
  if (!w) return
  const added = toggleFavorite(w.id)
  uni.showToast({ title: added ? '已收藏，可在「我的」中查看' : '已取消收藏', icon: 'none' })
}

function rate(value: Familiarity) {
  const w = word.value
  if (!w || grade.value) return
  setGrade(value)
  reviewWord(w.id, value)
}

function toDetail() {
  const w = word.value
  if (!w) return
  uni.navigateTo({ url: `/pages-words/word-detail/word-detail?id=${w.id}` })
}

function goNext() {
  if (!grade.value) return
  if (isLast.value) {
    uni.redirectTo({ url: '/pages-words/result/result' })
    return
  }
  next()
}

onUnload(() => {
  /* 队列保留在 store 里，返回单词页后再次进入可继续 */
})
</script>

<template>
  <view class="page">
    <AppHeader title="单词复习" />

    <view class="viewport fade-in">
      <view class="review-top">
        <text>记忆巩固</text>
        <text class="counter">{{ String(position).padStart(2, '0') }} / {{ String(total).padStart(2, '0') }}</text>
      </view>
      <view class="small-progress mt12"><view class="bar" :style="`width:${progress}%`" /></view>
      <text class="review-hint">{{ grade ? '每一次回想，都在加深记忆。' : '先回想一下，再判断你对它的熟悉程度。' }}</text>

      <view v-if="word" class="word-card">
        <view class="row">
          <text class="word-label">考研核心词汇</text>
          <button class="icon-button" :class="{ saved }" hover-class="hover-press" @tap="onFavorite">
            <image :src="saved ? '/static/icons/star-accent.png' : '/static/icons/star.png'" mode="aspectFit" />
          </button>
        </view>

        <text class="word-heading">{{ word.word }}</text>

        <!-- 音标是释义的一部分，保留；读音功能还没有，所以不再做成可点的发音按钮 -->
        <view class="word-ipa">
          <text>/{{ word.ipa }}/</text>
          <text class="accent-label">英音</text>
        </view>

        <view class="word-definition">
          <text v-if="reveal" class="def-text"><text class="part">{{ word.pos }}</text>{{ word.meaning }}</text>
          <button v-else class="text-button" hover-class="hover-press" @tap="toggleReveal">
            <image src="/static/icons/eye-primary.png" mode="aspectFit" />
            <text>想好了吗？点此查看释义</text>
          </button>
        </view>
      </view>

      <view class="review-tools">
        <button class="text-button" hover-class="hover-press" @tap="toggleReveal">
          <image src="/static/icons/eye-primary.png" mode="aspectFit" />
          <text>{{ reveal ? '隐藏释义，试着回想' : '显示中文释义' }}</text>
        </button>
        <button class="text-button" hover-class="hover-press" @tap="toDetail">
          <text>单词详情</text>
          <image src="/static/icons/chevron.png" mode="aspectFit" />
        </button>
      </view>

      <view v-if="grade" class="review-feedback" :class="{ 'needs-work': grade !== 'familiar' }">
        <view class="fb-title">
          <image
            :src="grade === 'familiar' ? '/static/icons/circleCheck-primary.png' : '/static/icons/refresh-primary.png'"
            mode="aspectFit"
          />
          <text>{{ feedbackText[grade][0] }}</text>
        </view>
        <text class="fb-body">{{ feedbackText[grade][1] }}</text>
        <button class="primary-button" hover-class="hover-press" @tap="goNext">
          <text>{{ isLast ? '查看复习结果' : '下一个单词' }}</text>
          <image src="/static/icons/arrow-on.png" mode="aspectFit" />
        </button>
      </view>

      <template v-else>
        <text class="rating-label">这个单词，你记住了吗？</text>
        <view class="ratings">
          <button class="rate-button unknown" hover-class="hover-press" @tap="rate('unknown')">
            <text>不认识</text>
            <text class="rate-sub">再认识一次</text>
          </button>
          <button class="rate-button" hover-class="hover-press" @tap="rate('fuzzy')">
            <text>模糊</text>
            <text class="rate-sub">还需巩固</text>
          </button>
          <button class="rate-button familiar" hover-class="hover-press" @tap="rate('familiar')">
            <text>熟悉</text>
            <text class="rate-sub">已经记住</text>
          </button>
        </view>
      </template>
    </view>
  </view>
</template>
