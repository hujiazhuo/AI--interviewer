<template>
  <view class="page">
    <view class="hero">
      <view class="hero-ring"></view>
      <text class="hero-title">创建你的 AI 面试账号</text>
      <text class="hero-subtitle">30 秒开启你的能力提升之路</text>
    </view>

    <view class="card glass">
      <view class="form">
        <input v-model="form.username" class="input" placeholder="用户名" />
        <input v-model="form.password" class="input" password placeholder="设置密码" />
      </view>

      <button :class="['btn', 'btn-primary', successAnimate ? 'success-pop' : '', submitting ? 'btn-disabled' : '']" :disabled="submitting" @tap="handleRegister">
        {{ submitting ? '注册中...' : '注册账号' }}
      </button>

      <view class="bottom-link">
        <text class="muted">已有账号？</text>
        <text class="link" @tap="goLogin">返回登录</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { registerApi } from '@/api'

const form = reactive({
  username: '',
  password: '',
})

const successAnimate = ref(false)
const submitting = ref(false)

async function handleRegister() {
  if (submitting.value) return

  const username = form.username.trim()
  const password = form.password.trim()

  if (!username || !password) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }

  submitting.value = true

  try {
    await registerApi({
      username,
      password,
    })

    successAnimate.value = true
    uni.showToast({ title: '注册成功，跳转登录', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/auth/login' })
    }, 650)
  } catch (error) {
    uni.showToast({ title: error.message || '注册失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function goLogin() {
  uni.navigateBack({
    delta: 1,
    fail: () => {
      uni.reLaunch({ url: '/pages/auth/login' })
    },
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 40rpx 32rpx;
  background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
}

.hero {
  position: relative;
  padding: 42rpx 30rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #0052d9, #2a80ff);
  overflow: hidden;
  box-shadow: 0 20rpx 40rpx rgba(0, 82, 217, 0.2);
}

.hero-ring {
  position: absolute;
  width: 260rpx;
  height: 260rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(255, 255, 255, 0.25);
  right: -56rpx;
  top: -90rpx;
}

.hero-title {
  display: block;
  color: #fff;
  font-size: 40rpx;
  font-weight: 700;
}

.hero-subtitle {
  display: block;
  margin-top: 12rpx;
  color: rgba(255, 255, 255, 0.88);
  font-size: 26rpx;
}

.card {
  margin-top: -20rpx;
  border-radius: 24rpx;
  padding: 28rpx;
}

.glass {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  border: 1rpx solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 16rpx 32rpx rgba(25, 48, 91, 0.12);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.input {
  height: 88rpx;
  border-radius: 18rpx;
  background: #f9fbff;
  border: 1rpx solid #d9e4f8;
  padding: 0 22rpx;
  font-size: 28rpx;
}

.btn {
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 18rpx;
  font-size: 28rpx;
  border: none;
}

.btn-primary {
  margin-top: 24rpx;
  color: #fff;
  background: linear-gradient(135deg, #0052d9, #2b7cff);
}

.btn-disabled {
  opacity: 0.7;
}

.success-pop {
  animation: pop 0.45s ease;
}

@keyframes pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
}

.bottom-link {
  margin-top: 18rpx;
  text-align: center;
  font-size: 26rpx;
}

.muted {
  color: #708197;
}

.link {
  margin-left: 10rpx;
  color: #0052d9;
  font-weight: 600;
}
</style>