<script setup lang="ts">
/** 学习首页：今日进度、两个学习入口、接着上次学 */
import { computed } from 'vue'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'
import { getEntry, knowledgeEntries, knowledgeTotal, appPoliticsQuestionTotal } from '../../composables/useContent'

const { currentGoal, todayWords, todayKnowledge, todayPending, todayPercent, streakDays, lastReading, totalQuiz } = useLearning()

const todayLabel = computed(() => {
  const d = new Date()
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${week}`
})

/** 环形进度：conic-gradient 角度 */
const ringDeg = computed(() => Math.round((todayPercent.value / 100) * 360))
const ringStyle = computed(
  () => `background: conic-gradient(#faab8c 0deg ${ringDeg.value}deg, rgba(255,255,255,0.32) ${ringDeg.value}deg 360deg);`,
)

const wordPercent = computed(() => Math.min(100, Math.round((todayWords.value / currentGoal.value.dailyWords) * 100)))
const knowledgePercent = computed(() =>
  Math.min(100, Math.round((todayKnowledge.value / currentGoal.value.dailyKnowledgePoints) * 100)),
)

const wordsDone = computed(() => todayWords.value >= currentGoal.value.dailyWords)
const knowledgeDone = computed(() => todayKnowledge.value >= currentGoal.value.dailyKnowledgePoints)

/**
 * 政治刷题卡片的进度：已练 / 题库总量。
 * 注意**刷题不算「今日目标」**——进度环与「今日待办」仍是单词 + 知识点两项，
 * 这里只是并列的第三个学习入口（与设计稿一致）。
 */
const quizPercent = computed(() =>
  appPoliticsQuestionTotal ? Math.min(100, Math.round((totalQuiz.value / appPoliticsQuestionTotal) * 100)) : 0,
)

/** 接着上次学：优先最近打开的阅读记录，没有则给第一个知识点 */
const recent = computed(() => {
  const last = lastReading.value
  if (last) {
    const entry = getEntry(last.knowledgeId)
    if (entry) return { entry, first: false }
  }
  const entry = knowledgeEntries[0]
  return entry ? { entry, first: true } : null
})

function goTab(url: string) {
  uni.switchTab({ url })
}

function openRecent() {
  const r = recent.value
  if (!r) return
  uni.navigateTo({ url: `/pages-knowledge/topic/topic?id=${r.entry.point.id}` })
}
</script>

<template>
  <view class="page">
    <AppHeader />

    <view class="viewport fade-in">
      <view class="row">
        <text class="eyebrow">{{ todayLabel }}</text>
        <view class="streak">
          <image src="/static/icons/flame-accent.png" mode="aspectFit" />
          <text>连续学习 {{ streakDays }} 天</text>
        </view>
      </view>

      <text class="page-title">今天，也向前一步。</text>

      <view class="daily-card">
        <view class="daily-text">
          <text class="eyebrow">每一步，都算数</text>
          <text class="daily-title">{{ todayPending ? '把坚持，变成自己的底气。' : '今天的目标，都做到了。' }}</text>
          <view class="daily-meta">
            <image src="/static/icons/circleCheck-on.png" mode="aspectFit" />
            <text>{{ todayPending ? `今日还有 ${todayPending} 项学习待完成` : '好好休息，明天继续同行' }}</text>
          </view>
        </view>
        <view class="progress-ring">
          <view class="ring-ring" :style="ringStyle" />
          <view class="ring-label">
            <text class="ring-num">{{ todayPercent }}</text>
            <text class="ring-unit">%</text>
            <text class="ring-cap">今日进度</text>
          </view>
        </view>
      </view>

      <view class="section-head">
        <text class="head-title">今日学习</text>
        <text class="head-note">{{ todayPending ? `${todayPending} 项待办` : '全部完成' }}</text>
      </view>

      <view class="learning-grid">
        <button class="study-card" hover-class="hover-press" @tap="goTab('/pages/words/words')">
          <view class="row">
            <image class="card-icon" src="/static/icons/logo-primary.png" mode="aspectFit" />
            <text class="card-kicker">考研英语</text>
          </view>
          <text class="card-title">今日单词</text>
          <text class="study-numbers"><text class="num">{{ todayWords }}</text> / {{ currentGoal.dailyWords }} 个</text>
          <view class="small-progress"><view class="bar" :style="`width:${wordPercent}%`" /></view>
          <view class="card-link">
            <text>{{ wordsDone ? '查看复习成果' : '继续背词' }}</text>
            <image :src="wordsDone ? '/static/icons/check-primary.png' : '/static/icons/arrow-primary.png'" mode="aspectFit" />
          </view>
        </button>

        <button class="study-card" hover-class="hover-press" @tap="goTab('/pages/library/library')">
          <view class="row">
            <image class="card-icon" src="/static/icons/logo-primary.png" mode="aspectFit" />
            <text class="card-kicker">数学 · 政治</text>
          </view>
          <text class="card-title">知识点讲解</text>
          <text class="study-numbers">
            <text class="num">{{ todayKnowledge }}</text>
            / {{ currentGoal.dailyKnowledgePoints }} 个
          </text>
          <view class="small-progress"><view class="bar" :style="`width:${knowledgePercent}%`" /></view>
          <view class="card-link">
            <text>{{ knowledgeDone ? '今天已达标' : '去读知识点' }}</text>
            <image src="/static/icons/arrow-primary.png" mode="aspectFit" />
          </view>
        </button>

        <!-- 政治刷题：并列的第三个入口（整行）。不计入今日目标 -->
        <button class="study-card wide" hover-class="hover-press" @tap="goTab('/pages/library/library')">
          <view class="row">
            <image class="card-icon" src="/static/icons/logo-primary.png" mode="aspectFit" />
            <text class="card-kicker">考研政治</text>
          </view>
          <text class="card-title">政治刷题</text>
          <text class="study-numbers">
            <text class="num">{{ totalQuiz }}</text>
            / {{ appPoliticsQuestionTotal }} 题
          </text>
          <view class="small-progress"><view class="bar" :style="`width:${quizPercent}%`" /></view>
          <view class="card-link">
            <text>{{ totalQuiz ? '继续刷题' : '去刷题' }}</text>
            <image src="/static/icons/arrow-primary.png" mode="aspectFit" />
          </view>
        </button>
      </view>

      <view class="section-head">
        <text class="head-title">接着上次学</text>
        <text class="head-note">把知识，再往前推一点</text>
      </view>

      <button v-if="recent" class="recent-card" hover-class="hover-press" @tap="openRecent">
        <view class="recent-formula">
          <text>{{ recent.entry.point.title.slice(0, 2) }}</text>
        </view>
        <view class="recent-text">
          <text class="recent-title">{{ recent.entry.point.title }}</text>
          <text class="recent-sub">
            {{ recent.entry.chapter.module }} · {{ recent.entry.chapter.title }} ·
            {{ recent.first ? '从这里开始' : '上次读到' }}
          </text>
        </view>
        <image class="chev" src="/static/icons/chevron.png" mode="aspectFit" />
      </button>

      <text class="quiet-note">共 {{ knowledgeTotal }} 个知识点 · 进度保存在本机</text>
    </view>
  </view>
</template>

<style scoped>
.ring-ring {
  position: absolute;
  left: 0;
  top: 0;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  /* 兜底色：万一运行环境不支持 conic-gradient，内联样式会被整条丢弃，
     此时显示为轨道色，而不是变成空白 */
  background: rgba(255, 255, 255, 0.32);
}
.ring-ring::after {
  content: '';
  position: absolute;
  left: 7px;
  top: 7px;
  right: 7px;
  bottom: 7px;
  border-radius: 50%;
  background: var(--primary);
}
</style>
