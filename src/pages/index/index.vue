<template>
  <scroll-view class="page" scroll-y>
    <view class="header card glass">
      <view class="user-row">
        <image class="avatar" :src="profile.avatar || defaultAvatar" mode="aspectFill" />
        <view class="user-info">
          <text class="name">Hi，{{ profile.nickname || '同学' }}</text>
          <text class="level">面试等级：{{ profile.interviewLevel || '--' }}</text>
          <text class="time">今日练习时长：{{ todayPracticeText }}</text>
        </view>
      </view>

      <view class="next-card">
        <text class="next-title">面试预约提醒</text>
        <text class="next-time">距离下次模拟练习还有 {{ remainPracticeText }}</text>
      </view>
    </view>

    <view class="module">
      <view class="module-title">核心功能</view>

      <view class="interview-btn" @click="goPositionSelect">
        <text class="interview-title">模拟面试</text>
        <text class="interview-sub">点击进入岗位选择，开启高拟真 AI 面试</text>
      </view>

      <view class="grid">
        <view class="grid-card card" @click="mockResumeAction">
          <text class="grid-title">个人简历</text>
          <text class="grid-sub">简历上传 / 解析</text>
          <progress :percent="resume.completion" activeColor="#0052D9" stroke-width="6" />
          <text class="meta">当前简历完整度：{{ resume.completion }}%</text>
          <button class="mini-btn" @click.stop="runResumeDiagnosis">AI 诊断</button>
        </view>

        <view class="grid-card card" @click="goScorePlaceholder">
          <text class="grid-title">评分记录</text>
          <text class="grid-sub">最近 3 次模拟评分</text>
          <view v-if="!recentScores.length" class="empty-tip">暂无评分记录</view>
          <view v-for="item in recentScores" :key="item.id || item.date" class="score-item">
            <text>{{ item.job }}</text>
            <text class="score">{{ item.score }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="module card glass">
      <view class="module-title">能力雷达图（AI 评估）</view>
      <view class="radar-wrap">
        <view v-if="!radarValues.length" class="empty-tip">暂无雷达图数据</view>
        <RadarChart v-else :labels="radarLabels" :values="radarValues" :size-rpx="420" />
      </view>
      <view v-if="radarValues.length" class="tags">
        <text v-for="tag in radarLabels" :key="tag" class="tag">{{ tag }}</text>
      </view>
    </view>

    <view class="module card">
      <view class="module-title">RAG 策略状态</view>
      <view class="rag-grid">
        <view class="rag-item">
          <text class="rag-k">相似度阈值</text>
          <text class="rag-v">{{ ragConfig.similarityThreshold }}</text>
        </view>
        <view class="rag-item">
          <text class="rag-k">召回 TopK</text>
          <text class="rag-v">{{ ragConfig.topKRetrieve }}</text>
        </view>
        <view class="rag-item">
          <text class="rag-k">重排 TopK</text>
          <text class="rag-v">{{ ragConfig.topKRerank }}</text>
        </view>
        <view class="rag-item">
          <text class="rag-k">联网回退</text>
          <text class="rag-v">{{ ragConfig.enableTavilyFallback }}</text>
        </view>
        <view class="rag-item">
          <text class="rag-k">联网写回</text>
          <text class="rag-v">{{ ragConfig.writebackOnWebMode }}</text>
        </view>
      </view>
    </view>

    <view class="module card">
      <view class="module-title">求职大厅 · 热门岗位</view>
      <view class="jobs">
        <view v-for="job in jobs" :key="job.name" class="job-item">
          <view class="job-top">
            <text class="job-name">{{ job.name }}</text>
            <text class="job-heat">{{ formatHeat(job.heat) }}</text>
          </view>
          <progress :percent="Number(job.heat) || 0" stroke-width="4" activeColor="#0052D9" />
        </view>
      </view>
    </view>

    <view class="module card">
      <view class="module-title">学习路线 · 今日必读</view>
      <view v-for="item in routes" :key="item.title" class="route-item">
        <view>
          <text class="route-title">{{ item.title }}</text>
          <text class="route-sub">针对弱项：{{ item.weakness }}</text>
        </view>
        <text class="route-time">{{ item.minutes }}min</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getDashboardHomeApi, getInterviewRecordsApi, getInterviewReportApi, getRagConfigApi, resumeDiagnosisApi } from '@/api'
import RadarChart from '@/components/RadarChart.vue'

const defaultAvatar = 'https://dummyimage.com/120x120/0052d9/ffffff&text=AI'
const defaultRadarLabels = ['技术', '逻辑', '匹配度', '表达', '稳定性']
const RADAR_DIM_KEYS = ['tech', 'logic', 'match', 'expression', 'stability']
const RESUME_COMPLETION_KEY = 'resume_completion_latest'
const nowTs = ref(Date.now())
let countdownTimer = null

function onResumeUpdated(payload) {
  if (payload?.completion !== undefined) {
    const next = Number(payload.completion)
    if (!Number.isNaN(next)) {
      resume.completion = Math.max(0, Math.min(100, next))
      uni.setStorageSync(RESUME_COMPLETION_KEY, resume.completion)
    }
  }
}

const profile = reactive({
  nickname: '林同学',
  avatar: defaultAvatar,
  interviewLevel: '面试达人',
  todayPracticeMinutes: 102,
})

const nextPractice = reactive({
  remainingMinutes: 388,
})

const resume = reactive({
  completion: 82,
  lastDiagnosis: {
    matchPercent: 86,
    summary: '',
  },
})

const radarLabels = ref(defaultRadarLabels)
const radarValues = ref([])
const ragConfig = reactive({
  similarityThreshold: '--',
  topKRetrieve: '--',
  topKRerank: '--',
  enableTavilyFallback: '--',
  writebackOnWebMode: '--',
})

const recentScores = ref([])

const jobs = ref([
  { name: 'Java 开发工程师', heat: 98 },
  { name: '前端开发工程师', heat: 95 },
  { name: '网络工程师', heat: 91 },
])

const routes = ref([
  { title: '高并发场景下的缓存一致性', weakness: '逻辑表达', minutes: 15 },
  { title: 'Vue 组件性能优化 Checklist', weakness: '技术深度', minutes: 12 },
  { title: 'STAR 法则结构化回答模板', weakness: '表达稳健', minutes: 8 },
])

const todayPracticeText = computed(() => {
  const total = Number(profile.todayPracticeMinutes || 0)
  const hour = Math.floor(total / 60)
  const minute = total % 60
  if (hour <= 0) return `${minute}m`
  return `${hour}h ${minute}m`
})

const remainPracticeText = computed(() => {
  const target = nextPractice.targetTime ? new Date(nextPractice.targetTime).getTime() : 0
  const total = target > 0
    ? Math.max(0, Math.floor((target - nowTs.value) / 60000))
    : Number(nextPractice.remainingMinutes || 0)
  const hour = Math.floor(total / 60)
  const minute = total % 60
  return `${String(hour).padStart(2, '0')} 小时 ${String(minute).padStart(2, '0')} 分`
})

onMounted(() => {
  applyLocalCompletion()
  fetchHomeData()
  fetchRagConfig()
  countdownTimer = setInterval(() => {
    nowTs.value = Date.now()
  }, 1000)
  uni.$on('resume:updated', onResumeUpdated)
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  uni.$off('resume:updated', onResumeUpdated)
})

onShow(() => {
  applyLocalCompletion()
  fetchHomeData()
  fetchRagConfig()
})

function applyLocalCompletion() {
  const local = Number(uni.getStorageSync(RESUME_COMPLETION_KEY))
  if (!Number.isNaN(local)) {
    resume.completion = Math.max(0, Math.min(100, local))
  }
}

function getBackendCompletion(data) {
  const candidates = [
    data?.resume?.completeness_score,
    data?.resume?.completion,
    data?.completeness_score,
  ]
  for (const item of candidates) {
    const num = Number(item)
    if (!Number.isNaN(num)) return Math.max(0, Math.min(100, num))
  }
  return null
}

async function fetchHomeData() {
  try {
    const data = await getDashboardHomeApi()

    Object.assign(profile, data.profile || {})
    Object.assign(nextPractice, data.nextPractice || {})
    Object.assign(resume, data.resume || {})

    const backendCompletion = getBackendCompletion(data)
    const localCompletion = Number(uni.getStorageSync(RESUME_COMPLETION_KEY))
    if (!Number.isNaN(localCompletion)) {
      resume.completion = Math.max(0, Math.min(100, localCompletion))
    } else if (backendCompletion !== null) {
      resume.completion = backendCompletion
      uni.setStorageSync(RESUME_COMPLETION_KEY, resume.completion)
    }

    radarLabels.value = defaultRadarLabels
    radarValues.value = []
    recentScores.value = []
    jobs.value = data.hotJobs || []
    routes.value = data.todayReadings || []
    fetchRecentRecords()
  } catch (error) {
    uni.showToast({ title: error.message || '首页数据加载失败', icon: 'none' })
  }
}

async function fetchRecentRecords() {
  try {
    const data = await getInterviewRecordsApi({ limit: 6 })
    const list = Array.isArray(data) ? data : data?.records || []
    if (!list.length) {
      recentScores.value = []
      radarValues.value = []
      return
    }

    const sorted = sortRecordsByDateDesc(list)

    recentScores.value = sorted.slice(0, 3).map((item) => ({
      id: getRecordId(item),
      job: item.job || item.job_role || '模拟面试',
      score: item.score || item.finalScore || item.totalScore || item.total_score || '--',
      date: item.date || item.createdAt || '',
    }))

    const weightedRadar = await buildWeightedRadarFromRecords(sorted)
    if (weightedRadar) {
      radarLabels.value = defaultRadarLabels
      radarValues.value = weightedRadar
    } else {
      radarValues.value = []
    }
  } catch (error) {
    recentScores.value = []
    radarValues.value = []
  }
}

async function fetchRagConfig() {
  try {
    const data = await getRagConfigApi()
    ragConfig.similarityThreshold = data?.similarity_threshold ?? '--'
    ragConfig.topKRetrieve = data?.top_k_retrieve ?? '--'
    ragConfig.topKRerank = data?.top_k_rerank ?? '--'
    ragConfig.enableTavilyFallback = boolText(data?.enable_tavily_fallback)
    ragConfig.writebackOnWebMode = boolText(data?.writeback_on_web_mode)
  } catch (error) {
  }
}

function boolText(val) {
  if (val === true) return '开启'
  if (val === false) return '关闭'
  return '--'
}

function getRecordId(item) {
  return item?.id || item?.recordId || item?.reportId || item?.report_id || item?.sessionId || ''
}

function score100(value, fallback = 0) {
  const num = Number(value)
  if (Number.isNaN(num)) return fallback
  return Math.max(0, Math.min(100, num))
}

function sortRecordsByDateDesc(list) {
  return [...list].sort((a, b) => {
    const ta = new Date(a?.createdAt || a?.date || 0).getTime()
    const tb = new Date(b?.createdAt || b?.date || 0).getTime()
    if (!Number.isNaN(tb - ta) && tb !== ta) return tb - ta
    return 0
  })
}

function normalizeDimensions(report) {
  const d = report?.dimensions || {}
  return {
    tech: score100(d.tech ?? report?.tech_score),
    logic: score100(d.logic ?? report?.logic_score),
    match: score100(d.match ?? report?.match_score),
    expression: score100(d.expression ?? report?.expression_score),
    stability: score100(d.stability ?? report?.stability_score),
  }
}

async function buildWeightedRadarFromRecords(records = []) {
  const ids = records
    .map((item) => getRecordId(item))
    .filter(Boolean)
    .slice(0, 6)

  if (!ids.length) return null

  const reports = await Promise.all(
    ids.map(async (id) => {
      try {
        const data = await getInterviewReportApi(id)
        return normalizeDimensions(data)
      } catch (error) {
        return null
      }
    })
  )

  const valid = reports.filter(Boolean)
  if (!valid.length) return null

  const totalWeight = valid.reduce((sum, _, index) => sum + (valid.length - index), 0)
  if (!totalWeight) return null

  return RADAR_DIM_KEYS.map((key) => {
    const weightedSum = valid.reduce((sum, item, index) => sum + item[key] * (valid.length - index), 0)
    return Math.round(weightedSum / totalWeight)
  })
}

function goPositionSelect() {
  uni.navigateTo({ url: '/pages/interview/position' })
}

function goScorePlaceholder() {
  uni.navigateTo({ url: '/pages/interview/records' })
}

function mockResumeAction() {
  uni.navigateTo({ url: '/pages/resume/resume_edit' })
}

async function runResumeDiagnosis() {
  try {
    const data = await resumeDiagnosisApi({ targetJob: '前端开发工程师' })
    resume.lastDiagnosis = data
    uni.showToast({ title: `AI 诊断：岗位匹配度 ${data.matchPercent}%`, icon: 'none' })
    fetchHomeData()
  } catch (error) {
    uni.showToast({ title: error.message || 'AI诊断失败', icon: 'none' })
  }
}

function formatHeat(heat) {
  const num = Number(heat)
  if (Number.isNaN(num)) return `${heat}`
  return `热度 ${num}%`
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f6faff;
  padding: 26rpx;
  box-sizing: border-box;
}

.card {
  border-radius: 24rpx;
  background: #fff;
  padding: 24rpx;
  box-shadow: 0 12rpx 28rpx rgba(18, 43, 80, 0.08);
}

.glass {
  background: rgba(255, 255, 255, 0.72);
  border: 1rpx solid rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(10px);
}

.header {
  background: linear-gradient(155deg, rgba(0, 82, 217, 0.88), rgba(27, 129, 255, 0.82));
  color: #fff;
}

.user-row {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.avatar {
  width: 110rpx;
  height: 110rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.36);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.name {
  font-size: 34rpx;
  font-weight: 700;
}

.level,
.time {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
}

.next-card {
  margin-top: 20rpx;
  padding: 18rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.18);
}

.next-title {
  display: block;
  font-size: 24rpx;
  opacity: 0.9;
}

.next-time {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.module {
  margin-top: 24rpx;
}

.module-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1c2432;
  margin-bottom: 16rpx;
}

.interview-btn {
  border-radius: 22rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #0052d9, #2f7fff);
  box-shadow: 0 12rpx 30rpx rgba(0, 82, 217, 0.3);
  animation: pulse 2s infinite;
}

.interview-title {
  display: block;
  color: #fff;
  font-size: 34rpx;
  font-weight: 700;
}

.interview-sub {
  display: block;
  margin-top: 8rpx;
  color: rgba(255, 255, 255, 0.9);
  font-size: 24rpx;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.01); }
  100% { transform: scale(1); }
}

.grid {
  margin-top: 16rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.grid-card {
  min-height: 240rpx;
}

.grid-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
}

.grid-sub {
  display: block;
  margin: 8rpx 0 14rpx;
  font-size: 22rpx;
  color: #6b7788;
}

.meta {
  margin-top: 8rpx;
  display: block;
  font-size: 22rpx;
  color: #5e6d81;
}

.mini-btn {
  margin-top: 14rpx;
  border-radius: 14rpx;
  font-size: 22rpx;
  height: 64rpx;
  line-height: 64rpx;
  color: #0052d9;
  background: rgba(0, 82, 217, 0.1);
}

.score-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
  font-size: 24rpx;
}

.score {
  color: #0052d9;
  font-weight: 700;
}

.empty-tip {
  color: #8a9ab2;
  font-size: 23rpx;
  text-align: center;
  padding: 14rpx 0;
}

.radar-wrap {
  height: 260rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.radar-bg,
.radar-data {
  position: absolute;
  width: 220rpx;
  height: 220rpx;
  clip-path: polygon(50% 0%, 95% 35%, 80% 92%, 20% 92%, 5% 35%);
}

.radar-bg {
  background: rgba(0, 82, 217, 0.08);
  border: 2rpx solid rgba(0, 82, 217, 0.2);
}

.radar-data {
  width: 180rpx;
  height: 180rpx;
  background: linear-gradient(135deg, rgba(0, 82, 217, 0.6), rgba(0, 160, 255, 0.3));
}

.tags {
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
}

.tag {
  background: #edf3ff;
  color: #0052d9;
  border-radius: 999rpx;
  padding: 8rpx 16rpx;
  font-size: 22rpx;
}

.rag-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.rag-item {
  background: #f6f9ff;
  border: 1rpx solid #e6eefc;
  border-radius: 14rpx;
  padding: 14rpx;
}

.rag-k {
  display: block;
  color: #6c7f9f;
  font-size: 22rpx;
}

.rag-v {
  display: block;
  margin-top: 6rpx;
  color: #1e3356;
  font-size: 28rpx;
  font-weight: 700;
}

.jobs {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.job-item {
  border-radius: 16rpx;
  background: #f3f8ff;
  padding: 18rpx;
}

.job-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.job-name {
  font-size: 26rpx;
  color: #1f2a3d;
}

.job-heat {
  font-size: 24rpx;
  color: #0052d9;
  font-weight: 600;
}

.route-item {
  border-radius: 16rpx;
  background: #f9fbff;
  border: 1rpx solid #e4ecfa;
  padding: 18rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.route-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
}

.route-sub {
  margin-top: 6rpx;
  display: block;
  font-size: 22rpx;
  color: #71839b;
}

.route-time {
  color: #0052d9;
  font-weight: 700;
}
</style>
