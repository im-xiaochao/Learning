<script setup lang="ts">
/**
 * 顶栏：设计稿的 app-bar。
 * 首页显示品牌（logo + 词数同行），子页显示返回键 + 标题。
 * 小程序端用胶囊按钮的实际位置做下移，其他端走 --status-bar-height。
 */
import { computed } from 'vue'
import { useNavBarPad, padStyle } from '../composables/useNavBarPad'

const props = withDefaults(defineProps<{ title?: string; showCapsule?: boolean }>(), {
  title: '',
  showCapsule: true,
})

const { topPad } = useNavBarPad()
const barStyle = computed(() => padStyle(topPad.value))

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/index/index' })
}
</script>

<template>
  <view class="appbar" :style="barStyle">
    <view v-if="props.title" class="brand sub">
      <button class="back-button" hover-class="hover-press" @tap="goBack">
        <image class="brand-logo" src="/static/icons/back-primary.png" mode="aspectFit" />
      </button>
      <text>{{ props.title }}</text>
    </view>
    <view v-else class="brand">
      <image class="brand-logo" src="/static/icons/logo-primary.png" mode="aspectFit" />
      <text>词数同行</text>
    </view>

    <view v-if="props.showCapsule" class="capsule">
      <view class="cap-btn">
        <image style="width: 20px; height: 20px" src="/static/icons/more.png" mode="aspectFit" />
      </view>
      <view class="divider" />
      <view class="cap-btn">
        <image style="width: 20px; height: 20px" src="/static/icons/target.png" mode="aspectFit" />
      </view>
    </view>
  </view>
</template>
