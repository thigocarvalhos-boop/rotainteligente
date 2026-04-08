import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({ log: ["error", "warn"] });

  client.$connect().catch((err: Error) => {
    console.error("[Prisma] Failed to connect to database:", err.message);
  });

  return client;
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (!process.env.DATABASE_URL) {
  const msg = "[FATAL] Nenhuma variável DATABASE_URL ou URL_DO_BANCO_DE_DADOS encontrada.";
  console.error(msg);
  if (process.env.NODE_ENV === "production") {
    throw new Error(msg);
  }
}

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "production"
    ? ["error", "warn"]
    : ["query", "error", "warn"],
});
