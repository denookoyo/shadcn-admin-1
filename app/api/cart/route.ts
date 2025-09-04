import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../server/prisma.js'
import { getUserFromRequest } from '../_lib/jwt'

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const sp = req.nextUrl.searchParams
    const sess = getUserFromRequest(req)
    const ownerId = sp.get('ownerId') ? Number(sp.get('ownerId')) : (sess?.uid ? Number(sess.uid) : NaN)
    if (!Number.isFinite(ownerId)) return NextResponse.json({ error: 'ownerId required' }, { status: 400 })
    let cart = await prisma.cart.findFirst({ where: { userId: ownerId }, include: { items: true } })
    if (!cart) cart = await prisma.cart.create({ data: { userId: ownerId }, include: { items: true } })
    return NextResponse.json(cart)
  } catch (e: any) {
    console.error('GET /api/cart error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const sp = req.nextUrl.searchParams
    const sess = getUserFromRequest(req)
    const ownerId = sp.get('ownerId') ? Number(sp.get('ownerId')) : (sess?.uid ? Number(sess.uid) : NaN)
    if (!Number.isFinite(ownerId)) return NextResponse.json({ error: 'ownerId required' }, { status: 400 })
    const { productId, quantity = 1, meta } = await req.json()
    let cart = await prisma.cart.findFirst({ where: { userId: ownerId } })
    if (!cart) cart = await prisma.cart.create({ data: { userId: ownerId } })
    const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId } })
    let item
    if (existing) {
      item = await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: (existing.quantity || 0) + quantity, meta: meta ?? existing.meta } })
    } else {
      item = await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity, meta } })
    }
    return NextResponse.json(item)
  } catch (e: any) {
    console.error('POST /api/cart error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const sp = req.nextUrl.searchParams
    const sess = getUserFromRequest(req)
    const ownerId = sp.get('ownerId') ? Number(sp.get('ownerId')) : (sess?.uid ? Number(sess.uid) : NaN)
    if (!Number.isFinite(ownerId)) return NextResponse.json({ error: 'ownerId required' }, { status: 400 })
    const id = String(sp.get('id') || '')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await prisma.cartItem.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (e: any) {
    console.error('DELETE /api/cart error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

