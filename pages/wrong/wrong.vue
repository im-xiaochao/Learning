<script setup lang="ts">
import { computed } from 'vue'
import { words } from '../../data/words'
import { useProgress } from '../../composables/useProgress'
import { useSettings } from '../../composables/useSettings'
import { startLearn, startWrongBook } from '../../stores/session'

const { wrongWordIds, removeWrong } = useProgress()
const { groupSize } = useSettings()

const wrongWords = computed(() =>
  wrongWordIds.value
    .map((id) => words.find((w) => w.id === id))
    .filter((w): w is NonNullable<typeof w> => Boolean(w)),
)

/** 本次学习词数：跟随全局设置，超出错词数则全学 */
const sessionSize = computed(() => Math.min(groupSize.value, wrongWords.value.length))

function goBack(): void {
  uni.navigateBack()
}

function onStart(): void {
  startWrongBook()
}

function goHome(): void {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<template>
  <view class="page">
    <view class="wb">
      <!-- 固定顶栏 -->
      <view class="wb-header">
        <view class="back-btn" hover-class="hover-press" role="button" aria-label="返回上一页" @click="goBack">
          <text class="back-text">‹</text>
        </view>
        <view class="page-title">
          <text class="title-text">错词本</text>
          <text class="page-sub">{{ wrongWords.length }} 个单词</text>
        </view>
      </view>

      <!-- 列表（页面滚动） -->
      <view class="wb-list">
        <view v-if="wrongWords.length === 0" class="empty card">
          <text class="empty-icon">✓</text>
          <text class="empty-text">还没有错词</text>
          <text class="empty-sub">测试中答错的单词会自动收进这里</text>
          <view class="empty-action" role="button" aria-label="开始学习新词" @click="startLearn">
            <text>开始学习新词</text>
          </view>
        </view>

        <view v-for="w in wrongWords" :key="w.id" class="wb-item card">
          <view class="wb-left">
            <text class="wb-word">{{ w.word }}</text>
            <text class="wb-phonetic">{{ w.phonetic }}</text>
            <text class="wb-meaning">{{ w.meaning }}</text>
          </view>
          <view class="wb-remove" hover-class="hover-press" role="button" :aria-label="`将 ${w.word} 标记为已掌握`" @click="removeWrong(w.id)">
            <text class="wb-remove-text">掌握</text>
          </view>
        </view>
      </view>

      <!-- 固定底部按钮 -->
      <view v-if="wrongWords.length > 0" class="wb-footer">
        <view class="btn btn-primary btn-block" role="button" aria-label="开始学习错词" @click="onStart">
          <text>开始学习（{{ sessionSize }} 词）</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.wb {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.wb-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(env(safe-area-inset-top, 0px) + var(--status-bar-height, 0px) + 10px) 16px 12px;
  background: var(--bg);
}

.wb-list {
  flex: 1;
  padding: calc(var(--status-bar-height, 0px) + env(safe-area-inset-top, 0px) + 70px) 20px 110px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty {
  padding: 40px 20px 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text);
}

.empty-icon {
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  border-radius: 50%;
  background: var(--success-soft);
  color: var(--success);
  font-size: 24px;
  font-weight: 800;
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
}

.empty-sub {
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}

.empty-action {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 14px;
  padding: 0 16px;
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 14px;
  font-weight: 700;
}

.wb-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 15px 16px;
}

.wb-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.wb-word {
  font-size: 19px;
  font-weight: 700;
  color: var(--text);
}

.wb-phonetic {
  font-size: 13px;
  color: var(--accent);
}

.wb-meaning {
  font-size: 14px;
  line-height: 1.45;
  color: var(--text);
}

.wb-remove {
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 12px;
  color: var(--success);
  background: var(--success-soft);
}

.wb-remove-text {
  color: var(--success);
  font-size: 12px;
  font-weight: 700;
}

.wb-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  padding: 12px 20px calc(env(safe-area-inset-bottom, 0px) + 16px);
  border-top: 1px solid var(--border);
  background: var(--bg);
}
</style>
