/**
 * GET /api/monthly/:month — 读取月报草稿
 * PUT /api/monthly/:month — 保存月报草稿
 */

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
  const month = params.month

  if (!isValidMonth(month)) return jsonResponse({ message: 'Invalid month format (YYYY-MM required)' }, 400)

  const emptyRecord = { month, rows: [], updatedAt: null, exists: false }

  try {
    const kv = getKV(context)
    if (!kv) return jsonResponse(emptyRecord)

    let data = null
    try {
      data = await kv.get(`monthly:${month}`, 'json')
    } catch {
      const raw = await kv.get(`monthly:${month}`)
      if (raw) data = typeof raw === 'string' ? JSON.parse(raw) : raw
    }

    if (!data) return jsonResponse(emptyRecord)
    return jsonResponse({ ...data, exists: true })
  } catch (err) {
    console.error('[KV GET monthly Error]', err)
    return jsonResponse(emptyRecord)
  }
}

// PUT
export async function onRequestPut(context) {
  const { params, request } = context
  const month = params.month

  if (!isValidMonth(month)) return jsonResponse({ message: 'Invalid month format (YYYY-MM required)' }, 400)

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ message: 'Invalid request body' }, 400)
  }

  const record = {
    month,
    rows: Array.isArray(body.rows) ? body.rows : [],
    updatedAt: new Date().toISOString()
  }

  try {
    const kv = getKV(context)
    if (kv) {
      await kv.put(`monthly:${month}`, JSON.stringify(record))
    }
    return jsonResponse({ success: true, record })
  } catch (err) {
    console.error('[KV PUT monthly Error]', err)
    return jsonResponse({ success: true, record })
  }
}

function isValidMonth(str) {
  return str && /^\d{4}-\d{2}$/.test(str)
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
