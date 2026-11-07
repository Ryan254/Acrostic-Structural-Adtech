import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const tier = body?.tier === 'impression' ? 'impression' : 'engagement'
  const amount = tier === 'impression' ? 0.4 : 4
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  const receiver = process.env.PAYPAL_SANDBOX_BUYER_EMAIL
  if (!clientId || !clientSecret || !receiver) return NextResponse.json({ error: 'PayPal Sandbox payout configuration is incomplete' }, { status: 503 })

  const tokenResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' })
  if (!tokenResponse.ok) return NextResponse.json({ error: 'PayPal authentication failed' }, { status: 502 })
  const token = (await tokenResponse.json()).access_token
  const payoutResponse = await fetch('https://api-m.sandbox.paypal.com/v1/payments/payouts', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ sender_batch_header: { sender_batch_id: `aye-${crypto.randomUUID()}`, email_subject: 'Acrostic Yield-Escrow Sandbox payout' }, items: [{ recipient_type: 'EMAIL', amount: { value: amount.toFixed(2), currency: 'USD' }, receiver, note: `AYE ${tier} settlement` }] }) })
  const result = await payoutResponse.json().catch(() => ({}))
  if (!payoutResponse.ok) return NextResponse.json({ error: 'PayPal payout failed', detail: result }, { status: 502 })
  return NextResponse.json({ ok: true, tier, amount, batchId: result.batch_header?.payout_batch_id ?? null })
}
