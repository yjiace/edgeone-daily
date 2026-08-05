/**
 * POST /api/monthly/generate
 * AI 月报生成（Streaming SSE）
 * Body: { month: 'YYYY-MM' }
 */
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
    return jsonResponse({ message: 'Invalid month format' }, 400)
  }

  const apiKey = env.OPENAI_API_KEY || env.MAKERS_MODELS_KEY
  if (!apiKey) {
    return jsonResponse({ message: 'OPENAI_API_KEY or MAKERS_MODELS_KEY not configured' }, 500)
  }

  // 默认使用 EdgeOne AI Gateway 地址与默认模型，允许通过环境变量覆盖
  const baseUrl = (env.OPENAI_BASE_URL || 'https://ai-gateway.edgeone.link/v1').replace(/\/+$/, '')
  const modelName = env.OPENAI_MODEL || '@makers/deepseek-v4-flash'

  const kv = env.DAILY_KV

  // 读取该月全部日报
  const prefix = `daily:${month}-`
  let keys = []
  let cursor = undefined
  do {
    const result = await kv.list({ prefix, limit: 256, cursor })
    keys = keys.concat(result.keys || [])
    cursor = result.complete ? undefined : result.cursor
  } while (cursor)

  if (keys.length === 0) {
    return jsonResponse({ message: 'No daily records found for this month' }, 404)
  }

  // 读取全部日报内容
  const dailyContents = await Promise.all(
    keys.map(async (k) => {
      const raw = await kv.get(k.name)
      if (!raw) return null
      const record = JSON.parse(raw)
      // 优先使用润色版，没有则用原文
      const content = record.polished || record.raw || ''
      return `【${record.date}】${record.title ? record.title + '：' : ''}${content}`
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

  ;(async () => {
    try {
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
        const err = await res.json()
        await writeSSE(writer, encoder, { type: 'error', message: err.error?.message || 'OpenAI API error' })
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
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
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
      await writeSSE(writer, encoder, { type: 'error', message: err.message })
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
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
