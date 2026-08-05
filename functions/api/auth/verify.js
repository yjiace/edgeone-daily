/**
 * POST /api/auth/verify
 * 验证密码
 * Body: { password: string }
 * 返回 { ok: boolean, message?: string }
 */
export async function onRequestPost(context) {
  const { request, env } = context

  // 如果没有配置密码，直接通过
  if (!env.AUTH_PASSWORD) {
    return jsonResponse({ ok: true })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ ok: false, message: '请求格式错误' }, 400)
  }

  const { password } = body || {}
  if (!password) {
    return jsonResponse({ ok: false, message: '请输入密码' }, 400)
  }

  if (password === env.AUTH_PASSWORD) {
    return jsonResponse({ ok: true })
  }

  return jsonResponse({ ok: false, message: '密码错误，请重试' }, 401)
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
