import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

// Resolve the database path - must be absolute for better-sqlite3
const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db'

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({ url: DB_PATH })
  return new PrismaClient({ adapter, log: ['error'] })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
