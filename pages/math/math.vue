<script setup lang="ts">
import { computed, ref } from 'vue'
import { MATH_MODULES } from '../../data/math-data'
import type { MathChapter, MathModule, MathPart, MathPoint, MathSection } from '../../data/math-data'
import { cleanTitle, pointDetail, sectionLessons } from '../../data/math-detail'
import { getMathLecture } from '../../data/math-lectures'
import MathPointDetail from '../../components/MathPointDetail.vue'

const activeModule = ref<MathModule>(MATH_MODULES[0]!)
const search = ref('')
const expandedChapters = ref<Record<string, boolean>>({})
const expandedSections = ref<Record<string, boolean>>({})

type SelectedPoint = {
  key: string
  module: MathModule
  part: MathPart
  chapter: MathChapter
  section: MathSection
  point: MathPoint
  pointIndex: number
  pointCount: number
}

const selectedPoint = ref<SelectedPoint | null>(null)

type VisibleChapter = { chapter: MathChapter; sections: MathSection[] }
type VisiblePart = { part: MathPart; chapters: VisibleChapter[] }
type MapNode = {
  key: string
  label: string
}

function chapterKey(part: MathPart | string, chapter: MathChapter | string): string {
  const partId = typeof part === 'string' ? part : part.id
  const chapterId = typeof chapter === 'string' ? chapter : chapter.id
  return partId + '__' + chapterId
}

function sectionKey(part: MathPart | string, chapter: MathChapter | string, section: MathSection | string): string {
  const sectionId = typeof section === 'string' ? section : section.id
  return chapterKey(part, chapter) + '__' + sectionId
}

function pointKey(
  part: MathPart | string,
  chapter: MathChapter | string,
  section: MathSection | string,
  point: MathPoint | string,
): string {
  const pointId = typeof point === 'string' ? point : point.id
  return sectionKey(part, chapter, section) + '__' + pointId
}

function cleanLine(line: string): string {
  return line.split(String.fromCharCode(96)).join('').trim()
}

function normalize(text: string): string {
  return cleanLine(text).toLowerCase()
}

function chapterNumber(title: string): string {
  return title.match(/^第([一二三四五六七八九十0-9]+)章/)?.[1] || '·'
}

function sectionNumber(title: string): string {
  return title.match(/^\d+/)?.[0] || '·'
}

function shortMapLabel(title: string): string {
  const label = cleanTitle(title)
  return label.length > 12 ? label.slice(0, 12) + '…' : label
}

function sectionPoints(section: MathSection): MathPoint[] {
  if (section.points.length) return section.points

  return sectionLessons(section).map((lesson, index) => ({
    id: section.id + '__topic__' + (index + 1),
    title: lesson.title,
    blocks: [],
  }))
}

function sectionPointCount(section: MathSection): number {
  return section.points.length || sectionLessons(section).length
}

function hasSectionContent(section: MathSection): boolean {
  return sectionPointCount(section) > 0
}

function chapterSections(chapter: MathChapter): MathSection[] {
  return chapter.sections.filter(hasSectionContent)
}

const searchTerm = computed(() => normalize(search.value))
const hasSearch = computed(() => searchTerm.value.length > 0)

function includesTerm(text: string, term = searchTerm.value): boolean {
  return Boolean(term) && normalize(text).includes(term)
}

function pointMatches(point: MathPoint, term = searchTerm.value): boolean {
  if (!term) return true
  const content = point.blocks.flatMap((block) => [block.label, ...block.lines]).join(' ')
  return includesTerm(point.title + ' ' + content, term)
}

function topicMatches(topic: string, section: MathSection, term = searchTerm.value): boolean {
  if (!term) return true
  const lesson = getMathLecture(topic, section.title)
  const detailText = [
    lesson.explanation,
    lesson.formula,
    lesson.example,
    lesson.trap,
    ...lesson.keyPoints,
    ...lesson.steps,
  ]
    .filter(Boolean)
    .join(' ')
  return includesTerm(topic + ' ' + detailText, term)
}

function sectionPointMatches(point: MathPoint, section: MathSection, term = searchTerm.value): boolean {
  return section.points.length ? pointMatches(point, term) : topicMatches(point.title, section, term)
}

const visibleParts = computed<VisiblePart[]>(() => {
  const term = searchTerm.value

  if (!term) {
    return activeModule.value.parts
      .map((part) => ({
        part,
        chapters: part.chapters
          .map((chapter) => {
            const sections = chapterSections(chapter)
            return sections.length ? { chapter, sections } : null
          })
          .filter((chapter): chapter is VisibleChapter => Boolean(chapter)),
      }))
      .filter((part) => part.chapters.length)
  }

  return activeModule.value.parts
    .map((part) => {
      const partHit = includesTerm(part.title, term)
      const chapters = part.chapters
        .map((chapter) => {
          const chapterHit = partHit || includesTerm(chapter.title, term)
          const sections = chapter.sections
            .map((section) => {
              const sectionHit = chapterHit || includesTerm(section.title, term)
              if (sectionHit) return hasSectionContent(section) ? section : null
              if (!hasSectionContent(section)) return null

              if (!section.points.length) {
                const intro = (section.intro || []).filter((topic) => topicMatches(topic, section, term))
                return intro.length ? { ...section, intro } : null
              }

              const points = section.points.filter((point) => pointMatches(point, term))
              return points.length ? { ...section, points } : null
            })
            .filter((section): section is MathSection => Boolean(section))

          return sections.length ? { chapter, sections } : null
        })
        .filter((chapter): chapter is VisibleChapter => Boolean(chapter))

      return chapters.length ? { part, chapters } : null
    })
    .filter((part): part is VisiblePart => Boolean(part))
})

function moduleSummary(module: MathModule) {
  let chapters = 0
  let sections = 0
  let points = 0
  let detailedPoints = 0
  let lessonTopics = 0

  for (const part of module.parts) {
    const contentChapters = part.chapters.filter((chapter) => chapterSections(chapter).length)
    chapters += contentChapters.length

    for (const chapter of contentChapters) {
      const contentSections = chapterSections(chapter)
      sections += contentSections.length

      for (const section of contentSections) {
        const count = sectionPointCount(section)
        points += count
        detailedPoints += count
        if (!section.points.length) lessonTopics += section.intro?.length || 0
      }
    }
  }

  return {
    parts: module.parts.filter((part) => part.chapters.some((chapter) => chapterSections(chapter).length)).length,
    chapters,
    sections,
    points,
    detailedPoints,
    lessonTopics,
  }
}

const stats = computed(() => moduleSummary(activeModule.value))

const searchResultCount = computed(() => {
  const sections = visibleParts.value.reduce(
    (total, part) => total + part.chapters.reduce((sum, item) => sum + item.sections.length, 0),
    0,
  )
  const points = visibleParts.value.reduce(
    (total, part) =>
      total +
      part.chapters.reduce(
        (sum, item) => sum + item.sections.reduce((sectionSum, section) => sectionSum + sectionPointCount(section), 0),
        0,
      ),
    0,
  )
  return { sections, points }
})

function switchModule(module: MathModule): void {
  if (activeModule.value === module) return
  activeModule.value = module
  search.value = ''
  collapseAll()
}

function toggleChapter(key: string): void {
  expandedChapters.value = { ...expandedChapters.value, [key]: !expandedChapters.value[key] }
}

function toggleSection(key: string): void {
  expandedSections.value = { ...expandedSections.value, [key]: !expandedSections.value[key] }
}

function collapseAll(): void {
  expandedChapters.value = {}
  expandedSections.value = {}
}

function isChapterOpen(key: string): boolean {
  return Boolean(expandedChapters.value[key] || hasSearch.value)
}

function isSectionOpen(key: string, section: MathSection): boolean {
  const matchingPoint = hasSearch.value && sectionPoints(section).some((point) => sectionPointMatches(point, section))
  return Boolean(expandedSections.value[key] || matchingPoint)
}

function chapterSummary(chapter: MathChapter) {
  const sections = chapterSections(chapter)
  const points = sections.reduce((sum, section) => sum + sectionPointCount(section), 0)
  return { sections: sections.length, points, detailedPoints: points }
}

/**
 * 章节 → 模块关系：改用可换行的节点列表。
 * 原来的固定半径环形图在模块较多（单章最多 10 个）时，节点会越出卡片边界；
 * 列表布局与模块数量无关，永远不会溢出。
 */
function chapterMapNodes(part: MathPart, chapter: MathChapter, sections: MathSection[]): MapNode[] {
  return sections.map((section) => ({
    key: sectionKey(part, chapter, section),
    label: shortMapLabel(section.title),
  }))
}

function openPoint(
  module: MathModule,
  part: MathPart,
  chapter: MathChapter,
  section: MathSection,
  point: MathPoint,
  pointIndex: number,
): void {
  selectedPoint.value = {
    key: pointKey(part, chapter, section, point),
    module,
    part,
    chapter,
    section,
    point,
    pointIndex,
    pointCount: sectionPointCount(section),
  }
  uni.pageScrollTo({ scrollTop: 0, duration: 0 })
}

function closePoint(): void {
  selectedPoint.value = null
  uni.pageScrollTo({ scrollTop: 0, duration: 0 })
}

function onSearchInput(e: { detail: { value?: string } }): void {
  search.value = e.detail?.value || ''
}
</script>

<template>
  <MathPointDetail
    v-if="selectedPoint"
    :key="selectedPoint.key"
    :module="selectedPoint.module"
    :part="selectedPoint.part"
    :chapter="selectedPoint.chapter"
    :section="selectedPoint.section"
    :point="selectedPoint.point"
    :point-index="selectedPoint.pointIndex"
    :point-count="selectedPoint.pointCount"
    :note-key="selectedPoint.key"
    @back="closePoint"
  />

  <view v-else class="page">
    <view class="math">
      <view class="math-top">
        <view class="math-breadcrumb">
          <text class="math-kicker">考研数学 · 知识地图</text>
          <text class="math-breadcrumb-text">数学知识地图</text>
        </view>
      </view>

      <view class="math-hero card">
        <view class="math-hero-copy">
          <text class="hero-eyebrow">考研数学 · 关系图</text>
          <text class="math-title">把公式放回图像里</text>
          <text class="math-hero-desc">先看关系，再记结论；点击知识点标题进入完整详情。</text>
        </view>
        <view class="hero-symbol">
          <text>∫</text>
          <text class="hero-symbol-small">f′</text>
        </view>
      </view>

      <view class="module-tabs">
        <view
          v-for="module in MATH_MODULES"
          :key="module.name"
          class="module-tab"
          :class="{ on: activeModule.name === module.name }"
          hover-class="hover-press"
          role="button"
          :aria-label="`切换到${module.name}`"
          @click="switchModule(module)"
        >
          <text class="tab-name">{{ module.name }}</text>
          <text class="tab-detail">{{ moduleSummary(module).chapters }} 章 · {{ moduleSummary(module).points }} 卡</text>
        </view>
      </view>

      <view class="math-search">
        <text class="search-icon">⌕</text>
        <input
          class="search-input"
          :value="search"
          type="text"
          placeholder="搜索章节、公式或知识点"
          aria-label="搜索数学知识"
          @input="onSearchInput"
        />
        <view v-if="search" class="search-clear" role="button" aria-label="清空搜索" @click="search = ''"><text>×</text></view>
      </view>
      <text v-if="hasSearch" class="search-result">找到 {{ searchResultCount.sections }} 个模块 · {{ searchResultCount.points }} 个知识卡</text>

      <view class="module-overview card">
        <view class="overview-top">
          <view>
            <text class="overview-eyebrow">当前知识地图</text>
            <text class="overview-title">{{ activeModule.name }} · {{ stats.chapters }} 章</text>
          </view>
          <text class="overview-orbit">{{ stats.detailedPoints }}/{{ stats.points }}</text>
        </view>
        <view class="overview-metrics">
          <view class="overview-metric">
            <text class="overview-metric-number">{{ stats.sections }}</text>
            <text class="overview-metric-label">知识模块</text>
          </view>
          <view class="overview-metric">
            <text class="overview-metric-number">{{ stats.detailedPoints }}</text>
            <text class="overview-metric-label">详细知识卡</text>
          </view>
          <view class="overview-metric">
            <text class="overview-metric-number">{{ stats.lessonTopics }}</text>
            <text class="overview-metric-label">提纲详解</text>
          </view>
        </view>
        <text class="overview-tip">· 建议顺序：章节图 → 模块清单 → 公式卡 → 例题与易错点</text>
      </view>

      <view v-if="visibleParts.length === 0" class="no-results card">
        <text class="no-results-icon">⌕</text>
        <text class="no-results-title">没有找到相关内容</text>
        <text class="no-results-copy">试试搜索“极限”“导数”“矩阵”或清空关键词。</text>
        <view class="no-results-btn" @click="search = ''"><text>查看全部内容</text></view>
      </view>

      <view v-for="group in visibleParts" :key="group.part.id" class="part-block">
        <view class="part-heading">
          <view class="part-heading-main">
            <text class="part-index">{{ group.part.id.endsWith('p1') ? '01' : group.part.id.endsWith('p2') ? '02' : '03' }}</text>
            <view>
              <text class="part-eyebrow">知识路径</text>
              <text class="part-title">{{ group.part.title }}</text>
            </view>
          </view>
          <text class="part-count">{{ group.chapters.length }} 章</text>
        </view>

        <view
          v-for="item in group.chapters"
          :key="chapterKey(group.part, item.chapter)"
          class="chapter card"
        >
          <view class="chapter-head" role="button" :aria-label="`展开或收起${item.chapter.title}`" @click="toggleChapter(chapterKey(group.part, item.chapter))">
            <text class="chapter-index">{{ chapterNumber(item.chapter.title) }}</text>
            <view class="chapter-copy">
              <text class="chapter-title">{{ item.chapter.title }}</text>
              <text class="chapter-subtitle">
                {{ chapterSummary(item.chapter).sections }} 个模块 · {{ chapterSummary(item.chapter).points }} 个知识卡 · {{ chapterSummary(item.chapter).detailedPoints }} 个有详解
              </text>
            </view>
            <text class="chapter-arrow">{{ isChapterOpen(chapterKey(group.part, item.chapter)) ? '−' : '+' }}</text>
          </view>

          <template v-if="isChapterOpen(chapterKey(group.part, item.chapter))">
            <view class="map-area">
              <view class="map-heading">
                <text>章节关系</text>
                <text>本章 → 模块 · 点击模块直接展开</text>
              </view>
              <view class="chapter-map">
                <view class="map-core">
                  <text class="map-core-index">{{ chapterNumber(item.chapter.title) }}章</text>
                  <text class="map-core-title">{{ shortMapLabel(item.chapter.title) }}</text>
                  <text class="map-core-meta">{{ item.sections.length }} 个模块</text>
                </view>
                <view class="map-nodes">
                  <view
                    v-for="(node, nodeIndex) in chapterMapNodes(group.part, item.chapter, item.sections)"
                    :key="node.key"
                    class="map-node"
                    :class="{ selected: expandedSections[node.key] }"
                    role="button"
                    :aria-label="`展开或收起${node.label}`"
                    @click.stop="toggleSection(node.key)"
                  >
                    <text class="map-node-index">{{ nodeIndex + 1 }}</text>
                    <text class="map-node-label">{{ node.label }}</text>
                  </view>
                </view>
              </view>
              <view class="map-legend">
                <text class="legend-core" />
                <text>本章</text>
                <text class="legend-node" />
                <text>可展开模块</text>
              </view>
            </view>

            <view v-for="section in item.sections" :key="sectionKey(group.part, item.chapter, section)" class="section-block">
              <view class="section-head" role="button" :aria-label="`展开或收起${section.title}`" @click="toggleSection(sectionKey(group.part, item.chapter, section))">
                <text class="section-marker">{{ sectionNumber(section.title) }}</text>
                <view class="section-copy">
                  <text class="section-title">{{ section.title }}</text>
                  <text class="section-subtitle">点击知识点标题，进入完整讲解</text>
                </view>
                <text class="section-meta">
                  {{ sectionPointCount(section) }} 个知识点
                  {{ isSectionOpen(sectionKey(group.part, item.chapter, section), section) ? '−' : '+' }}
                </text>
              </view>

              <template v-if="isSectionOpen(sectionKey(group.part, item.chapter, section), section)">
                <view
                  v-for="(point, pointIndex) in sectionPoints(section)"
                  :key="pointKey(group.part, item.chapter, section, point)"
                  class="point-block"
                >
                  <view
                    class="point-head"
                    hover-class="hover-press"
                    role="button"
                    :aria-label="`打开知识点${point.title}`"
                    @click="openPoint(activeModule, group.part, item.chapter, section, point, pointIndex)"
                  >
                    <text class="point-num">{{ String(pointIndex + 1).padStart(2, '0') }}</text>
                    <view class="point-copy">
                      <text class="point-title">{{ point.title }}</text>
                      <text class="point-subtitle">{{ pointDetail(point, section).tag }} · 查看完整讲解</text>
                    </view>
                    <text class="point-badge">进入</text>
                    <text class="point-arrow">›</text>
                  </view>
                </view>
              </template>
            </view>
          </template>
        </view>
      </view>
    </view>
  </view>
</template>
<style scoped>
/* ══ 布局骨架 ══ */
.math {
  min-height: 100vh;
  padding: calc(var(--status-bar-height, 0px) + 12px) 20px calc(78px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
}

.math-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.math-breadcrumb {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.math-breadcrumb-text {
  color: var(--muted);
  font-size: 12px;
}

/* 小号强调标签（kicker）：统一一处定义 */
.math-kicker,
.hero-eyebrow,
.part-eyebrow,
.overview-eyebrow,
.map-heading {
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

/* ══ 顶部 Hero 卡 ══ */
.math-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 142px;
  margin-top: 10px;
  padding: 20px 19px;
  overflow: hidden;
  background: var(--card-raised);
}

.math-hero-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.math-title {
  color: var(--text);
  font-size: 24px;
  font-weight: 800;
  line-height: 1.3;
}

.math-hero-desc {
  max-width: 245px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

.hero-symbol {
  position: relative;
  display: flex;
  width: 70px;
  height: 70px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 41px;
  font-weight: 800;
}

.hero-symbol-small {
  position: absolute;
  right: 7px;
  bottom: 6px;
  color: var(--success);
  font-size: 13px;
}

/* ══ 模块切换 ══ */
.module-tabs {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  padding: 5px;
  border-radius: 14px;
  background: var(--card);
  box-shadow: var(--shadow);
}

.module-tab {
  display: flex;
  min-height: 52px;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 2px;
  border-radius: 10px;
  color: var(--muted);
}

.module-tab.on {
  background: var(--accent-strong);
  color: var(--on-accent);
  box-shadow: var(--shadow-lg);
}

.tab-name {
  font-size: 15px;
  font-weight: 800;
}

.tab-detail {
  font-size: 11px;
  opacity: 0.8;
}

/* ══ 搜索 ══ */
.math-search {
  display: flex;
  min-height: 48px;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
  box-shadow: var(--shadow);
}

.search-icon {
  color: var(--accent-strong);
  font-size: 20px;
}

.search-input {
  height: 46px;
  flex: 1;
  color: var(--text);
  font-size: 16px;
}

.search-clear {
  display: flex;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--card-soft);
  color: var(--muted);
  font-size: 17px;
}

.search-result {
  display: block;
  margin: 8px 2px 0;
  color: var(--accent-strong);
  font-size: 12px;
  line-height: 1.55;
}

/* ══ 模块总览 ══ */
.module-overview {
  margin-top: 12px;
  padding: 15px;
}

.overview-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.overview-title {
  display: block;
  margin-top: 4px;
  color: var(--text);
  font-size: 17px;
  font-weight: 800;
}

.overview-orbit {
  display: flex;
  width: 49px;
  height: 49px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--accent);
  border-radius: 50%;
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 800;
}

.overview-metrics {
  display: flex;
  margin-top: 14px;
  border-top: 1px solid var(--card-soft);
  border-bottom: 1px solid var(--card-soft);
}

.overview-metric {
  display: flex;
  flex: 1;
  align-items: center;
  flex-direction: column;
  padding: 11px 3px;
  border-right: 1px solid var(--card-soft);
}

.overview-metric:last-child {
  border-right: 0;
}

.overview-metric-number {
  color: var(--text);
  font-size: 20px;
  font-weight: 800;
}

.overview-metric-label {
  margin-top: 3px;
  color: var(--muted);
  font-size: 11px;
}

.overview-tip {
  display: block;
  margin-top: 11px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.55;
}

/* ══ 空结果 ══ */
.no-results {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 7px;
  margin-top: 14px;
  padding: 24px 16px;
  text-align: center;
}

.no-results-icon {
  color: var(--accent-strong);
  font-size: 28px;
}

.no-results-title {
  color: var(--text);
  font-size: 16px;
  font-weight: 800;
}

.no-results-copy {
  color: var(--muted);
  font-size: 12px;
}

.no-results-btn {
  margin-top: 6px;
  padding: 8px 12px;
  border-radius: 9px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 700;
}

/* ══ 部分（Part） ══ */
.part-block {
  margin-top: 18px;
}

.part-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.part-heading-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.part-index,
.chapter-index {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-weight: 800;
}

.part-index {
  width: 31px;
  height: 31px;
  border-radius: 10px;
  font-size: 11px;
}

.part-title {
  display: block;
  margin-top: 3px;
  color: var(--text);
  font-size: 16px;
  font-weight: 800;
}

.part-count {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 11px;
}

/* ══ 章（Chapter） ══ */
.chapter {
  margin-bottom: 12px;
  overflow: hidden;
}

.chapter-head {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 14px;
}

.chapter-index {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  font-size: 12px;
}

.chapter-copy,
.section-copy,
.point-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.chapter-copy {
  gap: 4px;
}

.chapter-title {
  color: var(--text);
  font-size: 15px;
  font-weight: 800;
  line-height: 1.35;
}

.chapter-subtitle,
.section-subtitle,
.point-subtitle {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.45;
}

.chapter-arrow {
  flex-shrink: 0;
  color: var(--accent-strong);
  font-size: 22px;
  font-weight: 300;
}

/* ══ 章节关系图：本章卡片 + 可换行的模块节点，模块再多也不会越界 ══ */
.map-area {
  padding: 12px 12px 10px;
  border-top: 1px solid var(--card-soft);
  background: var(--card-soft);
}

.map-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 3px 8px;
}

.map-heading > text:last-child {
  color: var(--muted);
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0;
}

.chapter-map {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 11px;
  border-radius: 14px;
  background: var(--card);
}

.map-core {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  padding: 9px 11px;
  border-radius: 11px;
  background: var(--accent-strong);
  color: var(--on-accent);
  box-shadow: var(--shadow-lg);
}

.map-core-index {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 800;
}

.map-core-title {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-core-meta {
  flex-shrink: 0;
  color: var(--on-accent-muted);
  font-size: 11px;
}

.map-nodes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.map-node {
  display: flex;
  width: calc(50% - 3px);
  min-width: 0;
  min-height: 34px;
  flex: 0 1 auto;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border: 1px solid var(--accent);
  border-radius: 10px;
  background: var(--card);
  color: var(--text);
}

.map-node.selected {
  border-color: var(--accent-strong);
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.map-node-index {
  display: flex;
  width: 19px;
  height: 19px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 800;
}

.map-node.selected .map-node-index {
  background: var(--accent-strong);
  color: var(--on-accent);
}

.map-node-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: 8px;
  color: var(--muted);
  font-size: 11px;
}

.legend-core,
.legend-node {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-core {
  background: var(--accent-strong);
}

.legend-node {
  margin-left: 6px;
  border: 1px solid var(--accent);
  background: var(--card);
}

/* ══ 节（Section） ══ */
.section-block {
  border-top: 1px solid var(--card-soft);
}

.section-head {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
}

.section-marker {
  display: flex;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 800;
}

.section-copy {
  gap: 3px;
}

.section-title {
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.section-meta {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 11px;
}

/* ══ 知识点（Point） ══ */
.point-block {
  border-top: 1px dashed var(--card-soft);
}

.point-head {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 14px 9px 32px;
  background: var(--card-soft);
}

.point-num {
  display: flex;
  width: 25px;
  height: 25px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: var(--card);
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 800;
}

.point-copy {
  gap: 3px;
}

.point-title {
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.point-badge {
  flex-shrink: 0;
  padding: 4px 6px;
  border-radius: 7px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 700;
}

.point-arrow {
  flex-shrink: 0;
  color: var(--accent-strong);
  font-size: 20px;
  font-weight: 300;
}

/* ══ 按压反馈（H5 走 :active；小程序端由 hover-class 提供，见模板） ══ */
.chapter-head,
.section-head,
.point-head,
.map-node,
.no-results-btn,
.module-tab,
.search-clear {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.chapter-head:active,
.section-head:active,
.point-head:active,
.map-node:active,
.no-results-btn:active,
.module-tab:active,
.search-clear:active {
  opacity: 0.72;
  transform: scale(0.99);
}
</style>
