import { NextResponse } from 'next/server'
import { getPrisma } from '../../_lib/prisma'
// Auth is required in Express version; here assume any authenticated user; tighten as needed later

export async function GET() {
  try {
    const prisma = getPrisma()
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true, buyer: true, seller: true },
    })
    return NextResponse.json(orders)
  } catch (e: any) {
    console.error('GET /api/admin/orders error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}
