import type { Handler } from '@netlify/functions'

// Lazy import to avoid bundling errors when prisma client not generated yet
const getPrisma = async () => {
  const { PrismaClient } = await import('@prisma/client')
  return new PrismaClient()
}

function imageForServer(query: string, w = 640, h = 640) {
  const provider = process.env.VITE_IMAGE_PROVIDER || 'picsum'
  if (provider === 'picsum') return `https://picsum.photos/seed/${encodeURIComponent(query)}/${w}/${h}`
  if (provider === 'placeholder') return `https://placehold.co/${w}x${h}?text=${encodeURIComponent(query)}`
  return `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(query)}`
}

// No dummy seed data; always return what's in the database

export const handler: Handler = async (event) => {
  const prisma = await getPrisma()
  const method = event.httpMethod

  try {
    if (method === 'GET') {
      const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } })
      return { statusCode: 200, body: JSON.stringify(products) }
    }

    if (method === 'POST') {
      const data = JSON.parse(event.body || '{}')
      const created = await prisma.product.create({ data })
      return { statusCode: 201, body: JSON.stringify(created) }
    }

    if (method === 'PUT') {
      const data = JSON.parse(event.body || '{}')
      if (!data.id) return { statusCode: 400, body: 'Missing id' }
      const { id, ...patch } = data
      const updated = await prisma.product.update({ where: { id }, data: patch })
      return { statusCode: 200, body: JSON.stringify(updated) }
    }

    if (method === 'DELETE') {
      const data = JSON.parse(event.body || '{}')
      if (!data.id) return { statusCode: 400, body: 'Missing id' }
      await prisma.product.delete({ where: { id: data.id } })
      return { statusCode: 204, body: '' }
    }

    return { statusCode: 405, body: 'Method Not Allowed' }
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || 'Internal Error' }) }
  } finally {
    await prisma.$disconnect()
  }
}
