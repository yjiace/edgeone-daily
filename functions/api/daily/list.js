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

// 兼容 key 列表项为 string、{ name: string } 或 { key: string } 的多种结构
function getKeyName(k) {
  if (typeof k === 'string') return k
  if (!k) return ''
  return k.name || k.key || k.id || String(k)
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

    const targetPrefix = `daily:${month}`

    // 1. 尝试带 prefix 的检索
    let rawKeys = []
    let options = { prefix: targetPrefix, limit: 256 }
    let result = null

    try {
      do {
        result = await kv.list(options)
        if (result && Array.isArray(result.keys)) {
          rawKeys = rawKeys.concat(result.keys)
        }
        if (result && result.complete === false && result.cursor) {
          options.cursor = result.cursor
        } else {
          break
        }
      } while (result && !result.complete)
    } catch (e) {
      console.warn('[KV List Prefix Exception]', e)
    }

    // 2. 如果带 prefix 未查到结果，尝试无 prefix 全量检索作为强力降级
    if (rawKeys.length === 0) {
      try {
        let fallbackResult = await kv.list({ limit: 256 })
        if (fallbackResult && Array.isArray(fallbackResult.keys)) {
          rawKeys = fallbackResult.keys
        }
      } catch (e) {
        console.warn('[KV List Fallback Exception]', e)
      }
    }

    // 提取 keyName 并过滤出匹配当月的 key
    const validKeyNames = Array.from(new Set(
      rawKeys
        .map(getKeyName)
        .filter(name => name && name.startsWith(`daily:${month}`))
    ))

    if (validKeyNames.length === 0) {
      return jsonResponse({ month, items: [] })
    }

    // 并发读取每条记录（支持 json 模式与 string 模式解析）
    const items = await Promise.all(
      validKeyNames.map(async (keyName) => {
        let record = null
        try {
          record = await kv.get(keyName, 'json')
        } catch {
          const raw = await kv.get(keyName)
          if (raw) record = typeof raw === 'string' ? JSON.parse(raw) : raw
        }
        if (!record) return null

        return {
          date: record.date || keyName.replace(/^daily:/, ''),
          title: record.title || '',
          raw: record.raw || '',
          polished: record.polished || '',
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
