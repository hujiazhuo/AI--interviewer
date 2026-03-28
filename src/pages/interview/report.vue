<template>
  <view class="page">正在跳转报告...</view>
</template>

<script setup>
import { onLoad } from '@dcloudio/uni-app'

onLoad((options) => {
  const id = options?.id || ''
  uni.redirectTo({
    url: `/pages/interview/report_detail?id=${encodeURIComponent(id)}`,
    fail: () => uni.reLaunch({ url: '/pages/interview/records' }),
  })
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6e8099;
  font-size: 28rpx;
}
</style>
