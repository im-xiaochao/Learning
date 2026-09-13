<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MathChapter, MathModule, MathPart, MathPoint, MathSection } from '../data/math-data'
import {
  cleanLine,
  cleanTitle,
  contentBlocks,
  pointDetail,
  pointSteps,
  visualHints,
  VISUAL_LABELS,
} from '../data/math-detail'
import MathVisual from './MathVisual.vue'

const props = defineProps<{
  module: MathModule
  part: MathPart
  chapter: MathChapter
  section: MathSection
  point: MathPoint
  pointIndex: number
  pointCount: number
  noteKey: string
}>()

const emit = defineEmits<{
  back: []
}>()

const detail = computed(() => pointDetail(props.point, props.section))
const blocks = computed(() => contentBlocks(props.point))
const hints = computed(() => visualHints(props.point))
const steps = computed(() => pointSteps(props.point, props.section))
const visualContent = computed(() => blocks.value.flatMap((block) => block.lines.map(cleanLine)))
const visualLabel = computed(() => VISUAL_LABELS[detail.value.visual] || '概念关系')
const visualTitle = computed(() => `${visualLabel.value}关系图`)

function readNote(): string {
  try {
    return (uni.getStorageSync(props.noteKey) as string) || ''
  } catch {
    return ''
  }
}

const note = ref(readNote())
const noteEditing = ref(false)
const noteDraft = ref(note.value)

function startEditNote(): void {
  noteDraft.value = note.value
  noteEditing.value = true
}

function cancelEditNote(): void {
  noteEditing.value = false
  noteDraft.value = note.value
}

function saveNote(): void {
  const value = noteDraft.value.trim()
  try {
    if (value) uni.setStorageSync(props.noteKey, value)
    else uni.removeStorageSync(props.noteKey)
  } catch {
    /* ignore storage failures */
  }
  note.value = value
  noteEditing.value = false
}

function onNoteInput(e: { detail: { value: string } }): void {
  noteDraft.value = e.detail.value
}
</script>

<template>
  <view class="page detail-page">
    <view class="detail-top">
      <view class="detail-back" hover-class="hover-press" role="button" aria-label="返回数学知识地图" @click="emit('back')">
        <text class="detail-back-icon">‹</text>
        <text>返回</text>
      </view>
      <view class="detail-top-copy">
        <text>数学知识卡</text>
        <text class="detail-top-sub">完整讲解 · 公式 · 例题</text>
      </view>
      <text class="detail-top-mark">∫</text>
    </view>

    <view class="detail-hero card">
      <view class="detail-hero-top">
        <text class="detail-eyebrow">知识卡</text>
        <text class="detail-card-number">{{ String(props.pointIndex + 1).padStart(2, '0') }} / {{ String(props.pointCount).padStart(2, '0') }}</text>
      </view>
      <text class="detail-path">{{ props.module.name }} · {{ props.part.title }} · {{ props.chapter.title }} · {{ props.section.title }}</text>
      <text class="detail-title">{{ cleanTitle(props.point.title) }}</text>
      <text class="detail-summary">{{ detail.summary }}</text>
      <view class="detail-tags">
        <text>{{ detail.tag }}</text>
        <text>{{ visualLabel }}</text>
        <text>返回地图可继续浏览</text>
      </view>
    </view>

    <view class="detail-section card detail-explanation-section">
      <view class="detail-section-heading">
        <text class="detail-section-kicker">核心概念</text>
        <text class="detail-section-title">先理解，再记公式</text>
      </view>
      <view class="detail-lead">
        <text class="detail-lead-label">这一卡要解决什么</text>
        <text class="detail-lead-text">{{ detail.summary }}</text>
      </view>
      <text class="detail-explanation">{{ detail.explanation || detail.summary }}</text>
      <view v-if="detail.keyPoints && detail.keyPoints.length" class="detail-key-points">
        <text class="detail-label">真正要掌握</text>
        <text v-for="(item, index) in detail.keyPoints" :key="index" class="detail-key-point">· {{ item }}</text>
      </view>
    </view>

    <view v-if="detail.formula" class="detail-section card">
      <view class="detail-section-heading">
        <text class="detail-section-kicker">核心公式</text>
        <text class="detail-section-title">核心关系</text>
      </view>
      <view class="detail-formula">
        <text class="detail-formula-text">{{ detail.formula }}</text>
        <text class="detail-formula-tip">先确认条件，再把公式放回题目结构中。</text>
      </view>
    </view>

    <view v-if="detail.visualUseful" class="detail-section card detail-visual-section">
      <view class="detail-section-heading">
        <text class="detail-section-kicker">关系图</text>
        <text class="detail-section-title">{{ visualTitle }}</text>
        <text class="detail-section-subtitle">由本卡的核心公式、解题步骤与要点整理而成</text>
      </view>
      <MathVisual
        :kind="detail.visual"
        :title="cleanTitle(props.point.title)"
        :section="cleanTitle(props.section.title)"
        :summary="detail.summary"
        :formula="detail.formula"
        :key-points="detail.keyPoints"
        :steps="detail.steps"
        :example="detail.example"
        :content="visualContent"
        label="当前知识点"
      />
      <view v-if="hints.length" class="detail-visual-note">
        <text class="detail-note-label">观察重点</text>
        <text class="detail-note-copy">{{ hints.join(' ') }}</text>
      </view>
    </view>

    <view v-if="steps.length" class="detail-section card">
      <view class="detail-section-heading">
        <text class="detail-section-kicker">解题路径</text>
        <text class="detail-section-title">解题路径</text>
      </view>
      <view class="detail-steps">
        <view v-for="(step, index) in steps" :key="index" class="detail-step">
          <text class="detail-step-index">{{ index + 1 }}</text>
          <text class="detail-step-text">{{ cleanLine(step) }}</text>
        </view>
      </view>
    </view>

    <view v-if="detail.example || detail.trap" class="detail-insights">
      <view v-if="detail.example" class="detail-insight card">
        <text class="detail-insight-label">例题提示</text>
        <text class="detail-insight-text">{{ detail.example }}</text>
      </view>
      <view v-if="detail.trap" class="detail-insight card detail-trap">
        <text class="detail-insight-label">易错提醒</text>
        <text class="detail-insight-text">{{ detail.trap }}</text>
      </view>
    </view>

    <view v-if="blocks.length" class="detail-section card">
      <view class="detail-section-heading">
        <text class="detail-section-kicker">完整讲义</text>
        <text class="detail-section-title">完整讲义</text>
        <text class="detail-section-subtitle">原始提纲只作为关键词复习。</text>
      </view>
      <view class="detail-lecture">
        <view v-for="(block, blockIndex) in blocks" :key="blockIndex" class="lecture-block">
          <text v-if="block.label" class="lecture-label">{{ block.label }}</text>
          <text v-for="(line, lineIndex) in block.lines" :key="lineIndex" class="lecture-line">{{ cleanLine(line) }}</text>
        </view>
      </view>
    </view>

    <view class="detail-section card detail-note-section">
      <view class="detail-section-heading">
        <text class="detail-section-kicker">我的笔记</text>
        <text class="detail-section-title">留下自己的理解</text>
      </view>
      <template v-if="noteEditing">
        <textarea
          class="detail-note-input"
          :value="noteDraft"
          :maxlength="500"
          placeholder="写自己的理解、易错点或例题…"
          aria-label="我的笔记"
          @input="onNoteInput"
        />
        <view class="detail-note-actions">
          <view class="detail-note-btn ghost" hover-class="hover-press" role="button" aria-label="取消编辑笔记" @click="cancelEditNote"><text>取消</text></view>
          <view class="detail-note-btn primary" hover-class="hover-press" role="button" aria-label="保存笔记" @click="saveNote"><text>保存笔记</text></view>
        </view>
      </template>
      <template v-else>
        <text v-if="note" class="detail-note-text">✎ {{ note }}</text>
        <view class="detail-note-edit" role="button" :aria-label="note ? '编辑我的笔记' : '添加我的笔记'" @click="startEditNote">
          <text>{{ note ? '编辑我的笔记' : '+ 添加我的笔记' }}</text>
        </view>
      </template>
    </view>

    <view class="detail-back-link" hover-class="hover-press" role="button" aria-label="返回数学知识地图" @click="emit('back')">
      <text>← 返回数学知识地图</text>
    </view>
  </view>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  /* 固定顶栏脱离文档流，正文为它预留空间，避免首张卡片被遮挡。 */
  padding: calc(env(safe-area-inset-top, 0px) + var(--status-bar-height, 0px) + 70px) 16px 34px;
  color: var(--text);
  box-sizing: border-box;
}

.detail-top {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 66px;
  margin: 0;
  padding: calc(env(safe-area-inset-top, 0px) + var(--status-bar-height, 0px) + 10px) 16px 12px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  box-sizing: border-box;
}

/* 微信小程序：右上角胶囊按钮悬浮在页面之上，顶栏右侧为它让出位置。 */
/* #ifdef MP-WEIXIN */
.detail-top {
  padding-right: 104px;
}
/* #endif */

.detail-back {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 58px;
  color: var(--text);
  font-size: 12px;
}

.detail-back-icon {
  font-size: 27px;
  line-height: 1;
}

.detail-top-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.detail-top-copy > text:first-child {
  color: var(--accent-strong);
  font-size: 13px;
  font-weight: 800;
}

.detail-top-sub {
  color: var(--muted);
  font-size: 10px;
}

.detail-top-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 31px;
  height: 31px;
  border-radius: 11px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 17px;
  font-weight: 700;
}

.detail-hero {
  margin-top: 10px;
  padding: 20px 18px 19px;
  background: var(--card);
}

.detail-hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.detail-eyebrow,
.detail-section-kicker {
  color: var(--accent-strong);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

.detail-card-number {
  padding: 5px 8px;
  border-radius: 9px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 800;
}

.detail-path {
  display: block;
  margin-top: 14px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.6;
  text-align: center;
}

.detail-title {
  display: block;
  margin-top: 8px;
  color: var(--text);
  font-size: 26px;
  font-weight: 800;
  line-height: 1.3;
  text-align: center;
}

.detail-summary {
  display: block;
  margin-top: 10px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
  text-align: center;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: 13px;
}

.detail-tags text {
  padding: 5px 8px;
  border-radius: 8px;
  background: var(--card-soft);
  color: var(--muted);
  font-size: 10px;
}

.detail-section {
  margin-top: 13px;
  padding: 17px 15px;
}

.detail-section-heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.detail-section-title {
  display: block;
  margin-top: 4px;
  color: var(--text);
  font-size: 18px;
  font-weight: 800;
}

.detail-section-subtitle {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 11px;
}

.detail-lead {
  margin-top: 14px;
  padding: 12px 13px;
  border-left: 3px solid var(--accent);
  border-radius: 0 12px 12px 0;
  background: var(--accent-soft);
}

.detail-lead-label,
.detail-note-label,
.detail-label,
.detail-insight-label {
  display: block;
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 800;
  text-align: center;
}

.detail-lead-text,
.detail-explanation,
.detail-note-copy,
.detail-insight-text {
  display: block;
  margin-top: 6px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.7;
}

.detail-explanation {
  margin-top: 14px;
}

.detail-key-points {
  margin-top: 13px;
  padding: 11px 12px;
  border-radius: 11px;
  background: var(--card-soft);
}

.detail-key-point {
  display: block;
  margin-top: 6px;
  color: var(--text);
  font-size: 12px;
  line-height: 1.6;
}

.detail-formula {
  margin-top: 13px;
  padding: 13px;
  border-radius: 12px;
  background: var(--accent-soft);
}

.detail-formula-text {
  display: block;
  color: var(--text);
  font-family: monospace;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
}

.detail-formula-tip {
  display: block;
  margin-top: 8px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.5;
}

.detail-visual-section {
  padding-bottom: 12px;
}

.detail-visual-section .visual-card {
  margin-top: 13px;
}

.detail-visual-note {
  margin-top: 10px;
  padding: 10px 11px;
  border-radius: 11px;
  background: var(--success-soft);
}

.detail-visual-note .detail-note-label {
  color: var(--success);
}

.detail-note-copy {
  font-size: 12px;
  line-height: 1.55;
}

.detail-steps {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-top: 14px;
}

.detail-step {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}

.detail-step-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 7px;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 11px;
  font-weight: 800;
}

.detail-step-text {
  flex: 1;
  padding-top: 1px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.55;
}

.detail-insights {
  display: flex;
  gap: 9px;
  margin-top: 13px;
}

.detail-insight {
  flex: 1;
  min-width: 0;
  padding: 13px 11px;
}

.detail-trap {
  background: var(--danger-soft);
}

.detail-trap .detail-insight-label {
  color: var(--danger);
}

.detail-insight-text {
  font-size: 12px;
  line-height: 1.6;
}

.detail-lecture {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 14px;
}

.lecture-block {
  padding-top: 12px;
  border-top: 1px solid var(--card-soft);
}

.lecture-block:first-child {
  padding-top: 0;
  border-top: 0;
}

.lecture-label {
  display: block;
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}

.lecture-line {
  display: block;
  margin-top: 6px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.7;
}

.detail-note-section {
  margin-bottom: 13px;
}

.detail-note-input {
  width: 100%;
  min-height: 96px;
  margin-top: 14px;
  padding: 11px;
  border: 0;
  border-radius: 11px;
  background: var(--card-soft);
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
  box-sizing: border-box;
}

.detail-note-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 9px;
}

.detail-note-btn {
  min-height: 34px;
  padding: 8px 12px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 700;
}

.detail-note-btn.primary {
  background: var(--accent-strong);
  color: var(--on-accent);
}

.detail-note-btn.ghost {
  background: var(--card-soft);
  color: var(--muted);
}

.detail-note-text {
  display: block;
  margin-top: 14px;
  color: var(--accent-strong);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.detail-note-edit {
  display: inline-block;
  margin-top: 12px;
  color: var(--muted);
  font-size: 12px;
}

.detail-back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  margin: 4px 0 14px;
  padding: 8px 12px;
  color: var(--accent-strong);
  font-size: 13px;
  font-weight: 700;
}

.detail-back {
  min-height: 44px;
  padding-right: 8px;
}

.detail-note-edit {
  display: flex;
  min-height: 44px;
  align-items: center;
  padding: 0 8px;
}

.detail-note-btn {
  min-height: 44px;
  display: flex;
  align-items: center;
}

.detail-back:active,
.detail-back-link:active,
.detail-note-edit:active,
.detail-note-btn:active {
  opacity: 0.72;
}

.detail-eyebrow,
.detail-section-kicker,
.detail-top-sub,
.detail-card-number,
.detail-tags text,
.detail-section-subtitle,
.detail-label,
.detail-note-label,
.detail-insight-label,
.lecture-label {
  font-size: 11px;
}
</style>
