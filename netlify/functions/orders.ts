import type { Handler } from '@netlify/functions'

const getPrisma = async () => {
  const { PrismaClient } = await import('@prisma/client')
  return new PrismaClient()
}

export const handler: Handler = async (event) => {
  const prisma = await getPrisma()
  const method = event.httpMethod
  const ownerId = event.queryStringParameters?.ownerId
  if (method !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    if (!ownerId) return { statusCode: 400, body: 'ownerId required' }
    const orders = await prisma.order.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    })
    return { statusCode: 200, body: JSON.stringify(orders) }
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || 'Internal Error' }) }
  } finally {
    await prisma.$disconnect()
  }
}

