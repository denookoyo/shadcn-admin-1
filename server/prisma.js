import { PrismaClient } from '@prisma/client'

function resolveDbUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_URL_NON_POOLING,
  ]
  for (const v of candidates) {
    if (!v) continue
    const s = String(v)
    if (s.includes('${')) continue // guard against unexpanded interpolations
    if (/^postgres(ql)?:\/\//i.test(s)) return s
  }
  return undefined
}

let prisma
export function getPrisma() {
  if (!prisma) {
    const url = resolveDbUrl()
    prisma = url
      ? new PrismaClient({ datasources: { db: { url } } })
      : new PrismaClient()
  }
  return prisma
}
