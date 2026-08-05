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
3. 必须在第一行输出 `# 标题：` 加上生成的简洁标题（标题不超过20个字）。
4. 标题后空一行，随后输出正文内容。正文必须为 Markdown 格式，每一条具体工作事项单独成行，使用数字序号有序列表（如 \`1. 工作内容...\`、\`2. 工作内容...\`），条目之间必须有清晰换行，方便排版与阅读。
5. 绝对不要输出 JSON 格式，绝对不要套用 \`\`\`json 代码块。`

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
          max_tokens: 1600
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

      // 解析生成结果（智能拆分 Markdown 标题与正文）
      let title = '工作日报'
      let content = fullText.trim()

      if (content) {
        // 匹配第一行 `# 标题：xxx` 或 `# xxx`
        const titleMatch = content.match(/^(?:#\s*标题[：:]?\s*|#\s*)([^\n]+)/m)
        if (titleMatch) {
          title = titleMatch[1].replace(/^标题[：:]?\s*/, '').trim()
          // 移除开头的标题行
          content = content.replace(/^(?:#\s*标题[：:]?\s*|#\s*)[^\n]+\n*/, '').trim()
        } else {
          // 如果没有带 # 的标题，提取第一行非空文本作为标题
          const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
          if (lines.length > 1 && lines[0].length <= 30 && !/^\d+\./.test(lines[0])) {
            title = lines[0]
            content = lines.slice(1).join('\n').trim()
          }
        }
      }

      await writeSSE(writer, encoder, {
        type: 'done',
        result: { title: title || '工作日报', content: content || fullText }
      })
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
