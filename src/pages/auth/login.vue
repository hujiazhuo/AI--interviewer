<template>
  <view class="page">
    <view class="hero">
      <view class="hero-glow"></view>
      <view class="brain-logo">
        <view class="brain-core"></view>
        <view class="brain-dot dot-1"></view>
        <view class="brain-dot dot-2"></view>
        <view class="brain-dot dot-3"></view>
      </view>
      <text class="hero-title">AI 全真模拟面试</text>
      <text class="hero-subtitle">让每一次练习都更接近 Offer</text>
    </view>

    <view class="card glass">
      <view class="form">
        <input v-model="form.username" class="input" placeholder="用户名" />
        <input v-model="form.password" class="input" password placeholder="请输入密码" />
        <button class="btn btn-primary" @click="handleLogin">登录</button>
      </view>

      <view class="bottom-link">
        <text class="muted">还没有账号？</text>
        <view class="link" @tap="goRegister">立即注册</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive } from 'vue'
import { loginApi } from '@/api'

const form = reactive({
  username: '',
  password: '',
})

async function handleLogin() {
  if (!form.username || !form.password) {
    uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
    return
  }

  try {
    const data = await loginApi({
      username: form.username,
      password: form.password,
    })

    uni.setStorageSync('token', data.token || '')
    uni.setStorageSync('user', data.user || {})

    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/index/index' })
    }, 350)
  } catch (error) {
    uni.showToast({ title: error.message || '登录失败', icon: 'none' })
  }
}

function goRegister() {
  uni.navigateTo({
    url: '/pages/auth/register',
    fail: (err) => {
      console.error('navigateTo register failed:', err)
      uni.redirectTo({
        url: '/pages/auth/register',
        fail: (redirectErr) => {
          console.error('redirectTo register failed:', redirectErr)
          uni.reLaunch({
            url: '/pages/auth/register',
            fail: () => {
              uni.showToast({ title: '跳转失败，请重启项目', icon: 'none' })
            },
          })
        },
      })
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
  border-radius: 24rpx;
  padding: 46rpx 30rpx;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(0, 82, 217, 0.9), rgba(0, 132, 255, 0.78));
  box-shadow: 0 20rpx 48rpx rgba(0, 82, 217, 0.28);
}

.hero-glow {
  position: absolute;
  width: 360rpx;
  height: 360rpx;
  right: -100rpx;
  top: -150rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}

.brain-logo {
  position: relative;
  width: 132rpx;
  height: 132rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  border: 2rpx solid rgba(255, 255, 255, 0.42);
  backdrop-filter: blur(10px);
}

.brain-core {
  position: absolute;
  inset: 30rpx;
  border-radius: 40rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.9);
}

.brain-dot {
  position: absolute;
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #fff;
}

.dot-1 { top: 30rpx; left: 58rpx; }
.dot-2 { top: 62rpx; left: 26rpx; }
.dot-3 { right: 22rpx; bottom: 28rpx; }

.hero-title {
  margin-top: 24rpx;
  display: block;
  color: #fff;
  font-size: 44rpx;
  font-weight: 700;
}

.hero-subtitle {
  margin-top: 14rpx;
  display: block;
  color: rgba(255, 255, 255, 0.85);
  font-size: 26rpx;
}

.card {
  margin-top: -26rpx;
  border-radius: 24rpx;
  padding: 28rpx;
}

.glass {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(12px);
  border: 1rpx solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 14rpx 36rpx rgba(30, 60, 118, 0.12);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.input {
  height: 88rpx;
  border-radius: 18rpx;
  background: #f8fbff;
  border: 1rpx solid #dfe7f6;
  padding: 0 22rpx;
  font-size: 28rpx;
}

.btn {
  border: none;
  border-radius: 18rpx;
  font-size: 28rpx;
  height: 88rpx;
  line-height: 88rpx;
}

.btn-primary {
  margin-top: 8rpx;
  color: #fff;
  background: linear-gradient(135deg, #0052d9, #2b7cff);
  box-shadow: 0 10rpx 26rpx rgba(0, 82, 217, 0.28);
}

.bottom-link {
  margin-top: 20rpx;
  text-align: center;
  font-size: 26rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}

.muted {
  color: #7b8799;
}

.link {
  color: #0052d9;
  margin-left: 10rpx;
  font-weight: 600;
  padding: 8rpx 12rpx;
  border-radius: 12rpx;
}
</style>