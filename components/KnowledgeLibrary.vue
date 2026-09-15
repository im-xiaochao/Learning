<script setup lang="ts">
/**
 * 知识库主体（学科切换 + 搜索 + 章节列表）。
 *
 * 设计稿的资料库是「一屏一个学科的扁平知识点」，实际数据有近千个知识点、
 * 几十个章节，扁平铺开不可用，所以保留设计稿的视觉语言，
 * 层级改成「学科 → 章节（可展开）→ 小节 → 知识点」。
 *
 * 抽成组件是因为要支撑两个 tab：数学（高数/线代/概率）与资料库（政治/计算机专业课）。
 * 两个页面只是传入不同的学科清单与文案。
 */
import { computed, ref, watch } from 'vue'
import { useLearning } from '../stores/learning'
import {
  chaptersOfSubject,
  entriesOfChapter,
  getEntry,
  searchKnowledge,
  subjects as allSubjects,
  knowledgeCountOfSubject,
} from '../composables/useContent'
import type { KnowledgeEntry } from '../composables/useContent'

const props = withDefaults(
  defineProps<{
    /** 本页要展示的学科 id，按顺序渲染成学科 tab */
    subjectIds: string[]
    eyebrow?: string
    title?: string
    searchPlaceholder?: string
    /** 学科暂无内容时的提示 */
    emptyHint?: string
  }>(),
  {
    eyebrow: '考研知识库',
    title: '把知识点，讲明白。',
    searchPlaceholder: '搜索知识点',
    emptyHint: '这个学科的内容还在整理中。',
  },
)

const { getReading, lastReading, isPlanned } = useLearning()

/** 本页的学科清单 */
const subjects = computed(() => props.subjectIds.map((id) => allSubjects.find((s) => s.id === id)).filter((s): s is (typeof allSubjects)[number] => Boolean(s)))

const subjectIndex = ref(0)
const keyword = ref('')
const expanded = ref('')

const subject = computed(() => subjects.value[subjectIndex.value] || subjects.value[0])
const chapterList = computed(() => chaptersOfSubject(subject.value?.id || ''))
const totalOfSubject = computed(() => knowledgeCountOfSubject(subject.value?.id || ''))

const searching = computed(() => keyword.value.trim().length > 0)
const results = computed<KnowledgeEntry[]>(() => (searching.value ? searchKnowledge(keyword.value, subject.value?.id) : []))

/** 学科清单变化时重置选中项 */
watch(
  () => props.subjectIds.join(','),
  () => {
    subjectIndex.value = 0
    expanded.value = ''
    keyword.value = ''
  },
)

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
  uni.navigateTo({ url: '/pages/plan/plan' })
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
</script>

<template>
  <view class="viewport fade-in">
    <text class="eyebrow">{{ props.eyebrow }} · {{ subject?.name || '' }}</text>
    <text class="page-title">{{ props.title }}</text>

    <view class="search-box">
      <image src="/static/icons/search.png" mode="aspectFit" />
      <input
        v-model="keyword"
        type="text"
        :placeholder="props.searchPlaceholder"
        placeholder-class="search-ph"
        confirm-type="search"
      />
    </view>

    <view v-if="subjects.length > 1" class="subject-tabs">
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
        <text class="subtext mt12">换个关键词试试。当前只检索 {{ subject?.name }}。</text>
      </view>
    </template>

    <!-- 学科暂无内容 -->
    <view v-else-if="chapterList.length === 0" class="empty">
      <view class="empty-symbol">
        <image src="/static/icons/logo-primary.png" mode="aspectFit" />
      </view>
      <text class="empty-title">{{ subject?.name }}的内容还在整理</text>
      <text class="empty-copy">{{ props.emptyHint }}</text>
    </view>

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
                v-for="p in chapterPoints(ch.id)"
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
