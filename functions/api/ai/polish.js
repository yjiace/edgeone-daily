/**
 * POST /api/ai/polish
 * AI 日报润色（Streaming SSE）
 * Body: { rawText: string }
 * Response: SSE stream
 *   data: {"type":"chunk","text":"..."}
 *   data: {"type":"done","result":{"title":"...","content":"..."}}
 *   data: {"type":"error","message":"..."}
 */
export async function onRequestPost(context) {
  const { request, env } = context

  let rawText
  try {
    const body = await request.json()
    rawText = body.rawText
  } catch {
    return jsonResponse({ message: 'Invalid request body' }, 400)
  }

  if (!rawText || !rawText.trim()) {
    return jsonResponse({ message: 'rawText is required' }, 400)
  }

  // EdgeOne Pages Functions 的 context.env 或兼容 process.env / 全局变量
  const envVars = env || (typeof process !== 'undefined' ? process.env : {})
  const apiKey = envVars.MAKERS_MODELS_KEY || envVars.OPENAI_API_KEY || (typeof process !== 'undefined' ? process.env?.MAKERS_MODELS_KEY || process.env?.OPENAI_API_KEY : undefined)
  
  if (!apiKey) {
    return jsonResponse({ message: 'OPENAI_API_KEY or MAKERS_MODELS_KEY not configured' }, 500)
  }

  // 默认使用 EdgeOne AI Gateway 地址与默认模型，允许通过环境变量覆盖
  const baseUrl = (envVars.OPENAI_BASE_URL || (typeof process !== 'undefined' ? process.env?.OPENAI_BASE_URL : '') || 'https://ai-gateway.edgeone.link/v1').replace(/\/+$/, '')
  const modelName = envVars.OPENAI_MODEL || (typeof process !== 'undefined' ? process.env?.OPENAI_MODEL : '') || '@makers/deepseek-v4-flash'

  const systemPrompt = `你是一位专业的职场文案撰写助手。你的任务是将用户口语化的工作记录润色为正式、流畅的工作日报文案，并生成一个简洁的标题。

要求：
1. 保持原意，不添加用户未提及的工作内容。
2. 语言正式、书面化，适合工作日报。
3. 标题简洁，不超过20个字。
4. content 字段必须为 Markdown 格式，每一条具体工作事项单独成行，使用数字序号有序列表（如 \`1. 工作内容...\`、\`2. 工作内容...\`），条目之间必须有清晰换行（使用 \\n 分隔），方便排版与阅读。
5. 输出必须是合法的 JSON 格式，不要有多余的 Markdown 包裹说明（如不要在 JSON 外套 \`\`\`json ）。

输出格式（严格遵守）：
{"title": "标题文字", "content": "1. 完成工作项1\\n2. 完成工作项2\\n3. 完成工作项3"}`

  const userPrompt = `请润色以下工作记录：\n\n${rawText.trim()}`

  // 创建 SSE 流
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  // 异步调用 LLM API
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
          temperature: 0.7,
          max_tokens: 800
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

      // 解析最终 JSON 结果
      let result
      try {
        // 提取 JSON（可能包含 markdown 代码块）
        const jsonMatch = fullText.match(/\{[\s\S]*\}/)
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : null
      } catch {
        result = null
      }

      if (result && result.title && result.content) {
        await writeSSE(writer, encoder, { type: 'done', result })
      } else {
        // fallback：把整个输出当作 content
        await writeSSE(writer, encoder, {
          type: 'done',
          result: { title: '工作日报', content: fullText }
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
