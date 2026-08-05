/**
 * GET /api/daily/list?month=YYYY-MM
 * 读取指定月份全部日报列表（轻量版，不含完整内容）
 */
export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const month = url.searchParams.get('month')

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return jsonResponse({ message: 'Invalid month format (YYYY-MM required)' }, 400)
  }

  const kv = env.DAILY_KV
  const prefix = `daily:${month}-`

  // 按前缀列举该月所有 key
  let keys = []
  let cursor = undefined
  do {
    const result = await kv.list({ prefix, limit: 256, cursor })
    keys = keys.concat(result.keys || [])
    cursor = result.complete ? undefined : result.cursor
  } while (cursor)

  if (keys.length === 0) {
    return jsonResponse({ month, items: [] })
  }

  // 并发读取每条记录
  const items = await Promise.all(
    keys.map(async (k) => {
      const raw = await kv.get(k.name)
      if (!raw) return null
      const record = JSON.parse(raw)
      // 列表只返回摘要（不含完整润色文案和原文，节省传输量）
      return {
        date: record.date,
        title: record.title || '',
        raw: record.raw || '',
        polished: record.polished ? record.polished.slice(0, 200) : '', // 只返回前200字用于预览
        updatedAt: record.updatedAt || null
      }
    })
  )

  return jsonResponse({
    month,
    items: items.filter(Boolean).sort((a, b) => a.date.localeCompare(b.date))
  })
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
