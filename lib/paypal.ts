import 'server-only'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const PAYPAL_SANDBOX_API = 'https://api-m.sandbox.paypal.com'
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? process.env.secret ?? ''

let cachedToken: { value: string; expiresAt: number } | undefined

export async function getOrigin() {
  if (process.env.NODE_ENV !== 'production' && process.env.V0_RUNTIME_URL) return process.env.V0_RUNTIME_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  const requestHeaders = await headers()
  return `${requestHeaders.get('x-forwarded-proto') ?? 'https'}://${requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')}`
}

export async function getCurrentUser() {
  return auth.api.getSession({ headers: await headers() })
}

export async function getPayPalToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET ?? process.env.secret_2
  if (!PAYPAL_CLIENT_ID || !clientSecret) throw new Error('PayPal Sandbox credentials are not configured')
  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${clientSecret}`).toString('base64')
  const response = await fetch(`${PAYPAL_SANDBOX_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('PayPal Sandbox authentication failed')
  const data = await response.json() as { access_token: string; expires_in: number }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return data.access_token
}

export { PAYPAL_SANDBOX_API }
