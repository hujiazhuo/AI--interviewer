<template>
  <view class="page">
    <view class="nav">
      <text class="back" @tap="goBack">‹ 返回</text>
      <text class="title">评分记录</text>
      <view class="holder"></view>
    </view>

    <view class="filters">
      <text :class="['filter', activeFilter === 'all' ? 'on' : '']" @tap="setFilter('all')">全部</text>
      <text :class="['filter', activeFilter === 'kb' ? 'on' : '']" @tap="setFilter('kb')">知识库评分</text>
      <text :class="['filter', activeFilter === 'web' ? 'on' : '']" @tap="setFilter('web')">联网评分</text>
    </view>

    <view class="list">
      <view v-for="item in filteredRecords" :key="item.id" class="card" @tap="openDetail(item)">
        <view class="top">
          <text class="job">{{ item.job }}</text>
          <view class="right">
            <text class="score">{{ item.score }}分</text>
            <text v-if="item.scorePath" :class="['path', item.scorePath === 'web' ? 'web' : 'kb']">
              {{ item.scorePath === 'web' ? '联网' : '知识库' }}
            </text>
            <text class="delete" @tap.stop="confirmDelete(item)">删除</text>
          </view>
        </view>
        <view class="meta">
          <text>{{ item.dateText }}</text>
          <text>{{ item.roundText }}</text>
        </view>
      </view>

      <view v-if="!filteredRecords.length" class="empty">
        {{ activeFilter === 'all' ? '暂无面试记录' : '暂无该类型记录' }}
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { deleteInterviewRecordApi, getInterviewRecordsApi, getInterviewReportApi } from '@/api'

const records = ref([])
const activeFilter = ref('all')
let fetchSeq = 0
const filteredRecords = computed(() => {
  if (activeFilter.value === 'all') return records.value
  return records.value.filter((item) => item.scorePath === activeFilter.value)
})

onLoad(() => {
  fetchRecords()
})

onShow(() => {
  fetchRecords()
})

async function fetchRecords() {
  const currentSeq = ++fetchSeq
  try {
    const data = await getInterviewRecordsApi({ limit: 50 })
    const list = Array.isArray(data) ? data : data?.records || []
    records.value = list.map((item) => ({
      id: item.id || item.recordId || item.reportId || item.sessionId || String(Math.random()),
      job: item.job || item.job_role || '模拟面试',
      score: Number(item.score || item.finalScore || item.totalScore || item.total_score || 0),
      scorePath: normalizePath(item.scorePath || item.score_path || item.routeHint || item.route_hint),
      dateText: formatDate(item.date || item.createdAt),
      roundText: formatRound(item.currentRound || item.round, item.totalRounds || item.total_rounds),
    }))

    await backfillScorePathFromReport(records.value, currentSeq)
  } catch (error) {
    uni.showToast({ title: error.message || '记录加载失败', icon: 'none' })
  }
}

function openDetail(item) {
  uni.navigateTo({ url: `/pages/interview/report_detail?id=${encodeURIComponent(item.id)}` })
}

function setFilter(key) {
  activeFilter.value = key
}

async function backfillScorePathFromReport(list, seq) {
  const missing = list.filter((item) => item.id && !item.scorePath)
  if (!missing.length) return

  await Promise.all(
    missing.map(async (item) => {
      try {
        const report = await getInterviewReportApi(item.id)
        const inferred = inferPathFromReport(report)
        if (seq !== fetchSeq) return
        item.scorePath = inferred
      } catch (error) {
      }
    })
  )
}

function inferPathFromReport(report) {
  const rootPath = normalizePath(report?.scorePath || report?.score_path || report?.scoreRoute || report?.score_route)
  if (rootPath) return rootPath

  const questions = Array.isArray(report?.questions) ? report.questions : []
  if (!questions.length) return ''

  const hasWeb = questions.some((q) => normalizePath(q?.scorePath || q?.score_path || q?.scoreRoute || q?.score_route) === 'web')
  if (hasWeb) return 'web'

  const hasKb = questions.some((q) => normalizePath(q?.scorePath || q?.score_path || q?.scoreRoute || q?.score_route) === 'kb')
  return hasKb ? 'kb' : ''
}

function confirmDelete(item) {
  if (!item?.id) {
    uni.showToast({ title: '该记录无法删除', icon: 'none' })
    return
  }

  uni.showModal({
    title: '删除评分记录',
    content: `确认删除「${item.job}」这条记录吗？`,
    confirmText: '删除',
    success: async (res) => {
      if (!res.confirm) return
      await deleteRecord(item)
    },
  })
}

async function deleteRecord(item) {
  uni.showLoading({ title: '删除中...' })
  try {
    await deleteInterviewRecordApi(item.id)
    records.value = records.value.filter((r) => r.id !== item.id)
    uni.showToast({ title: '已删除', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error.message || '删除失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

function goBack() {
  uni.reLaunch({ url: '/pages/index/index' })
}

function formatDate(raw) {
  if (!raw) return '刚刚'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return String(raw)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function formatRound(cur, total) {
  const c = Number(cur || 0)
  const t = Number(total || 0)
  if (!c || !t) return '轮次信息待补充'
  return `轮次 ${c}/${t}`
}

function normalizePath(val) {
  if (!val) return ''
  const k = String(val).toLowerCase()
  if (k === 'web') return 'web'
  if (k === 'kb') return 'kb'
  return ''
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f6faff;
  padding: 20rpx 22rpx;
}

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;

  .back,
  .holder {
    width: 120rpx;
  }

  .back {
    color: #0052d9;
    font-size: 26rpx;
  }

  .title {
    font-size: 34rpx;
    color: #1f2b3d;
    font-weight: 700;
  }
}

.list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.filters {
  display: flex;
  gap: 10rpx;
  margin-bottom: 14rpx;
  flex-wrap: wrap;
}

.filter {
  font-size: 22rpx;
  color: #58739f;
  background: #edf3ff;
  border: 1rpx solid #dce8ff;
  border-radius: 999rpx;
  padding: 8rpx 14rpx;

  &.on {
    color: #fff;
    background: linear-gradient(135deg, #0052d9, #2b7cff);
    border-color: transparent;
  }
}

.card {
  background: #fff;
  border-radius: 18rpx;
  padding: 18rpx;
  box-shadow: 0 10rpx 24rpx rgba(18, 43, 80, 0.08);
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.right {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.job {
  font-size: 28rpx;
  color: #1f2b3d;
  font-weight: 700;
}

.score {
  color: #0052d9;
  font-weight: 700;
}

.path {
  font-size: 20rpx;
  border-radius: 999rpx;
  padding: 4rpx 10rpx;

  &.kb {
    color: #245db8;
    background: #e9f1ff;
  }

  &.web {
    color: #8c5a08;
    background: #fff4de;
  }
}

.delete {
  font-size: 22rpx;
  color: #d64545;
  border: 1rpx solid rgba(214, 69, 69, 0.35);
  background: rgba(214, 69, 69, 0.08);
  border-radius: 999rpx;
  padding: 6rpx 14rpx;
}

.meta {
  margin-top: 10rpx;
  display: flex;
  justify-content: space-between;
  color: #6e8099;
  font-size: 22rpx;
}

.empty {
  margin-top: 60rpx;
  text-align: center;
  color: #72839a;
  font-size: 24rpx;
}
</style>
