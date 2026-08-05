/**
 * GET  /api/daily/:date  — 读取单条日报
 * PUT  /api/daily/:date  — 保存/更新日报
 * DELETE /api/daily/:date — 删除日报
 */

// GET
export async function onRequestGet(context) {
  const { params, env } = context
  const date = params.date

  if (!isValidDate(date)) return jsonResponse({ message: 'Invalid date format (YYYY-MM-DD required)' }, 400)

  try {
    const kv = env?.DAILY_KV
    if (!kv) {
      return jsonResponse({ message: 'Not found' }, 404)
    }
    const raw = await kv.get(`daily:${date}`)
    if (!raw) return jsonResponse({ message: 'Not found' }, 404)

    return jsonResponse(JSON.parse(raw))
  } catch (err) {
    console.error('[KV GET daily Error]', err)
    return jsonResponse({ message: 'Not found' }, 404)
  }
}

// PUT
export async function onRequestPut(context) {
  const { params, request, env } = context
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

  try {
    const kv = env?.DAILY_KV
    if (!kv) {
      return jsonResponse({ message: 'KV storage unavailable' }, 500)
    }
    await kv.put(`daily:${date}`, JSON.stringify(record))
    return jsonResponse({ success: true, record })
  } catch (err) {
    console.error('[KV PUT daily Error]', err)
    return jsonResponse({ message: 'Failed to save daily record' }, 500)
  }
}

// DELETE
export async function onRequestDelete(context) {
  const { params, env } = context
  const date = params.date

  if (!isValidDate(date)) return jsonResponse({ message: 'Invalid date format (YYYY-MM-DD required)' }, 400)

  try {
    const kv = env?.DAILY_KV
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
