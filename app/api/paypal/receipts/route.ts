import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { paypalReceipt } from '@/lib/db/schema'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ receipts: [] }, { status: 401 })

  const receipts = await db
    .select({
      id: paypalReceipt.id,
      paypalOrderId: paypalReceipt.paypalOrderId,
      brandName: paypalReceipt.brandName,
      keyword: paypalReceipt.keyword,
      amount: paypalReceipt.amount,
      subtotal: paypalReceipt.subtotal,
      tax: paypalReceipt.tax,
      currency: paypalReceipt.currency,
      status: paypalReceipt.status,
      payerEmail: paypalReceipt.payerEmail,
      createdAt: paypalReceipt.createdAt,
    })
    .from(paypalReceipt)
    .where(and(eq(paypalReceipt.userId, session.user.id), eq(paypalReceipt.status, 'COMPLETED')))
    .orderBy(desc(paypalReceipt.createdAt))
    .limit(20)

  return NextResponse.json({ receipts })
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const receiptId = typeof body?.id === 'string' ? body.id : ''
  if (!receiptId) return NextResponse.json({ error: 'Receipt id is required' }, { status: 400 })

  await db.delete(paypalReceipt).where(and(eq(paypalReceipt.id, receiptId), eq(paypalReceipt.userId, session.user.id)))
  return NextResponse.json({ ok: true })
}
