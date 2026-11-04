import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { paidAdvert } from '@/lib/db/schema'
import { headers } from 'next/headers'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ paid: false }, { status: 401 })
  const brand = new URL(request.url).searchParams.get('brand')?.trim()
  if (!brand) {
    const paidRows = await db.select({ brandName: paidAdvert.brandName }).from(paidAdvert).where(and(eq(paidAdvert.userId, session.user.id), eq(paidAdvert.status, 'paid')))
    return NextResponse.json({ paidBrands: [...new Set(paidRows.map((row) => row.brandName))] })
  }

  const exact = await db.select({ id: paidAdvert.id, brandName: paidAdvert.brandName }).from(paidAdvert).where(and(eq(paidAdvert.userId, session.user.id), eq(paidAdvert.brandName, brand), eq(paidAdvert.status, 'paid'))).limit(1)
  if (exact.length > 0) return NextResponse.json({ paid: true, brand: exact[0].brandName })

  return NextResponse.json({ paid: false, brand })
}
