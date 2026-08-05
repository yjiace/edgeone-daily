/**
 * GET /api/daily/list?month=YYYY-MM
 * 读取指定月份全部日报列表（轻量版，不含完整内容）
 */
function getKV(context) {
  const env = context?.env || {}
  if (env.DAILY_KV) return env.DAILY_KV
  if (env.DAILYKV) return env.DAILYKV
  if (typeof DAILY_KV !== 'undefined' && DAILY_KV) return DAILY_KV
  if (typeof globalThis !== 'undefined' && globalThis.DAILY_KV) return globalThis.DAILY_KV
  return null
}

export async function onRequestGet(context) {
  const { request } = context
  const url = new URL(request.url)
  const month = url.searchParams.get('month')

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return jsonResponse({ message: 'Invalid month format (YYYY-MM required)' }, 400)
  }

  try {
    const kv = getKV(context)
    if (!kv) return jsonResponse({ month, items: [] })

    const prefix = `daily:${month}-`

    // 按官方规范列举该月所有 key
    let keys = []
    let options = { prefix, limit: 256 }
    let result = null

    do {
      result = await kv.list(options)
      if (result && Array.isArray(result.keys)) {
        keys = keys.concat(result.keys)
      }
      if (result && result.complete === false && result.cursor) {
        options.cursor = result.cursor
      } else {
        break
      }
    } while (result && !result.complete)

    if (keys.length === 0) {
      return jsonResponse({ month, items: [] })
    }

    // 并发读取每条记录（优先使用 "json" 模式读取）
    const items = await Promise.all(
      keys.map(async (k) => {
        let record = null
        try {
          record = await kv.get(k.name, 'json')
        } catch {
          const raw = await kv.get(k.name)
          if (raw) record = typeof raw === 'string' ? JSON.parse(raw) : raw
        }
        if (!record) return null

        return {
          date: record.date,
          title: record.title || '',
          raw: record.raw || '',
          polished: record.polished ? record.polished.slice(0, 200) : '',
          updatedAt: record.updatedAt || null
        }
      })
    )

    return jsonResponse({
      month,
      items: items.filter(Boolean).sort((a, b) => a.date.localeCompare(b.date))
    })
  } catch (err) {
    console.error('[KV LIST daily Error]', err)
    return jsonResponse({ month, items: [] })
  }
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
