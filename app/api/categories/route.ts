import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../server/prisma.js'
import { getUserFromRequest } from '../_lib/jwt'

export async function GET() {
  try {
    const prisma = getPrisma()
    const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(cats)
  } catch (e: any) {
    console.error('GET /api/categories error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess = getUserFromRequest(req)
    if (!sess?.uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const data = await req.json()
    const prisma = getPrisma()
    const created = await prisma.category.create({ data })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    console.error('POST /api/categories error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sess = getUserFromRequest(req)
    if (!sess?.uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id, ...patch } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const prisma = getPrisma()
    const updated = await prisma.category.update({ where: { id }, data: patch })
    return NextResponse.json(updated)
  } catch (e: any) {
    console.error('PUT /api/categories error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sess = getUserFromRequest(req)
    if (!sess?.uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const prisma = getPrisma()
    await prisma.category.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (e: any) {
    console.error('DELETE /api/categories error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

