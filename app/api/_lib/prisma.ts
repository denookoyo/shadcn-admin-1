import { PrismaClient } from '@prisma/client'

// Reuse Prisma in dev to avoid exhausting DB connections
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export function getPrisma() {
  return prisma
}

