<script setup lang="ts">
/** 收藏单词：空态引导去复习 */
import { computed } from 'vue'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'
import { startReview } from '../../stores/review'

const { favoriteWords } = useLearning()
const items = computed(() => favoriteWords.value)

function openDetail(id: string) {
  uni.navigateTo({ url: `/pages/word-detail/word-detail?id=${id}` })
}

function goReview() {
  if (!startReview('favorites')) {
    uni.showToast({ title: '还没有收藏的单词', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/review/review' })
}
</script>

<template>
  <view class="page">
    <AppHeader title="收藏单词" />

    <view class="viewport fade-in">
      <template v-if="items.length">
        <text class="eyebrow">我的单词本</text>
        <text class="page-title">值得，再见一面。</text>
        <text class="subtext mt12">已收藏 {{ items.length }} 个单词</text>

        <button class="primary-button mt20" hover-class="hover-press" @tap="goReview">
          <text>复习收藏的单词</text>
          <image src="/static/icons/arrow-on.png" mode="aspectFit" />
        </button>

        <view class="word-list">
          <button
            v-for="w in items"
            :key="w.id"
            class="word-list-row"
            hover-class="hover-press"
            @tap="openDetail(w.id)"
          >
            <view class="wl-main">
              <text class="wl-word">{{ w.word }}</text>
              <text class="wl-meaning">{{ w.meaning }}</text>
            </view>
            <image class="chev" src="/static/icons/chevron.png" mode="aspectFit" />
          </button>
        </view>
      </template>

      <view v-else class="empty">
        <view class="empty-symbol">
          <image src="/static/icons/star-accent.png" mode="aspectFit" />
        </view>
        <text class="empty-title">留住值得再看一遍的词</text>
        <text class="empty-copy">遇到想收藏的单词，点一下星标。下一次，它们就在这里等你。</text>
        <button class="primary-button" hover-class="hover-press" @tap="goReview">
          <text>去复习单词</text>
          <image src="/static/icons/arrow-on.png" mode="aspectFit" />
        </button>
      </view>
    </view>
  </view>
</template>
