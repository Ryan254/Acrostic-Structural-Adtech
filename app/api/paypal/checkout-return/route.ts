import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { paidAdvert } from '@/lib/db/schema'
import { getPayPalToken } from '@/lib/paypal'
import { headers } from 'next/headers'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.redirect(new URL('/sign-in?next=/campaigns', request.url))
  const params = new URL(request.url).searchParams
  const orderId = params.get('token')
  if (!orderId) return NextResponse.redirect(new URL('/?paypal=missing-order', request.url))

  const token = await getPayPalToken()
  const response = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  })
  let data = await response.json()
  if (!response.ok || data.status !== 'COMPLETED') {
    const orderResponse = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${encodeURIComponent(orderId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const orderData = await orderResponse.json().catch(() => ({}))
    if (!orderResponse.ok || orderData.status !== 'COMPLETED') return NextResponse.redirect(new URL('/?paypal=payment-failed', request.url))
    data = orderData
  }

  const purchaseUnit = data.purchase_units?.[0]
  const keyword = params.get('keyword')?.replace(/[^A-Za-z]/g, '').toUpperCase() ?? purchaseUnit?.payments?.captures?.[0]?.custom_id ?? purchaseUnit?.custom_id ?? 'PAYPAL'
  const description = purchaseUnit?.description ?? 'PayPal contextual placement'
  const brandName = params.get('brand')?.trim() || description.replace(/ contextual placement$/, '')
  const existing = await db.select({ id: paidAdvert.id }).from(paidAdvert).where(eq(paidAdvert.paypalOrderId, orderId)).limit(1)
  if (existing.length === 0) {
    await db.insert(paidAdvert).values({ id: crypto.randomUUID(), userId: session.user.id, brandName, keyword, paypalOrderId: orderId, status: 'paid' })
  }
  const destination = new URL('/?paypal=paid', request.url)
  destination.searchParams.set('brand', brandName)
  destination.searchParams.set('keyword', keyword)
  destination.searchParams.set('view', params.get('view') || 'publisher')
  return NextResponse.redirect(destination)
}
