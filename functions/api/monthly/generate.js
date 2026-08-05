/**
 * POST /api/monthly/generate
 * AI 月报生成（Streaming SSE）
 * Body: { month: 'YYYY-MM' }
 */
function getKV(context) {
  const env = context?.env || {}
  if (env.DAILY_KV) return env.DAILY_KV
  if (env.DAILYKV) return env.DAILYKV
  if (typeof DAILY_KV !== 'undefined' && DAILY_KV) return DAILY_KV
  if (typeof globalThis !== 'undefined' && globalThis.DAILY_KV) return globalThis.DAILY_KV
  return null
}

function getKeyName(k) {
  if (typeof k === 'string') return k
  if (!k) return ''
  return k.name || k.key || k.id || String(k)
}

export async function onRequestPost(context) {
  const { request, env } = context

  let month
  try {
    const body = await request.json()
    month = body.month
  } catch {
    return jsonResponse({ message: 'Invalid request body' }, 400)
  }

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return jsonResponse({ message: 'Invalid month format (YYYY-MM required)' }, 400)
  }

  // EdgeOne Pages Functions 的 context.env 或兼容 process.env / 全局变量
  const envVars = env || (typeof process !== 'undefined' ? process.env : {})
  const apiKey = envVars.MAKERS_MODELS_KEY || envVars.OPENAI_API_KEY || (typeof process !== 'undefined' ? (process.env?.MAKERS_MODELS_KEY || process.env?.OPENAI_API_KEY) : '')

  if (!apiKey) {
    return jsonResponse({
      message: '尚未配置 AI API Key。请在 EdgeOne Functions 函数设置中配置环境变量 MAKERS_MODELS_KEY 或 OPENAI_API_KEY。'
    }, 500)
  }

  // 默认使用 EdgeOne AI Gateway 地址与默认模型，允许通过环境变量覆盖
  const baseUrl = (envVars.OPENAI_BASE_URL || (typeof process !== 'undefined' ? process.env?.OPENAI_BASE_URL : '') || 'https://ai-gateway.edgeone.link/v1').replace(/\/+$/, '')
  const modelName = envVars.OPENAI_MODEL || (typeof process !== 'undefined' ? process.env?.OPENAI_MODEL : '') || '@makers/deepseek-v4-flash'

  const kv = getKV(context)
  if (!kv) {
    return jsonResponse({ message: 'KV storage unavailable' }, 500)
  }

  // 读取该月全部日报（兼容 string 与对象类型的 keyName 提取）
  const targetPrefix = `daily:${month}`
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
    console.warn('[KV List Prefix Exception in generate]', e)
  }

  // 降级全量无 prefix 扫描
  if (rawKeys.length === 0) {
    try {
      let fallbackResult = await kv.list({ limit: 256 })
      if (fallbackResult && Array.isArray(fallbackResult.keys)) {
        rawKeys = fallbackResult.keys
      }
    } catch (e) {
      console.warn('[KV List Fallback Exception in generate]', e)
    }
  }

  const validKeyNames = Array.from(new Set(
    rawKeys
      .map(getKeyName)
      .filter(name => name && name.startsWith(`daily:${month}`))
  ))

  if (validKeyNames.length === 0) {
    return jsonResponse({ message: 'No daily records found for this month' }, 404)
  }

  // 读取全部日报内容
  const dailyContents = await Promise.all(
    validKeyNames.map(async (keyName) => {
      let record = null
      try {
        record = await kv.get(keyName, 'json')
      } catch {
        const raw = await kv.get(keyName)
        if (raw) record = typeof raw === 'string' ? JSON.parse(raw) : raw
      }
      if (!record) return null

      // 优先使用润色版，没有则用原文
      const content = record.polished || record.raw || ''
      return `【${record.date || keyName.replace(/^daily:/, '')}】${record.title ? record.title + '：' : ''}${content}`
    })
  )

  const validContents = dailyContents.filter(Boolean).sort()
  const dailyText = validContents.join('\n\n')

  const [year, mon] = month.split('-')
  const systemPrompt = `你是一位专业的工作报告整理助手。你的任务是根据员工的工作日报，整理归纳出月度工作计划与考核表所需内容。

输出要求：
1. 按工作类型/项目归纳为多行（通常3-6行），每行对应一类工作
2. 每行包含6个字段：
   - plan：计划工作内容/指标（简洁描述工作类型）
   - target：目标结果/指标描述（预期产出或目标）
   - weight：权重（整数，代表该工作在当月所占比重，所有行的weight合计必须等于100）
   - standard：考核评分标准（如何判断完成质量）
   - completion：完成情况评价（实际完成情况的简要描述）
   - score：自我得分（0-100的整数）
3. 语言正式书面
4. 输出必须是合法 JSON 数组，不含其他内容

输出格式（严格遵守）：
[
  {"plan":"工作内容","target":"目标结果","weight":30,"standard":"评分标准","completion":"完成情况","score":90},
  ...
]`

  const userPrompt = `请根据以下${year}年${mon}月的工作日报，整理生成月度工作计划与考核表：\n\n${dailyText}`

  // 创建 SSE 流
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  const streamTask = async () => {
    try {
      // 发送初始化空 chunk 破除边缘 CDN Buffering 挂起
      await writeSSE(writer, encoder, { type: 'chunk', text: '' })

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.5,
          max_tokens: 2000
        })
      })

      if (!res.ok) {
        let errMsg = 'AI 服务响应异常'
        try {
          const err = await res.json()
          errMsg = err.error?.message || err.message || `HTTP ${res.status}`
        } catch {
          errMsg = `HTTP ${res.status} ${res.statusText}`
        }
        await writeSSE(writer, encoder, { type: 'error', message: errMsg })
        return
      }

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += dec.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content
            if (delta) {
              fullText += delta
              await writeSSE(writer, encoder, { type: 'chunk', text: delta })
            }
          } catch {}
        }
      }

      // 解析 JSON 数组结果
      let result
      try {
        const jsonMatch = fullText.match(/\[[\s\S]*\]/)
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : null
      } catch {
        result = null
      }

      if (Array.isArray(result) && result.length > 0) {
        await writeSSE(writer, encoder, { type: 'done', result })
      } else {
        await writeSSE(writer, encoder, {
          type: 'error',
          message: '月报生成结果格式异常，请重试'
        })
      }
    } catch (err) {
      await writeSSE(writer, encoder, { type: 'error', message: err.message || 'Stream processing failed' })
    } finally {
      await writer.close().catch(() => {})
    }
  }

  if (context.waitUntil) {
    context.waitUntil(streamTask())
  } else {
    streamTask()
  }

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    }
  })
}

async function writeSSE(writer, encoder, data) {
  await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
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
