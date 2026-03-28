<template>
  <view class="page">
    <view class="top-progress">
      <view class="top-nav">
        <text class="back-home" @tap="goHome">‹ 返回主页</text>
        <text class="top-title">简历内容填写</text>
      </view>
      <view class="top-progress-bar">
        <view class="top-progress-inner" :style="{ width: `${progress}%` }"></view>
      </view>
      <text class="top-progress-text">简历完整度 {{ progress }}%</text>
    </view>

    <scroll-view class="content" scroll-y>
      <view class="card section">
        <view class="section-title" @tap="toggle('basic')">
          <text>基础信息</text>
          <text class="arrow">{{ openSection.basic ? '−' : '+' }}</text>
        </view>
        <view v-if="openSection.basic" class="form-grid">
          <input v-model="form.name" class="input" placeholder="姓名" @input="onFormInput" />
          <input
            v-model="form.targetJobIndustry"
            class="input"
            placeholder="目标岗位+行业（如：大模型应用开发工程师·互联网）"
            @input="onFormInput"
          />

          <view class="field">
            <text class="field-label">工作年限</text>
            <view class="chips">
              <view
                v-for="item in workYearOptions"
                :key="item"
                :class="['chip', form.workYears === item ? 'active' : '']"
                @tap="selectWorkYears(item)"
              >
                {{ item }}
              </view>
            </view>
          </view>

          <view class="field">
            <text class="field-label">期望面试类型</text>
            <view class="chips">
              <view
                v-for="item in interviewTypeOptions"
                :key="item"
                :class="['chip', form.interviewTypes.includes(item) ? 'active' : '']"
                @tap="toggleInterviewType(item)"
              >
                {{ item }}
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="card section">
        <view class="section-title" @tap="toggle('skills')">
          <text>核心技能</text>
          <text class="arrow">{{ openSection.skills ? '−' : '+' }}</text>
        </view>
        <view v-if="openSection.skills">
          <view class="field">
            <text class="field-label">技术栈（逗号分隔）</text>
            <textarea
              v-model="form.techStack"
              class="textarea"
              maxlength="1200"
              placeholder="请列出你的技术栈，用逗号分隔，如：Java, Vue, SpringBoot"
              @input="onFormInput"
            />
          </view>

          <view class="field">
            <text class="field-label">掌握程度（对应技术栈填写）</text>
            <textarea
              v-model="form.mastery"
              class="textarea"
              maxlength="1200"
              placeholder="如：Python-掌握, PyTorch-熟悉, LangChain-精通"
              @input="onFormInput"
            />
          </view>

          <view class="field">
            <text class="field-label">专业方向（可多选）</text>
            <view class="chips">
              <view
                v-for="item in directionOptions"
                :key="item"
                :class="['chip', form.directions.includes(item) ? 'active' : '']"
                @tap="toggleDirection(item)"
              >
                {{ item }}
              </view>
            </view>
          </view>

        </view>
      </view>

      <view class="card section">
        <view class="section-title" @tap="toggle('projects')">
          <text>项目经历</text>
          <text class="arrow">{{ openSection.projects ? '−' : '+' }}</text>
        </view>
        <view v-if="openSection.projects">
          <view v-for="(project, idx) in form.projects" :key="idx" class="project-card">
            <view class="project-header">
              <text class="project-title">项目{{ idx + 1 }}</text>
              <text v-if="form.projects.length > 1" class="project-remove" @tap="removeProject(idx)">删除</text>
            </view>

            <input v-model="project.name" class="input" placeholder="项目名称" @input="onFormInput" />
            <textarea
              v-model="project.responsibility"
              class="textarea"
              maxlength="1000"
              placeholder="核心职责"
              @input="onFormInput"
            />
            <textarea
              v-model="project.challengeSolution"
              class="textarea"
              maxlength="1600"
              placeholder="项目难点与解决方案"
              @input="onFormInput"
            />
            <textarea
              v-model="project.quantResult"
              class="textarea"
              maxlength="1000"
              placeholder="项目成果（量化）"
              @input="onFormInput"
            />
          </view>

          <button class="add-project" @tap="addProject">+ 添加项目</button>
        </view>
      </view>
    </scroll-view>

    <view class="bottom-bar">
      <button class="btn primary full" :disabled="saving" @tap="saveResumeInfo">
        {{ saving ? '保存中...' : '保存简历信息' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { saveResumeApi } from '@/api'

const DRAFT_KEY = 'resume_edit_draft_v1'
const RESUME_COMPLETION_KEY = 'resume_completion_latest'

const workYearOptions = ['应届生', '1-3年', '3-5年', '5年以上']
const interviewTypeOptions = ['技术面', 'HR面', '项目面', '综合面']
const directionOptions = ['大模型应用', '机器人开发', '后端', '前端', '数据开发']

function createProject() {
  return {
    name: '',
    responsibility: '',
    challengeSolution: '',
    quantResult: '',
  }
}

const form = reactive({
  name: '',
  targetJobIndustry: '',
  workYears: '',
  interviewTypes: [],
  techStack: '',
  mastery: '',
  directions: [],
  projects: [createProject()],
})

const openSection = reactive({
  basic: true,
  skills: true,
  projects: true,
})

const saving = ref(false)
let autosaveTimer = null

const progress = computed(() => {
  const projectsFilledCount = form.projects.filter(
    (p) => p.name || p.responsibility || p.challengeSolution || p.quantResult
  ).length

  const score = [
    form.name ? 10 : 0,
    form.targetJobIndustry ? 12 : 0,
    form.workYears ? 8 : 0,
    form.interviewTypes.length ? 10 : 0,
    form.techStack.trim().length >= 8 ? 18 : 0,
    form.mastery.trim().length >= 8 ? 15 : 0,
    form.directions.length ? 10 : 0,
    projectsFilledCount > 0 ? 17 : 0,
  ].reduce((a, b) => a + b, 0)

  return Math.min(100, score)
})

onLoad(() => {
  restoreDraft()
  uni.setStorageSync(RESUME_COMPLETION_KEY, progress.value)
})

onUnload(() => {
  uni.setStorageSync(RESUME_COMPLETION_KEY, progress.value)
  uni.$emit('resume:updated', { completion: progress.value })
})

onUnmounted(() => {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer)
    autosaveTimer = null
  }
})

watch(progress, (val) => {
  uni.setStorageSync(RESUME_COMPLETION_KEY, val)
})

function toggle(key) {
  openSection[key] = !openSection[key]
}

function onFormInput() {
  debounceAutoSave()
}

function debounceAutoSave() {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => {
    persistLocalDraft()
  }, 2000)
}

function goHome() {
  uni.redirectTo({ url: '/pages/index/index' })
}

function persistLocalDraft() {
  const payload = {
    ...form,
    progress: progress.value,
    updatedAt: Date.now(),
  }
  uni.setStorageSync(DRAFT_KEY, payload)
}

function restoreDraft() {
  const draft = uni.getStorageSync(DRAFT_KEY)
  if (!draft || typeof draft !== 'object') return
  Object.assign(form, {
    name: draft.name || '',
    targetJobIndustry: draft.targetJobIndustry || '',
    workYears: draft.workYears || '',
    interviewTypes: Array.isArray(draft.interviewTypes) ? draft.interviewTypes : [],
    techStack: draft.techStack || '',
    mastery: draft.mastery || '',
    directions: Array.isArray(draft.directions) ? draft.directions : [],
    projects: Array.isArray(draft.projects) && draft.projects.length ? draft.projects : [createProject()],
  })
}

function selectWorkYears(val) {
  form.workYears = val
  onFormInput()
}

function toggleInterviewType(val) {
  const idx = form.interviewTypes.indexOf(val)
  if (idx >= 0) form.interviewTypes.splice(idx, 1)
  else form.interviewTypes.push(val)
  onFormInput()
}

function toggleDirection(val) {
  const idx = form.directions.indexOf(val)
  if (idx >= 0) form.directions.splice(idx, 1)
  else form.directions.push(val)
  onFormInput()
}

function addProject() {
  form.projects.push(createProject())
  onFormInput()
}

function removeProject(index) {
  form.projects.splice(index, 1)
  if (!form.projects.length) form.projects.push(createProject())
  onFormInput()
}

async function saveResumeInfo() {
  if (saving.value) return

  saving.value = true
  try {
    await saveResumeApi({
      ...form,
      completeness_score: progress.value,
    })

    uni.setStorageSync(RESUME_COMPLETION_KEY, progress.value)
    uni.$emit('resume:updated', { completion: progress.value })
    uni.showToast({ title: '保存成功', icon: 'success' })

    setTimeout(() => {
      uni.navigateBack({
        delta: 1,
        fail: () => uni.redirectTo({ url: '/pages/index/index' }),
      })
    }, 500)
  } catch (error) {
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f6faff;
  padding-bottom: 140rpx;
}

.top-progress {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(246, 250, 255, 0.95);
  backdrop-filter: blur(8px);
  padding: 20rpx 24rpx 12rpx;

  .top-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;
  }

  .back-home {
    color: #0052d9;
    font-size: 26rpx;
    font-weight: 600;
  }

  .top-title {
    color: #1f2b3d;
    font-size: 28rpx;
    font-weight: 700;
  }

  &-bar {
    height: 14rpx;
    border-radius: 999rpx;
    background: #dfe9fa;
    overflow: hidden;
  }

  &-inner {
    height: 100%;
    border-radius: 999rpx;
    background: linear-gradient(90deg, #0052d9, #2b7cff);
    transition: width 0.25s ease;
  }

  &-text {
    margin-top: 8rpx;
    display: block;
    color: #4f6280;
    font-size: 24rpx;
    text-align: right;
  }
}

.content {
  height: calc(100vh - 170rpx);
  padding: 0 24rpx;
  box-sizing: border-box;
}

.card {
  margin-top: 18rpx;
  padding: 22rpx;
  border-radius: 22rpx;
  background: #fff;
  box-shadow: 0 10rpx 24rpx rgba(18, 43, 80, 0.08);
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #1f2b3d;
  font-size: 30rpx;
  font-weight: 700;
}

.arrow {
  color: #0052d9;
  font-size: 36rpx;
  line-height: 1;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14rpx;
  margin-top: 16rpx;
}

.field {
  margin-top: 8rpx;
}

.field-label {
  display: block;
  color: #38506f;
  font-size: 24rpx;
  margin-bottom: 8rpx;
}

.chips {
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
}

.chip {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #eef3ff;
  color: #5a6f8f;
  font-size: 24rpx;
  border: 1rpx solid #d6e2f7;

  &.active {
    color: #fff;
    background: linear-gradient(135deg, #0052d9, #2b7cff);
    border-color: transparent;
  }
}

.input,
.textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1rpx solid #d8e4f8;
  background: #f9fbff;
  border-radius: 16rpx;
  padding: 16rpx 18rpx;
  color: #1f2b3d;
  font-size: 27rpx;
}

.input {
  min-height: 96rpx;
  line-height: 1.4;
}

.textarea {
  height: 180rpx;
  margin-top: 16rpx;
}

.textarea-lg {
  height: 300rpx;
}

.project-card {
  margin-top: 14rpx;
  padding: 14rpx;
  border-radius: 16rpx;
  background: #f7faff;
  border: 1rpx solid #e2ebfb;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.project-title {
  color: #1f2b3d;
  font-size: 26rpx;
  font-weight: 600;
}

.project-remove {
  color: #ff5d5d;
  font-size: 24rpx;
}

.add-project {
  margin-top: 12rpx;
  border: 1rpx dashed #97b6eb;
  color: #0052d9;
  background: #eff5ff;
  border-radius: 14rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 26rpx;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 14rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 -8rpx 18rpx rgba(18, 43, 80, 0.08);
}

.btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  border: none;
  border-radius: 16rpx;
  font-size: 28rpx;

  &.secondary {
    color: #0052d9;
    background: rgba(0, 82, 217, 0.1);
  }

  &.primary {
    color: #fff;
    background: linear-gradient(135deg, #0052d9, #2b7cff);
  }

  &.full {
    width: 100%;
  }
}
</style>
