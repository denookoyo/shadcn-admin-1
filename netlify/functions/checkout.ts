import type { Handler } from '@netlify/functions'

const getPrisma = async () => {
  const { PrismaClient } = await import('@prisma/client')
  return new PrismaClient()
}

export const handler: Handler = async (event) => {
  const prisma = await getPrisma()
  const method = event.httpMethod
  if (method !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const body = JSON.parse(event.body || '{}') as {
      ownerId?: string
      items: Array<{ productId: string; title: string; price: number; quantity: number }>
      total: number
      customerName?: string
      customerEmail?: string
      address?: string
    }

    const order = await prisma.order.create({
      data: {
        ownerId: body.ownerId,
        total: body.total,
        status: 'pending',
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        address: body.address,
        items: {
          create: body.items.map((i) => ({ productId: i.productId, title: i.title, price: i.price, quantity: i.quantity })),
        },
      },
      include: { items: true },
    })
    return { statusCode: 201, body: JSON.stringify(order) }
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || 'Internal Error' }) }
  } finally {
    await prisma.$disconnect()
  }
}

