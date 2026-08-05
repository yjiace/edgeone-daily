/**
 * GET /api/monthly/:month — 读取月报草稿
 * PUT /api/monthly/:month — 保存月报草稿
 */

// GET
export async function onRequestGet(context) {
  const { params, env } = context
  const month = params.month

  if (!isValidMonth(month)) return jsonResponse({ message: 'Invalid month format (YYYY-MM required)' }, 400)

  const kv = env.DAILY_KV
  const raw = await kv.get(`monthly:${month}`)
  if (!raw) return jsonResponse({ message: 'Not found' }, 404)

  return jsonResponse(JSON.parse(raw))
}

// PUT
export async function onRequestPut(context) {
  const { params, request, env } = context
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

  const kv = env.DAILY_KV
  await kv.put(`monthly:${month}`, JSON.stringify(record))

  return jsonResponse({ success: true, record })
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
