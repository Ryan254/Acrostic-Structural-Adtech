import { NextResponse } from 'next/server'

export async function GET() {
  const email = process.env.PAYPAL_SANDBOX_BUYER_EMAIL
  if (!email) return NextResponse.json({ available: false })
  return NextResponse.json({ available: true, email })
}
