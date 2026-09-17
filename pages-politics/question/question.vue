<script setup lang="ts">
/**
 * 政治答题页：一次一题。
 *
 *  - 选择题：点选项 → 交卷 → 立刻标出对错（正确项标绿、错选标红）→ 展开解析 → 下一题
 *  - 材料题：读材料 → 点「查看参考答案」展开采分点 → 可再点「隐藏参考答案」收起 → 下一题
 *
 * 作答记录写进主包的 `stores/learning.ts`（只写 id 与对错），
 * 题库正文只在分包内解析。
 */
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'
import { isObjective } from '../../utils/politics'
import { usePoliticsQuiz, startQuiz, normalizeKeys } from '../usePoliticsQuiz'

const { getQuizAnswer, answerQuiz } = useLearning()
const quiz = usePoliticsQuiz()

const question = quiz.current
const progress = computed(() => (quiz.total.value ? Math.round(((quiz.cursor.value + (quiz.revealed.value ? 1 : 0)) / quiz.total.value) * 100) : 0))

/** 本题此前的作答记录（用于「上次答错了」提示） */
const previous = computed(() => (question.value ? getQuizAnswer(question.value.id) : undefined))

const optionState = ref<Record<string, string>>({})

function resetOptionState() {
  optionState.value = {}
}

onLoad((options) => {
  // 队列在**这一页**建，不在列表页建：题库正文只在分包内，主包里的套卷卡
  // （资料库内嵌的那份）拿不到它，所以套卷卡只把**卷号**带过来：
  //   pool=x4-1 … x8-8
  const pool = options?.pool ? decodeURIComponent(options.pool) : ''
  const startId = options?.start ? decodeURIComponent(options.start) : ''

  if (pool) {
    // 整卷按卷面顺序作答。卷号认不出来时 startQuiz 会建不出队列（返回 false），
    // 这时退回开一轮全部，别把用户停在空队列上。
    if (!startQuiz(pool, undefined, false, true)) startQuiz('all')
  } else if (!quiz.total.value) {
    // 没有 pool 且队列为空（刷新 / 从结果页「再练一遍」前队列被清）→ 兜底开一轮全部
    startQuiz('all')
  }

  if (startId) {
    // 从清单点某一题进来：以该题开一轮，队列其余题目（保持原顺序）排在后面。
    const rest = quiz.queue.value.filter((id) => id !== startId)
    quiz.queue.value = [startId, ...rest]
    quiz.cursor.value = 0
    quiz.pickedKeys.value = []
    quiz.revealed.value = false
  }
})

/** 是不是选择题（单选 / 多选）。两者共用选项交互，区别只是多选可选中多个 */
const isChoiceLike = computed(() => isObjective(question.value?.type || ''))
const isMulti = computed(() => question.value?.type === 'multi')

/** 本题的正确选项 key 列表：单选取 answerKey，多选取 answerKeys */
const answerKeys = computed<string[]>(() => {
  const q = question.value
  if (!q) return []
  if (q.type === 'choice') return q.answerKey ? [q.answerKey] : []
  if (q.type === 'multi') return q.answerKeys || []
  return []
})
/** 正确选项的规范形式（排序后拼接），判分比对与文案展示都用它 */
const answerText = computed(() => normalizeKeys(answerKeys.value))

/** 选项点击：多选切换选中、单选替换选择 */
function choose(key: string) {
  if (isMulti.value) quiz.toggle(key)
  else quiz.select(key)
}

/** 交卷（单选 / 多选） */
function submit() {
  const q = question.value
  if (!q || !isChoiceLike.value || !quiz.picked.value || quiz.revealed.value) return
  // 多选判分是「完全一致」：少选、多选、错选都算错
  answerQuiz(q.id, quiz.picked.value, quiz.picked.value === answerText.value)
  quiz.reveal()
}

/**
 * 查看 / 隐藏参考答案（材料题）。
 *
 * 与设计稿一致：按钮常显、文案随状态切换，可以反复展开收起。
 * **只在首次展开时**写「已读参考答案」记录，收起不撤销——否则题库列表里的
 * 「已读参考答案」标记会跟着一起闪。
 */
function toggleAnswer() {
  const q = question.value
  if (!q || q.type !== 'material') return
  if (!quiz.revealed.value) answerQuiz(q.id, '', false)
  quiz.toggleReveal()
}

/** 选项的状态类：交卷后正确项标绿、错选项标红 */
function optionClass(key: string): Record<string, boolean> {
  if (!isChoiceLike.value || !quiz.revealed.value) {
    return { picked: quiz.isPicked(key) }
  }
  const isAnswer = answerKeys.value.includes(key)
  return {
    correct: isAnswer,
    wrong: quiz.isPicked(key) && !isAnswer,
    dim: !isAnswer && !quiz.isPicked(key),
  }
}

const isCorrect = computed(() => isChoiceLike.value && quiz.picked.value === answerText.value)

const canSubmit = computed(() => Boolean(isChoiceLike.value && quiz.picked.value))

function goNext() {
  if (quiz.isLast.value) {
    uni.redirectTo({ url: '/pages-politics/result/result' })
    return
  }
  resetOptionState()
  quiz.next()
}

function quit() {
  uni.navigateBack()
}

const typeLabel = computed(() => {
  const t = question.value?.type
  return t === 'material' ? '材料题' : t === 'multi' ? '多选题' : '单选题'
})
</script>

<template>
  <view class="page">
    <AppHeader title="政治刷题" />

    <view v-if="!question" class="viewport fade-in">
      <view class="empty">
        <view class="empty-symbol">
          <image src="/static/icons/logo-primary.png" mode="aspectFit" />
        </view>
        <text class="empty-title">这一组没有题目</text>
        <text class="empty-copy">题库还是空的，补好题目后再来。</text>
        <button class="primary-button mt20" hover-class="hover-press" @tap="quit">
          <text>返回</text>
          <image src="/static/icons/arrow-on.png" mode="aspectFit" />
        </button>
      </view>
    </view>

    <view v-else class="viewport fade-in">
      <view class="review-top">
        <text>{{ question.module }}</text>
        <text class="counter">{{ String(quiz.position.value).padStart(2, '0') }} / {{ String(quiz.total.value).padStart(2, '0') }}</text>
      </view>
      <view class="small-progress mt12"><view class="bar" :style="`width:${progress}%`" /></view>

      <!-- 材料题：先读材料 -->
      <view v-if="question.type === 'material' && question.material" class="material-box">
        <text class="material-title">{{ question.material.title }}</text>
        <text v-for="(p, i) in question.material.paragraphs" :key="i" class="material-para">{{ p }}</text>
      </view>

      <!-- 题干 -->
      <view class="stem-box">
        <view class="stem-tags">
          <text class="quiz-tag">{{ typeLabel }}</text>
          <text class="quiz-tag ghost">难度{{ question.difficulty === 1 ? '易' : question.difficulty === 2 ? '中' : '难' }}</text>
        </view>
        <text class="stem-text">{{ question.stem }}</text>
      </view>

      <!-- 选择题（单选 / 多选）：选项 -->
      <view v-if="isChoiceLike" class="option-list">
        <button
          v-for="o in question.options"
          :key="o.key"
          class="option-row"
          :class="optionClass(o.key)"
          hover-class="hover-press"
          @tap="choose(o.key)"
        >
          <view class="option-key"><text>{{ o.key }}</text></view>
          <text class="option-text">{{ o.text }}</text>
          <image v-if="quiz.revealed.value && answerKeys.includes(o.key)" class="option-mark" src="/static/icons/circleCheck-primary.png" mode="aspectFit" />
          <image v-else-if="quiz.revealed.value && quiz.isPicked(o.key)" class="option-mark" src="/static/icons/check-on.png" mode="aspectFit" />
        </button>
      </view>

      <!-- 判对错 + 解析 -->
      <view v-if="quiz.revealed.value" class="quiz-feedback" :class="{ 'needs-work': isChoiceLike && !isCorrect }">
        <view class="fb-title">
          <image
            :src="question.type === 'material' || isCorrect ? '/static/icons/circleCheck-primary.png' : '/static/icons/refresh-primary.png'"
            mode="aspectFit"
          />
          <text>{{ question.type === 'material' ? '参考答案' : isCorrect ? '答对了。' : `答错了。正确答案是 ${answerText}` }}</text>
        </view>

        <text v-if="previous && previous.picked && previous.picked !== quiz.picked.value" class="fb-history">
          上次你选的是 {{ previous.picked }}。
        </text>

        <!-- 材料题：采分点 -->
        <view v-if="question.type === 'material' && question.answerPoints" class="answer-points">
          <text class="ap-label">采分点</text>
          <view v-for="(pt, i) in question.answerPoints" :key="i" class="ap-row">
            <view class="ap-no"><text>{{ i + 1 }}</text></view>
            <text class="ap-text">{{ pt }}</text>
          </view>
        </view>

        <!-- 解析 -->
        <view class="explain-box">
          <text class="ex-label">解析</text>
          <text class="ex-body">{{ question.explanation }}</text>
        </view>
      </view>

      <!-- 操作区 -->
      <view class="action-stack">
        <!-- 材料题：参考答案可展开 / 收起，按钮常显 -->
        <template v-if="question.type === 'material'">
          <button class="primary-button" hover-class="hover-press" @tap="toggleAnswer">
            <text>{{ quiz.revealed.value ? '隐藏参考答案' : '查看参考答案' }}</text>
          </button>
          <button v-if="quiz.revealed.value" class="primary-button mt12" hover-class="hover-press" @tap="goNext">
            <text>{{ quiz.isLast.value ? '查看本轮结果' : '下一题' }}</text>
            <image src="/static/icons/arrow-on.png" mode="aspectFit" />
          </button>
          <text class="action-hint">
            {{ quiz.revealed.value ? '对照完采分点，就去下一题。' : '先在纸上写要点，再对照采分点。' }}
          </text>
        </template>

        <!-- 单选 / 多选：交卷后展示结果，不提供收起 -->
        <template v-else>
          <template v-if="!quiz.revealed.value">
            <button class="primary-button" :class="{ disabled: !canSubmit }" hover-class="hover-press" @tap="submit">
              <text>交卷，看对错</text>
            </button>
            <text class="action-hint">
              {{ quiz.picked.value ? '选好了就交卷。' : isMulti ? '至少选两项，选完再交卷。' : '先选一个选项。' }}
            </text>
          </template>
          <template v-else>
            <button class="primary-button" hover-class="hover-press" @tap="goNext">
              <text>{{ quiz.isLast.value ? '查看本轮结果' : '下一题' }}</text>
              <image src="/static/icons/arrow-on.png" mode="aspectFit" />
            </button>
          </template>
        </template>

        <button class="text-button" style="width: 100%" hover-class="hover-press" @tap="quit">
          <text>先退出，稍后继续</text>
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.material-box {
  margin-top: 16px;
  padding: 16px;
  border-radius: 18px;
  background: var(--surface);
  border: 1px solid var(--border);
}
.material-title {
  font-size: 12px;
  font-weight: 650;
  color: var(--primary);
  letter-spacing: 1px;
  display: block;
  margin-bottom: 10px;
}
.material-para {
  font-size: 13px;
  line-height: 1.85;
  color: var(--fg);
  display: block;
  margin-bottom: 8px;
}
.material-para:last-child {
  margin-bottom: 0;
}

.stem-box {
  margin-top: 16px;
}
.stem-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.quiz-tag {
  font-size: 10px;
  color: var(--primary);
  background: var(--primary-soft);
  border-radius: 20px;
  padding: 3px 8px;
}
.quiz-tag.ghost {
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--border);
}
.stem-text {
  font-size: 16px;
  line-height: 1.7;
  font-weight: 600;
  display: block;
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}
.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  text-align: left;
}
.option-row.picked {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.option-row.correct {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.option-row.wrong {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.option-row.dim {
  opacity: 0.55;
}
.option-key {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: #ffffff;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.option-row.picked .option-key,
.option-row.correct .option-key {
  color: #ffffff;
  background: var(--primary);
  border-color: var(--primary);
}
.option-row.wrong .option-key {
  color: #ffffff;
  background: var(--accent);
  border-color: var(--accent);
}
.option-text {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  line-height: 1.6;
}
.option-mark {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}

.quiz-feedback {
  margin-top: 18px;
  padding: 16px;
  border-radius: 18px;
  background: var(--primary-soft);
}
.quiz-feedback.needs-work {
  background: var(--accent-soft);
}
.fb-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 650;
  color: var(--primary);
}
.quiz-feedback.needs-work .fb-title {
  color: var(--accent-ink);
}
.fb-title image {
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
}
.fb-history {
  font-size: 11px;
  color: var(--muted);
  display: block;
  margin-top: 8px;
}

.answer-points {
  margin-top: 14px;
}
.ap-label {
  font-size: 10px;
  letter-spacing: 1.2px;
  color: var(--muted);
  display: block;
  margin-bottom: 8px;
}
.ap-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid rgba(0, 93, 85, 0.12);
}
.ap-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.ap-no {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  color: var(--primary);
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  margin-top: 1px;
}
.ap-text {
  flex: 1;
  font-size: 12.5px;
  line-height: 1.75;
  color: var(--fg);
}

.explain-box {
  margin-top: 14px;
  padding-top: 13px;
  border-top: 1px solid rgba(0, 93, 85, 0.16);
}
.quiz-feedback.needs-work .explain-box {
  border-top-color: rgba(138, 62, 41, 0.16);
}
.ex-label {
  font-size: 10px;
  letter-spacing: 1.2px;
  color: var(--muted);
  display: block;
  margin-bottom: 6px;
}
.ex-body {
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--fg);
  display: block;
}

.action-stack {
  margin-top: 20px;
}
.primary-button.disabled {
  opacity: 0.45;
}
.action-hint {
  font-size: 11px;
  color: var(--muted);
  text-align: center;
  display: block;
  margin-top: 10px;
  line-height: 1.7;
}
</style>
