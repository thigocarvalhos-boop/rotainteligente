import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@guiasocial.org" },
    update: {},
    create: {
      name: "Administrador ROTA",
      email: "admin@guiasocial.org",
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const edital = await prisma.edital.create({
    data: {
      nome: "Edital de Inclusão Produtiva 2026",
      financiador: "Instituição Exemplo",
      area: "Inclusão Produtiva",
      valorMin: 50000,
      valorMax: 300000,
      descricao: "Edital de exemplo para seed",
      link: "https://exemplo.org/edital",
      documentosObrigatorios: ["Estatuto", "CNPJ", "Certidão Negativa"],
    },
  });

  await prisma.project.create({
    data: {
      nome: "Guia Digital 2026",
      financiador: "Instituição Exemplo",
      area: "Digital",
      valor: 150000,
      status: "Triagem",
      risco: "Médio",
      probabilidade: 72,
      editalId: edital.id,
      responsavelId: admin.id,
      publico: "Jovens em situação de vulnerabilidade",
      territorio: "Recife e RMR",
      observacao: "Projeto inicial seed",
      proximoPasso: "Revisar documentos obrigatórios",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
