<script setup lang="ts">
/**
 * 计划设定：设定每天学多少个单词。
 *
 * 为什么单独一页、而且改完立即生效：单词页的「今日新词 / 今日复习」两张卡要有个
 * 说得清的分母；用户在「我的 · 学习目标」里改的是同一项，但那边按文档约定次日生效，
 * 这里走 setDailyWords——今天、以及之后还没生效的目标一并对齐，避免明天被旧值顶回去。
 */
import { computed } from 'vue'
import AppHeader from '../../components/AppHeader.vue'
import { DAILY_WORD_OPTIONS, useLearning } from '../../stores/learning'

const { currentGoal, wordTargets, setDailyWords } = useLearning()

const daily = computed(() => currentGoal.value.dailyWords)
const targets = computed(() => wordTargets.value)

function pick(value: number) {
  if (value === daily.value) return
  setDailyWords(value)
  uni.showToast({ title: `每天学 ${value} 个单词`, icon: 'none' })
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
        现在每天学 {{ daily }} 个：新词 {{ targets.newWords }} 个 · 复习 {{ targets.review }} 个。
      </text>

      <view class="panel mt20">
        <text class="panel-title">每天学多少个单词</text>
        <view class="src-switch">
          <button
            v-for="n in DAILY_WORD_OPTIONS"
            :key="n"
            class="src-chip"
            :class="{ active: n === daily }"
            hover-class="hover-press"
            @tap="pick(n)"
          >
            <text>{{ n }}</text>
            <text class="chip-note">个 / 天</text>
          </button>
        </view>
        <text class="subtext mt12">
          其中约四成是新词、六成是复习——复习量不少于新词量，记得更牢。
        </text>
      </view>

      <text class="quiet-note">
        修改后立即生效，今日进度会按新目标重新计算。<br />
        「我的 · 学习目标」里改的是同一项，那边的改动从次日生效。
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
</style>
