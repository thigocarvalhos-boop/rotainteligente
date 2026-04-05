import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[seed] Iniciando seed do banco de dados...');

  // Upsert admin user so re-runs are idempotent
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@guiasocial.org' },
    update: {},
    create: {
      email: 'admin@guiasocial.org',
      name: 'Administrador ROTA',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  });
  console.log('[seed] Admin user OK —', admin.email);

  // Only create seed project if none exist
  const projectCount = await prisma.project.count();
  if (projectCount === 0) {
    const project = await prisma.project.create({
      data: {
        nome: 'Guia Digital Teen 2026',
        edital: 'FMCA/COMDICA',
        financiador: 'Fundo Municipal da Criança',
        area: 'Digital',
        valor: 320000,
        status: 'Inscrito',
        prazo: new Date('2026-04-15'),
        responsavelId: admin.id,
        probabilidade: 72,
        risco: 'Médio',
        aderencia: 5,
        territorio: 'RPA 6 — Pina / Ipsep',
        publico: 'Adolescentes 12–18 anos',
        competitividade: 'Alta',
        proximoPasso: 'Aguardar resultado do edital',
        ptScore: 8,
        metas: {
          create: [
            {
              descricao: 'Certificar jovens em tecnologia',
              indicador: 'Jovens certificados',
              meta: 500,
              alcancado: 380,
              unidade: 'Jovens',
              budget: 150000,
            },
            {
              descricao: 'Inserção no mercado de trabalho',
              indicador: 'Jovens empregados',
              meta: 50,
              alcancado: 12,
              unidade: 'Jovens',
              budget: 100000,
            },
          ],
        },
        etapas: {
          create: [
            {
              nome: 'Mobilização',
              inicio: new Date('2026-01-01'),
              fim: new Date('2026-02-28'),
              status: 'Concluído',
              peso: 20,
            },
            {
              nome: 'Execução das Aulas',
              inicio: new Date('2026-03-01'),
              fim: new Date('2026-07-31'),
              status: 'Em curso',
              peso: 60,
            },
          ],
        },
        docs: {
          create: [
            { nome: 'Estatuto Social', status: 'Aprovado', validade: null },
            { nome: 'CNPJ', status: 'Aprovado', validade: null },
            { nome: 'CND Federal', status: 'Aprovado', validade: new Date('2026-05-20') },
          ],
        },
      },
    });
    console.log('[seed] Projeto inicial criado — ID:', project.id);

    await prisma.alert.create({
      data: {
        projectId: project.id,
        titulo: 'Documento Vencendo',
        mensagem: 'CND Municipal Recife vence em 15 dias.',
        nivel: 'N4',
        tipo: 'DOCUMENTO',
        status: 'PENDENTE',
        prazo: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    });
    console.log('[seed] Alerta inicial criado.');
  } else {
    console.log(`[seed] ${projectCount} projeto(s) já existem — seed de projetos ignorado.`);
  }

  console.log('[seed] Concluído.');
}

main()
  .catch(e => {
    console.error('[seed] Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
