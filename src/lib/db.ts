import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || ''

  // Vercel Postgres uses connection pooling via the @prisma/adapter-neon approach
  // or direct connection. We configure for both environments.
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
