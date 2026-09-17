<script setup lang="ts">
/**
 * 数学 tab：高等数学 / 线性代数 / 概率论。
 *
 * 只有三项，学科切换用**胶囊 tab**（与政治卷的「4套卷 / 8套卷」同一套控件），
 * 标签显示学科全称——见设计稿 v1.6 与 KnowledgeLibrary 的 switchStyle。
 */
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
      switch-style="pill"
    />
  </view>
</template>
