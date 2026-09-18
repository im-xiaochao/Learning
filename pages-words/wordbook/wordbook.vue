<script setup lang="ts">
/**
 * 单词本：全部单词 + 学习状态（未学习 / 熟悉 / 模糊 / 不认识）。
 *
 * 为什么分批渲染：词库 5493 个词，一次性铺开会让小程序首屏卡住。
 * 这里先渲染 100 条，到底再点「加载更多」——筛选后重新从 100 条起算。
 */
import { computed, ref, watch } from 'vue'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'
import { appWords } from '../words'

const { getFamiliarity } = useLearning()

type Filter = 'all' | 'new' | 'familiar' | 'fuzzy' | 'unknown' | 'deep'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'new', label: '未学习' },
  { value: 'familiar', label: '熟悉' },
  { value: 'fuzzy', label: '模糊' },
  { value: 'unknown', label: '不认识' },
  { value: 'deep', label: '有详解' },
]

/**
 * 有词根 / 助记的词（深度内容）目前只覆盖了一小部分词库（数据来自
 * data/english/word-content.ts，不能为了填满界面编造）。列表里给它们单独标出来、
 * 并提供「有详解」筛选，否则用户随机点开几个都是空态，会以为功能没做。
 */
const deepIds: Set<string> = new Set(appWords.filter((w) => w.root || w.mnemonic).map((w) => w.id))
const hasDeep = (id: string): boolean => deepIds.has(id)

const LABELS: Record<string, string> = { familiar: '熟悉', fuzzy: '模糊', unknown: '不认识' }

const filter = ref<Filter>('all')
const limit = ref(100)

/** 切筛选时把分页重置，否则从「全部」翻到第 5 页再切「未学习」会看到空白 */
watch(filter, () => {
  limit.value = 100
})

/**
 * 状态文案与配色都走函数，不在模板里写 `as` 断言——模板表达式是当 JS 编译的，
 * TS 类型转换在里面不一定被解析，写上去等于埋雷。
 */
function statusLabel(id: string): string {
  const f = getFamiliarity(id)
  return f ? LABELS[f] : '未学习'
}

/** 未学习和「模糊 / 不认识」都用强调色：它们都还需要再见一面 */
function isPending(id: string): boolean {
  return getFamiliarity(id) !== 'familiar'
}

const counts = computed(() => {
  let learned = 0
  let weak = 0
  for (const w of appWords) {
    const f = getFamiliarity(w.id)
    if (!f) continue
    learned += 1
    if (f !== 'familiar') weak += 1
  }
  return { total: appWords.length, learned, weak, deep: deepIds.size }
})

const matched = computed(() => {
  if (filter.value === 'all') return appWords
  if (filter.value === 'deep') return appWords.filter((w) => deepIds.has(w.id))
  return appWords.filter((w) => {
    const f = getFamiliarity(w.id)
    if (filter.value === 'new') return f === undefined
    return f === filter.value
  })
})

const visible = computed(() => matched.value.slice(0, limit.value))
const hasMore = computed(() => matched.value.length > visible.value.length)

function loadMore() {
  limit.value += 100
}

function openDetail(id: string) {
  uni.navigateTo({ url: `/pages-words/word-detail/word-detail?id=${id}` })
}
</script>

<template>
  <view class="page">
    <AppHeader title="单词本" />

    <view class="viewport fade-in">
      <text class="eyebrow">考研英语 · 核心词汇</text>
      <text class="page-title">每个词，都有自己的位置。</text>
      <text class="subtext mt12">
        共 {{ counts.total }} 个单词 · 已学 {{ counts.learned }} 个 · 待巩固 {{ counts.weak }} 个
      </text>
      <text class="subtext">词根 / 助记已收录 {{ counts.deep }} 个，点开带「详解」标记的词可以看到。</text>

      <view class="src-switch">
        <button
          v-for="f in FILTERS"
          :key="f.value"
          class="src-chip"
          :class="{ active: filter === f.value }"
          hover-class="hover-press"
          @tap="filter = f.value"
        >
          <text>{{ f.label }}</text>
        </button>
      </view>

      <view v-if="visible.length" class="word-list mt20">
        <button
          v-for="w in visible"
          :key="w.id"
          class="word-list-row"
          hover-class="hover-press"
          @tap="openDetail(w.id)"
        >
          <view class="wl-main">
            <text class="wl-word">{{ w.word }}</text>
            <text class="wl-meaning">{{ w.pos }} {{ w.meaning }}</text>
          </view>
          <view class="wl-tail">
            <text v-if="hasDeep(w.id)" class="wl-tag">详解</text>
            <view class="pill" :class="{ orange: isPending(w.id) }">
              <text>{{ statusLabel(w.id) }}</text>
            </view>
          </view>
        </button>
      </view>

      <view v-else class="empty">
        <text class="empty-title">这个分类下还没有单词</text>
        <text class="empty-copy">换个筛选看看，或者先去背一组新词。</text>
      </view>

      <button v-if="hasMore" class="text-button mt20" hover-class="hover-press" @tap="loadMore">
        <text>加载更多（还有 {{ matched.length - visible.length }} 个）</text>
        <image src="/static/icons/chevron.png" mode="aspectFit" />
      </button>

      <text class="quiet-note">点开带「详解」标记的词，可以看到词根与助记。</text>
    </view>
  </view>
</template>

<style scoped>
.wl-tail {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 0 0 auto;
}
/* 「详解」= 这个词收录了词根 / 助记。没有这个词库里绝大多数词点开都是空态，
   必须先让用户看得出哪些词有内容，否则等于功能不可发现。 */
.wl-tag {
  font-size: 9px;
  color: var(--primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px 5px;
  line-height: 1.4;
}
</style>
