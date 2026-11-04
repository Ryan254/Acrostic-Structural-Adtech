import { NextResponse } from 'next/server'
import { getCurrentUser, getPayPalToken } from '@/lib/paypal'

export async function GET() {
  const session = await getCurrentUser()
  if (!session?.user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  try {
    await getPayPalToken()
    return NextResponse.json({ connected: true, mode: 'sandbox' })
  } catch {
    return NextResponse.json({ error: 'PayPal Sandbox credentials are not valid.' }, { status: 502 })
  }
}
