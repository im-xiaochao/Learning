<script setup lang="ts">
/**
 * 资料库 tab：政治 + 计算机专业课。
 *
 * 数学不在这里——数学单独占了「数学」tab。两个 tab 共用 KnowledgeLibrary 组件，
 * 差别只是传入的学科清单；清单按 courseId 从数据派生，加新学科不用改这个文件。
 */
import AppHeader from '../../components/AppHeader.vue'
import KnowledgeLibrary from '../../components/KnowledgeLibrary.vue'
import { LIBRARY_SUBJECT_IDS } from '../../composables/useContent'
</script>

<template>
  <view class="page">
    <AppHeader />
    <KnowledgeLibrary
      :subject-ids="LIBRARY_SUBJECT_IDS"
      eyebrow="考研知识库"
      title="把理论，放进时代里。"
      search-placeholder="搜索政治或专业课知识点"
      empty-hint="这个学科的题库还在整理，之后会陆续补上。"
    />
  </view>
</template>
