/**
 * API 请求封装
 * 统一处理错误和响应格式
 */

const BASE = '/api'

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

// ---- 日报 ----

export const dailyApi = {
  get(date) {
    return request('GET', `/daily/${date}`)
  },
  save(date, data) {
    return request('PUT', `/daily/${date}`, data)
  },
  delete(date) {
    return request('DELETE', `/daily/${date}`)
  },
  listByMonth(month) {
    return request('GET', `/daily/list?month=${month}`)
  }
}

// ---- 月报 ----

export const monthlyApi = {
  get(month) {
    return request('GET', `/monthly/${month}`)
  },
  save(month, data) {
    return request('PUT', `/monthly/${month}`, data)
  }
}

// ---- AI ----

export const aiApi = {
  /**
   * 日报润色（Streaming SSE）
   * @param {string} rawText 原文
   * @param {function} onChunk 每次收到 chunk 的回调 (text) => void
   * @param {function} onDone 完成回调 ({ title, content }) => void
   * @param {function} onError 错误回调 (err) => void
   */
  async polish(rawText, { onChunk, onDone, onError } = {}) {
    try {
      const res = await fetch(`${BASE}/ai/polish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // 保留未完整的行

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            // 最终结果在 onDone 中处理
            continue
          }
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'chunk' && onChunk) {
              onChunk(parsed.text)
            } else if (parsed.type === 'done' && onDone) {
              onDone(parsed.result)
            } else if (parsed.type === 'error') {
              throw new Error(parsed.message)
            }
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') {
              onError && onError(e)
            }
          }
        }
      }
    } catch (e) {
      onError && onError(e)
    }
  },

  /**
   * 月报生成（Streaming SSE）
   */
  async generateMonthly(month, { onChunk, onDone, onError } = {}) {
    try {
      const res = await fetch(`${BASE}/monthly/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'chunk' && onChunk) {
              onChunk(parsed.text)
            } else if (parsed.type === 'done' && onDone) {
              onDone(parsed.result)
            } else if (parsed.type === 'error') {
              throw new Error(parsed.message)
            }
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') {
              onError && onError(e)
            }
          }
        }
      }
    } catch (e) {
      onError && onError(e)
    }
  }
}
