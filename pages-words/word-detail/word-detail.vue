<script setup lang="ts">
/**
 * 单词详情：音标、各词性释义、词根、助记、语境例句、搭配、收藏。
 *
 * 深度内容（examples / root / mnemonic / collocations）来自 data/english/word-content.ts，
 * 经 build-content 并入 pages-words/words.ts。词库尚未覆盖全部词条，
 * 缺哪块哪块显示空态——不要为了填满界面而编造内容。
 *
 * 注意：空字段在运行时投影里是**整键省略**的（undefined），不是空数组/空串。
 */
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'
import { appWords } from '../words'

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

const examples = computed(() => word.value?.examples || [])
const root = computed(() => word.value?.root)
const mnemonic = computed(() => word.value?.mnemonic || '')
const collocations = computed(() => word.value?.collocations || [])

/** 深度内容的覆盖进度：目前只收录了一部分词，空态要把这个事实讲清楚，别让人以为坏了 */
const deepTotal = appWords.filter((w) => w.root || w.mnemonic).length

/**
 * 例句里高亮当前单词。用词边界匹配，避免 "approach" 命中 "approaches" 之外的
 * 无关子串；大小写不敏感（句首大写、专有名词形变）。
 * 返回分词片段供模板 v-for 渲染 —— 小程序不支持 v-html。
 */
const highlightRe = computed(() => {
  const w = word.value
  if (!w) return null
  const escaped = w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // 屈折形三种情况：
  //   1. 直接加后缀    persist → persisted / persisting
  //   2. 以 e 结尾     achieve → achieved / achieving
  //   3. 以 y 结尾     strategy → strategies ; apply → applied（y 变 i）
  const stem = /y$/i.test(w.word) ? `${escaped.slice(0, -1)}(?:y|ies|ied)` : `${escaped}(?:s|es|ed|d|ing)?`
  return new RegExp(`(${stem})\\b`, 'gi')
})

function splitParts(sentence: string): { text: string; hit: boolean }[] {
  const re = highlightRe.value
  if (!re) return [{ text: sentence, hit: false }]
  const parts: { text: string; hit: boolean }[] = []
  let last = 0
  re.lastIndex = 0
  for (let m = re.exec(sentence); m; m = re.exec(sentence)) {
    if (m.index > last) parts.push({ text: sentence.slice(last, m.index), hit: false })
    parts.push({ text: m[0], hit: true })
    last = m.index + m[0].length
  }
  if (last < sentence.length) parts.push({ text: sentence.slice(last), hit: false })
  return parts
}

function onFavorite() {
  const w = word.value
  if (!w) return
  const added = toggleFavorite(w.id)
  uni.showToast({ title: added ? '已收藏' : '已取消收藏', icon: 'none' })
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
          <!-- 音标保留；读音功能还没有，不做成可点的发音按钮 -->
          <view class="word-ipa">
            <text>/{{ word.ipa }}/</text>
            <text class="accent-label">英音</text>
          </view>
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
          <template v-if="root">
            <view class="root-parts"><text>{{ root.display }}</text></view>
            <text class="section-body">{{ root.explanation }}</text>
          </template>
          <text v-else class="section-body">
            这个词的词根与词源还没有收录。回单词本按「有详解」筛选，可以看到已收录的词。
          </text>
        </view>

        <view class="detail-section memory-note">
          <text class="section-title">给记忆一个落脚点</text>
          <text v-if="mnemonic" class="section-body">{{ mnemonic }}</text>
          <text v-else class="section-body">助记内容还没有收录，可以先靠音标与释义反复相遇。</text>
        </view>

        <view class="detail-section">
          <text class="section-title">语境例句</text>
          <template v-if="examples.length">
            <view v-for="(ex, i) in examples" :key="i" class="example">
              <view class="example-en">
                <text
                  v-for="(part, j) in splitParts(ex.sentence)"
                  :key="j"
                  :class="{ 'example-mark': part.hit }"
                >{{ part.text }}</text>
              </view>
              <text class="example-zh">{{ ex.translation }}</text>
            </view>
          </template>
          <text v-else class="section-body">例句还没有收录。</text>
        </view>

        <view class="detail-section">
          <text class="section-title">把它放进表达里</text>
          <template v-if="collocations.length">
            <view v-for="(c, i) in collocations" :key="i" class="collocation-row">
              <text class="collocation-phrase">{{ c.phrase }}</text>
              <text class="collocation-meaning">{{ c.meaning }}</text>
            </view>
          </template>
          <text v-else class="section-body">这个词的常用搭配还没有收录。</text>
        </view>

        <text class="quiet-note">
          词根 / 助记 / 例句 / 搭配来自 data/english/word-content.ts，已收录 {{ deepTotal }} /
          {{ appWords.length }} 个词，其余会陆续补充——不为了填满界面编造内容。
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

/* 词根拆解：.root-parts 的字体/配色沿用 App.vue 的全局样式，这里只微调间距 */
.root-parts {
  margin-bottom: 8px;
}

/* 语境例句 */
.example {
  margin-top: 12px;
}
.example-en {
  font-family: var(--display);
  font-size: 14.5px;
  line-height: 1.72;
  color: var(--fg);
  display: block;
}
/* 小程序里 <text> 默认是 inline，但显式声明更稳妥：
   分词片段必须连成一行，不能各占一行。 */
.example-en text {
  display: inline;
}
.example-mark {
  color: var(--primary);
  font-weight: 600;
  border-bottom: 2px solid var(--primary-soft, var(--primary));
  padding-bottom: 1px;
}
.example-zh {
  display: block;
  margin-top: 5px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--muted);
}

/* 搭配 */
.collocation-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 0;
  border-bottom: 1px solid var(--border);
}
.collocation-row:last-child {
  border-bottom: none;
}
.collocation-phrase {
  font-family: var(--display);
  font-size: 14px;
  color: var(--fg);
}
.collocation-meaning {
  font-size: 13px;
  color: var(--muted);
}
</style>
