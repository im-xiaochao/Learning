<script setup lang="ts">
/**
 * 顶栏：设计稿的 app-bar。
 * 首页显示品牌（logo + 词数同行），子页显示返回键 + 标题。
 *
 * 注意：**不要在这里画右上角的胶囊**。微信小程序会自己在右上角绘制原生胶囊
 * （「···」+「⊙」），设计稿里的那个胶囊是原型模拟的，真机上重复。
 * 顶栏只需用 useNavBarPad 把自己移到原生胶囊下方即可。
 */
import { computed } from 'vue'
import { useNavBarPad, padStyle } from '../composables/useNavBarPad'

const props = withDefaults(defineProps<{ title?: string }>(), { title: '' })

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
  </view>
</template>
