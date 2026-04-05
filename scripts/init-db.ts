/**
 * scripts/init-db.ts
 *
 * Inicialização automática do banco de dados.
 * Executa `prisma db push` para criar as tabelas e insere dados iniciais
 * (usuário admin + projeto de exemplo + alerta) se ainda não existirem.
 *
 * Uso manual: npm run db:init
 * Chamado automaticamente pelo server.ts em produção.
 */

import { execSync } from "child_process";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

// ─── 1. Criar tabelas via prisma db push ────────────────────────────────────

async function pushSchema(): Promise<void> {
  console.log("[init-db] Executando prisma db push...");
  try {
    execSync("npx prisma db push --accept-data-loss", {
      stdio: "inherit",
      env: process.env,
    });
    console.log("[init-db] prisma db push concluído com sucesso.");
  } catch (err) {
    console.error("[init-db] ERRO ao executar prisma db push:", err);
    throw err;
  }
}

// ─── 2. Seed: usuário admin ──────────────────────────────────────────────────

async function seedAdmin() {
  const adminEmail = "admin@guiasocial.org";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log("[init-db] Usuário admin já existe — pulando criação.");
    return existing;
  }

  const hashedPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: "Administrador ROTA",
      role: "SUPER_ADMIN",
    },
  });

  console.log(`[init-db] Usuário admin criado: ${admin.email}`);
  return admin;
}

// ─── 3. Seed: projeto de exemplo ────────────────────────────────────────────

async function seedProject(adminId: string) {
  const count = await prisma.project.count();
  if (count > 0) {
    console.log("[init-db] Projetos já existem — pulando seed de projeto.");
    return null;
  }

  const prazoAlerta = new Date();
  prazoAlerta.setDate(prazoAlerta.getDate() + 15);

  const project = await prisma.project.create({
    data: {
      nome: "Guia Digital Teen 2026",
      edital: "FMCA/COMDICA",
      financiador: "Fundo Municipal da Criança",
      area: "Digital",
      valor: 320000,
      status: "Inscrito",
      prazo: new Date("2026-04-15"),
      responsavelId: adminId,
      probabilidade: 72,
      risco: "Médio",
      aderencia: 5,
      territorio: "RPA 6 — Pina / Ipsep",
      publico: "Adolescentes 12–18 anos",
      competitividade: "Alta",
      proximoPasso: "Aguardar resultado do edital",
      ptScore: 8,
      observacao: "Projeto estratégico para inclusão digital de jovens em vulnerabilidade social.",
      historico: [
        {
          id: "h1",
          data: new Date("2025-11-10").toISOString(),
          autor: "Administrador ROTA",
          acao: "Projeto cadastrado no sistema ROTA",
        },
        {
          id: "h2",
          data: new Date("2025-12-05").toISOString(),
          autor: "Administrador ROTA",
          acao: "Documentação completa enviada ao financiador",
        },
        {
          id: "h3",
          data: new Date("2026-01-20").toISOString(),
          autor: "Administrador ROTA",
          acao: "Status atualizado para Inscrito após confirmação do edital",
        },
      ],
      metas: {
        create: [
          {
            descricao: "Certificar jovens em tecnologia",
            indicador: "Jovens certificados",
            meta: 500,
            alcancado: 380,
            unidade: "Jovens",
            budget: 150000,
          },
          {
            descricao: "Inserção no mercado de trabalho",
            indicador: "Jovens empregados",
            meta: 50,
            alcancado: 12,
            unidade: "Jovens",
            budget: 100000,
          },
        ],
      },
      etapas: {
        create: [
          {
            nome: "Mobilização",
            inicio: new Date("2026-01-01"),
            fim: new Date("2026-02-28"),
            status: "Concluído",
            peso: 20,
          },
          {
            nome: "Execução das Aulas",
            inicio: new Date("2026-03-01"),
            fim: new Date("2026-07-31"),
            status: "Em curso",
            peso: 60,
          },
          {
            nome: "Avaliação e Encerramento",
            inicio: new Date("2026-08-01"),
            fim: new Date("2026-09-30"),
            status: "Pendente",
            peso: 20,
          },
        ],
      },
      docs: {
        create: [
          { nome: "Estatuto Social", status: "Aprovado", validade: null },
          { nome: "CNPJ", status: "Aprovado", validade: null },
          {
            nome: "CND Federal",
            status: "Aprovado",
            validade: new Date("2026-05-20"),
          },
          {
            nome: "CND Municipal Recife",
            status: "Aprovado",
            validade: prazoAlerta,
          },
        ],
      },
    },
  });

  console.log(`[init-db] Projeto de exemplo criado: "${project.nome}" (id: ${project.id})`);
  return project;
}

// ─── 4. Seed: alerta de exemplo ─────────────────────────────────────────────

async function seedAlert(projectId: string) {
  const prazo = new Date();
  prazo.setDate(prazo.getDate() + 15);

  const alert = await prisma.alert.create({
    data: {
      projectId,
      titulo: "Documento a Vencer",
      mensagem: "CND Municipal Recife vence em 15 dias. Providencie a renovação com urgência.",
      nivel: "N4",
      status: "PENDENTE",
      tipo: "DOCUMENTO",
      prazo,
    },
  });

  console.log(`[init-db] Alerta de exemplo criado: "${alert.titulo}" (prazo: ${prazo.toLocaleDateString("pt-BR")})`);
}

// ─── Orquestrador principal ──────────────────────────────────────────────────

export async function initDatabase(): Promise<void> {
  console.log("[init-db] ══════════════════════════════════════════");
  console.log("[init-db] Iniciando configuração do banco de dados...");
  console.log("[init-db] ══════════════════════════════════════════");

  // Etapa 1 — garantir que as tabelas existam (crítico)
  await pushSchema();

  // Etapa 2 — seed de dados iniciais (não-crítico: falha não impede o servidor)
  try {
    const admin = await seedAdmin();
    const project = await seedProject(admin.id);

    if (project) {
      await seedAlert(project.id);
    }

    console.log("[init-db] ✔ Inicialização do banco concluída com sucesso.");
  } catch (seedError) {
    console.error(
      "[init-db] ⚠ Erro durante o seed de dados iniciais (tabelas já foram criadas):",
      seedError
    );
    // Não relança — o servidor pode iniciar mesmo sem os dados de exemplo
  } finally {
    await prisma.$disconnect();
  }
}

// ─── Execução direta (npm run db:init) ──────────────────────────────────────

const isMain =
  process.argv[1]?.endsWith("init-db.ts") ||
  process.argv[1]?.endsWith("init-db.js");

if (isMain) {
  initDatabase()
    .then(() => {
      console.log("[init-db] Script finalizado.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[init-db] Falha crítica na inicialização:", err);
      process.exit(1);
    });
}
