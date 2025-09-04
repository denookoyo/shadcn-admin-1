import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../_lib/prisma'
import { getUserFromRequest } from '../_lib/jwt'

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const sp = req.nextUrl.searchParams
    const sess = getUserFromRequest(req)
    const ownerId = sp.get('ownerId') ? Number(sp.get('ownerId')) : (sess?.uid ? Number(sess.uid) : NaN)
    if (!Number.isFinite(ownerId)) return NextResponse.json({ error: 'ownerId required' }, { status: 400 })
    const orders = await prisma.order.findMany({ where: { buyerId: ownerId }, orderBy: { createdAt: 'desc' }, include: { items: { include: { product: true } } } })
    return NextResponse.json(orders)
  } catch (e: any) {
    console.error('GET /api/orders error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}
