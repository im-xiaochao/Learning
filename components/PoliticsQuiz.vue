<script setup lang="ts">
/**
 * 政治刷题首页（资料库内嵌）：来源切换（4套卷 / 8套卷）+ 每套卷的进度卡。
 *
 * 这一屏**只画索引级信息**，一行题干都没有。原因有两个，缺一不可：
 *   1. 体积：资料库在**主包**，主包不能 import 分包题库（见 tools/check-bundles.mjs）。
 *      题干一旦画在这里，就必须常驻主包——曾经就是这样，`politics-index.ts` 202 KB。
 *   2. 设计稿本来就是两级：`politicsQuizBody()` 只画套卷卡，点某套卷才进
 *      `quizPaperSetPage()`（独立路由 quiz-paper），**题干只出现在那一页**。
 *
 * 宿主有两个（内容共用同一个组件，不各写一份）：
 *   1. `components/KnowledgeLibrary.vue` —— 主包，政治学科内嵌（主入口）
 *   2. `pages-politics/list/list.vue`    —— 分包，结果页「返回题库」进来的独立页
 *
 * 数据是主包里的 `data/generated/app/politics-index.ts`（`appPoliticsPaperSets`），
 * 里面只有每套卷的题目 id：「共 N 题」= ids.length，「已练 M 题」靠 id 查同学的作答记录。
 * 点卡片 = 带卷号跳到分包里的卷详情页，题干在那里才被解析出来。
 */
import { computed, ref } from 'vue'
import { appPoliticsPaperSets } from '../data/generated/app/politics-index'
import { useLearning } from '../stores/learning'

const { getQuizAnswer } = useLearning()

/**
 * 书：文案与原型 PAPER_BOOKS 一致。
 *  - 4套卷：考前一周的押题卷
 *  - 8套卷：冲刺阶段的模拟卷
 */
const BOOKS = [
  { key: 'x4', label: '2026 肖秀荣《4套卷》', short: '4套卷', note: '考前一周的押题卷' },
  { key: 'x8', label: '2026 肖秀荣《8套卷》', short: '8套卷', note: '冲刺阶段的模拟卷' },
] as const

type BookKey = (typeof BOOKS)[number]['key']

const source = ref<BookKey>('x4')

const bookOfSource = computed(() => BOOKS.find((b) => b.key === source.value) || BOOKS[0])

/** 一组题的进度：已练 / 总题数 / 已答对 / 正确率 */
function statsOf(ids: string[]) {
  const done = ids.filter((id) => getQuizAnswer(id)).length
  const correct = ids.filter((id) => getQuizAnswer(id)?.correct).length
  return { total: ids.length, done, correct, rate: done ? Math.round((correct / done) * 100) : 0 }
}

/** 当前这本书的每一套（题量 + 进度）：第 N 套卡片就是这一屏的全部内容 */
const bookSets = computed(() =>
  appPoliticsPaperSets.filter((s) => s.book === source.value).map((s) => ({ ...s, stats: statsOf(s.ids) })),
)

/** 来源切换标签（含各来源题量） */
const sourceTabs = computed(() =>
  BOOKS.map((b) => ({
    key: b.key,
    label: b.short,
    count: appPoliticsPaperSets.filter((s) => s.book === b.key).reduce((n, s) => n + s.ids.length, 0),
  })),
)

/** 题库为空是合法状态 */
const isEmpty = computed(() => appPoliticsPaperSets.length === 0)

function switchSource(key: BookKey) {
  source.value = key
}

/**
 * 进卷详情页。带的是**卷号**（`x4-1` … `x8-8`），详情页据此在分包里取这一套的全部题干。
 *
 * 用 navigateTo 而不是 redirectTo：详情页与答题页都在分包里，返回时能一层层退回来——
 * 答题页返回 → 本套详情页，详情页「换一套卷」→ 回这里，都不丢当前来源。
 */
function openPaper(book: BookKey, set: number) {
  uni.navigateTo({ url: `/pages-politics/paper/paper?set=${book}-${set}` })
}
</script>

<template>
  <view class="src-switch">
    <button
      v-for="s in sourceTabs"
      :key="s.key"
      class="src-chip"
      :class="{ active: source === s.key }"
      hover-class="hover-press"
      @tap="switchSource(s.key)"
    >
      <text>{{ s.label }}</text>
      <text class="src-count">{{ s.count }} 题</text>
    </button>
  </view>

  <!-- 空题库：来源切换照常渲染，内容只剩一句说明 -->
  <view v-if="isEmpty" class="panel mt20">
    <text class="subtext">题库还在整理中，补充后会自动出现在这里。</text>
  </view>

  <template v-else>
    <text class="hint-note">从 {{ bookOfSource.label }} 中选择一套开始练习，套内按卷面顺序连续作答。</text>

    <view class="section-head">
      <text class="head-title">选择一套卷</text>
      <text class="head-note">{{ bookOfSource.note }}</text>
    </view>

    <view class="paper-grid">
      <button
        v-for="s in bookSets"
        :key="s.set"
        class="paper-card"
        hover-class="hover-press"
        @tap="openPaper(s.book, s.set)"
      >
        <text class="paper-no">第 {{ s.set }} 套</text>
        <text class="paper-label">{{ bookOfSource.label }}</text>
        <view class="paper-meta">
          <image src="/static/icons/clock.png" mode="aspectFit" />
          <text>已练 {{ s.stats.done }}/{{ s.stats.total }} 题</text>
        </view>
        <text class="paper-rate" :class="{ good: s.stats.rate >= 80 }">
          {{ s.stats.done ? `${s.stats.rate}% 正确率` : '尚未开始' }}
        </text>
      </button>
    </view>

    <text class="quiet-note">题库按 PDF 转档录入，套内按卷面顺序排列。</text>
  </template>
</template>

<style scoped>
/* ── 来源切换 ──
   .src-switch / .src-chip 定义在 App.vue 全局：数学 tab 的学科切换要用同一套，
   复制两份迟早会飘（样式检查脚本也是按原型那一条定义来对账的）。
   这里只放来源切换**独有**的那一行小字：芯片里多一行「75 题」。 */
.src-count {
  font-size: 9px;
  font-weight: 400;
  opacity: 0.85;
}
.src-chip.active .src-count {
  opacity: 0.8;
}

.hint-note {
  display: block;
  margin-top: 9px;
  font-size: 10px;
  color: var(--muted);
  line-height: 1.7;
}

/* ── 卷选择卡片 ── */
.paper-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 11px;
  margin-top: 4px;
}
.paper-card {
  flex: 1 1 calc(50% - 6px);
  min-width: 0;
  min-height: 118px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 15px 14px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
  position: relative;
  overflow: hidden;
  text-align: left;
}
/* 右上角的装饰圆：原型 .paper-card::after，小程序里用伪元素同样有效 */
.paper-card::after {
  content: '';
  position: absolute;
  right: -18px;
  top: -18px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--primary-soft);
  opacity: 0.6;
}
.paper-no {
  font-family: var(--display);
  font-size: 19px;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: 0.5px;
}
.paper-label {
  font-size: 10px;
  color: var(--muted);
  position: relative;
  z-index: 1;
}
.paper-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: auto;
  font-size: 10px;
  color: var(--muted);
  position: relative;
  z-index: 1;
}
.paper-meta image {
  width: 12px;
  height: 12px;
}
.paper-rate {
  font-size: 10px;
  font-weight: 600;
  color: var(--accent-ink);
  background: var(--accent-soft);
  border-radius: 12px;
  padding: 3px 8px;
  position: relative;
  z-index: 1;
}
.paper-rate.good {
  color: var(--primary);
  background: var(--primary-soft);
}
</style>
