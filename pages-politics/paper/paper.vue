<script setup lang="ts">
/**
 * 政治卷详情页（分包内）：一套卷的题目列表 + 本套进度。
 *
 * **题干只在这一页出现**。资料库那边（主包）只画套卷卡，点卡片才带卷号跳到这里，
 * 所以主包的 `politics-index.ts` 里只需要题目 id 就够（202 KB → 8.6 KB，不随题库增长）。
 * 与设计稿的两级结构一致：`politicsQuizBody()` 画卡 → `quizPaperSetPage()` 画题。
 *
 * 这一页在分包里，能直接拿 `pages-politics/questions.ts` 的完整题库（题干 / 选项 / 答案 / 解析），
 * 这正是把它拆出来的意义——主包拿不到这份数据，也不该拿到。
 *
 * 作答记录写进主包的 `stores/learning.ts`（只写 id 与对错）。
 */
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'
import { isObjective } from '../../utils/politics'
import { appPoliticsQuestions } from '../questions'

const { getQuizAnswer } = useLearning()

/** 书的文案与原型 PAPER_BOOKS 一致 */
const BOOKS = {
  x4: { label: '2026 肖秀荣《4套卷》', short: '4套卷' },
  x8: { label: '2026 肖秀荣《8套卷》', short: '8套卷' },
} as const

/** 卷号：`x4-1` … `x8-8`，由资料库的套卷卡带过来 */
const setKey = ref('x4-1')

onLoad((options) => {
  const raw = options?.set ? decodeURIComponent(options.set) : ''
  // 只认 x4-1 / x8-3 这种卷号；拿不到就退回 4套卷第 1 套，别让页面空着
  if (/^x[48]-\d+$/.test(raw)) setKey.value = raw
})

const book = computed(() => BOOKS[(setKey.value.startsWith('x8') ? 'x8' : 'x4') as 'x4' | 'x8'])
const setNo = computed(() => Number(setKey.value.split('-')[1]) || 1)

/** 这一套的题，卷面顺序（题库本身按录入顺序排） */
const pool = computed(() => appPoliticsQuestions.filter((q) => `${q.book}-${q.set}` === setKey.value))

/**
 * 本套进度：已练 / 总题数 / 已答对 / 正确率。
 * 客观题才判对错（材料题只有「已读参考答案」），所以「已答对」只数客观题。
 */
const stats = computed(() => {
  const done = pool.value.filter((q) => getQuizAnswer(q.id)).length
  const correct = pool.value.filter((q) => isObjective(q.type) && getQuizAnswer(q.id)?.correct).length
  return { total: pool.value.length, done, correct, rate: done ? Math.round((correct / done) * 100) : 0 }
})
const percent = computed(() => (stats.value.total ? Math.round((stats.value.done / stats.value.total) * 100) : 0))
const allDone = computed(() => stats.value.total > 0 && stats.value.done === stats.value.total)

// ── 行状态 ──
const TYPE_LABEL: Record<string, string> = { choice: '单选', multi: '多选', material: '材料' }

/**
 * 行的语义状态：答对 / 答错 / 已读参考答案 / 没做过。
 * 与原型一致：**答对的行整块变成 primary-soft 底色**，答错只换描边。
 * 材料题没有对错，答过就算「已读参考答案」——不按答错处理（原型曾经的缺陷，已修）。
 */
function statusOf(id: string): 'correct' | 'wrong' | 'material-done' | 'todo' {
  const q = pool.value.find((x) => x.id === id)
  const rec = getQuizAnswer(id)
  if (!rec) return 'todo'
  if (q?.type === 'material') return 'material-done'
  return rec.correct ? 'correct' : 'wrong'
}

function rowTone(id: string): string {
  const s = statusOf(id)
  if (s === 'correct' || s === 'material-done') return 'ok'
  return s === 'wrong' ? 'bad' : ''
}

function markOf(id: string): string {
  const s = statusOf(id)
  if (s === 'correct' || s === 'material-done') return '/static/icons/circleCheck-primary.png'
  if (s === 'wrong') return '/static/icons/refresh-primary.png'
  return '/static/icons/chevron.png'
}

/** 行副标题：「题型 · 模块 · 状态」，与原型一致 */
function metaOf(q: { type: string; module: string }, id: string): string {
  const parts = [TYPE_LABEL[q.type] || q.type]
  if (q.module) parts.push(q.module)
  const s = statusOf(id)
  if (s === 'correct') parts.push('已答对')
  else if (s === 'wrong') parts.push('答错了')
  else if (s === 'material-done') parts.push('已读参考答案')
  return parts.join(' · ')
}

// ── 交互 ──
/**
 * 换一套卷 = 退回上一屏（资料库里的套卷卡列表）。
 * 用统一的返回而不是自己 redirectTo 一张选卷页：来源（4套卷 / 8套卷）留在上一屏的组件里，
 * 退回去正好还是原来那本书和那个滚动位置。
 */
function backToSelect() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.redirectTo({ url: '/pages-politics/list/list' })
}

/**
 * 跳到答题页。队列在答题页用**完整题库**建（这里仍只带筛选条件）：
 *   pool=<卷号>，从某题进入时额外带 start=<id>，答题页会把该题排到队首。
 */
function goQuestion(startId?: string) {
  const tail = startId ? `&start=${encodeURIComponent(startId)}` : ''
  uni.navigateTo({ url: `/pages-politics/question/question?pool=${encodeURIComponent(setKey.value)}${tail}` })
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
</script>

<template>
  <view class="page">
    <AppHeader title="卷内题目" />

    <!-- 这一套没有题：给一条退路，别停空白页 -->
    <view v-if="!pool.length" class="viewport fade-in">
      <view class="empty">
        <view class="empty-symbol">
          <image src="/static/icons/logo-primary.png" mode="aspectFit" />
        </view>
        <text class="empty-title">这一套还没有题目</text>
        <text class="empty-copy">换一套卷，或者稍后再来。</text>
        <button class="primary-button mt20" hover-class="hover-press" @tap="backToSelect">
          <text>换一套卷</text>
          <image src="/static/icons/arrow-on.png" mode="aspectFit" />
        </button>
      </view>
    </view>

    <view v-else class="viewport fade-in">
      <!-- 本套进度（对齐原型 paper-progress） -->
      <view class="panel mt20">
        <view class="row">
          <view>
            <text class="eyebrow">{{ book.label }} · 第 {{ setNo }} 套</text>
            <text class="big-number">{{ stats.done }}<text class="unit"> / {{ stats.total }}</text></text>
          </view>
          <view class="pill">
            <image :src="allDone ? '/static/icons/check-primary.png' : '/static/icons/clock.png'" mode="aspectFit" />
            <text>{{ allDone ? '已全部练过' : `还剩 ${stats.total - stats.done} 题` }}</text>
          </view>
        </view>
        <view class="small-progress mt16"><view class="bar" :style="`width:${percent}%`" /></view>
        <text class="panel-note">已答对 {{ stats.correct }} 题，正确率 {{ stats.rate }}%</text>
      </view>

      <view class="row mt16">
        <button class="text-button" hover-class="hover-press" @tap="backToSelect">
          <image src="/static/icons/back-primary.png" mode="aspectFit" />
          <text>换一套卷</text>
        </button>
        <text class="subtext small-hint">按卷面顺序排列题目</text>
      </view>

      <!-- 题目列表：题干只在这里出现，属分包内容 -->
      <view class="quiz-list">
        <button
          v-for="(q, i) in pool"
          :key="q.id"
          class="quiz-row"
          :class="rowTone(q.id)"
          hover-class="hover-press"
          @tap="goQuestion(q.id)"
        >
          <text class="quiz-no">{{ pad(i + 1) }}</text>
          <view class="quiz-body">
            <text class="quiz-stem">{{ q.stem }}</text>
            <text class="quiz-meta">{{ metaOf(q, q.id) }}</text>
          </view>
          <image class="quiz-mark" :src="markOf(q.id)" mode="aspectFit" />
        </button>
      </view>

      <button class="primary-button mt20" hover-class="hover-press" @tap="goQuestion()">
        <text>{{ stats.done ? '继续练习本套' : '从头开始本套' }}</text>
        <image src="/static/icons/arrow-on.png" mode="aspectFit" />
      </button>
      <text class="quiet-note">整卷按顺序作答，做完全套查看结果与错题回顾。</text>
    </view>
  </view>
</template>

<style scoped>
/* 进度卡里那行「已答对 N 题，正确率 X%」：原型是 quiet-note + margin-top:10px */
.panel-note {
  display: block;
  margin-top: 10px;
  font-size: 11px;
  color: var(--muted);
  text-align: center;
  line-height: 1.7;
}
.small-hint {
  font-size: 10px;
}

/* ── 题目列表 ── */
.quiz-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-top: 12px;
}
.quiz-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 12px;
  min-height: 67px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  text-align: left;
}
/* 答对（含材料题已读参考答案）整块染成 primary-soft；答错只换描边 —— 与原型一致。
   两个描边色是原型 oklch 字面量的精确 sRGB 换算（小程序不支持 oklch）：
   oklch(0.86 0.06 160) → #b0dec4；oklch(0.87 0.05 40) → #f2cabc。 */
.quiz-row.ok {
  border-color: #b0dec4;
  background: var(--primary-soft);
}
.quiz-row.bad {
  border-color: #f2cabc;
}
.quiz-no {
  width: 26px;
  flex: 0 0 auto;
  font-family: var(--display);
  font-size: 15px;
  color: var(--muted);
}
.quiz-body {
  flex: 1;
  min-width: 0;
}
.quiz-stem {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.55;
  margin-bottom: 4px;
}
.quiz-meta {
  font-size: 10px;
  color: var(--muted);
  line-height: 1.5;
}
.quiz-mark {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}
</style>
