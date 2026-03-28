const runtimeHost =
  typeof window !== 'undefined' && window.location && window.location.hostname
    ? window.location.hostname
    : '127.0.0.1'
const FALLBACK_BASE_URL = `http://${runtimeHost}:3000/api/v1`
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || FALLBACK_BASE_URL).trim()

function getAuthHeaders() {
  const token = uni.getStorageSync('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function handleUnauthorized() {
  uni.removeStorageSync('token')
  uni.removeStorageSync('user')

  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const currentRoute = current?.route || ''

  if (currentRoute !== 'pages/auth/login') {
    uni.reLaunch({ url: '/pages/auth/login' })
  }
}

export function request(url, { method = 'GET', data = null, auth = false } = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      timeout: 20000,
      header: {
        'Content-Type': 'application/json',
        ...(auth ? getAuthHeaders() : {}),
      },
      success: (res) => {
        const payload = typeof res.data === 'object' && res.data !== null ? res.data : {}
        const code = payload.code

        if (code === 0) {
          resolve(payload.data)
          return
        }

        if (code === 4010) {
          handleUnauthorized()
          reject(new Error(payload.message || '未登录或 token 失效'))
          return
        }

        reject(new Error(payload.message || `请求失败(${res.statusCode || 'unknown'})`))
      },
      fail: (err) => {
        reject(new Error(err?.errMsg || '网络请求失败，请确认后端服务可访问'))
      },
    })
  })
}

export function registerApi(data) {
  return request('/auth/register', { method: 'POST', data })
}

export function loginApi(data) {
  return request('/auth/login', { method: 'POST', data })
}

export function getDashboardHomeApi() {
  return request('/dashboard/home', { auth: true })
}

export function resumeDiagnosisApi(data) {
  return request('/resume/diagnosis', { method: 'POST', data, auth: true })
}

export function getInterviewJobsApi() {
  return request('/interview/jobs', { auth: true })
}

export function getRagConfigApi() {
  return request('/rag/config', { auth: true })
}

export function rebuildKnowledgeApi(data) {
  return request('/rag/knowledge/rebuild', { method: 'POST', data, auth: true })
}

export function ingestKnowledgeApi(data) {
  return request('/rag/knowledge/ingest', { method: 'POST', data, auth: true })
}

export function retrieveKnowledgeApi(data) {
  return request('/rag/knowledge/retrieve', { method: 'POST', data, auth: true })
}

export function extractResumeKeywordsApi(data) {
  return request('/rag/resume/keywords', { method: 'POST', data, auth: true })
}

export function rewriteQueryApi(data) {
  return request('/rag/query/rewrite', { method: 'POST', data, auth: true })
}

export function saveResumeApi(data) {
  return request('/resume/save', { method: 'POST', data, auth: true })
}

export function startInterviewApi(data) {
  return request('/interview/start', { method: 'POST', data, auth: true })
}

export async function answerInterviewApi(data) {
  try {
    return await request('/interview/answer', { method: 'POST', data, auth: true })
  } catch (error) {
    const msg = String(error?.message || '')
    if (msg.includes('404') || msg.includes('Not Found') || msg.includes('服务端异常')) {
      return request('/interview/chat', { method: 'POST', data, auth: true })
    }
    throw error
  }
}

export async function submitInterviewDecisionApi(data) {
  try {
    return await request('/interview/decision', { method: 'POST', data, auth: true })
  } catch (error) {
    const msg = String(error?.message || '')
    if (msg.includes('404') || msg.includes('Not Found') || msg.includes('服务端异常')) {
      return request('/interview/answer', { method: 'POST', data, auth: true })
    }
    throw error
  }
}

export function endInterviewApi(data) {
  return request('/interview/end', { method: 'POST', data, auth: true })
}

export async function analyzeInterviewApi(data) {
  try {
    return await request('/interview/analyze', { method: 'POST', data, auth: true })
  } catch (error) {
    const msg = String(error?.message || '')
    if (msg.includes('404') || msg.includes('Not Found') || msg.includes('服务端异常')) {
      return request('/analyze', { method: 'POST', data, auth: true })
    }
    throw error
  }
}

export async function getInterviewRecordsApi(params = {}) {
  const query = new URLSearchParams(params).toString()
  const suffix = query ? `?${query}` : ''
  try {
    return await request(`/interview/records${suffix}`, { auth: true })
  } catch (error) {
    const msg = String(error?.message || '')
    if (msg.includes('404') || msg.includes('Not Found') || msg.includes('服务端异常')) {
      return request(`/records${suffix}`, { auth: true })
    }
    throw error
  }
}

export async function getInterviewReportApi(id) {
  if (!id) throw new Error('缺少报告ID')
  try {
    return await request(`/interview/report?id=${encodeURIComponent(id)}`, { auth: true })
  } catch (error) {
    const msg = String(error?.message || '')
    if (msg.includes('404') || msg.includes('Not Found') || msg.includes('服务端异常')) {
      return request(`/report?id=${encodeURIComponent(id)}`, { auth: true })
    }
    throw error
  }
}

export async function deleteInterviewRecordApi(id) {
  if (!id) throw new Error('缺少记录ID')

  const encodedId = encodeURIComponent(id)
  const attempts = [
    () => request(`/interview/records?id=${encodedId}`, { method: 'DELETE', auth: true }),
    () => request(`/interview/records/${encodedId}`, { method: 'DELETE', auth: true }),
    () => request('/interview/records/delete', { method: 'POST', data: { id }, auth: true }),
    () => request('/records/delete', { method: 'POST', data: { id }, auth: true }),
    () => request(`/records?id=${encodedId}`, { method: 'DELETE', auth: true }),
  ]

  let lastError = null
  for (const run of attempts) {
    try {
      return await run()
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('删除评分记录失败')
}
