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

  let rawText, date
  try {
    const body = await request.json()
    rawText = body.rawText
    date = body.date
  } catch {
    return jsonResponse({ message: 'Invalid request body' }, 400)
  }

  if (!rawText || !rawText.trim()) {
    return jsonResponse({ message: 'rawText is required' }, 400)
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

  const systemPrompt = `你是一位专业的职场文案撰写助手。你的任务是将用户口语化的工作记录润色为正式、流畅的工作日报文案，并生成一个简洁的标题。

要求：
1. 保持原意，不添加用户未提及的工作内容。
2. 语言正式、书面化，适合工作日报。
3. 必须在第一行输出 \`# 标题：\` 加上生成的简洁标题（标题不超过20个字）。
4. 标题后空一行，随后输出正文内容。正文必须为 Markdown 格式，每一条具体工作事项单独成行，使用数字序号有序列表（如 \`1. 工作内容...\`、\`2. 工作内容...\`），条目之间必须有清晰换行，方便排版与阅读。
5. 绝对不要输出 JSON 格式，绝对不要套用 \`\`\`json 代码块。`

  const userPrompt = `请润色以下工作记录：\n\n${rawText.trim()}`

  // 创建 TransformStream SSE 流
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  const streamTask = async () => {
    try {
      // 0.01s 内发送初始化空包，破解 CDN / 边缘缓冲与客户端 Pending 卡死
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
          temperature: 0.7,
          max_tokens: 1600
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

      // 解析生成结果（智能拆分 Markdown 标题与正文）
      let title = '工作日报'
      let content = fullText.trim()

      if (content) {
        const titleMatch = content.match(/^(?:#\s*标题[：:]?\s*|#\s*)([^\n]+)/m)
        if (titleMatch) {
          title = titleMatch[1].replace(/^标题[：:]?\s*/, '').trim()
          content = content.replace(/^(?:#\s*标题[：:]?\s*|#\s*)[^\n]+\n*/, '').trim()
        } else {
          const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
          if (lines.length > 1 && lines[0].length <= 30 && !/^\d+\./.test(lines[0])) {
            title = lines[0]
            content = lines.slice(1).join('\n').trim()
          }
        }
      }

      let savedAt = null
      if (date) {
        try {
          const record = {
            date,
            raw: rawText,
            title: title || '工作日报',
            polished: content || fullText,
            updatedAt: new Date().toISOString()
          }
          const kv = getKV(context)
          if (kv) {
            await kv.put(`daily:${date}`, JSON.stringify(record))
            savedAt = record.updatedAt
          }
        } catch (err) {
          console.error('[AI Auto Save KV Error]', err)
        }
      }

      await writeSSE(writer, encoder, {
        type: 'done',
        result: { title: title || '工作日报', content: content || fullText, savedAt }
      })
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

// 兼容多路径获取 EdgeOne Pages Functions 的 KV 实例
function getKV(context) {
  const env = context?.env || {}
  if (env.DAILY_KV) return env.DAILY_KV
  if (env.DAILYKV) return env.DAILYKV
  if (typeof DAILY_KV !== 'undefined' && DAILY_KV) return DAILY_KV
  if (typeof globalThis !== 'undefined' && globalThis.DAILY_KV) return globalThis.DAILY_KV
  return null
}
