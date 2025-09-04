import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../../../server/prisma.js'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prisma = getPrisma()
    const id = String(params.id)
    await prisma.order.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (e: any) {
    console.error('DELETE /api/admin/orders/:id error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

