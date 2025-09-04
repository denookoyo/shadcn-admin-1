import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../../server/prisma.js'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const code = String(sp.get('code') || '')
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })
    const prisma = getPrisma()
    let order = await prisma.order.findFirst({ where: { accessCode: code }, include: { items: { include: { product: true } }, seller: true } })
    if (!order) {
      const byId = await prisma.order.findUnique({ where: { id: code }, include: { items: { include: { product: true } }, seller: true } })
      if (byId?.accessCode) order = byId
    }
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(order)
  } catch (e: any) {
    console.error('GET /api/orders/track error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

