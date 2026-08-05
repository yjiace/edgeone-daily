/**
 * GET /api/auth/check
 * 检查是否启用了密码鉴权
 * 返回 { required: boolean }
 */
export async function onRequestGet(context) {
  const { env } = context
  const required = Boolean(env.AUTH_PASSWORD)
  return new Response(JSON.stringify({ required }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}
