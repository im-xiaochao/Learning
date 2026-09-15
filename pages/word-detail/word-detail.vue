<script setup lang="ts">
/**
 * 单词详情：音标、各词性释义、收藏。
 * 设计稿还有「词根 / 助记 / 语境例句 / 搭配」四块，但词库当前只有
 * word / phonetic / meaning，这几块按设计稿的结构保留、内容留空态。
 */
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'
import { appWords } from '../../data/generated/app/words'

const { isFavorite, toggleFavorite, getFamiliarity } = useLearning()

const wordId = ref('')
onLoad((query) => {
  wordId.value = (query as Record<string, string>)?.id || ''
})

const word = computed(() => appWords.find((w) => w.id === wordId.value))
const saved = computed(() => (word.value ? isFavorite(word.value.id) : false))
const familiarity = computed(() => (word.value ? getFamiliarity(word.value.id) : undefined))

const familiarityLabel = computed(() => {
  const f = familiarity.value
  if (f === 'familiar') return '已熟悉'
  if (f === 'fuzzy') return '有点模糊'
  if (f === 'unknown') return '还不认识'
  return '还没复习过'
})

/** 词性 + 释义：app bundle 里合并成了一个字符串，这里按「；」拆开逐条展示 */
const senses = computed(() => {
  const w = word.value
  if (!w) return []
  const parts = w.meaning.split('；').filter(Boolean)
  return parts.map((m) => ({ pos: parts.length === 1 ? w.pos : '', meaning: m }))
})

function onFavorite() {
  const w = word.value
  if (!w) return
  const added = toggleFavorite(w.id)
  uni.showToast({ title: added ? '已收藏' : '已取消收藏', icon: 'none' })
}

function pronounce() {
  const w = word.value
  if (!w) return
  // #ifdef H5
  const synth = (window as unknown as { speechSynthesis?: SpeechSynthesis }).speechSynthesis
  if (synth && typeof SpeechSynthesisUtterance !== 'undefined') {
    synth.cancel()
    const u = new SpeechSynthesisUtterance(w.word)
    u.lang = 'en-GB'
    u.rate = 0.82
    synth.speak(u)
    return
  }
  // #endif
  uni.showToast({ title: '当前端暂不支持语音朗读，可参考音标', icon: 'none' })
}
</script>

<template>
  <view class="page">
    <AppHeader title="单词详情" />

    <view class="viewport fade-in">
      <template v-if="word">
        <view class="row">
          <view class="pill"><text>考研核心词汇</text></view>
          <button class="icon-button" :class="{ saved }" hover-class="hover-press" @tap="onFavorite">
            <image :src="saved ? '/static/icons/star-accent.png' : '/static/icons/star.png'" mode="aspectFit" />
          </button>
        </view>

        <view class="detail-hero">
          <text class="word-heading">{{ word.word }}</text>
          <button class="pronunciation" hover-class="hover-press" @tap="pronounce">
            <image src="/static/icons/sound-primary.png" mode="aspectFit" />
            <text>/{{ word.ipa }}/</text>
            <text class="accent-label">英音</text>
          </button>
        </view>

        <view class="panel mt20">
          <view class="row">
            <text class="panel-title">释义</text>
            <view class="pill"><text>{{ familiarityLabel }}</text></view>
          </view>
          <view class="sense-list">
            <view v-for="(s, i) in senses" :key="i" class="sense-row">
              <text v-if="s.pos" class="part">{{ s.pos }}</text>
              <text class="def-text">{{ s.meaning }}</text>
            </view>
          </view>
        </view>

        <view class="detail-section">
          <text class="section-title">从词根，读懂单词</text>
          <text class="section-body">这个词的词根与词源还没有收录。</text>
        </view>

        <view class="detail-section memory-note">
          <text class="section-title">给记忆一个落脚点</text>
          <text class="section-body">助记内容还没有收录，可以先靠音标与释义反复相遇。</text>
        </view>

        <view class="detail-section">
          <text class="section-title">语境例句</text>
          <text class="section-body">例句还没有收录。</text>
        </view>

        <text class="quiet-note">
          词根 / 助记 / 例句来自 data/content/vocabulary，补齐后本页会自动展示。
        </text>
      </template>

      <view v-else class="empty">
        <view class="empty-symbol">
          <image src="/static/icons/logo-primary.png" mode="aspectFit" />
        </view>
        <text class="empty-title">没有找到这个单词</text>
        <text class="empty-copy">可能链接已失效，回到单词页重新进入。</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.detail-hero {
  margin-top: 14px;
}
.sense-list {
  margin-top: 14px;
}
.sense-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 0;
  border-bottom: 1px solid var(--border);
}
.sense-row:last-child {
  border-bottom: none;
}
</style>
