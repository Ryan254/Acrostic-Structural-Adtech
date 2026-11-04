import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.redirect(new URL('/?paypal=connected', process.env.V0_RUNTIME_URL ?? 'http://localhost:3000'))
}
