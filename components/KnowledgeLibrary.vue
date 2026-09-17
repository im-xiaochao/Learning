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
 *
 * **政治分支不跳页**：设计稿的 knowledgePage 在选中政治时直接把 politicsQuizBody()
 * 渲染在学科 tab 下面（政治没有知识点讲解，只有题）。这里同样内嵌 `PoliticsQuiz`，
 * 不再放「进入政治刷题」的入口卡——刷题内容本身就是政治模块的内容。
 */
import { computed, ref, watch } from 'vue'
import PoliticsQuiz from './PoliticsQuiz.vue'
import { useLearning } from '../stores/learning'
import {
  chaptersOfSubject,
  entriesOfChapter,
  filterChaptersByModule,
  getEntry,
  isQuizSubject,
  modulesOfSubject,
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
    /** 刷题学科（政治）的页面标题：政治没有知识点讲解，标题按设计稿换一句 */
    quizTitle?: string
    searchPlaceholder?: string
    /** 学科暂无内容时的提示 */
    emptyHint?: string
  }>(),
  {
    eyebrow: '考研知识库',
    title: '把知识点，讲明白。',
    quizTitle: '先刷题，再回头看理论。',
    searchPlaceholder: '搜索知识点',
    emptyHint: '这个学科的内容还在整理中。',
  },
)

const { getReading, lastReading, isPlanned } = useLearning()

/** 本页的学科清单 */
const subjects = computed(() => props.subjectIds.map((id) => allSubjects.find((s) => s.id === id)).filter((s): s is (typeof allSubjects)[number] => Boolean(s)))

/**
 * 学科 ≥5 个时切换器要挤进一行：短名/长名按内容比例分摊宽度，
 * 否则「组成原理」「计算机网络」这类长名会把整行撑到换行。
 */
const denseTabs = computed(() => subjects.value.length >= 5)

const subjectIndex = ref(0)
const keyword = ref('')
const expanded = ref('')

const subject = computed(() => subjects.value[subjectIndex.value] || subjects.value[0])
const allChapters = computed(() => chaptersOfSubject(subject.value?.id || ''))

/**
 * 考试模块筛选（数学一 / 数学二）。数学一和数学二共用同一份章节，
 * 章上有 modules 标注；默认「全部」，用户也可以只看自己考的那一档。
 */
const moduleOptions = computed(() => modulesOfSubject(subject.value?.id || ''))
const activeModule = ref('all')
const chapterList = computed(() => filterChaptersByModule(allChapters.value, activeModule.value))
const showModuleFilter = computed(() => moduleOptions.value.length > 1)
const totalOfSubject = computed(() => knowledgeCountOfSubject(subject.value?.id || ''))

/** 切换学科时重置模块筛选，避免带着上一个学科的选择 */
watch(
  () => subject.value?.id,
  () => {
    activeModule.value = 'all'
    expanded.value = ''
  },
)

const searching = computed(() => keyword.value.trim().length > 0)
const results = computed<KnowledgeEntry[]>(() => (searching.value ? searchKnowledge(keyword.value, subject.value?.id) : []))

/**
 * 当前学科是否以「刷题」呈现（政治）。
 * 政治没有可发布的知识点讲解，只有题目，所以这个学科的内容**就是**刷题内容
 * （下面内嵌 PoliticsQuiz），不再放一张入口卡把人领到另一个页面。
 * 判据在 useContent.isQuizSubject：kind === 'politics' 且没有章节——
 * 补上真实讲解稿后自动回到知识点列表。
 */
const quiz = computed(() => isQuizSubject(subject.value?.id || ''))

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

function selectModule(m: string) {
  activeModule.value = m
  expanded.value = ''
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
    <!-- 政治是题库学科：eyebrow 落到「政治 · 题库」，标题换成刷题口径（与设计稿 knowledgePage 一致） -->
    <text class="eyebrow">{{ props.eyebrow }} · {{ quiz ? `${subject?.shortName} · 题库` : subject?.name || '' }}</text>
    <text class="page-title">{{ quiz ? props.quizTitle : props.title }}</text>

    <!-- 政治没有知识点可搜，搜索框只在知识点学科出现 -->
    <view v-if="!quiz" class="search-box">
      <image src="/static/icons/search.png" mode="aspectFit" />
      <input
        v-model="keyword"
        type="text"
        :placeholder="props.searchPlaceholder"
        placeholder-class="search-ph"
        confirm-type="search"
      />
    </view>

    <view v-if="subjects.length > 1" class="subject-tabs" :class="{ dense: denseTabs }">
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

    <!-- 考试模块筛选：数学一 / 数学二 共用同一份章节，按需过滤 -->
    <view v-if="showModuleFilter" class="module-filter">
      <button
        class="module-chip"
        :class="{ active: activeModule === 'all' }"
        hover-class="hover-press"
        @tap="selectModule('all')"
      >
        <text>全部</text>
      </button>
      <button
        v-for="m in moduleOptions"
        :key="m"
        class="module-chip"
        :class="{ active: activeModule === m }"
        hover-class="hover-press"
        @tap="selectModule(m)"
      >
        <text>{{ m }}</text>
      </button>
    </view>

    <!--
      政治：没有知识点讲解，只有题目 → 刷题内容**直接渲染在学科 tab 下面**。
      设计稿就是这么做的（knowledgePage 里 `isQuiz ? politicsQuizBody() : knowledgeResults()`），
      所以这里不能再放「进入政治刷题」的入口卡——那等于把政治模块藏到二级页面里。
      数据在主包（politics-index），题库正文仍在分包，由 PoliticsQuiz 负责跳转。
    -->
    <PoliticsQuiz v-if="quiz" />

    <!-- 搜索结果 -->
    <template v-else-if="searching">
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

    <!-- 政治走刷题，底部说明由 PoliticsQuiz 自己给（与设计稿一致） -->
    <text v-if="!quiz" class="quiet-note">内容来自 data/content · 共 {{ totalOfSubject }} 个知识点</text>
  </view>
</template>

<style scoped>
/* 考试模块筛选：数学一 / 数学二 共用章节数据，这里做视图过滤 */
.module-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0 2px;
}
.module-chip {
  padding: 0 14px;
  height: 30px;
  line-height: 30px;
  border-radius: 15px;
  font-size: 12.5px;
  color: var(--muted);
  background: #ffffff;
  border: 1px solid var(--border);
  text-align: center;
}
.module-chip.active {
  color: #ffffff;
  background: var(--primary);
  border-color: var(--primary);
}
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
