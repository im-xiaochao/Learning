<script setup lang="ts">
/**
 * 政治刷题首页：模块筛选 + 题目清单 + 进度。
 *
 * 政治没有知识点讲解（`data/politics/chapters.ts` 是空数组），手上只有题目，
 * 所以这个学科在资料库里落到这个页面，而不是知识点列表。
 * 题库正文在分包内的 `questions.ts`；对错记录在主包的 `stores/learning.ts`（只存 id）。
 */
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppHeader from '../../components/AppHeader.vue'
import { useLearning } from '../../stores/learning'
import { appPoliticsModules, appPoliticsQuestions } from '../questions'
import { startQuiz } from '../usePoliticsQuiz'

const { getQuizAnswer, todayQuiz } = useLearning()

const activeModule = ref('all')

/** 题库为空是合法状态 */
const isEmpty = computed(() => appPoliticsQuestions.length === 0)

const list = computed(() =>
  activeModule.value === 'all' ? appPoliticsQuestions : appPoliticsQuestions.filter((q) => q.module === activeModule.value),
)

/** 已答 / 答对 / 答错 */
/** 客观题 = 单选 + 多选（多选也要判对错，别只认 choice） */
function isObjective(type: string): boolean {
  return type === 'choice' || type === 'multi'
}

const stats = computed(() => {
  let answered = 0
  let correct = 0
  let wrong = 0
  for (const q of appPoliticsQuestions) {
    const rec = getQuizAnswer(q.id)
    if (!rec) continue
    answered += 1
    if (isObjective(q.type)) {
      if (rec.correct) correct += 1
      else wrong += 1
    }
  }
  return { answered, correct, wrong, total: appPoliticsQuestions.length }
})

/** 错题 id 清单（单选 / 多选答错的），供「只练错题」 */
const wrongIds = computed(() => appPoliticsQuestions.filter((q) => isObjective(q.type) && getQuizAnswer(q.id) && !getQuizAnswer(q.id)?.correct).map((q) => q.id))

/**
 * 模块 chip：只列**真的有题**的模块，文案与设计稿一致（已完成/总数）。
 * `appPoliticsModules` 已经过滤掉没题的模块，这里只补每块的进度。
 * 放在 `stats` 之后声明，避免读一个还没初始化的 computed。
 */
const moduleChips = computed(() => {
  const per = new Map<string, { total: number; done: number }>()
  for (const q of appPoliticsQuestions) {
    const cell = per.get(q.module) || { total: 0, done: 0 }
    cell.total += 1
    if (getQuizAnswer(q.id)) cell.done += 1
    per.set(q.module, cell)
  }
  return [
    { name: '全部', total: appPoliticsQuestions.length, done: stats.value.answered },
    ...appPoliticsModules.map((m) => ({ name: m.name, ...(per.get(m.name) || { total: 0, done: 0 }) })),
  ]
})

const percent = computed(() => (stats.value.total ? Math.round((stats.value.answered / stats.value.total) * 100) : 0))

// 每次回到本页刷新一下（从答题页返回时对错记录已变），onShow 触发 computed 重算即可
const tick = ref(0)
onShow(() => {
  tick.value += 1
})

const typeLabel: Record<string, string> = { choice: '单选题', multi: '多选题', material: '材料题' }
const difficultyLabel: Record<number, string> = { 1: '易', 2: '中', 3: '难' }

/** 题号（在题库里的全局序号，稳定不随筛选变化） */
function globalNo(id: string): number {
  return appPoliticsQuestions.findIndex((q) => q.id === id) + 1
}

function statusOf(id: string): 'correct' | 'wrong' | 'material-done' | 'todo' {
  const q = appPoliticsQuestions.find((x) => x.id === id)
  const rec = getQuizAnswer(id)
  if (!rec) return 'todo'
  if (q?.type === 'material') return 'material-done'
  return rec.correct ? 'correct' : 'wrong'
}

function start(mode: 'all' | 'module' | 'wrong') {
  if (isEmpty.value) {
    uni.showToast({ title: '题库还在整理中', icon: 'none' })
    return
  }
  let ok = false
  if (mode === 'wrong') {
    if (!wrongIds.value.length) {
      uni.showToast({ title: '暂时没有错题', icon: 'none' })
      return
    }
    ok = startQuiz('all', wrongIds.value, true)
  } else if (mode === 'module') {
    ok = startQuiz(activeModule.value)
  } else {
    ok = startQuiz(activeModule.value)
  }
  if (!ok) {
    uni.showToast({ title: '这个模块还没有题目', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages-politics/question/question' })
}

/** 从某题开始：把该题放到队首，其余打散在后 */
function openAt(id: string) {
  const rest = appPoliticsQuestions.filter((q) => q.id !== id).map((q) => q.id)
  if (!startQuiz('all')) return
  // startQuiz 已建好队列，这里重排：目标题优先
  uni.navigateTo({ url: `/pages-politics/question/question?start=${encodeURIComponent(id)}` })
  void rest
}

function selectModule(name: string) {
  activeModule.value = name
}
</script>

<template>
  <view class="page">
    <AppHeader title="政治刷题" />

    <view class="viewport fade-in">
      <text class="eyebrow">考研政治 · 刷题</text>
      <text class="page-title">先把题做对，再回头看理论。</text>
      <text class="subtext mt12">
        政治的知识点讲解还在整理，这里先放题目：单选、多选做完立刻判对错、给解析；材料题读材料再看采分点。
      </text>

      <!-- 空态 -->
      <view v-if="isEmpty" class="empty">
        <view class="empty-symbol">
          <image src="/static/icons/logo-primary.png" mode="aspectFit" />
        </view>
        <text class="empty-title">题库还在整理</text>
        <text class="empty-copy">题目会陆续补进来。补好后这一页会自动出现，不需要更新应用。</text>
      </view>

      <template v-else>
        <!-- 进度总览 -->
        <view class="quiz-overview">
          <view class="qo-head">
            <text class="qo-title">刷题进度</text>
            <text class="qo-note">今日 {{ todayQuiz }} 题</text>
          </view>
          <view class="small-progress"><view class="bar" :style="`width:${percent}%`" /></view>
          <view class="quiz-stats">
            <view class="qs-cell">
              <text class="qs-num">{{ stats.answered }}<text class="qs-unit"> / {{ stats.total }}</text></text>
              <text class="qs-label">已作答</text>
            </view>
            <view class="qs-cell">
              <text class="qs-num ok">{{ stats.correct }}</text>
              <text class="qs-label">答对</text>
            </view>
            <view class="qs-cell">
              <text class="qs-num bad">{{ stats.wrong }}</text>
              <text class="qs-label">答错</text>
            </view>
          </view>
        </view>

        <button class="primary-button mt20" hover-class="hover-press" @tap="start('all')">
          <text>{{ stats.answered ? '继续刷题' : '开始刷题' }} · {{ activeModule === 'all' ? '全部' : activeModule }}</text>
          <image src="/static/icons/arrow-on.png" mode="aspectFit" />
        </button>
        <button v-if="stats.wrong > 0" class="secondary-button mt12" hover-class="hover-press" @tap="start('wrong')">
          <text>只练错题 · {{ stats.wrong }} 道</text>
          <image src="/static/icons/refresh-primary.png" mode="aspectFit" />
        </button>

        <!-- 模块筛选：考纲模块是政治**内部**的分组，用缩进 + 左侧竖线表明从属关系，
             不能和学科层（政治 / 四门计算机课）长得一样，否则会被读成并列的第六个学科。 -->
        <view class="section-head">
          <text class="head-title">按考纲模块练习</text>
          <text class="head-note">共 {{ list.length }} 题</text>
        </view>
        <view class="sub-group">
          <text class="sub-group-label">政治 · 考纲模块</text>
          <view class="chip-row sub-chips">
            <button
              v-for="m in moduleChips"
              :key="m.name"
              class="chip"
              :class="{ active: activeModule === m.name }"
              hover-class="hover-press"
              @tap="selectModule(m.name)"
            >
              <text>{{ m.name }} {{ m.done }}/{{ m.total }}</text>
            </button>
          </view>
        </view>
        <text class="hint-note">上方切换学科，下面按政治的考纲模块筛题。</text>

        <!-- 题目清单 -->
        <view class="quiz-list">
          <button v-for="q in list" :key="q.id" class="quiz-row" hover-class="hover-press" @tap="openAt(q.id)">
            <view class="quiz-no" :class="statusOf(q.id)">
              <text>{{ String(globalNo(q.id)).padStart(2, '0') }}</text>
            </view>
            <view class="quiz-main">
              <view class="quiz-tags">
                <text class="quiz-tag">{{ typeLabel[q.type] }}</text>
                <text class="quiz-tag ghost">难度{{ difficultyLabel[q.difficulty] }}</text>
                <text v-if="statusOf(q.id) === 'correct'" class="quiz-tag ok">已答对</text>
                <text v-else-if="statusOf(q.id) === 'wrong'" class="quiz-tag bad">答错过</text>
                <text v-else-if="statusOf(q.id) === 'material-done'" class="quiz-tag ok">已读参考答案</text>
              </view>
              <text class="quiz-stem">{{ q.stem }}</text>
            </view>
            <image class="chev" src="/static/icons/chevron.png" mode="aspectFit" />
          </button>
        </view>

        <text class="quiet-note">题目来自 data/politics/questions.ts · 共 {{ appPoliticsQuestions.length }} 题</text>
      </template>
    </view>
  </view>
</template>

<style scoped>
.quiz-overview {
  margin-top: 16px;
  padding: 16px;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--border);
}
.qo-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.qo-title {
  font-size: 14px;
  font-weight: 650;
}
.qo-note {
  font-size: 11px;
  color: var(--muted);
}
.quiz-stats {
  display: flex;
  margin-top: 4px;
}
.qs-cell {
  flex: 1;
  text-align: center;
}
.qs-num {
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.5px;
  display: block;
}
.qs-num.ok {
  color: var(--primary);
}
.qs-num.bad {
  color: var(--accent-ink);
}
.qs-unit {
  font-size: 13px;
  font-weight: 400;
  color: var(--muted);
  letter-spacing: 0;
}
.qs-label {
  font-size: 10px;
  color: var(--muted);
  margin-top: 4px;
  display: block;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.chip {
  padding: 0 13px;
  height: 32px;
  line-height: 32px;
  border-radius: 16px;
  font-size: 12px;
  color: var(--muted);
  background: var(--surface);
  border: 1px solid var(--border);
  text-align: center;
}
.chip.active {
  color: #ffffff;
  background: var(--primary);
  border-color: var(--primary);
}

/* 二级分组：左侧竖线 + 缩进，表示「从属于政治」而不是与学科平级 */
.sub-group {
  border-left: 2px solid var(--primary-soft);
  padding-left: 11px;
}
.sub-group-label {
  font-size: 10.5px;
  color: var(--muted);
  letter-spacing: 0.2px;
  display: block;
  margin-bottom: 8px;
}
.sub-chips {
  margin-bottom: 10px;
}
.sub-chips .chip {
  height: 26px;
  line-height: 26px;
  padding: 0 9px;
  border-radius: 13px;
  font-size: 10.5px;
  background: transparent;
}
.sub-chips .chip.active {
  background: var(--primary);
  border-color: var(--primary);
}
.hint-note {
  font-size: 10.5px;
  color: var(--muted);
  line-height: 1.6;
  display: block;
  margin-bottom: 16px;
}

.quiz-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.quiz-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 13px 14px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  text-align: left;
}
.quiz-no {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-soft);
  border-radius: 9px;
  min-width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.quiz-no.wrong {
  color: var(--accent-ink);
  background: var(--accent-soft);
}
.quiz-main {
  flex: 1;
  min-width: 0;
}
.quiz-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
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
.quiz-tag.ok {
  color: var(--primary);
  background: var(--primary-soft);
}
.quiz-tag.bad {
  color: var(--accent-ink);
  background: var(--accent-soft);
}
.quiz-stem {
  font-size: 13px;
  line-height: 1.6;
  display: block;
}
</style>
