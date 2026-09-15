<script setup lang="ts">
/** 数学 tab：高数 / 线代 / 概率 */
import AppHeader from '../../components/AppHeader.vue'
import KnowledgeLibrary from '../../components/KnowledgeLibrary.vue'
import { MATH_SUBJECT_IDS } from '../../composables/useContent'
</script>

<template>
  <view class="page">
    <AppHeader />
    <KnowledgeLibrary
      :subject-ids="MATH_SUBJECT_IDS"
      eyebrow="考研数学"
      title="把知识点，讲明白。"
      search-placeholder="搜索数学知识点，如：极限、矩阵、行列式"
    />
  </view>
</template>
