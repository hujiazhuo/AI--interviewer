<template>
  <scroll-view class="page" scroll-y>
    <view class="nav">
      <text class="back" @tap="goBack">‹ 返回</text>
      <text class="title">面试报告</text>
      <view class="holder"></view>
    </view>

    <view v-if="loading" class="card status-card">
      <text class="section-title">报告生成中</text>
      <text class="summary">AI 正在生成评分报告，请稍候...</text>
      <text class="poll-tip">已轮询 {{ pollCount }}/{{ maxPollCount }}</text>
      <view class="skeleton-wrap">
        <view class="skeleton-line w1"></view>
        <view class="skeleton-line w2"></view>
        <view class="skeleton-line w3"></view>
      </view>
    </view>

    <view v-else-if="failed" class="card status-card">
      <text class="section-title">报告生成失败</text>
      <text class="summary">本次报告暂不可用，请重试分析。</text>
      <button class="retry-btn" @tap="retryFetch">重试获取报告</button>
    </view>

    <template v-else>
    <view class="card total">
      <view class="ring-wrap">
        <view class="ring" :style="ringStyle">
          <view class="ring-inner">
            <text class="score">{{ totalScore }}</text>
            <text class="unit">总分</text>
          </view>
        </view>
      </view>
      <text class="level">{{ levelText }}</text>
    </view>

    <view class="card">
      <text class="section-title">能力雷达图</text>
      <RadarChart :labels="radarLabels" :values="radarValues" :size-rpx="420" />
    </view>

    <view class="card">
      <text class="section-title">AI 总评</text>
      <text class="summary">{{ summary }}</text>
    </view>

    <view class="card split">
      <view class="col">
        <text class="section-title green">亮点</text>
        <text v-for="(i, idx) in strengths" :key="`s-${idx}`" class="tag good">{{ i }}</text>
      </view>
      <view class="col">
        <text class="section-title red">待改进</text>
        <text v-for="(i, idx) in weaknesses" :key="`w-${idx}`" class="tag bad">{{ i }}</text>
      </view>
    </view>

    <view class="card">
      <text class="section-title">学习建议</text>
      <view v-for="(i, idx) in suggestions" :key="`sg-${idx}`" class="suggest-item">
        <text class="idx">{{ idx + 1 }}</text>
        <text class="txt">{{ i }}</text>
      </view>
    </view>

    <view v-if="questionItems.length" class="card">
      <text class="section-title">逐题评分溯源</text>
      <view v-for="(q, idx) in questionItems" :key="`q-${idx}`" class="qa-item">
        <view class="qa-top">
          <text class="qa-title">第 {{ q.round }} 题 · {{ q.score }} 分</text>
          <text :class="['route-tag', q.scoreRoute === 'web' ? 'web' : 'kb']">
            {{ q.scoreRoute === 'web' ? '依据全网实时搜索' : '依据本地官方知识库' }}
          </text>
        </view>
        <text class="qa-q">Q：{{ q.question }}</text>
        <text class="qa-a">A：{{ q.answer }}</text>
        <text class="qa-sim">相似度：{{ q.similarityText }}（阈值 {{ q.thresholdText }}）</text>

        <view v-if="q.scoreRoute === 'kb' && q.kbSnippets.length" class="evidence-block">
          <text class="evidence-title">匹配知识片段</text>
          <view v-for="(s, sIdx) in q.kbSnippets" :key="`kb-${idx}-${sIdx}`" class="evidence-item">
            <text class="evidence-meta">{{ s.source }} · {{ s.headerPath }}</text>
            <text class="evidence-content">{{ s.content }}</text>
          </view>
        </view>

        <view v-if="q.scoreRoute === 'web' && q.webSources.length" class="evidence-block">
          <text class="evidence-title">联网参考来源</text>
          <view v-for="(s, sIdx) in q.webSources" :key="`web-${idx}-${sIdx}`" class="evidence-item">
            <text class="evidence-meta">{{ s.title }}</text>
            <text class="evidence-content">{{ s.snippet }}</text>
            <text v-if="s.url" class="evidence-url" @tap="openSourceUrl(s.url)">{{ s.url }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="growthSummary" class="card growth-card">
      <text class="section-title">系统成长</text>
      <text class="growth-text">{{ growthSummary }}</text>
    </view>

    <view v-if="evolutionInfo.show" class="card">
      <text class="section-title">知识库写回结果</text>
      <view class="evo-row">
        <text class="evo-k">写回状态</text>
        <text :class="['evo-v', evolutionInfo.written ? 'ok' : 'warn']">{{ evolutionInfo.written ? '成功' : '未写回' }}</text>
      </view>
      <view v-if="evolutionInfo.file" class="evo-row">
        <text class="evo-k">写回文件</text>
        <text class="evo-v file">{{ evolutionInfo.file }}</text>
      </view>
      <view v-if="evolutionInfo.reason" class="evo-row">
        <text class="evo-k">说明</text>
        <text class="evo-v">{{ evolutionInfo.reason }}</text>
      </view>
    </view>

    <view class="card">
      <view class="dialog-head" @tap="showDialog = !showDialog">
        <text class="section-title">对话回顾</text>
        <text class="toggle">{{ showDialog ? '收起' : '展开' }}</text>
      </view>
      <view v-if="showDialog">
        <view v-for="(m, idx) in messages" :key="`m-${idx}`" :class="['msg', m.role === 'user' ? 'user' : 'ai']">
          <text class="role">{{ m.role === 'user' ? '我' : 'AI' }}</text>
          <text class="content">{{ m.content }}</text>
        </view>
      </view>
    </view>
    </template>
  </scroll-view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { getInterviewReportApi } from '@/api'
import RadarChart from '@/components/RadarChart.vue'

const reportId = ref('')
const totalScore = ref(84)
const summary = ref('整体回答结构较清晰，项目细节可再深入，建议补充量化结果。')
const strengths = ref(['表达清晰', '回答结构完整'])
const weaknesses = ref(['量化指标不足', '深度追问略保守'])
const suggestions = ref(['复习性能优化实战案例', '准备 STAR 项目叙述模板', '增强系统设计问题表达'])
const showDialog = ref(false)
const loading = ref(true)
const failed = ref(false)
const pollCount = ref(0)
const maxPollCount = 15
let pollTimer = null

const radarLabels = ref(['技术', '逻辑', '匹配度', '表达', '稳定性'])
const radarValues = ref([82, 80, 85, 84, 79])

const messages = ref([])
const questionItems = ref([])
const growthSummary = ref('')
const evolutionInfo = ref({ show: false, written: false, file: '', reason: '' })

onLoad((options) => {
  reportId.value = options?.id || ''
  fetchReport()
})

onUnload(() => {
  clearPolling()
})

const ringStyle = computed(() => {
  const deg = Math.max(0, Math.min(100, Number(totalScore.value || 0))) * 3.6
  return {
    background: `conic-gradient(#0052d9 0deg, #2b7cff ${deg}deg, #dce8ff ${deg}deg 360deg)`,
  }
})

const levelText = computed(() => {
  const s = Number(totalScore.value || 0)
  if (s >= 85) return '优秀'
  if (s >= 70) return '良好'
  return '及格'
})

async function fetchReport() {
  if (!reportId.value) return
  try {
    loading.value = true
    failed.value = false

    const data = await getInterviewReportApi(reportId.value)

    const status = String(data?.status || '').toLowerCase()
    if (status === 'processing') {
      startPolling()
      return
    }
    if (status === 'failed') {
      clearPolling()
      loading.value = false
      failed.value = true
      return
    }

    clearPolling()
    loading.value = false
    failed.value = false

    totalScore.value = Number(data?.finalScore || data?.total_score || data?.score || totalScore.value)
    summary.value = data?.summary || summary.value

    strengths.value = data?.strengths || data?.highlights || strengths.value
    weaknesses.value = data?.weaknesses || data?.improvements || weaknesses.value
    suggestions.value = data?.suggestions || suggestions.value

    const dims = Object.keys(data?.dimensions || {}).length
      ? data.dimensions
      : {
          tech: data?.tech_score,
          logic: data?.logic_score,
          match: data?.match_score,
          expression: data?.expression_score,
          stability: data?.stability_score,
        }
    const labels = Object.keys(dims)
    if (labels.length) {
      radarLabels.value = labels.map((k) => mapDimensionName(k))
      radarValues.value = labels.map((k) => Number(dims[k] || 0))
    }

    const chat = Array.isArray(data?.messages)
      ? data.messages
      : Array.isArray(data?.chat_history)
        ? data.chat_history
        : []
    messages.value = chat

    questionItems.value = normalizeQuestions(data?.questions)
    growthSummary.value = data?.growthSummary || data?.growth_summary || data?.growthNote || data?.growth_note || ''
    evolutionInfo.value = normalizeEvolution(data)
  } catch (error) {
    clearPolling()
    loading.value = false
    failed.value = true
    uni.showToast({ title: error.message || '报告加载失败', icon: 'none' })
  }
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    pollCount.value += 1
    if (pollCount.value >= maxPollCount) {
      clearPolling()
      loading.value = false
      failed.value = true
      return
    }
    await fetchReport()
  }, 1000)
}

function clearPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function retryFetch() {
  pollCount.value = 0
  clearPolling()
  fetchReport()
}

function mapDimensionName(k) {
  const map = {
    tech: '技术',
    logic: '逻辑',
    match: '匹配度',
    expression: '表达',
    stability: '稳定性',
  }
  return map[k] || k
}

function normalizeQuestions(list) {
  if (!Array.isArray(list)) return []
  return list.map((item, idx) => {
    const evidence = item?.evidence || {}
    const kbSnippets = Array.isArray(evidence?.kbSnippets)
      ? evidence.kbSnippets
      : Array.isArray(evidence?.kb_snippets)
        ? evidence.kb_snippets
        : []
    const webSources = Array.isArray(evidence?.webSources)
      ? evidence.webSources
      : Array.isArray(evidence?.web_sources)
        ? evidence.web_sources
        : Array.isArray(item?.webSources)
          ? item.webSources
          : Array.isArray(item?.web_sources)
            ? item.web_sources
            : []

    const similarity = Number(item?.similarity)
    const threshold = Number(item?.threshold)

    return {
      round: Number(item?.round || idx + 1),
      question: item?.question || '（无题干）',
      answer: item?.answer || '（无回答）',
      score: Number(item?.score || 0),
      scoreRoute: normalizeScoreRoute(item),
      similarityText: Number.isNaN(similarity) ? '--' : similarity.toFixed(2),
      thresholdText: Number.isNaN(threshold) ? '--' : threshold.toFixed(2),
      kbSnippets: kbSnippets.map((s) => ({
        source: s?.source || 'knowledge',
        headerPath: s?.headerPath || s?.header_path || '命中片段',
        content: s?.content || '',
      })),
      webSources: webSources.map((s) => ({
        title: s?.title || '搜索来源',
        url: s?.url || '',
        snippet: s?.snippet || s?.content || s?.text || '',
      })),
    }
  })
}

function normalizeScoreRoute(item) {
  const val = String(item?.scoreRoute || item?.score_route || item?.scorePath || item?.score_path || item?.routeHint || item?.route_hint || '').toLowerCase()
  return val === 'web' ? 'web' : 'kb'
}

function normalizeEvolution(data) {
  const evo = data?.evolution || {}
  const written = evo?.written === true || evo?.writeback === true
  const file = evo?.file || evo?.targetFile || evo?.target_file || ''
  const reason = evo?.reason || ''
  return {
    show: written || !!file || !!reason,
    written,
    file,
    reason,
  }
}

function openSourceUrl(url) {
  if (!url) return
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`
  // #ifdef H5
  window.open(normalized, '_blank')
  // #endif
  // #ifndef H5
  uni.setClipboardData({ data: normalized, showToast: true })
  // #endif
}

function goBack() {
  const pages = getCurrentPages()
  const prevRoute = pages?.[pages.length - 2]?.route || ''
  const fromRecords = prevRoute === 'pages/interview/records'

  if (fromRecords) {
    uni.navigateBack({
      delta: 1,
      fail: () => {
        uni.redirectTo({
          url: '/pages/interview/records',
          fail: () => uni.reLaunch({ url: '/pages/interview/records' }),
        })
      },
    })
    return
  }

  uni.redirectTo({
    url: '/pages/interview/records',
    fail: () => uni.reLaunch({ url: '/pages/interview/records' }),
  })
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f6faff;
  padding: 20rpx 22rpx;
  box-sizing: border-box;
}

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;

  .back,
  .holder { width: 120rpx; }
  .back { color: #0052d9; font-size: 26rpx; }
  .title { font-size: 34rpx; color: #1f2b3d; font-weight: 700; }
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx;
  box-shadow: 0 10rpx 24rpx rgba(18, 43, 80, 0.08);
  margin-bottom: 14rpx;
}

.total {
  text-align: center;
}

.ring-wrap { display: flex; justify-content: center; }
.ring {
  width: 220rpx;
  height: 220rpx;
  border-radius: 50%;
  padding: 12rpx;
}
.ring-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.score { font-size: 58rpx; color: #1f2b3d; font-weight: 700; }
.unit { color: #72839a; font-size: 22rpx; }
.level { margin-top: 8rpx; color: #0052d9; font-size: 30rpx; font-weight: 700; }

.section-title { font-size: 28rpx; font-weight: 700; color: #1f2b3d; display: block; margin-bottom: 12rpx; }
.summary { color: #31435f; font-size: 25rpx; line-height: 1.7; }

.split { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.col { background: #f7faff; border-radius: 14rpx; padding: 12rpx; }
.green { color: #17a34a; }
.red { color: #d94848; }
.tag { display: block; padding: 8rpx 10rpx; border-radius: 10rpx; margin-bottom: 8rpx; font-size: 23rpx; }
.good { background: #eaf9ef; color: #1d8d44; }
.bad { background: #fff0f0; color: #c23636; }

.suggest-item {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin-bottom: 10rpx;
}
.idx {
  width: 34rpx;
  height: 34rpx;
  line-height: 34rpx;
  border-radius: 50%;
  text-align: center;
  background: #e9f1ff;
  color: #0052d9;
  font-size: 22rpx;
}
.txt { flex: 1; font-size: 24rpx; color: #32445f; line-height: 1.6; }

.dialog-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.toggle { color: #0052d9; font-size: 24rpx; }
.msg {
  margin-bottom: 10rpx;
  border-radius: 12rpx;
  padding: 10rpx 12rpx;
}
.msg.ai { background: #f3f7ff; }
.msg.user { background: #edf5ff; border: 1rpx solid #d8e7ff; }
.role { display: block; color: #6f819a; font-size: 22rpx; margin-bottom: 4rpx; }
.content { color: #21324a; font-size: 24rpx; line-height: 1.6; }

.status-card {
  text-align: center;
}

.poll-tip {
  margin-top: 8rpx;
  color: #6d7f98;
  font-size: 22rpx;
}

.retry-btn {
  margin-top: 14rpx;
  border: none;
  border-radius: 12rpx;
  font-size: 26rpx;
  height: 72rpx;
  line-height: 72rpx;
  color: #fff;
  background: linear-gradient(135deg, #0052d9, #2b7cff);
}

.qa-item {
  border: 1rpx solid #e6eefb;
  border-radius: 14rpx;
  padding: 14rpx;
  margin-bottom: 14rpx;
  background: #f9fbff;
}

.qa-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 8rpx;
}

.qa-title {
  color: #1f2b3d;
  font-size: 25rpx;
  font-weight: 700;
}

.route-tag {
  font-size: 20rpx;
  border-radius: 999rpx;
  padding: 5rpx 12rpx;

  &.kb {
    color: #245db8;
    background: #e9f1ff;
    border: 1rpx solid #cddfff;
  }

  &.web {
    color: #8c5a08;
    background: #fff4de;
    border: 1rpx solid #ffe0a9;
  }
}

.qa-q,
.qa-a,
.qa-sim {
  display: block;
  font-size: 23rpx;
  color: #334861;
  line-height: 1.6;
  margin-top: 4rpx;
}

.evidence-block {
  margin-top: 10rpx;
  padding-top: 10rpx;
  border-top: 1rpx dashed #d8e5fb;
}

.evidence-title {
  display: block;
  color: #1f2b3d;
  font-size: 22rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.evidence-item {
  background: #fff;
  border: 1rpx solid #edf3ff;
  border-radius: 10rpx;
  padding: 10rpx;
  margin-bottom: 8rpx;
}

.evidence-meta {
  display: block;
  color: #5a74a1;
  font-size: 20rpx;
}

.evidence-content {
  display: block;
  color: #2c4058;
  font-size: 22rpx;
  line-height: 1.55;
  margin-top: 4rpx;
}

.evidence-url {
  display: block;
  color: #0052d9;
  font-size: 20rpx;
  margin-top: 4rpx;
  text-decoration: underline;
}

.growth-card {
  background: linear-gradient(135deg, #f4f9ff, #eef5ff);
}

.growth-text {
  color: #2b3f59;
  line-height: 1.7;
  font-size: 24rpx;
}

.evo-row {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin-bottom: 8rpx;
}

.evo-k {
  width: 120rpx;
  color: #6b7f9d;
  font-size: 22rpx;
}

.evo-v {
  flex: 1;
  color: #2b3f59;
  font-size: 23rpx;
  line-height: 1.6;

  &.ok {
    color: #178a3e;
    font-weight: 700;
  }

  &.warn {
    color: #bb6a10;
    font-weight: 700;
  }

  &.file {
    word-break: break-all;
  }
}

.skeleton-wrap {
  margin-top: 14rpx;
}

.skeleton-line {
  height: 20rpx;
  border-radius: 999rpx;
  margin: 10rpx auto 0;
  background: linear-gradient(90deg, #edf2fb 25%, #f8fbff 37%, #edf2fb 63%);
  background-size: 400% 100%;
  animation: shimmer 1.2s ease infinite;
}

.skeleton-line.w1 { width: 78%; }
.skeleton-line.w2 { width: 62%; }
.skeleton-line.w3 { width: 84%; }

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}
</style>
