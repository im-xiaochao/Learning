<script setup lang="ts">
/**
 * 政治刷题独立页（薄壳）。
 *
 * 政治模块的**主入口在资料库**：`components/KnowledgeLibrary.vue` 选中政治时直接内嵌
 * `components/PoliticsQuiz.vue`，与设计稿 knowledgePage 的
 * `isQuiz ? politicsQuizBody() : knowledgeResults()` 一致——刷题内容本身就是政治模块的内容，
 * 不该藏在「进入政治刷题」这类二级入口后面。
 *
 * 所以这一页只剩一个用途：答题 / 结果页里「返回题库」时回到刷题首页。
 * 内容与内嵌的那份**完全共用同一个组件**，别在这里另写一套。
 */
import AppHeader from '../../components/AppHeader.vue'
import PoliticsQuiz from '../../components/PoliticsQuiz.vue'
</script>

<template>
  <view class="page">
    <AppHeader title="政治刷题" />

    <view class="viewport fade-in">
      <text class="eyebrow">考研政治 · 刷题</text>
      <text class="page-title">先把题做对，再回头看理论。</text>
      <text class="subtext mt12">
        政治的知识点讲解还在整理，这里先放题目：单选、多选做完立刻判对错、给解析；材料题读材料再看采分点。
      </text>

      <PoliticsQuiz />
    </view>
  </view>
</template>
