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

【第一步：按功能模块聚合，禁止拆散】（最重要，必须优先执行）
1. 先通读全部日报，识别出本月涉及的"业务/功能模块"（例如：批量推送统计模块、备付金管理模块、统采物料模块、资金预算模块等），而不是按"开发、测试、修复"这种动作类型来切分。
2. 同一个功能模块下的所有相关工作内容——无论是该模块的前后端开发、该模块的Bug修复、该模块的数据容错优化、该模块的联调测试——都必须合并进【同一条任务行】，禁止把同一模块的开发和修复/测试拆成两条独立的任务。
3. 只有当某类工作确实不属于任何具体业务模块、且体量较大时（例如跨模块的统一需求梳理、跨模块的统一联调上线支持），才可以单独归为一条"综合类"任务行。

【第二步：plan 字段必须是具体工作项的编号列表，禁止写成一个笼统的模块名称】（关键要求，务必遵守）
1. plan（计划工作内容/指标）字段不能只写一句抽象的概括性标题（如"核心业务功能开发与系统改造"），而必须把该任务行下合并进来的每一个具体工作事项，逐条编号列出。
2. 格式固定为："1、xxx；2、xxx；3、xxx；..."，每条对应日报中一个具体的、可核实的工作内容（如某个统计功能、某个报表、某个字段、某个接口），条目文字应贴近日报原文的具体表述，不要用抽象词汇代替。
3. 一条任务行下的 plan 编号条目数量不限，只要是同一模块下识别出的具体工作项都应全部列出，不能遗漏，也不能为了简洁而合并成一句话。
4. target（目标结果/指标描述）字段则用一句连贯的话描述这些具体工作项完成后达成的整体目标结果，可以概括性地提及涵盖了 plan 中的哪些内容，但不需要再逐条编号。

【全栈开发人员的权重分配原则】
1. 核心倾斜项（高权重，合计占比 60% ~ 80%）：
   - 各业务模块的前后端核心功能开发、系统架构改造
   - 各业务模块的线上 Bug 紧急修复、日常维护与代码重构
   - 各业务模块的数据库字段维护、SQL/表结构优化、数据清洗与容错增强
   （以上三类只要属于同一模块，一律合并进该模块所在的那一条任务行）
2. 辅助倾斜项（低权重，合计占比 20% ~ 40%）：
   - 不属于具体模块的通用需求整理、技术评审与方案设计
   - 不属于具体模块的通用联调测试、Bug 验证与上线说明

【输出要求】（严格遵守）
1. 任务条数：归纳出的工作任务必须大于等于 2 条（通常在 2 到 5 条之间），绝不能少于 2 条；条数应等于"识别出的功能模块数 + 必要的综合类任务数"，不得为了凑数把同一模块拆成多条。
2. plan（计划工作内容/指标）：严格按【第二步】的编号列表格式输出，每条为该模块下的一个具体工作事项。
3. target（目标结果/指标描述）：用一句连贯的话描述整体目标结果，不编号。
4. 权重 (weight)：必须为整数（表示百分比），所有任务行的 weight 之和必须精准等于 100。模块类任务权重通常在 30%-50%，综合类（需求/测试）任务权重通常在 10%-20%。
5. 对应分数与考核评分标准 (standard)：
   - 权重多少，该任务的总满分就是多少（例如 weight 为 40，该任务总分即为 40 分）。
   - standard 字段必须严格写明总分及细分项评分标准，细分项应对应 plan 中列出的具体工作项的合理归类（例如按"开发类"和"验证/上线类"归为两类打分），而不是另起一条新任务，格式参考：
     "该计划总分40分。完成以下指标得相应的分数 1、完成前后端开发：25分 2、完成缺陷修复与联调：15分"
6. 自评得分 (score)：
   - 每行的 score 为整数，不得超过该行的 weight 满分。
   - 所有任务行的 score (自评得分) 之和必须大于 90 分（通常在 92 到 98 分之间）。
7. 完成情况评价 (completion)：书面正规，如 "已完成开发和测试" 或 "已按期上线交付"。
8. 严格输出合法 JSON 数组，绝不要包含 markdown 代码块包裹，绝不要有多余文字。

输出示例（严格遵守格式，注意 plan 字段是逐条编号的具体事项，而不是笼统标题）：
[
  {
    "plan": "1、完成批量推送统计；2、备付金展期；3、统采物料对比表；4、资金预算完成情况表及填报",
    "target": "完成上述前后端功能开发，并配合完成相关联调测试与功能自测",
    "weight": 40,
    "standard": "该计划总分40分。完成以下指标得相应的分数 1、完成前后端开发：30分 2、完成功能自测：10分",
    "completion": "已完成核心功能开发与自测",
    "score": 38
  },
  {
    "plan": "1、修复推送统计异常；2、备付金到期时间/利息精度问题；3、资金预算数据库异常；4、旧版明细为空等生产问题",
    "target": "修复上述线上生产问题，并优化相关数据容错逻辑",
    "weight": 35,
    "standard": "该计划总分35分。完成以下指标得相应的分数 1、完成问题定位与修复：25分 2、完成数据正确性校验与容错优化：10分",
    "completion": "已完成生产问题修复与数据优化",
    "score": 33
  },
  {
    "plan": "1、统采物料需求梳理；2、资金预算填报需求梳理；3、解付接口需求梳理",
    "target": "完成上述需求梳理与方案评估，产出接口文档与关联分析",
    "weight": 15,
    "standard": "该计划总分15分。完成以下指标得相应的分数 1、完成需求梳理与方案评估：10分 2、完成接口文档与SQL支撑：5分",
    "completion": "已完成需求梳理与接口文档",
    "score": 14
  },
  {
    "plan": "1、联调测试支持；2、生产上线配置",
    "target": "配合测试修复缺陷，完成相关功能自测与生产上线配置",
    "weight": 10,
    "standard": "该计划总分10分。完成以下指标得相应的分数 1、完成测试支持与缺陷修复：5分 2、完成上线部署与配置：5分",
    "completion": "已完成测试支持与上线部署",
    "score": 10
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
          } catch { }
        }
      }

      // 多层强力 JSON 数组解析器（应对缺失末尾 ] 或带有 markdown 标记）
      let result = null

      // 1. 经典 [ ... ] 匹配
      try {
        const jsonMatch = fullText.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0])
        }
      } catch { }

      // 2. 补全末尾 ] 解析
      if (!Array.isArray(result) || result.length === 0) {
        try {
          const startIdx = fullText.indexOf('[')
          if (startIdx !== -1) {
            let subStr = fullText.slice(startIdx).trim()
            subStr = subStr.replace(/```json|```/g, '').trim()
            if (!subStr.endsWith(']')) {
              subStr = subStr.replace(/,\s*$/, '') + '\n]'
            }
            result = JSON.parse(subStr)
          }
        } catch { }
      }

      // 3. 终极容错：按对象级别正则 { ... } 逐个抓取并提取
      if (!Array.isArray(result) || result.length === 0) {
        const objectMatches = fullText.match(/\{[\s\S]*?\}/g)
        if (objectMatches && objectMatches.length > 0) {
          const extractedRows = []
          for (const objStr of objectMatches) {
            try {
              const item = JSON.parse(objStr)
              if (item && (item.plan || item.target || item.weight)) {
                extractedRows.push(item)
              }
            } catch { }
          }
          if (extractedRows.length > 0) {
            result = extractedRows
          }
        }
      }

      // 校验、格式化并进行得分强制校准（确保 AI 生成得分且总分 > 90 分）
      if (Array.isArray(result) && result.length > 0) {
        let cleanRows = result.map((r) => {
          const w = Math.max(1, Number(r.weight) || 30)
          // 优先使用 AI 生成的 score，如果没有或非法则默认为近乎满分 (w - 2)
          const rawScore = (r.score !== undefined && r.score !== null && !isNaN(Number(r.score))) ? Number(r.score) : Math.max(1, w - 2)
          const s = Math.min(w, Math.max(0, rawScore))
          return {
            plan: String(r.plan || r.title || '重点工作事项').trim(),
            target: String(r.target || '完成相关业务目标').trim(),
            weight: w,
            standard: String(r.standard || `该计划总分${w}分。完成相关指标得相应分数`).trim(),
            completion: String(r.completion || '已按期完成开发与验证').trim(),
            score: s
          }
        })

        // 校准检测：确保自评总得分精准在 91 ~ 100 分之间
        let currentTotalScore = cleanRows.reduce((sum, item) => sum + item.score, 0)
        if (currentTotalScore <= 90) {
          // 如果得分总和小于等于 90，优先将各行的 score 提高至该行 weight 满分
          for (const item of cleanRows) {
            if (currentTotalScore > 90) break
            const room = item.weight - item.score
            if (room > 0) {
              const boost = Math.min(room, 93 - currentTotalScore)
              item.score += boost
              currentTotalScore += boost
            }
          }
          // 兜底：若提升后仍低于等于 90，直接将全部任务的 score 置为权重满分
          if (currentTotalScore <= 90) {
            cleanRows.forEach(item => { item.score = item.weight })
          }
        }

        await writeSSE(writer, encoder, { type: 'done', result: cleanRows })
      } else {
        await writeSSE(writer, encoder, {
          type: 'error',
          message: '月报生成结果解析失败，请重试'
        })
      }
    } catch (err) {
      await writeSSE(writer, encoder, { type: 'error', message: err.message || 'Stream processing failed' })
    } finally {
      await writer.close().catch(() => { })
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
