import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'

const http = httpRouter()

http.route({
  path: '/clover/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLOVER_WEBHOOK_SECRET
    if (!secret) return new Response('Webhook is not configured.', { status: 503 })
    const rawBody = await request.text()
    const signature = request.headers.get('Clover-Signature') || ''
    if (!(await validSignature(signature, rawBody, secret))) return new Response('Invalid signature.', { status: 401 })

    let payload: Record<string, unknown>
    try { payload = JSON.parse(rawBody) as Record<string, unknown> } catch { return new Response('Invalid JSON.', { status: 400 }) }
    const merchantId = stringField(payload, 'merchantId', 'MerchantId')
    if (!merchantId || merchantId !== process.env.CLOVER_MERCHANT_ID) return new Response('Wrong merchant.', { status: 403 })
    const type = stringField(payload, 'type', 'Type').toUpperCase()
    if (type !== 'PAYMENT') return new Response('Ignored.', { status: 202 })
    const status = stringField(payload, 'status', 'Status').toUpperCase()
    if (!['APPROVED', 'DECLINED'].includes(status)) return new Response('Ignored.', { status: 202 })
    const checkoutSessionId = checkoutId(payload)
    if (!checkoutSessionId) return new Response('Missing checkout session.', { status: 400 })
    const paymentId = stringField(payload, 'id', 'Id')
    const result = await ctx.runMutation(internal.clover.recordWebhookPayment, {
      checkoutSessionId, paymentId, approved: status === 'APPROVED'
    })
    return Response.json(result, { status: result.found ? 200 : 202 })
  })
})

async function validSignature(header: string, body: string, secret: string) {
  const fields = Object.fromEntries(header.split(',').map(part => part.trim().split('=', 2)))
  const timestamp = fields.t
  const supplied = fields.v1?.toLowerCase()
  if (!timestamp || !supplied || !/^\d+$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(supplied)) return false
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`))
  const expected = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
  let difference = expected.length ^ supplied.length
  for (let index = 0; index < expected.length; index++) difference |= expected.charCodeAt(index) ^ (supplied.charCodeAt(index) || 0)
  return difference === 0
}

function stringField(payload: Record<string, unknown>, ...names: string[]) {
  const value = names.map(name => payload[name]).find(candidate => typeof candidate === 'string')
  return typeof value === 'string' ? value : ''
}

function checkoutId(payload: Record<string, unknown>) {
  const direct = stringField(payload, 'data', 'Data', 'checkoutSessionId')
  if (direct) return direct
  const data = payload.data || payload.Data
  return data && typeof data === 'object' ? stringField(data as Record<string, unknown>, 'checkoutSessionId', 'id') : ''
}

export default http
