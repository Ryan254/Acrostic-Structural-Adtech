import { NextResponse } from 'next/server'
import { getCurrentUser, getOrigin, getPayPalToken } from '@/lib/paypal'

const CATALOG = {
  PayPal: { name: 'PayPal contextual placement', value: '12.00' },
  PayLater: { name: 'PayLater contextual placement', value: '14.00' },
  Credit: { name: 'Credit contextual placement', value: '11.00' },
} as const

export async function POST(request: Request) {
  const session = await getCurrentUser()
  if (!session?.user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const requestedBrand = typeof body?.brand === 'string' ? body.brand.trim().slice(0, 80) : 'PayPal'
  const item = CATALOG[requestedBrand as keyof typeof CATALOG] ?? { name: `${requestedBrand || 'Partner'} contextual placement`, value: '16.00' }
  const keyword = typeof body?.keyword === 'string' ? body.keyword.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 20) : 'PAYPAL'
  const returnView = body?.view === 'chat' || body?.view === 'campaigns' || body?.view === 'about' ? body.view : 'publisher'
  const token = await getPayPalToken()
  const origin = await getOrigin()
  const returnUrl = new URL('/api/paypal/checkout-return', origin)
  returnUrl.searchParams.set('brand', requestedBrand)
  returnUrl.searchParams.set('keyword', keyword)
  returnUrl.searchParams.set('view', returnView)
  const cancelUrl = new URL('/', origin)
  cancelUrl.searchParams.set('paypal', 'cancelled')
  cancelUrl.searchParams.set('view', returnView)

  const response = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': crypto.randomUUID() },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ custom_id: keyword, description: item.name, amount: { currency_code: 'USD', value: item.value } }],
      application_context: { user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING', return_url: returnUrl.toString(), cancel_url: cancelUrl.toString() },
    }),
  })

  const data = await response.json()
  if (!response.ok) return NextResponse.json({ error: 'PayPal could not create the checkout.' }, { status: response.status })
  const approval = data.links?.find((link: { rel?: string }) => link.rel === 'approve')?.href
  const approvalUrl = approval ? `${approval}${approval.includes('?') ? '&' : '?'}prompt=login` : undefined
  return NextResponse.json({ id: data.id, approvalUrl })
}
