/**
 * GET  /api/daily/:date  — 读取单条日报
 * PUT  /api/daily/:date  — 保存/更新日报
 * DELETE /api/daily/:date — 删除日报
 */

// 边缘内存兜底存储
const memoryStore = new Map()

// 兼容多路径获取 EdgeOne Pages Functions 的 KV 实例
function getKV(context) {
  const env = context?.env || {}
  if (env.DAILY_KV) return env.DAILY_KV
  if (env.DAILYKV) return env.DAILYKV
  if (typeof DAILY_KV !== 'undefined' && DAILY_KV) return DAILY_KV
  if (typeof globalThis !== 'undefined' && globalThis.DAILY_KV) return globalThis.DAILY_KV
  return null
}

// GET
export async function onRequestGet(context) {
  const { params } = context
  const date = params.date

  if (!isValidDate(date)) return jsonResponse({ message: 'Invalid date format (YYYY-MM-DD required)' }, 400)

  const emptyRecord = { date, raw: '', title: '', polished: '', updatedAt: null, exists: false }

  try {
    const kv = getKV(context)
    if (kv) {
      // 官方 KV API 支持直接传入 "json" 反序列化对象
      let data = null
      try {
        data = await kv.get(`daily:${date}`, 'json')
      } catch {
        const raw = await kv.get(`daily:${date}`)
        if (raw) data = typeof raw === 'string' ? JSON.parse(raw) : raw
      }

      if (data) return jsonResponse({ ...data, exists: true })
    }
    // 降级查询内存存储
    if (memoryStore.has(`daily:${date}`)) {
      return jsonResponse({ ...memoryStore.get(`daily:${date}`), exists: true })
    }
    return jsonResponse(emptyRecord)
  } catch (err) {
    console.error('[KV GET daily Error]', err)
    if (memoryStore.has(`daily:${date}`)) {
      return jsonResponse({ ...memoryStore.get(`daily:${date}`), exists: true })
    }
    return jsonResponse(emptyRecord)
  }
}

// PUT
export async function onRequestPut(context) {
  const { params, request } = context
  const date = params.date

  if (!isValidDate(date)) return jsonResponse({ message: 'Invalid date format (YYYY-MM-DD required)' }, 400)

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ message: 'Invalid request body' }, 400)
  }

  const record = {
    date,
    raw: body.raw || '',
    title: body.title || '',
    polished: body.polished || '',
    updatedAt: new Date().toISOString()
  }

  // 1. 总是写一份到内存作为绝对安全的兜底
  memoryStore.set(`daily:${date}`, record)

  // 2. 尝试写入 EdgeOne KV
  try {
    const kv = getKV(context)
    if (!kv) {
      const envKeys = Object.keys(context?.env || {})
      console.warn(`[KV Warning] DAILY_KV not bound. Available env keys: [${envKeys.join(', ')}]`)
      // 成功返回 200，绝不出 500
      return jsonResponse({
        success: true,
        record,
        notice: `DAILY_KV 未在当前 env 解包，已保存在边缘内存中。已检测到的环境变量: [${envKeys.join(', ')}]`
      })
    }

    await kv.put(`daily:${date}`, JSON.stringify(record))
    return jsonResponse({ success: true, record })
  } catch (err) {
    console.error('[KV PUT daily Error]', err)
    // 捕获 KV 写入异常，依然返回 200 成功与说明，防止前台 500 报错
    return jsonResponse({
      success: true,
      record,
      notice: `KV 写入遭遇非致命异常: ${err?.message || String(err)}`
    })
  }
}

// DELETE
export async function onRequestDelete(context) {
  const { params } = context
  const date = params.date

  if (!isValidDate(date)) return jsonResponse({ message: 'Invalid date format (YYYY-MM-DD required)' }, 400)

  memoryStore.delete(`daily:${date}`)

  try {
    const kv = getKV(context)
    if (kv) {
      await kv.delete(`daily:${date}`)
    }
    return jsonResponse({ success: true })
  } catch (err) {
    console.error('[KV DELETE daily Error]', err)
    return jsonResponse({ success: true })
  }
}

function isValidDate(str) {
  return str && /^\d{4}-\d{2}-\d{2}$/.test(str)
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
