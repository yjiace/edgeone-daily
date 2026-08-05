/**
 * EdgeOne Pages Functions — 全局中间件
 * 统一处理 CORS 和错误
 */
export async function onRequest(context) {
  const { request, next } = context

  // OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders()
    })
  }

  try {
    const response = await next()
    // 为所有 /api/* 响应添加 CORS 头
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      return addCorsHeaders(response)
    }
    return response
  } catch (err) {
    console.error('[Middleware Error]', err)
    return jsonResponse({ message: err.message || 'Internal Server Error' }, 500)
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
}

function addCorsHeaders(response) {
  const headers = new Headers(response.headers)
  Object.entries(corsHeaders()).forEach(([k, v]) => headers.set(k, v))
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  })
}
