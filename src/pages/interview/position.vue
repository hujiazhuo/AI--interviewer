<template>
  <view class="page">
    <view class="card">
      <text class="title">岗位选择（原型）</text>
      <text class="sub">请选择你要模拟的目标岗位</text>

      <view class="config">
        <text class="cfg-title">出题策略</text>
        <view class="chips">
          <text :class="['chip', questionMode === 'balanced' ? 'on' : '']" @tap="questionMode = 'balanced'">均衡（推荐）</text>
          <text :class="['chip', questionMode === 'project-lite' ? 'on' : '']" @tap="questionMode = 'project-lite'">减少项目追问</text>
          <text :class="['chip', questionMode === 'project-deep' ? 'on' : '']" @tap="questionMode = 'project-deep'">项目深挖</text>
        </view>

        <text class="cfg-title">题目随机性</text>
        <view class="chips">
          <text :class="['chip', randomLevel === 'low' ? 'on' : '']" @tap="randomLevel = 'low'">低</text>
          <text :class="['chip', randomLevel === 'medium' ? 'on' : '']" @tap="randomLevel = 'medium'">中</text>
          <text :class="['chip', randomLevel === 'high' ? 'on' : '']" @tap="randomLevel = 'high'">高</text>
        </view>
      </view>

      <view v-for="item in jobs" :key="item.id || item.name" class="job" @click="choose(item.name)">
        <text>{{ item.name }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getInterviewJobsApi } from '@/api'

const jobs = ref([
  { id: 'j_002', name: 'Java后端开发工程师' },
  { id: 'j_003', name: '网络工程师' },
  { id: 'j_004', name: '大模型应用开发工程师' },
])
const questionMode = ref('balanced')
const randomLevel = ref('high')

onLoad(() => {
  fetchJobs()
})

async function fetchJobs() {
  try {
    const data = await getInterviewJobsApi()
    if (Array.isArray(data) && data.length) {
      jobs.value = data.filter((item) => item?.name !== '前端开发工程师')
    }
  } catch (error) {
    uni.showToast({ title: error.message || '岗位加载失败', icon: 'none' })
  }
}

function choose(job) {
  uni.navigateTo({
    url: `/pages/interview/interview_chat?job_role=${encodeURIComponent(job)}&mode=${encodeURIComponent(questionMode.value)}&rand=${encodeURIComponent(randomLevel.value)}`,
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f6faff;
  padding: 26rpx;
}

.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
}

.title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #1f2b3d;
}

.sub {
  margin-top: 12rpx;
  display: block;
  color: #72839a;
  font-size: 24rpx;
}

.config {
  margin-top: 18rpx;
  padding: 16rpx;
  border-radius: 16rpx;
  background: #f8fbff;
  border: 1rpx solid #e6eefc;
}

.cfg-title {
  display: block;
  margin-top: 8rpx;
  margin-bottom: 8rpx;
  color: #4f627f;
  font-size: 22rpx;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.chip {
  font-size: 21rpx;
  color: #4e6b95;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #edf3ff;
  border: 1rpx solid #dce7fc;

  &.on {
    color: #fff;
    background: linear-gradient(135deg, #0052d9, #2b7cff);
    border-color: transparent;
  }
}

.job {
  margin-top: 16rpx;
  border-radius: 16rpx;
  padding: 18rpx;
  background: #edf4ff;
  color: #0052d9;
  font-size: 28rpx;
}
</style>