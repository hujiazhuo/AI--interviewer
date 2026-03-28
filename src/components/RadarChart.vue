<template>
  <view class="radar-chart">
    <canvas
      :id="canvasId"
      :canvas-id="canvasId"
      class="radar-canvas"
      :style="{ width: `${sizeRpx}rpx`, height: `${sizeRpx}rpx` }"
      :width="sizePx"
      :height="sizePx"
    />
  </view>
</template>

<script setup>
import { getCurrentInstance, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  labels: {
    type: Array,
    default: () => ['技术', '表达', '逻辑', '心理', '稳健'],
  },
  values: {
    type: Array,
    default: () => [80, 80, 80, 80, 80],
  },
  sizeRpx: {
    type: Number,
    default: 420,
  },
})

const canvasId = `radar-${Math.random().toString(36).slice(2, 8)}`
const sizePx = uni.upx2px(props.sizeRpx)
const instance = getCurrentInstance()
let animTimer = null

function safeValues() {
  return props.values.map((v) => {
    const n = Number(v)
    if (Number.isNaN(n)) return 0
    return Math.max(0, Math.min(100, n))
  })
}

function draw(progress = 1) {
  const labels = props.labels
  const values = safeValues()
  const count = Math.min(labels.length, values.length)
  if (!count) return

  const ctx = uni.createCanvasContext(canvasId, instance?.proxy)
  const c = sizePx / 2
  const radius = (sizePx * 0.33)

  ctx.clearRect(0, 0, sizePx, sizePx)

  for (let layer = 1; layer <= 4; layer += 1) {
    const r = (radius / 4) * layer
    ctx.beginPath()
    for (let i = 0; i < count; i += 1) {
      const angle = (-Math.PI / 2) + (i * Math.PI * 2) / count
      const x = c + r * Math.cos(angle)
      const y = c + r * Math.sin(angle)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.setStrokeStyle('rgba(0, 82, 217, 0.18)')
    ctx.setLineWidth(1)
    ctx.stroke()
  }

  for (let i = 0; i < count; i += 1) {
    const angle = (-Math.PI / 2) + (i * Math.PI * 2) / count
    const x = c + radius * Math.cos(angle)
    const y = c + radius * Math.sin(angle)

    ctx.beginPath()
    ctx.moveTo(c, c)
    ctx.lineTo(x, y)
    ctx.setStrokeStyle('rgba(0, 82, 217, 0.15)')
    ctx.stroke()

    const tx = c + (radius + 26) * Math.cos(angle)
    const ty = c + (radius + 26) * Math.sin(angle)
    ctx.setFillStyle('#4a5d78')
    ctx.setFontSize(12)
    ctx.setTextAlign('center')
    ctx.fillText(labels[i], tx, ty)
  }

  ctx.beginPath()
  for (let i = 0; i < count; i += 1) {
    const angle = (-Math.PI / 2) + (i * Math.PI * 2) / count
    const r = radius * (values[i] / 100) * progress
    const x = c + r * Math.cos(angle)
    const y = c + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.setFillStyle('rgba(79, 169, 255, 0.32)')
  ctx.fill()
  ctx.setStrokeStyle('rgba(0, 82, 217, 0.88)')
  ctx.setLineWidth(2)
  ctx.stroke()

  ctx.draw()
}

function animateIn() {
  if (animTimer) clearInterval(animTimer)
  let frame = 0
  const max = 18
  animTimer = setInterval(() => {
    frame += 1
    draw(frame / max)
    if (frame >= max) {
      clearInterval(animTimer)
      animTimer = null
    }
  }, 16)
}

watch(
  () => [props.labels, props.values],
  () => {
    animateIn()
  },
  { deep: true }
)

onMounted(() => {
  animateIn()
})

onUnmounted(() => {
  if (animTimer) clearInterval(animTimer)
})
</script>

<style scoped lang="scss">
.radar-chart {
  display: flex;
  align-items: center;
  justify-content: center;
}

.radar-canvas {
  border-radius: 24rpx;
}
</style>
