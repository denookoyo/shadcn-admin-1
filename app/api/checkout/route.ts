import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../server/prisma.js'
import { getUserFromRequest } from '../_lib/jwt'

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const { items = [], customerName, customerEmail, address, customerPhone } = await req.json()
    const sess = getUserFromRequest(req)
    const uid = sess?.uid ? Number(sess.uid) : null
    const productIds = (items || []).map((i: any) => i.productId)
    const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, ownerId: true, type: true } })
    const productById = new Map(products.map((p: any) => [p.id, p]))
    const groups = new Map<any, any[]>()
    for (const i of items) {
      const ownerId = productById.get(i.productId)?.ownerId ?? null
      if (!groups.has(ownerId)) groups.set(ownerId, [])
      groups.get(ownerId)!.push(i)
    }
    const createdOrders: any[] = []
    for (const [ownerId, groupItems] of groups) {
      const groupTotal = groupItems.reduce((a: number, c: any) => a + (c.price || 0) * (c.quantity || 0), 0)
      const hasService = groupItems.some((gi: any) => productById.get(gi.productId)?.type === 'service')
      const order = await prisma.order.create({
        data: {
          buyerId: uid,
          sellerId: ownerId || null,
          total: groupTotal,
          status: hasService ? 'pending' : 'paid',
          customerName,
          customerEmail,
          address,
          customerPhone,
          accessCode: uid == null ? (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)) : null,
          items: { create: groupItems.map((i: any) => ({
            productId: i.productId,
            title: i.title,
            price: i.price,
            quantity: i.quantity,
            appointmentAt: productById.get(i.productId)?.type === 'service' && i.meta ? new Date(i.meta) : null,
            appointmentStatus: productById.get(i.productId)?.type === 'service' ? 'requested' : null,
          })) },
        },
        include: { items: true },
      })
      createdOrders.push(order)
    }
    if (uid != null) {
      const cart = await prisma.cart.findFirst({ where: { userId: uid }, include: { items: true } })
      if (cart?.items.length) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
    }
    return NextResponse.json(createdOrders[0] || null, { status: 201 })
  } catch (e: any) {
    console.error('POST /api/checkout error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

