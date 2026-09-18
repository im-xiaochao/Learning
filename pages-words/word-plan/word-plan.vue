<script setup lang="ts">
/**
 * 计划设定：两张卡——每天新学多少个单词 / 每天复习多少个单词（与原型一致），
 * 预设之外还可以**自定义**输入。
 *
 * 两条约定：
 *  1. 改完**今天立即生效**（走 setWordPlan），与「我的 · 学习目标」的次日生效不同；
 *  2. **设置时不弹轻提示**——数字就在卡片上，用户看得见，多一个 toast 只是打断。
 */
import { computed, ref } from 'vue'
import AppHeader from '../../components/AppHeader.vue'
import { DAILY_NEW_OPTIONS, DAILY_REVIEW_OPTIONS, WORD_PLAN_MAX, useLearning } from '../../stores/learning'

const { wordTargets, setWordPlan } = useLearning()

type Field = 'newWords' | 'review'

const plan = computed(() => wordTargets.value)
const customField = ref<Field | ''>('')
const draft = ref('')

const optionsOf = (field: Field): number[] => (field === 'newWords' ? DAILY_NEW_OPTIONS : DAILY_REVIEW_OPTIONS)
/** 当前值不在预设里 → 说明是自定义的，「自定义」chip 要显示这个数字并保持选中 */
const isCustom = (field: Field): boolean => !optionsOf(field).includes(plan.value[field])

function openCustom(field: Field) {
  customField.value = field
  draft.value = String(plan.value[field])
}

function closeCustom() {
  customField.value = ''
  draft.value = ''
}

function apply(field: Field, value: number) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return
  const clamped = Math.max(1, Math.min(WORD_PLAN_MAX, n))
  if (field === 'newWords') setWordPlan(clamped, plan.value.review)
  else setWordPlan(plan.value.newWords, clamped)
  closeCustom()
}

function pick(field: Field, value: number) {
  closeCustom()
  apply(field, value)
}

function applyCustom(field: Field) {
  apply(field, Number(draft.value))
}

function goBack() {
  uni.navigateBack()
}
</script>

<template>
  <view class="page">
    <AppHeader title="计划设定" />

    <view class="viewport fade-in">
      <text class="eyebrow">按自己的节奏来</text>
      <text class="page-title">目标刚刚好，才走得远。</text>
      <text class="subtext mt12">
        现在每天新学 {{ plan.newWords }} 个、复习 {{ plan.review }} 个，共
        {{ plan.newWords + plan.review }} 个。
      </text>

      <view class="panel mt20">
        <text class="panel-title">每天新学多少个单词</text>
        <view class="src-switch">
          <button
            v-for="n in DAILY_NEW_OPTIONS"
            :key="n"
            class="src-chip"
            :class="{ active: n === plan.newWords }"
            hover-class="hover-press"
            @tap="pick('newWords', n)"
          >
            <text>{{ n }}</text>
            <text class="chip-note">个 / 天</text>
          </button>
          <button
            class="src-chip"
            :class="{ active: isCustom('newWords') }"
            hover-class="hover-press"
            @tap="openCustom('newWords')"
          >
            <text>{{ isCustom('newWords') ? plan.newWords : '自定义' }}</text>
            <text class="chip-note">个 / 天</text>
          </button>
        </view>
        <view v-if="customField === 'newWords'" class="plan-custom">
          <input
            class="plan-input"
            type="number"
            :value="draft"
            :maxlength="3"
            confirm-type="done"
            @input="draft = $event.detail.value"
            @confirm="applyCustom('newWords')"
          />
          <text class="plan-hint">1~{{ WORD_PLAN_MAX }} 个</text>
          <button class="secondary-button plan-apply" hover-class="hover-press" @tap="applyCustom('newWords')">
            <text>确定</text>
          </button>
          <button class="text-button" hover-class="hover-press" @tap="closeCustom"><text>取消</text></button>
        </view>
      </view>

      <view class="panel mt16">
        <text class="panel-title">每天复习多少个单词</text>
        <view class="src-switch">
          <button
            v-for="n in DAILY_REVIEW_OPTIONS"
            :key="n"
            class="src-chip"
            :class="{ active: n === plan.review }"
            hover-class="hover-press"
            @tap="pick('review', n)"
          >
            <text>{{ n }}</text>
            <text class="chip-note">个 / 天</text>
          </button>
          <button
            class="src-chip"
            :class="{ active: isCustom('review') }"
            hover-class="hover-press"
            @tap="openCustom('review')"
          >
            <text>{{ isCustom('review') ? plan.review : '自定义' }}</text>
            <text class="chip-note">个 / 天</text>
          </button>
        </view>
        <view v-if="customField === 'review'" class="plan-custom">
          <input
            class="plan-input"
            type="number"
            :value="draft"
            :maxlength="3"
            confirm-type="done"
            @input="draft = $event.detail.value"
            @confirm="applyCustom('review')"
          />
          <text class="plan-hint">1~{{ WORD_PLAN_MAX }} 个</text>
          <button class="secondary-button plan-apply" hover-class="hover-press" @tap="applyCustom('review')">
            <text>确定</text>
          </button>
          <button class="text-button" hover-class="hover-press" @tap="closeCustom"><text>取消</text></button>
        </view>
      </view>

      <text class="quiet-note">
        修改后立即生效，今日进度会按新目标重新计算。<br />
        「我的 · 学习目标」里改的是每天的总量，那边的改动从次日生效。
      </text>

      <button class="primary-button mt20" hover-class="hover-press" @tap="goBack">
        <text>返回背单词</text>
        <image src="/static/icons/arrow-on.png" mode="aspectFit" />
      </button>
    </view>
  </view>
</template>

<style scoped>
/* chip 里那行「个 / 天」小字：原型是 .src-chip small（9px / opacity .85）。
   小程序没有 <small>，且 .src-count 定义在 PoliticsQuiz.vue 的 scoped 里不能跨组件用，
   所以这里在本页作用域内补一条，不改 App.vue 里那份与原型逐属性对账的全局定义。 */
.chip-note {
  font-size: 9px;
  font-weight: 400;
  opacity: 0.85;
}
/* 自定义数量：预设 chip 之外的内联输入行（输入框 + 范围提示 + 确定 / 取消） */
.plan-custom {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}
.plan-input {
  flex: 1 1 80px;
  min-width: 0;
  height: 42px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--fg);
  font-size: 14px;
  font-weight: 600;
}
.plan-hint {
  font-size: 9px;
  color: var(--muted);
  flex: 0 0 auto;
}
/* .secondary-button 全局是 width:100%，这里按内容宽度收窄 */
.plan-apply {
  width: auto;
  min-height: 42px;
  padding: 0 14px;
  font-size: 12px;
}
</style>
