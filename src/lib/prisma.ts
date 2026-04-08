import { PrismaClient } from '@prisma/client'

// Allow URL_DO_BANCO_DE_DADOS as a fallback for DATABASE_URL.
// This must run before PrismaClient initializes because ESM imports are
// hoisted — prisma.ts is evaluated before any code in server.ts executes.
if (!process.env.DATABASE_URL && process.env.URL_DO_BANCO_DE_DADOS) {
  process.env.DATABASE_URL = process.env.URL_DO_BANCO_DE_DADOS
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
