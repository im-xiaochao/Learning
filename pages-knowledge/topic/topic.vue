<script setup lang="ts">
/**
 * 知识点讲解。
 *
 * 这个页面在分包 pages-knowledge 里，正文数据 knowledge-content.ts 只被它引用，
 * 因此会被打进分包——主包只保留「标题 + 摘要」的列表数据，避免顶到微信 2MB 主包上限。
 */
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'
import { getEntry } from '../../composables/useContent'
import { appKnowledgeContent } from '../../data/generated/app/knowledge-content'

const { getReading, isPlanned, togglePlan, openKnowledge, completeKnowledge } = useLearning()

const pointId = ref('')
onLoad((query) => {
  pointId.value = (query as Record<string, string>)?.id || ''
  const entry = getEntry(pointId.value)
  if (entry) openKnowledge(entry.point.id, entry.section.id)
})

const entry = computed(() => getEntry(pointId.value))
const content = computed(() => appKnowledgeContent[pointId.value])

const reading = computed(() => (entry.value ? getReading(entry.value.point.id) : undefined))
const read = computed(() => reading.value?.status === 'completed')
const planned = computed(() => (entry.value ? isPlanned(entry.value.point.id) : false))

const anchorLabel = computed(() => (content.value?.anchor.type === 'formula' ? '关键公式' : '概念抓手'))
const indexInSection = computed(() => {
  const e = entry.value
  if (!e) return 1
  return e.section.points.findIndex((p) => p.id === e.point.id) + 1
})

function onTogglePlan() {
  const e = entry.value
  if (!e) return
  const added = togglePlan(e.point.id)
  uni.showToast({ title: added ? '已加入计划，下一次接着学' : '已从学习计划中移除', icon: 'none' })
}

function onMarkRead() {
  const e = entry.value
  if (!e) return
  completeKnowledge(e.point.id)
  uni.showToast({ title: '已标记为读完', icon: 'none' })
}

function goPlan() {
  uni.switchTab({ url: '/pages/plan/plan' })
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
</script>

<template>
  <view class="page">
    <AppHeader :title="entry ? '知识点讲解' : ''" />

    <view class="viewport fade-in">
      <template v-if="entry">
        <text class="eyebrow">
          {{ entry.chapter.module }} / {{ entry.chapter.title }} / {{ entry.section.title }} / 知识点
          {{ pad(indexInSection) }}
        </text>
        <text class="page-title">{{ entry.point.title }}</text>
        <text class="topic-lead">{{ entry.point.summary }} 先理解，再记忆。</text>

        <view v-if="content" class="formula-box">
          <text class="knowledge-anchor">{{ anchorLabel }}</text>
          <text class="formula-text">{{ content.anchor.content }}</text>
          <text class="formula-caption">{{ content.anchor.caption }}</text>
          <view class="pill" :class="{ orange: !read }">
            <text>{{ read ? '已读知识点' : '正在阅读' }}</text>
          </view>
        </view>

        <view v-if="content" class="detail-section">
          <text class="section-title">抓住这三个要点</text>
          <view v-for="(k, i) in content.keyPoints" :key="i" class="concept-step">
            <view class="step-no"><text>{{ i + 1 }}</text></view>
            <text class="step-text">{{ k.body }}</text>
          </view>
        </view>

        <view v-if="content && content.example" class="detail-section">
          <text class="section-title">放进例子里理解</text>
          <text class="section-body">{{ content.example }}</text>
        </view>

        <view class="action-stack">
          <button class="secondary-button" hover-class="hover-press" @tap="onTogglePlan">
            <image :src="planned ? '/static/icons/check-primary.png' : '/static/icons/plus-primary.png'" mode="aspectFit" />
            <text>{{ planned ? '已加入计划 · 点击移除' : '加入学习计划' }}</text>
          </button>
          <button v-if="!read" class="primary-button mt12" hover-class="hover-press" @tap="onMarkRead">
            <text>标记为已读完</text>
            <image src="/static/icons/check-on.png" mode="aspectFit" />
          </button>
          <button v-else class="text-button" style="width: 100%" hover-class="hover-press" @tap="goPlan">
            <text>去学习计划看下一步</text>
            <image src="/static/icons/chevron.png" mode="aspectFit" />
          </button>
        </view>

        <text class="quiet-note">预计阅读 {{ entry.point.minutes }} 分钟 · 理解得慢一点，也是在认真向前。</text>
      </template>

      <view v-else class="empty">
        <view class="empty-symbol">
          <image src="/static/icons/logo-primary.png" mode="aspectFit" />
        </view>
        <text class="empty-title">没有找到这个知识点</text>
        <text class="empty-copy">可能链接已失效，回到资料库重新进入。</text>
      </view>
    </view>
  </view>
</template>
