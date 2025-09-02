import type { Handler } from '@netlify/functions'

const getPrisma = async () => {
  const { PrismaClient } = await import('@prisma/client')
  return new PrismaClient()
}

export const handler: Handler = async (event) => {
  const prisma = await getPrisma()
  const method = event.httpMethod
  const ownerId = event.queryStringParameters?.ownerId
  if (!ownerId) return { statusCode: 400, body: 'ownerId required' }

  try {
    if (method === 'GET') {
      const cart = await prisma.cart.upsert({
        where: { ownerId },
        update: {},
        create: { ownerId },
        include: { items: true },
      })
      return { statusCode: 200, body: JSON.stringify(cart) }
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}') as { productId: string; quantity?: number; meta?: string }
      const cart = await prisma.cart.upsert({ where: { ownerId }, update: {}, create: { ownerId } })
      const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId: body.productId } })
      let item
      if (existing) {
        item = await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: (existing.quantity || 0) + (body.quantity || 1), meta: body.meta ?? existing.meta } })
      } else {
        item = await prisma.cartItem.create({ data: { cartId: cart.id, productId: body.productId, quantity: body.quantity || 1, meta: body.meta } })
      }
      return { statusCode: 200, body: JSON.stringify(item) }
    }

    if (method === 'DELETE') {
      const id = event.queryStringParameters?.id
      if (!id) return { statusCode: 400, body: 'id required' }
      await prisma.cartItem.delete({ where: { id } })
      return { statusCode: 204, body: '' }
    }

    return { statusCode: 405, body: 'Method Not Allowed' }
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || 'Internal Error' }) }
  } finally {
    await prisma.$disconnect()
  }
}

