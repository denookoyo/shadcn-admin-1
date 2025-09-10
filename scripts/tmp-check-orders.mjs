import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
try {
  const count = await p.order.count({ where: { accessCode: { not: null } } })
  console.log('orders with accessCode:', count)
  const latest = await p.order.findMany({ where: { accessCode: { not: null } }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, accessCode: true, createdAt: true, status: true } })
  console.log(latest)
} catch (e) {
  console.error('query error', e?.message || e)
} finally {
  await p.$disconnect()
}
