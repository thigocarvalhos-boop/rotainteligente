// src/services/alertService.ts
import { prisma } from "../lib/prisma";

export const alertService = {
  async create({
    projectId,
    titulo,
    mensagem,
    nivel,
    tipo,
    prazo,
  }: {
    projectId?: string;
    titulo: string;
    mensagem: string;
    nivel: string;
    tipo: string;
    prazo?: Date;
  }) {
    return prisma.alert.create({
      data: { projectId, titulo, mensagem, nivel, tipo, status: "PENDENTE", prazo: prazo ?? null },
    });
  },

  async checkDocumentExpirations() {
    console.log("[AlertService] Verificando vencimentos de documentos...");
    const now = new Date();
    const horizon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const docs = await prisma.document.findMany({
      where: {
        validade: { not: null, lte: horizon },
        status: { not: "VENCIDO" },
      },
    });

    console.log(`[AlertService] ${docs.length} documento(s) próximo(s) do vencimento encontrado(s).`);

    for (const doc of docs) {
      if (!doc.validade) continue;

      const prazo: Date = doc.validade;
      const isExpired = prazo < now;

      console.log(`[AlertService] Documento "${doc.nome}" — validade: ${prazo.toISOString()} | vencido: ${isExpired}`);

      await alertService.create({
        projectId: doc.projectId || undefined,
        titulo: isExpired ? "Documento Vencido" : "Documento a Vencer",
        mensagem: `O documento "${doc.nome}" ${isExpired ? "venceu" : "vencerá"} em ${prazo.toLocaleDateString("pt-BR")}.`,
        nivel: isExpired ? "N4" : "N2",
        tipo: "DOCUMENTO",
        prazo,
      });

      if (isExpired) {
        await prisma.document.update({
          where: { id: doc.id },
          data: { status: "VENCIDO" },
        });
        console.log(`[AlertService] Documento "${doc.nome}" marcado como VENCIDO.`);
      }
    }

    console.log("[AlertService] Verificação de vencimentos concluída.");
  },

  async checkBudgetOverrun(_projectId: string) {
    // Meta/Expense models not yet in schema — method is a no-op until they are added
    console.warn("[alertService.checkBudgetOverrun] Meta/Expense models not available in schema. Skipping.");
  },
};
