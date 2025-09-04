import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../../../../server/prisma.js'
import { getUserFromRequest } from '../../../../_lib/jwt'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prisma = getPrisma()
    const sess = getUserFromRequest(req)
    const buyerId = sess?.uid ? Number(sess.uid) : NaN
    if (!Number.isFinite(buyerId)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = String(params.id)
    const { date } = await req.json()
    if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })
    const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } })
    if (!order || order.buyerId !== buyerId) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    const serviceItemIds = order.items.filter((it: any) => it.product?.type === 'service').map((it: any) => it.id)
    await prisma.orderItem.updateMany({ where: { id: { in: serviceItemIds } }, data: { appointmentAt: new Date(date), appointmentStatus: 'scheduled', appointmentAlternates: null } })
    const updated = await prisma.order.update({ where: { id }, data: { status: 'scheduled' } })
    return NextResponse.json(updated)
  } catch (e: any) {
    console.error('POST /api/orders/:id/appointment/accept error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

