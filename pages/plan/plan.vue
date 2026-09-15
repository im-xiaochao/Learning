<script setup lang="ts">
/** 计划页：待学知识点列表；空态引导去资料库 */
import { computed } from 'vue'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'

const { planEntries } = useLearning()

const items = computed(() => planEntries.value)

function openPoint(id: string) {
  uni.navigateTo({ url: `/pages-knowledge/topic/topic?id=${id}` })
}

function goLibrary() {
  uni.switchTab({ url: '/pages/library/library' })
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
</script>

<template>
  <view class="page">
    <AppHeader />

    <view class="viewport fade-in">
      <template v-if="items.length">
        <text class="eyebrow">按自己的节奏学习</text>
        <text class="page-title">下一步，已经安排好。</text>
        <text class="subtext mt12">{{ items.length }} 个知识点待学习</text>

        <view class="knowledge-list mt20">
          <button
            v-for="(it, i) in items"
            :key="it.item.id"
            class="knowledge-row"
            hover-class="hover-press"
            @tap="openPoint(it.item.knowledgeId)"
          >
            <view class="knowledge-number"><text>{{ pad(i + 1) }}</text></view>
            <view class="knowledge-content">
              <text class="k-title">{{ it.entry?.point.title }}</text>
              <text class="k-sub">{{ it.entry?.chapter.title }} · {{ it.entry?.section.title }}</text>
            </view>
            <image class="chev" src="/static/icons/chevron.png" mode="aspectFit" />
          </button>
        </view>

        <text class="quiet-note">进入知识点后，可再次点击计划按钮移除。</text>
      </template>

      <view v-else class="empty">
        <view class="empty-symbol">
          <image src="/static/icons/target-primary.png" mode="aspectFit" />
        </view>
        <text class="empty-title">给下一步，留个位置。</text>
        <text class="empty-copy">把想读的数学知识点加入计划。每次打开，就知道从哪里继续。</text>
        <button class="primary-button" hover-class="hover-press" @tap="goLibrary">
          <text>去资料库</text>
          <image src="/static/icons/arrow-on.png" mode="aspectFit" />
        </button>
      </view>
    </view>
  </view>
</template>
