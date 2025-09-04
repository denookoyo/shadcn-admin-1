import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../../_lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prisma = getPrisma()
    const id = String(params.id)
    const { status } = await req.json()
    const allowed = ['pending', 'paid', 'shipped', 'completed', 'cancelled']
    if (!allowed.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    const exists = await prisma.order.findUnique({ where: { id } })
    if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = await prisma.order.update({ where: { id }, data: { status } })
    return NextResponse.json(updated)
  } catch (e: any) {
    console.error('POST /api/admin/orders/:id/status error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}
