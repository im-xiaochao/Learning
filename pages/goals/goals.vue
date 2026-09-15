<script setup lang="ts">
/**
 * 学习目标：考研年份 / 科目 / 每日学习量。
 * 按文档第 7 节约定，新目标写入 goalHistory 并从次日起生效，今天继续按原计划完成。
 */
import { computed, ref } from 'vue'
import AppHeader from '../../components/AppHeader.vue'
import {
  useLearning,
  DAILY_WORD_OPTIONS,
  DAILY_KNOWLEDGE_OPTIONS,
  EXAM_YEARS,
  ENGLISH_EXAMS,
  MATH_EXAMS,
} from '../../stores/learning'

const { state, saveGoals } = useLearning()

const yearIndex = ref(Math.max(0, EXAM_YEARS.indexOf(state.value.settings.examYear)))
const englishIndex = ref(Math.max(0, ENGLISH_EXAMS.indexOf(state.value.settings.englishExam)))
const mathIndex = ref(Math.max(0, MATH_EXAMS.indexOf(state.value.settings.mathExam)))
const wordIndex = ref(Math.max(0, DAILY_WORD_OPTIONS.indexOf(state.value.goalHistory[state.value.goalHistory.length - 1]?.dailyWords ?? 50)))
const knowledgeIndex = ref(
  Math.max(0, DAILY_KNOWLEDGE_OPTIONS.indexOf(state.value.goalHistory[state.value.goalHistory.length - 1]?.dailyKnowledgePoints ?? 3)),
)

const status = ref('')

const yearText = computed(() => `${EXAM_YEARS[yearIndex.value]} 考研`)
const englishText = computed(() => ENGLISH_EXAMS[englishIndex.value])
const mathText = computed(() => MATH_EXAMS[mathIndex.value])
const wordText = computed(() => `${DAILY_WORD_OPTIONS[wordIndex.value]} 个`)
const knowledgeText = computed(() => `${DAILY_KNOWLEDGE_OPTIONS[knowledgeIndex.value]} 个`)

function onSave() {
  saveGoals({
    examYear: EXAM_YEARS[yearIndex.value],
    englishExam: ENGLISH_EXAMS[englishIndex.value],
    mathExam: MATH_EXAMS[mathIndex.value],
    dailyWords: DAILY_WORD_OPTIONS[wordIndex.value],
    dailyKnowledgePoints: DAILY_KNOWLEDGE_OPTIONS[knowledgeIndex.value],
  })
  status.value = `已保存：每天 ${DAILY_WORD_OPTIONS[wordIndex.value]} 个单词、阅读 ${DAILY_KNOWLEDGE_OPTIONS[knowledgeIndex.value]} 个知识点，从明天开始执行。`
  uni.showToast({ title: '目标已保存，一起稳稳向前', icon: 'none' })
}
</script>

<template>
  <view class="page">
    <AppHeader title="学习目标" />

    <view class="viewport fade-in">
      <text class="eyebrow">找到可以坚持的节奏</text>
      <text class="page-title">目标刚刚好，才能走更远。</text>

      <view class="panel mt20">
        <text class="panel-title">我的考研目标</text>

        <view class="field">
          <text class="field-label">考研年份</text>
          <picker mode="selector" :range="EXAM_YEARS.map((y) => `${y} 考研`)" :value="yearIndex" @change="yearIndex = Number($event.detail.value)">
            <view class="field-value"><text>{{ yearText }}</text></view>
          </picker>
        </view>

        <view class="form-grid">
          <view class="field">
            <text class="field-label">英语科目</text>
            <picker mode="selector" :range="ENGLISH_EXAMS" :value="englishIndex" @change="englishIndex = Number($event.detail.value)">
              <view class="field-value"><text>{{ englishText }}</text></view>
            </picker>
          </view>
          <view class="field">
            <text class="field-label">数学科目</text>
            <picker mode="selector" :range="MATH_EXAMS" :value="mathIndex" @change="mathIndex = Number($event.detail.value)">
              <view class="field-value"><text>{{ mathText }}</text></view>
            </picker>
          </view>
        </view>
      </view>

      <view class="panel mt16">
        <text class="panel-title">每日学习量</text>
        <view class="form-grid">
          <view class="field">
            <text class="field-label">单词目标</text>
            <picker
              mode="selector"
              :range="DAILY_WORD_OPTIONS.map((n) => `${n} 个`)"
              :value="wordIndex"
              @change="wordIndex = Number($event.detail.value)"
            >
              <view class="field-value"><text>{{ wordText }}</text></view>
            </picker>
          </view>
          <view class="field">
            <text class="field-label">知识点目标</text>
            <picker
              mode="selector"
              :range="DAILY_KNOWLEDGE_OPTIONS.map((n) => `${n} 个`)"
              :value="knowledgeIndex"
              @change="knowledgeIndex = Number($event.detail.value)"
            >
              <view class="field-value"><text>{{ knowledgeText }}</text></view>
            </picker>
          </view>
        </view>
        <text class="goal-helper">新的学习量从明天起生效，今天继续按原计划完成。目标保存在本机。</text>
      </view>

      <button class="primary-button mt20" hover-class="hover-press" @tap="onSave">
        <text>保存目标</text>
        <image src="/static/icons/check-on.png" mode="aspectFit" />
      </button>
      <text v-if="status" class="form-status">{{ status }}</text>
    </view>
  </view>
</template>
