<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { words as allWords } from '../../data/words'
import type { Word } from '../../data/words'
import { useProgress } from '../../composables/useProgress'
import { getSession, nextSession } from '../../stores/session'

const { sessionWords, sessionMode, sessionKey, sessionIndex } = getSession()
const { addLearned, recordWrong, clearWrongOfGroup, touchToday } = useProgress()

const isReview = computed(() => sessionMode.value === 'review')
const isWrongBook = computed(() => sessionMode.value === 'wrongbook')

type Stage = 'study' | 'recall' | 'spell' | 'result'
const stage = ref<Stage>(isReview.value ? 'recall' : 'study')

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 释义拆「词性 + 正文」 */
function splitMeaning(m: string): { pos: string; text: string } {
  const match = m.match(/^([a-z]+\.)/)
  if (match) return { pos: match[1] ?? '', text: m.slice(match[0].length) }
  return { pos: '', text: m }
}

/* 轻提示 */
const notice = ref('')
let noticeTimer: ReturnType<typeof setTimeout> | undefined
function flash(msg: string): void {
  notice.value = msg
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = ''), 2400)
}

/* ══ 阶段一：卡片学习（点释义切换显隐） ══ */
const studyCursor = ref(0)
const studyWord = computed<Word>(() => sessionWords.value[studyCursor.value] ?? sessionWords.value[0]!)
/** 遮义状态：切换单词后保持（用户明确要求） */
const masked = ref(true)

function prevWord(): void {
  if (studyCursor.value > 0) studyCursor.value -= 1
}
function nextWord(): void {
  if (studyCursor.value < sessionWords.value.length - 1) studyCursor.value += 1
}

/* ══ 阶段二：认词（学习 3 轮全对 / 复习 1 轮全对） ══ */
const recallRoundsTotal = computed(() => (isReview.value ? 1 : 3))
const recallRound = ref(1)
const roundFailed = ref(false)
const order = ref<Word[]>([])
const cursor = ref(0)
const roundResults = ref<boolean[]>([])
const picked = ref<string | null>(null)
const REVEAL = '—reveal—'

const current = computed<Word | null>(() => order.value[cursor.value] ?? null)

const options = computed<string[]>(() => {
  const w = current.value
  if (!w) return []
  const poolSrc = sessionWords.value.length >= 4 ? sessionWords.value : allWords
  const pool = poolSrc.filter((x) => x.id !== w.id).map((x) => x.meaning)
  return shuffle([w.meaning, ...shuffle(pool).slice(0, 3)])
})

const praisePool = ['不错！', '很好！', '答对了！', '继续保持！']
const praise = ref('')

function startRecall(): void {
  order.value = shuffle(sessionWords.value)
  cursor.value = 0
  recallRound.value = 1
  roundFailed.value = false
  roundResults.value = []
  picked.value = null
  stage.value = 'recall'
}

function pickOption(meaning: string): void {
  if (!current.value || picked.value !== null) return
  const correct = meaning === current.value.meaning
  picked.value = meaning
  roundResults.value = [...roundResults.value, correct]
  if (!correct) {
    roundFailed.value = true
    recordWrong(current.value.id)
  } else {
    praise.value = praisePool[Math.floor(Math.random() * praisePool.length)]!
  }
}

/** 看答案：视为不认识，标绿正确项，本轮作废 */
function revealAnswer(): void {
  if (!current.value || picked.value !== null) return
  picked.value = REVEAL
  roundResults.value = [...roundResults.value, false]
  roundFailed.value = true
  recordWrong(current.value.id)
}

function proceed(): void {
  if (cursor.value < order.value.length - 1) {
    cursor.value += 1
    picked.value = null
    return
  }
  if (roundFailed.value) {
    roundFailed.value = false
    flash('本轮有没认出的单词，再巩固一轮')
  } else if (recallRound.value >= recallRoundsTotal.value) {
    if (isReview.value) {
      finish()
      return
    }
    startSpell()
    return
  } else {
    recallRound.value += 1
    flash(`第 ${recallRound.value - 1} 轮通过！还剩 ${recallRoundsTotal.value - recallRound.value + 1} 轮`)
  }
  order.value = shuffle(sessionWords.value)
  cursor.value = 0
  roundResults.value = []
  picked.value = null
}

/* ══ 阶段三：拼写（所有单词拼对一遍） ══ */
const spellOrder = ref<Word[]>([])
const spellCursor = ref(0)
const spellWord = computed<Word | null>(() => spellOrder.value[spellCursor.value] ?? null)
const target = computed(() => (spellWord.value?.word ?? '').toLowerCase().replace(/[^a-z]/g, ''))

interface PoolItem {
  ch: string
  used: boolean
}
interface Tile {
  ch: string
  poolIdx: number
}
const pool = ref<PoolItem[]>([])
const tiles = ref<Tile[]>([])
const spellState = ref<'idle' | 'ok' | 'bad'>('idle')
const spellHint = computed(() => (spellWord.value ? splitMeaning(spellWord.value.meaning) : { pos: '', text: '' }))

function setupSpellWord(): void {
  tiles.value = []
  pool.value = shuffle(target.value.split('')).map((ch) => ({ ch, used: false }))
  spellState.value = 'idle'
}

function startSpell(): void {
  stage.value = 'spell'
  spellOrder.value = shuffle(sessionWords.value)
  spellCursor.value = 0
  setupSpellWord()
  flash('最后一步：把每个单词拼出来')
}

function tapPool(i: number): void {
  const item = pool.value[i]
  if (!item || item.used || spellState.value === 'ok' || tiles.value.length >= target.value.length) return
  item.used = true
  tiles.value = [...tiles.value, { ch: item.ch, poolIdx: i }]
  checkSpelled()
}

function tapTile(i: number): void {
  if (spellState.value === 'ok') return
  const t = tiles.value[i]
  if (!t) return
  const p = pool.value[t.poolIdx]
  if (p) p.used = false
  tiles.value = tiles.value.filter((_, idx) => idx !== i)
}

function checkSpelled(): void {
  const w = spellWord.value
  if (!w || tiles.value.length !== target.value.length) return
  const spelled = tiles.value.map((t) => t.ch).join('')
  if (spelled === target.value) {
    spellState.value = 'ok'
    setTimeout(() => {
      if (spellCursor.value >= spellOrder.value.length - 1) finish()
      else {
        spellCursor.value += 1
        setupSpellWord()
      }
    }, 500)
  } else {
    spellState.value = 'bad'
    recordWrong(w.id)
    setTimeout(() => {
      tiles.value.forEach((t) => {
        const p = pool.value[t.poolIdx]
        if (p) p.used = false
      })
      tiles.value = []
      spellState.value = 'idle'
    }, 550)
  }
}

/** 桌面键盘输入（仅 H5） */
// #ifdef H5
function onKeydown(e: KeyboardEvent): void {
  if (stage.value !== 'spell') return
  if (/^[a-z]$/i.test(e.key)) {
    const ch = e.key.toLowerCase()
    const idx = pool.value.findIndex((p) => !p.used && p.ch === ch)
    if (idx >= 0) tapPool(idx)
  } else if (e.key === 'Backspace') {
    tapTile(tiles.value.length - 1)
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
// #endif

onMounted(() => {
  if (isReview.value) startRecall()
})

onUnmounted(() => {
  clearTimeout(noticeTimer)
})

/* ══ 完成 ══ */
function finish(): void {
  stage.value = 'result'
  if (sessionMode.value === 'learn') {
    addLearned(sessionWords.value.length)
    clearWrongOfGroup(sessionWords.value.map((w) => w.id))
  } else if (sessionMode.value === 'wrongbook') {
    clearWrongOfGroup(sessionWords.value.map((w) => w.id))
  }
  touchToday()
}

function goBack(): void {
  uni.navigateBack()
}

const counterText = computed(() => {
  if (stage.value === 'study') return `${studyCursor.value + 1}/${sessionWords.value.length}`
  if (stage.value === 'recall') return `${Math.min(cursor.value + 1, order.value.length)}/${order.value.length}`
  if (stage.value === 'spell') return `${Math.min(spellCursor.value + 1, spellOrder.value.length)}/${spellOrder.value.length}`
  return ''
})

const stageProgress = computed(() => {
  if (stage.value === 'study') return sessionWords.value.length ? ((studyCursor.value + 1) / sessionWords.value.length) * 100 : 0
  if (stage.value === 'recall') return order.value.length ? ((cursor.value + 1) / order.value.length) * 100 : 0
  if (stage.value === 'spell') return spellOrder.value.length ? ((spellCursor.value + 1) / spellOrder.value.length) * 100 : 0
  return 100
})

const isLastQuestion = computed(() => cursor.value >= order.value.length - 1)
</script>

<template>
  <view class="learn page">
    <!-- 顶栏 -->
    <view class="lv-top">
      <view class="lv-back" hover-class="hover-press" role="button" aria-label="退出学习并返回上一页" @click="goBack">
        <text class="lv-icon-text">‹</text>
        <text class="lv-back-label">返回</text>
      </view>
      <text class="lv-counter">{{ counterText }}</text>
      <view class="lv-top-right">
        <text v-if="isReview" class="lv-round">复习</text>
        <text v-else-if="isWrongBook" class="lv-round">错词学习</text>
        <text v-else-if="stage === 'recall'" class="lv-round">认词 {{ recallRound }}/{{ recallRoundsTotal }} 轮</text>
        <text v-else-if="stage === 'spell'" class="lv-round">拼写</text>
        <text v-else-if="stage === 'study'" class="lv-round">学习</text>
      </view>
    </view>
    <view class="lv-progress" aria-label="当前步骤进度">
      <view class="lv-progress-fill" :style="{ width: stageProgress + '%' }" />
    </view>

    <!-- 阶段一：卡片学习 -->
    <view v-if="stage === 'study'" class="lv-body">
      <view class="study-area">
        <view class="study-card">
          <text class="study-card-label">先建立记忆</text>
          <view class="w-word">{{ studyWord.word }}</view>
          <view class="w-phonetic">
            <text class="w-chip">美</text>
            <text class="w-phonetic-text">{{ studyWord.phonetic }}</text>
          </view>

          <view
            v-if="masked"
            key="m"
            class="study-meaning masked"
            role="button"
            aria-label="点击查看释义"
            @click="masked = false"
          >
            <text>点击查看释义</text>
          </view>
          <view
            v-else
            key="s"
            class="study-meaning"
            hover-class="hover-press"
            role="button"
            aria-label="点击隐藏释义"
            @click="masked = true"
          >
            <text class="opt-pos">{{ splitMeaning(studyWord.meaning).pos }}</text>
            <text>{{ splitMeaning(studyWord.meaning).text }}</text>
          </view>
        </view>
      </view>

      <view class="study-nav">
        <view class="nav-btn" :class="{ disabled: studyCursor === 0 }" hover-class="hover-press" role="button" aria-label="上一个单词" @click="prevWord">
          <text class="nav-btn-arrow">‹</text>
          <text class="nav-btn-text">上一个</text>
        </view>
        <view class="nav-btn" :class="{ disabled: studyCursor === sessionWords.length - 1 }" hover-class="hover-press" role="button" aria-label="下一个单词" @click="nextWord">
          <text class="nav-btn-text">下一个</text>
          <text class="nav-btn-arrow">›</text>
        </view>
      </view>

      <view class="lv-cta" role="button" aria-label="开始认词测试" @click="startRecall">
        <text class="lv-cta-text">开始认词</text>
      </view>
    </view>

    <!-- 阶段二：认词 -->
    <view v-else-if="stage === 'recall' && current" class="lv-body">
      <view class="w-head">
        <view class="w-word recall-word">{{ current.word }}</view>
        <view class="w-phonetic">
          <text class="w-chip">美</text>
          <text class="w-phonetic-text">{{ current.phonetic }}</text>
        </view>
        <text class="w-hint">先回想词义再选择，想不起来「看答案」</text>
      </view>

      <view class="w-options">
        <view
          v-for="opt in options"
          :key="current.id + '-' + opt"
          class="w-option fade-in"
          :class="{
            correct: picked !== null && opt === current.meaning,
            wrong: picked === opt && opt !== current.meaning,
            dim: picked !== null && opt !== current.meaning && picked !== opt,
          }"
          :aria-label="`${splitMeaning(opt).text}${opt === current.meaning ? '，正确答案' : picked === opt ? '，你的选择' : ''}`"
          @click="pickOption(opt)"
        >
          <text class="opt-pos">{{ splitMeaning(opt).pos }}</text>
          <text class="opt-text">{{ splitMeaning(opt).text }}</text>
          <text v-if="picked !== null && opt === current.meaning" class="opt-state correct-state">正确答案</text>
          <text v-else-if="picked === opt && opt !== current.meaning" class="opt-state wrong-state">你的选择</text>
        </view>
      </view>

      <view class="w-bottom">
        <view v-if="picked === null" class="reveal-btn" role="button" aria-label="查看答案并标记为不认识" @click="revealAnswer">
          <text class="reveal-text">看答案</text>
        </view>
        <template v-else-if="picked !== current.meaning">
          <text class="fb-no">{{ picked === REVEAL ? '已标记为不认识' : '答错了，再巩固一下' }}</text>
          <view class="lv-cta small" role="button" :aria-label="isLastQuestion ? '查看本轮结果' : '继续下一题'" @click="proceed">
            <text class="lv-cta-text">{{ isLastQuestion ? '查看结果' : '继续' }}</text>
          </view>
        </template>
        <template v-else>
          <text class="fb-ok">{{ praise }}</text>
          <view class="lv-cta small" role="button" :aria-label="isLastQuestion ? '查看本轮结果' : '继续下一题'" @click="proceed">
            <text class="lv-cta-text">{{ isLastQuestion ? '查看结果' : '继续' }}</text>
          </view>
        </template>
      </view>
    </view>

    <!-- 阶段三：拼写 -->
    <view v-else-if="stage === 'spell' && spellWord" class="lv-body">
      <view class="w-head">
        <view class="w-phonetic spell-phonetic">
          <text class="w-chip">美</text>
          <text class="w-phonetic-text">{{ spellWord.phonetic }}</text>
        </view>
        <text class="spell-hint"><text class="opt-pos">{{ spellHint.pos }}</text>{{ spellHint.text }}</text>
      </view>

      <view class="slots" :class="spellState">
        <view
          v-for="i in target.length"
          :key="'s' + i"
          class="slot"
          :class="{ filled: tiles[i - 1] }"
          role="button"
          :aria-label="tiles[i - 1] ? `移除字母 ${tiles[i - 1]?.ch}` : '空白字母位'"
          @click="tapTile(i - 1)"
        >
          <text>{{ tiles[i - 1]?.ch ?? '' }}</text>
        </view>
      </view>

      <view class="pool">
        <view
          v-for="(p, i) in pool"
          :key="'p' + i"
          class="pool-item"
          :class="{ used: p.used }"
          role="button"
          :aria-label="p.used ? `字母 ${p.ch} 已使用` : `选择字母 ${p.ch}`"
          @click="tapPool(i)"
        >
          <text>{{ p.ch }}</text>
        </view>
      </view>
    </view>

    <!-- 完成 -->
    <view v-else class="lv-body result-body">
      <view class="result-card">
        <text class="result-icon">✓</text>
        <text class="result-title">{{ isReview ? '复习完成！' : isWrongBook ? '错词学习完成！' : `第 ${sessionIndex} 组学习完成！` }}</text>
        <text class="result-desc">
          {{
            isReview
              ? `${sessionWords.length} 个单词已复习一遍`
              : isWrongBook
                ? `${sessionWords.length} 个错词已全部通过，移出错词本`
                : `认词 3 轮全对 + 拼写 1 轮全对，本组 ${sessionWords.length} 个单词已掌握`
          }}
        </text>
        <view class="lv-cta" role="button" aria-label="继续下一组学习" @click="nextSession()">
          <text class="lv-cta-text">{{ isReview ? '再复习一组 ›' : isWrongBook ? '继续消灭错词 ›' : '学习下一组 ›' }}</text>
        </view>
        <view class="lv-ghost" hover-class="hover-press" role="button" aria-label="返回首页" @click="goBack">
          <text class="lv-ghost-text">返回首页</text>
        </view>
      </view>
    </view>

    <!-- 轻提示 -->
    <view v-if="notice" class="toast" role="status" aria-live="polite">
      <text class="toast-text">{{ notice }}</text>
    </view>
  </view>
</template>

<style>
/* 学习页是专注画布：保留沉浸感，但颜色和文字与全局色彩变量保持一致。 */
.learn.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  box-sizing: border-box;
  padding-top: var(--status-bar-height, 0px);
  background: linear-gradient(180deg, var(--bg) 0%, var(--card-soft) 100%);
  color: var(--text);
}

.lv-top {
  display: flex;
  min-height: 56px;
  align-items: center;
  gap: 12px;
  padding: 6px 18px 8px;
  box-sizing: border-box;
}

.lv-back {
  display: flex;
  min-width: 68px;
  min-height: 44px;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  color: var(--text);
}

.lv-icon-text {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.lv-back-label {
  font-size: 13px;
  font-weight: 700;
}

.lv-counter {
  color: var(--muted);
  font-size: 15px;
  font-weight: 700;
}

.lv-top-right {
  margin-left: auto;
}

/* 微信小程序：右上角胶囊按钮悬浮在页面之上，这里让出它的宽度。 */
/* #ifdef MP-WEIXIN */
.lv-top-right {
  margin-right: 96px;
}
/* #endif */

.lv-round {
  padding: 6px 11px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--card);
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}

.lv-progress {
  height: 4px;
  margin: 0 20px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--card-soft);
}

.lv-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--accent-strong);
  transition: width 0.25s ease;
}

.lv-body {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 14px 20px 28px;
  box-sizing: border-box;
}

/* 单词头部 */
.w-head {
  padding-top: 6px;
}

.w-word {
  color: var(--text);
  font-size: 46px;
  font-weight: 800;
  letter-spacing: 0.3px;
  line-height: 1.15;
}

.recall-word {
  font-size: 42px;
}

.w-phonetic {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.w-chip {
  padding: 3px 7px;
  border-radius: 7px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 700;
}

.w-phonetic-text {
  color: var(--muted);
  font-size: 16px;
}

.w-hint {
  display: block;
  margin-top: 14px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

/* 学习模式 */
.study-area {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.study-card {
  display: flex;
  width: 100%;
  max-width: 420px;
  align-items: center;
  flex-direction: column;
  padding: 28px 20px 24px;
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--card);
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.study-card-label {
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1px;
}

.study-area .w-word {
  margin-top: 14px;
  font-size: 52px;
}

.study-meaning {
  display: flex;
  width: 100%;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 24px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-soft);
  color: var(--text);
  font-family: inherit;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.45;
  box-sizing: border-box;
}

.study-meaning:active {
  opacity: 0.72;
}

.study-meaning.masked {
  border-style: dashed;
  background: transparent;
  color: var(--muted);
  font-size: 15px;
  font-weight: 600;
}

.opt-pos {
  margin-right: 6px;
  color: var(--muted);
  font-size: 12px;
}

.study-nav {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.nav-btn {
  display: flex;
  width: 104px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
  color: var(--text);
}

.nav-btn:active,
.lv-back:active,
.lv-cta:active,
.lv-ghost:active,
.reveal-btn:active,
.pool-item:active,
.slot:active {
  opacity: 0.72;
}

.nav-btn.disabled {
  opacity: 0.35;
}

.nav-btn-arrow {
  font-size: 24px;
  line-height: 1;
}

.nav-btn-text {
  font-size: 13px;
  font-weight: 700;
}

/* 主按钮 */
.lv-cta {
  display: flex;
  width: 100%;
  min-height: 56px;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
  background: var(--accent-strong);
  box-shadow: var(--shadow-lg);
}

.lv-cta-text {
  color: var(--on-accent);
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 1px;
}

.lv-cta.small {
  width: auto;
  min-height: 44px;
  padding: 0 30px;
}

.lv-cta.small .lv-cta-text {
  font-size: 15px;
  letter-spacing: 0;
}

.lv-ghost {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  border: 1px solid var(--border);
  border-radius: 15px;
  background: var(--card-soft);
}

.lv-ghost-text {
  color: var(--text);
  font-size: 15px;
  font-weight: 700;
}

/* 认词选项 */
.w-options {
  display: flex;
  flex: 1;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  padding: 22px 0 10px;
}

.w-option {
  display: flex;
  width: 100%;
  min-height: 58px;
  align-items: flex-start;
  justify-content: center;
  flex-direction: column;
  gap: 2px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.w-option.correct {
  border-color: var(--success);
  background: var(--success-soft);
}

.w-option.correct .opt-text,
.correct-state {
  color: var(--success);
  font-weight: 800;
}

.w-option.wrong {
  border-color: var(--danger);
  background: var(--danger-soft);
}

.w-option.wrong .opt-text,
.wrong-state {
  color: var(--danger);
  font-weight: 800;
}

.w-option.dim {
  opacity: 0.45;
}

.opt-text {
  color: var(--text);
  font-size: 16px;
  font-weight: 500;
  line-height: 1.4;
}

.opt-state {
  margin-top: 2px;
  font-size: 12px;
}

/* 反馈区 */
.w-bottom {
  display: flex;
  min-height: 104px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
}

.reveal-btn {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  padding: 0 17px;
  border: 1px dashed var(--accent);
  border-radius: 12px;
  background: var(--accent-soft);
}

.reveal-text {
  color: var(--accent-strong);
  font-size: 15px;
  font-weight: 700;
}

.fb-ok {
  color: var(--success);
  font-size: 16px;
  font-weight: 800;
}

.fb-no {
  color: var(--danger);
  font-size: 14px;
  font-weight: 700;
}

/* 拼写 */
.spell-phonetic {
  margin-top: 4px;
}

.spell-hint {
  display: block;
  margin-top: 12px;
  color: var(--text);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.55;
}

.slots {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin: 34px 0 26px;
}

.slot {
  display: flex;
  width: 40px;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-bottom: 3px solid var(--muted);
  border-radius: 11px;
  background: var(--card);
  color: var(--text);
  font-size: 22px;
  font-weight: 800;
  box-sizing: border-box;
}

.slot.filled {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.slots.ok .slot {
  border-color: var(--success);
  background: var(--success-soft);
  color: var(--success);
}

.slots.bad {
  animation: shake 0.4s ease;
}

.slots.bad .slot {
  border-color: var(--danger);
  background: var(--danger-soft);
  color: var(--danger);
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-6px);
  }
  75% {
    transform: translateX(6px);
  }
}

.pool {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.pool-item {
  display: flex;
  width: 46px;
  height: 52px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--card);
  color: var(--text);
  font-size: 22px;
  font-weight: 800;
  box-shadow: var(--shadow);
}

.pool-item.used {
  opacity: 0.25;
}

/* 结果页 */
.result-body {
  justify-content: center;
}

.result-card {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 9px;
  padding: 30px 22px 24px;
  border: 1px solid var(--border);
  border-radius: 22px;
  background: var(--card);
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.result-icon {
  display: flex;
  width: 52px;
  height: 52px;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  border-radius: 50%;
  background: var(--success-soft);
  color: var(--success);
  font-size: 30px;
  font-weight: 800;
}

.result-title {
  color: var(--text);
  font-size: 20px;
  font-weight: 800;
  text-align: center;
}

.result-desc {
  margin-bottom: 14px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
}

/* 轻提示 */
.toast {
  position: fixed;
  right: 5%;
  bottom: 110px;
  left: 5%;
  z-index: 50;
  padding: 10px 16px;
  border-radius: 14px;
  background: var(--text);
  text-align: center;
}

.toast-text {
  color: var(--bg);
  font-size: 14px;
  line-height: 1.45;
}

.fade-in {
  animation: uniFade 0.18s ease both;
}

@media (max-width: 340px) {
  .lv-body {
    padding-right: 16px;
    padding-left: 16px;
  }

  .nav-btn {
    width: 96px;
  }

  .slot {
    width: 36px;
  }
}
</style>
