import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../_lib/prisma'
import { getUserFromRequest } from '../../../_lib/jwt'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prisma = getPrisma()
    const sess = getUserFromRequest(req)
    const buyerId = sess?.uid ? Number(sess.uid) : NaN
    if (!Number.isFinite(buyerId)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = String(params.id)
    const review = await prisma.orderReview.findUnique({ where: { orderId: id } })
    if (!review || review.buyerId !== buyerId) return NextResponse.json(null)
    return NextResponse.json({ rating: review.rating, feedback: review.feedback })
  } catch (e: any) {
    console.error('GET /api/orders/:id/review error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prisma = getPrisma()
    const sess = getUserFromRequest(req)
    const buyerId = sess?.uid ? Number(sess.uid) : NaN
    if (!Number.isFinite(buyerId)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = String(params.id)
    const { rating, feedback } = await req.json()
    const r = Number(rating)
    if (!Number.isFinite(r) || r < 1 || r > 5) return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
    if (!feedback || String(feedback).trim().length < 3) return NextResponse.json({ error: 'Feedback required' }, { status: 400 })
    const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } })
    if (!order || order.buyerId !== buyerId) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (!['paid', 'shipped', 'completed'].includes(order.status)) return NextResponse.json({ error: 'Order not eligible for review' }, { status: 400 })
    const existing = await prisma.orderReview.findUnique({ where: { orderId: id } })
    if (existing) return NextResponse.json({ error: 'You have already rated this order' }, { status: 400 })
    const sellerId = order.sellerId ?? (order.items[0]?.product?.ownerId ?? null)
    if (!sellerId) return NextResponse.json({ error: 'Missing seller' }, { status: 400 })
    const saved = await prisma.orderReview.create({ data: { orderId: id, buyerId, sellerId, rating: r, feedback: String(feedback).trim() } })
    return NextResponse.json({ rating: saved.rating, feedback: saved.feedback })
  } catch (e: any) {
    console.error('POST /api/orders/:id/review error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}
