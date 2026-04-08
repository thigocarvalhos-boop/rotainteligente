import { PrismaClient } from "@prisma/client";

// Resolve DATABASE_URL from multiple possible env vars (Railway may use different names)
if (!process.env.DATABASE_URL && process.env.URL_DO_BANCO_DE_DADOS) {
  process.env.DATABASE_URL = process.env.URL_DO_BANCO_DE_DADOS;
  console.log("[DB] DATABASE_URL definida via URL_DO_BANCO_DE_DADOS.");
}

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
