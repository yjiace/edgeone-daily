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
  const systemPrompt = `你是一位专业的高级 HR 与研发部门主管级工作报告整理助手。被考核人员是一名【全栈开发人员】。
你的任务是根据该全栈开发人员当月的工作日报，整理归纳出规范的《月度工作计划与考核表》。

全栈开发人员的权重分配原则（重要）：
1. 核心倾斜项（高权重，合计占比 60% ~ 80%）：
   - 前后端核心功能与业务逻辑开发、系统架构改造
   - 线上 Bug 紧急修复、系统日常功能维护与代码重构
   - 数据库字段维护、SQL/表结构优化、数据清洗与容错增强
2. 辅助倾斜项（低权重，合计占比 20% ~ 40%）：
   - 需求整理、技术评审与方案设计
   - 联调测试、Bug 验证与上线说明

输出要求（严格遵守）：
1. 任务条数：归纳出的工作任务必须大于等于 2 条（通常在 2 到 5 条之间），绝不能少于 2 条。
2. 权重 (weight)：必须为整数（表示百分比），所有任务行的 weight 之和必须精准等于 100。高权重的开发/修复/维护类任务权重通常在 30%-50%，低权重的需求/测试类任务权重通常在 10%-20%。
3. 对应分数与考核评分标准 (standard)：
   - 权重多少，该任务的总满分就是多少（例如 weight 为 40，该任务总分即为 40 分；weight 为 30，总分即为 30 分）。
   - standard 字段必须严格写明总分及详细细分项评分标准，格式参考：
     "该计划总分40分。完成以下指标得相应的分数 1、完成开发：20分 2、完成测试：20分"
4. 自评得分 (score)：
   - 每行的 score 为整数，不得超过该行的 weight 满分（例如 weight 为 30，score 必须在 25 到 30 之间）。
   - 所有任务行的 score (自评得分) 之和必须大于 90 分（通常在 92 到 98 分之间）。
5. 完成情况评价 (completion)：书面正规，如 "已完成开发和测试" 或 "已按期上线交付"。
6. 严格输出合法 JSON 数组，绝不要包含 markdown 代码块包裹，绝不要有多余文字。

输出示例（严格遵守格式）：
[
  {
    "plan": "审批与业务核心功能开发",
    "target": "根据需求改造前后端功能完成",
    "weight": 40,
    "standard": "该计划总分40分。完成以下指标得相应的分数 1、完成开发：20分 2、完成测试：20分",
    "completion": "已完成开发和测试",
    "score": 38
  },
  {
    "plan": "数据库架构维护与容错优化",
    "target": "审核数据库字段、修改数据正确性，优化展期时间容错性",
    "weight": 35,
    "standard": "该计划总分35分。完成以下指标得相应的分数 1、完成数据审核：20分 2、完成容错优化：15分",
    "completion": "已完成数据审核与优化",
    "score": 32
  },
  {
    "plan": "需求评审与联调测试",
    "target": "完成技术方案评审，协助测试缺陷修复",
    "weight": 25,
    "standard": "该计划总分25分。完成以下指标得相应的分数 1、完成需求评审：15分 2、完成联调：10分",
    "completion": "已完成评审与联调",
    "score": 25
  }
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
