import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../server/prisma.js'
import { getUserFromRequest } from '../_lib/jwt'

function imageForServer(query: string, w = 640, h = 640) {
  const provider = process.env.VITE_IMAGE_PROVIDER || 'picsum'
  if (provider === 'picsum') return `https://picsum.photos/seed/${encodeURIComponent(query)}/${w}/${h}`
  if (provider === 'placeholder') return `https://placehold.co/${w}x${h}?text=${encodeURIComponent(query)}`
  return `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(query)}`
}

function compositeRating(baseAvg = 5, negCount = 0) {
  const avg = Number.isFinite(baseAvg) && baseAvg > 0 ? baseAvg : 5
  const negatives = Number.isFinite(negCount) && negCount > 0 ? negCount : 0
  const penalty = Math.min(2.5, negatives * 0.8)
  return Math.max(1, Math.min(5, avg - penalty))
}

export async function GET(_req: NextRequest) {
  try {
    const prisma = getPrisma()
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } })
    const ownerIds = [...new Set(products.map((p: any) => p.ownerId).filter((v) => v != null))]
    let ownersMap = new Map<number, any>()
    let repMap = new Map<number, any>()
    let avgMap = new Map<number, number>()
    if (ownerIds.length > 0) {
      const owners = await prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true, email: true, image: true } })
      ownersMap = new Map(owners.map((u: any) => [u.id, u]))
      const reps = await prisma.userReputation.findMany({ where: { userId: { in: ownerIds } } })
      repMap = new Map(reps.map((r: any) => [r.userId, r]))
      try {
        if ((prisma as any)?.orderReview?.groupBy) {
          const avgs = await (prisma as any).orderReview.groupBy({ by: ['sellerId'], where: { sellerId: { in: ownerIds } }, _avg: { rating: true } })
          avgMap = new Map(avgs.map((a: any) => [a.sellerId, a._avg.rating || 0]))
        } else if ((prisma as any)?.orderReview?.aggregate) {
          const avgs = await Promise.all(
            ownerIds.map(async (sellerId) => {
              const r = await (prisma as any).orderReview.aggregate({ where: { sellerId }, _avg: { rating: true } })
              return { sellerId, _avg: { rating: r._avg?.rating || 0 } }
            })
          )
          avgMap = new Map(avgs.map((a: any) => [a.sellerId, a._avg.rating || 0]))
        }
      } catch {
        avgMap = new Map()
      }
    }
    const enriched = products.map((p: any) => {
      const owner = ownersMap.get(p.ownerId)
      const rep = repMap.get(p.ownerId)
      const ownerName = owner?.name || (owner?.email ? owner.email.split('@')[0] : undefined)
      const ownerImage = owner?.image || null
      const ownerAvgRating = avgMap.get(p.ownerId) || null
      const negCount = rep?.negativeCount || 0
      const ownerRating = compositeRating(ownerAvgRating ?? 5, negCount)
      return { ...p, ownerName, ownerImage, ownerRating, ownerAvgRating, ownerNegativeCount: negCount }
    })
    return NextResponse.json(enriched)
  } catch (e: any) {
    console.error('GET /api/products error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess = getUserFromRequest(req)
    if (!sess?.uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const data = await req.json()
    const prisma = getPrisma()
    const created = await prisma.product.create({ data: { ...data, ownerId: sess.uid } as any })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    console.error('POST /api/products error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sess = getUserFromRequest(req)
    if (!sess?.uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const { id, ...patch } = body || {}
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const prisma = getPrisma()
    const updated = await prisma.product.update({ where: { id }, data: patch })
    return NextResponse.json(updated)
  } catch (e: any) {
    console.error('PUT /api/products error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sess = getUserFromRequest(req)
    if (!sess?.uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json().catch(() => ({}))
    const { id } = body || {}
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const prisma = getPrisma()
    await prisma.product.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (e: any) {
    console.error('DELETE /api/products error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

