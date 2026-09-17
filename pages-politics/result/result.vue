<script setup lang="ts">
/**
 * 政治刷题结果页：本轮对错统计 + 错题清单 + 重练入口。
 */
import { computed } from 'vue'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'
import { isObjective } from '../../utils/politics'
import { usePoliticsQuiz, startQuiz } from '../usePoliticsQuiz'
import { appPoliticsQuestions } from '../questions'

const { getQuizAnswer } = useLearning()
const quiz = usePoliticsQuiz()

/** 本轮题目（按队列顺序解析回题目对象） */
const reviewed = computed(() =>
  quiz.queue.value.map((id) => ({ question: appPoliticsQuestions.find((q) => q.id === id), rec: getQuizAnswer(id) })).filter((x) => x.question),
)

/** 客观题 = 单选 + 多选，两者都判对错；材料题只看参考答案、不计分。判据在 utils/politics */
const objectiveItems = computed(() => reviewed.value.filter((x) => isObjective(x.question?.type || '')))
const counts = computed(() => {
  let correct = 0
  let wrong = 0
  for (const x of objectiveItems.value) {
    if (x.rec?.correct) correct += 1
    else wrong += 1
  }
  return { correct, wrong, material: reviewed.value.length - objectiveItems.value.length }
})

const wrongItems = computed(() => objectiveItems.value.filter((x) => x.rec && !x.rec.correct))
const accuracy = computed(() => (objectiveItems.value.length ? Math.round((counts.value.correct / objectiveItems.value.length) * 100) : 0))
const perfect = computed(() => objectiveItems.value.length > 0 && counts.value.wrong === 0)

/** 本轮范围文案：整卷练习显示「4套卷第N套」等 */
const scopeLabel = computed(() => {
  const f = quiz.moduleFilter.value
  if (/^x[48]-\d+$/.test(f)) {
    const [book, set] = f.split('-')
    return `2026 肖秀荣《${book === 'x4' ? '4套卷' : '8套卷'}》第${set}套`
  }
  if (f && f !== 'all') return f
  return quiz.fromWeak.value ? '错题重练' : '全部题目'
})

function retryWrong() {
  if (!wrongItems.value.length) return
  startQuiz('all', wrongItems.value.map((x) => x.question!.id), true)
  uni.redirectTo({ url: '/pages-politics/question/question' })
}

function backToList() {
  uni.redirectTo({ url: '/pages-politics/list/list' })
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<template>
  <view class="page">
    <AppHeader title="刷题结果" />

    <view class="viewport fade-in">
      <view class="result-hero">
        <view class="result-mark">
          <image src="/static/icons/check-primary.png" mode="aspectFit" />
        </view>
        <text class="result-title">{{ perfect ? '这一组，拿下了。' : wrongItems.length ? '再练一遍，就稳了。' : '这一组做完了。' }}</text>
        <text class="subtext mt12">
          {{ scopeLabel }} · 本轮 {{ reviewed.length }} 题{{ counts.material ? `（含材料题 ${counts.material} 道）` : ''
          }}。{{ wrongItems.length ? `有 ${wrongItems.length} 道选错了，回头重练一遍。` : '选择题全部答对，继续保持。' }}
        </text>
      </view>

      <view class="result-counts">
        <view class="count-cell">
          <text class="count-num">{{ counts.correct }}</text>
          <text class="count-label">答对</text>
        </view>
        <view class="count-cell">
          <text class="count-num">{{ counts.wrong }}</text>
          <text class="count-label">答错</text>
        </view>
        <view class="count-cell">
          <text class="count-num">{{ accuracy }}<text class="count-unit">%</text></text>
          <text class="count-label">正确率</text>
        </view>
      </view>

      <button v-if="wrongItems.length" class="primary-button mt20" hover-class="hover-press" @tap="retryWrong">
        <text>重练错题 · {{ wrongItems.length }} 道</text>
        <image src="/static/icons/refresh-primary.png" mode="aspectFit" />
      </button>
      <button v-else class="primary-button mt20" hover-class="hover-press" @tap="backToList">
        <text>回到刷题列表</text>
        <image src="/static/icons/arrow-on.png" mode="aspectFit" />
      </button>
      <button v-if="wrongItems.length" class="text-button" style="width: 100%" hover-class="hover-press" @tap="backToList">
        <text>返回刷题列表</text>
      </button>

      <view class="section-head">
        <text class="head-title">本轮题目</text>
        <text class="head-note">点开重做这一题</text>
      </view>

      <view class="quiz-list">
        <button
          v-for="x in reviewed"
          :key="x.question!.id"
          class="quiz-row"
          hover-class="hover-press"
          @tap="startQuiz('all', [x.question!.id]) && uni.redirectTo({ url: '/pages-politics/question/question' })"
        >
          <view class="quiz-main">
            <text class="quiz-stem">{{ x.question!.stem }}</text>
            <text class="quiz-sub">{{ x.question!.module }}</text>
          </view>
          <view class="pill" :class="{ orange: x.question!.type !== 'material' && !x.rec?.correct }">
            <text>{{ x.question!.type === 'material' ? '材料题' : x.rec?.correct ? '答对' : '答错' }}</text>
          </view>
        </button>
      </view>

      <button class="text-button mt20" style="width: 100%" hover-class="hover-press" @tap="goHome">
        <text>回到学习首页</text>
      </button>
    </view>
  </view>
</template>

<style scoped>
.count-unit {
  font-size: 13px;
  font-weight: 400;
  color: var(--muted);
}
.quiz-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.quiz-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 14px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  text-align: left;
}
.quiz-main {
  flex: 1;
  min-width: 0;
}
.quiz-stem {
  font-size: 13px;
  line-height: 1.6;
  display: block;
  margin-bottom: 5px;
}
.quiz-sub {
  font-size: 10px;
  color: var(--muted);
}
</style>
