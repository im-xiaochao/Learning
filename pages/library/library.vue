<script setup lang="ts">
/**
 * 资料库：学科切换 + 搜索 + 章节列表。
 * 设计稿的列表是「一屏一个学科的扁平知识点」，实际数据有 960 个知识点、
 * 35 个章节，扁平铺开不可用，因此保留设计稿的视觉语言，把层级改成
 * 「学科 → 章节（可展开）→ 小节 → 知识点」。
 */
import { computed, ref } from 'vue'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'
import {
  chaptersOfSubject,
  entriesOfChapter,
  getEntry,
  searchKnowledge,
  subjects,
  knowledgeCountOfSubject,
} from '../../composables/useContent'
import type { KnowledgeEntry } from '../../composables/useContent'

const { getReading, lastReading, isPlanned } = useLearning()

const subjectIndex = ref(0)
const keyword = ref('')
const expanded = ref('')

const subject = computed(() => subjects[subjectIndex.value] || subjects[0])
const chapterList = computed(() => chaptersOfSubject(subject.value?.id || ''))

const searching = computed(() => keyword.value.trim().length > 0)
const results = computed<KnowledgeEntry[]>(() => (searching.value ? searchKnowledge(keyword.value, subject.value?.id) : []))

/** 正在阅读：优先最近打开的章节，否则该学科第一章 */
const feature = computed(() => {
  const last = lastReading.value
  if (last) {
    const entry = getEntry(last.knowledgeId)
    if (entry && entry.subjectId === subject.value?.id) {
      return { chapter: entry.chapter, point: entry.point, resumed: true }
    }
  }
  const first = chapterList.value[0]
  if (!first) return null
  const entries = entriesOfChapter(first.id)
  return entries.length ? { chapter: first, point: entries[0].point, resumed: false } : null
})

function chapterPoints(chapterId: string): KnowledgeEntry[] {
  return entriesOfChapter(chapterId)
}

/** 章节已读 / 总数（已读含「正在阅读」） */
function chapterProgress(chapterId: string): { read: number; total: number; percent: number } {
  const entries = chapterPoints(chapterId)
  const read = entries.filter((e) => getReading(e.point.id)).length
  const total = entries.length
  return { read, total, percent: total ? Math.round((read / total) * 100) : 0 }
}

function selectSubject(i: number) {
  subjectIndex.value = i
  expanded.value = ''
  keyword.value = ''
}

function toggleChapter(id: string) {
  expanded.value = expanded.value === id ? '' : id
}

function openPoint(id: string) {
  uni.navigateTo({ url: `/pages-knowledge/topic/topic?id=${id}` })
}

function goPlan() {
  uni.switchTab({ url: '/pages/plan/plan' })
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

const totalOfSubject = computed(() => knowledgeCountOfSubject(subject.value?.id || ''))
</script>

<template>
  <view class="page">
    <AppHeader />

    <view class="viewport fade-in">
      <text class="eyebrow">考研知识库 · {{ subject?.name }}</text>
      <text class="page-title">把知识点，讲明白。</text>

      <view class="search-box">
        <image src="/static/icons/search.png" mode="aspectFit" />
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索知识点，如：极限、矩阵、行列式"
          placeholder-class="search-ph"
          confirm-type="search"
        />
      </view>

      <view class="subject-tabs">
        <button
          v-for="(s, i) in subjects"
          :key="s.id"
          class="subject-tab"
          :class="{ active: i === subjectIndex }"
          hover-class="hover-press"
          @tap="selectSubject(i)"
        >
          <text>{{ s.shortName }}</text>
        </button>
      </view>

      <!-- 搜索结果 -->
      <template v-if="searching">
        <view class="section-head">
          <text class="head-title">搜索结果</text>
          <text class="head-note">{{ results.length }} 个知识点</text>
        </view>
        <view v-if="results.length" class="knowledge-list">
          <button
            v-for="(r, i) in results.slice(0, 60)"
            :key="r.point.id"
            class="knowledge-row"
            hover-class="hover-press"
            @tap="openPoint(r.point.id)"
          >
            <view class="knowledge-number"><text>{{ pad(i + 1) }}</text></view>
            <view class="knowledge-content">
              <text class="k-title">{{ r.point.title }}</text>
              <text class="k-sub">{{ r.chapter.title }} · {{ r.section.title }}</text>
            </view>
            <image class="chev" src="/static/icons/chevron.png" mode="aspectFit" />
          </button>
        </view>
        <view v-else class="panel mt20">
          <text class="panel-title">暂时没有找到「{{ keyword }}」</text>
          <text class="subtext mt12">试试「极限」「矩阵」「行列式」。当前只检索 {{ subject?.name }}。</text>
        </view>
      </template>

      <!-- 章节列表 -->
      <template v-else>
        <button v-if="feature" class="knowledge-feature" hover-class="hover-press" @tap="openPoint(feature.point.id)">
          <view class="feature-text">
            <text class="eyebrow">{{ feature.resumed ? '接着读 · ' : '从这里开始 · ' }}{{ feature.chapter.module }}</text>
            <text class="feature-title">{{ feature.chapter.title }}</text>
            <text class="subtext">{{ feature.chapter.summary }}</text>
            <view class="approach-note">
              <image src="/static/icons/eye-primary.png" mode="aspectFit" />
              <text>先理解，再记忆</text>
            </view>
            <view class="chapter-foot">
              <view class="small-progress">
                <view class="bar" :style="`width:${chapterProgress(feature.chapter.id).percent}%`" />
              </view>
              <text class="foot-text">
                已读 {{ chapterProgress(feature.chapter.id).read }} / {{ chapterProgress(feature.chapter.id).total }} 个知识点
              </text>
            </view>
          </view>
          <view class="feature-arrow">
            <image style="width: 18px; height: 18px" src="/static/icons/arrow-primary.png" mode="aspectFit" />
          </view>
        </button>

        <view class="section-head">
          <text class="head-title">知识点讲解</text>
          <button class="text-button" hover-class="hover-press" @tap="goPlan">
            <text>我的计划</text>
            <image src="/static/icons/chevron.png" mode="aspectFit" />
          </button>
        </view>
        <text class="head-note" style="display: block; margin: -6px 0 12px">
          {{ subject?.name }} · 共 {{ chapterList.length }} 章 / {{ totalOfSubject }} 个知识点
        </text>

        <view class="knowledge-list">
          <template v-for="(ch, ci) in chapterList" :key="ch.id">
            <button class="knowledge-row" hover-class="hover-press" @tap="toggleChapter(ch.id)">
              <view class="knowledge-number"><text>{{ pad(ci + 1) }}</text></view>
              <view class="knowledge-content">
                <text class="k-title">{{ ch.title }}</text>
                <text class="k-sub">
                  {{ ch.module }} · {{ chapterPoints(ch.id).length }} 个知识点 · 已读
                  {{ chapterProgress(ch.id).read }}
                </text>
              </view>
              <image
                class="chev"
                :src="expanded === ch.id ? '/static/icons/eye-primary.png' : '/static/icons/chevron.png'"
                mode="aspectFit"
              />
            </button>

            <view v-if="expanded === ch.id" class="chapter-body">
              <text class="subtext">{{ ch.summary }}</text>
              <view class="point-list">
                <button
                  v-for="(p, pi) in chapterPoints(ch.id)"
                  :key="p.point.id"
                  class="point-row"
                  hover-class="hover-press"
                  @tap="openPoint(p.point.id)"
                >
                  <view class="point-main">
                    <text class="point-title">{{ p.point.title }}</text>
                    <text class="point-sub">{{ p.section.title }} · {{ p.point.minutes }} 分钟</text>
                  </view>
                  <image
                    class="chev"
                    :src="isPlanned(p.point.id) ? '/static/icons/target-primary.png' : '/static/icons/chevron.png'"
                    mode="aspectFit"
                  />
                </button>
              </view>
            </view>
          </template>
        </view>
      </template>

      <text class="quiet-note">内容来自 data/content · 共 {{ totalOfSubject }} 个知识点</text>
    </view>
  </view>
</template>

<style scoped>
.chapter-body {
  margin: -4px 0 6px;
  padding: 14px 16px;
  border-radius: 0 0 16px 16px;
  background: #ffffff;
  border: 1px solid var(--border);
  border-top: none;
}
.point-list {
  display: flex;
  flex-direction: column;
  margin-top: 10px;
}
.point-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 0;
  border-bottom: 1px solid var(--border);
  text-align: left;
}
.point-main {
  flex: 1;
  min-width: 0;
}
.point-title {
  font-size: 13px;
  font-weight: 600;
  display: block;
  margin-bottom: 3px;
}
.point-sub {
  font-size: 10px;
  color: var(--muted);
}
</style>
