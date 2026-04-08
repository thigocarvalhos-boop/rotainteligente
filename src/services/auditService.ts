// src/services/auditService.ts
import { prisma } from "../lib/prisma";

export const auditService = {
  async log({
    userId,
    projectId,
    acao,
    entidade,
    entidadeId,
    antes,
    depois,
  }: {
    userId: string;
    projectId?: string;
    acao: string;
    entidade: string;
    entidadeId?: string;
    antes?: any;
    depois?: any;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          projectId,
          acao,
          entidade,
          entidadeId,
          antes: antes ?? undefined,
          depois: depois ?? undefined,
        },
      });
    } catch (error) {
      console.error("[auditService.log] Falha ao gravar log:", error);
    }
  },
};
