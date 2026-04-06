#!/usr/bin/env node
/**
 * ROTA — Inserção dos 14 projetos IGS 2026
 * Execute: railway run node inserir_projetos.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PROJETOS = [
  {
    nome: "Guia Digital – Plataforma de Transformação para Jovens Periféricos",
    edital: "Edital Fortalecendo Redes 2026",
    financiador: "Instituto TIM",
    area: "Digital",
    valor: 100000,
    status: "Inscrito",
    prazo: new Date("2026-12-31"),
    probabilidade: 55,
    risco: "Médio",
    aderencia: 4,
    territorio: "Recife / territórios periféricos",
    publico: "Jovens periféricos",
    competitividade: "Média",
    proximoPasso: "Acompanhar resultado e eventuais diligências",
    ptScore: 7.5,
    observacao: "Projeto com boa coerência temática e forte aderência à agenda de inclusão digital e oportunidades para juventudes periféricas.",
    categoriaEdital: "Privado",
    programaInterno: "Inclusão produtiva e formação digital",
    scoreCompliance: 85,
    scoreRiscoGlosa: 12,
    ptCriterios: [
      { critério: "Aderência", score: 8 },
      { critério: "Força Conceitual", score: 7 },
      { critério: "Adequação Financiador", score: 8 },
      { critério: "Cap. Institucional", score: 8 },
      { critério: "Maturidade", score: 7 },
      { critério: "Competitividade", score: 6 },
      { critério: "Plausibilidade Orçam.", score: 8 },
      { critério: "Risco Doc.", score: 8 }
    ],
    historico: [{ data: new Date().toLocaleDateString("pt-BR"), acao: "Projeto cadastrado no ROTA", autor: "Administrador ROTA" }]
  },
  {
    nome: "MARÉ DELAS",
    edital: "Edital nº 01/2026",
    financiador: "Ministério da Pesca e Aquicultura (MPA)",
    area: "Inclusão produtiva",
    valor: 350000,
    status: "Inscrito",
    prazo: new Date("2026-12-31"),
    probabilidade: 68,
    risco: "Médio",
    aderencia: 5,
    territorio: "Ilha de Deus / Recife-PE",
    publico: "Mulheres pescadoras e marisqueiras da Comunidade Ilha de Deus, vinculadas à Colônia Z-1 do Pina",
    competitividade: "Média",
    proximoPasso: "Monitorar tramitação e preparar documentação complementar",
    ptScore: 8.2,
    observacao: "Projeto muito aderente ao escopo do edital, com recorte territorial forte, público bem delimitado e conexão consistente com inclusão produtiva e autonomia econômica feminina.",
    categoriaEdital: "Público",
    programaInterno: "Autonomia econômica de mulheres pescadoras",
    scoreCompliance: 90,
    scoreRiscoGlosa: 8,
    ptCriterios: [
      { critério: "Aderência", score: 10 },
      { critério: "Força Conceitual", score: 8 },
      { critério: "Adequação Financiador", score: 9 },
      { critério: "Cap. Institucional", score: 8 },
      { critério: "Maturidade", score: 8 },
      { critério: "Competitividade", score: 7 },
      { critério: "Plausibilidade Orçam.", score: 8 },
      { critério: "Risco Doc.", score: 8 }
    ],
    historico: [{ data: new Date().toLocaleDateString("pt-BR"), acao: "Projeto cadastrado no ROTA", autor: "Administrador ROTA" }]
  },
  {
    nome: "ROTA PRODUTIVA",
    edital: "Chamamento Público MEMP nº 2/2026",
    financiador: "Ministério do Empreendedorismo, da Microempresa e da Empresa de Pequeno Porte (MEMP)",
    area: "Empreendedorismo",
    valor: 580000,
    status: "Inscrito",
    prazo: new Date("2026-12-31"),
    probabilidade: 62,
    risco: "Médio",
    aderencia: 5,
    territorio: "Recife e Região Metropolitana do Recife",
    publico: "Mulheres chefes de família, trabalhadoras informais, pessoas do CadÚnico e público de baixa renda",
    competitividade: "Alta",
    proximoPasso: "Acompanhar análise e manter documentação institucional pronta",
    ptScore: 8.0,
    observacao: "Projeto tecnicamente forte, bem alinhado ao eixo de formalização e geração de renda, com boa lógica territorial e aderência programática.",
    categoriaEdital: "Público",
    programaInterno: "Inclusão socioprodutiva e formalização",
    scoreCompliance: 88,
    scoreRiscoGlosa: 10,
    ptCriterios: [
      { critério: "Aderência", score: 10 },
      { critério: "Força Conceitual", score: 8 },
      { critério: "Adequação Financiador", score: 9 },
      { critério: "Cap. Institucional", score: 8 },
      { critério: "Maturidade", score: 8 },
      { critério: "Competitividade", score: 7 },
      { critério: "Plausibilidade Orçam.", score: 8 },
      { critério: "Risco Doc.", score: 8 }
    ],
    historico: [{ data: new Date().toLocaleDateString("pt-BR"), acao: "Projeto cadastrado no ROTA", autor: "Administrador ROTA" }]
  },
  {
    nome: "GUIA EMPREENDE",
    edital: "Chamamento do MEMP 2026",
    financiador: "Ministério do Empreendedorismo, da Microempresa e da Empresa de Pequeno Porte (MEMP)",
    area: "Empreendedorismo",
    valor: 2100000,
    status: "Inscrito",
    prazo: new Date("2026-12-31"),
    probabilidade: 48,
    risco: "Médio",
    aderencia: 4,
    territorio: "Pernambuco / RMR",
    publico: "Público em situação de vulnerabilidade com foco em inclusão produtiva e empreendedorismo",
    competitividade: "Alta",
    proximoPasso: "Acompanhar avaliação e reforçar estratégia de defesa institucional",
    ptScore: 7.8,
    observacao: "Projeto robusto e com bom encaixe temático, mas o valor elevado tende a aumentar a competitividade e a exigência de consistência técnica e institucional.",
    categoriaEdital: "Público",
    programaInterno: "Inclusão produtiva e autonomia econômica",
    scoreCompliance: 82,
    scoreRiscoGlosa: 15,
    ptCriterios: [
      { critério: "Aderência", score: 8 },
      { critério: "Força Conceitual", score: 8 },
      { critério: "Adequação Financiador", score: 8 },
      { critério: "Cap. Institucional", score: 7 },
      { critério: "Maturidade", score: 7 },
      { critério: "Competitividade", score: 6 },
      { critério: "Plausibilidade Orçam.", score: 8 },
      { critério: "Risco Doc.", score: 8 }
    ],
    historico: [{ data: new Date().toLocaleDateString("pt-BR"), acao: "Projeto cadastrado no ROTA", autor: "Administrador ROTA" }]
  },
  {
    nome: "Voz Ativa",
    edital: "Edital Instituto Chamex",
    financiador: "Instituto Chamex",
    area: "Juventude / cidadania",
    valor: 37500,
    status: "Inscrito",
    prazo: new Date("2026-12-31"),
    probabilidade: 72,
    risco: "Baixo",
    aderencia: 5,
    territorio: "Recife / territórios periféricos",
    publico: "Jovens de territórios periféricos",
    competitividade: "Média",
    proximoPasso: "Aguardar resultado",
    ptScore: 8.5,
    observacao: "Proposta enxuta, coerente e com alta compatibilidade com o perfil do financiador.",
    categoriaEdital: "Privado",
    programaInterno: "Criatividade e protagonismo juvenil",
    scoreCompliance: 92,
    scoreRiscoGlosa: 6,
    ptCriterios: [
      { critério: "Aderência", score: 10 },
      { critério: "Força Conceitual", score: 9 },
      { critério: "Adequação Financiador", score: 9 },
      { critério: "Cap. Institucional", score: 8 },
      { critério: "Maturidade", score: 8 },
      { critério: "Competitividade", score: 8 },
      { critério: "Plausibilidade Orçam.", score: 9 },
      { critério: "Risco Doc.", score: 8 }
    ],
    historico: [{ data: new Date().toLocaleDateString("pt-BR"), acao: "Projeto cadastrado no ROTA", autor: "Administrador ROTA" }]
  },
  {
    nome: "Territórios Digitais Produtivos",
    edital: "Prêmio Periferia Viva / Ministério das Cidades",
    financiador: "Ministério das Cidades",
    area: "Digital",
    valor: 200000,
    status: "Inscrito",
    prazo: new Date("2026-12-31"),
    probabilidade: 58,
    risco: "Médio",
    aderencia: 4,
    territorio: "Territórios periféricos",
    publico: "Moradores de periferias com foco em inclusão produtiva digital",
    competitividade: "Alta",
    proximoPasso: "Acompanhar resultado",
    ptScore: 7.6,
    observacao: "Boa convergência entre inovação social, mobilização territorial e proposta de desenvolvimento em periferias.",
    categoriaEdital: "Público",
    programaInterno: "Inclusão produtiva digital",
    scoreCompliance: 84,
    scoreRiscoGlosa: 11,
    ptCriterios: [
      { critério: "Aderência", score: 8 },
      { critério: "Força Conceitual", score: 8 },
      { critério: "Adequação Financiador", score: 8 },
      { critério: "Cap. Institucional", score: 8 },
      { critério: "Maturidade", score: 7 },
      { critério: "Competitividade", score: 7 },
      { critério: "Plausibilidade Orçam.", score: 8 },
      { critério: "Risco Doc.", score: 8 }
    ],
    historico: [{ data: new Date().toLocaleDateString("pt-BR"), acao: "Projeto cadastrado no ROTA", autor: "Administrador ROTA" }]
  },
  {
    nome: "TRAMA",
    edital: "Edital Instituto Lojas Renner",
    financiador: "Instituto Lojas Renner",
    area: "Inclusão produtiva",
    valor: 220000,
    status: "Inscrito",
    prazo: new Date("2026-12-31"),
    probabilidade: 60,
    risco: "Médio",
    aderencia: 5,
    territorio: "Recife / RMR",
    publico: "Mulheres em situação de vulnerabilidade",
    competitividade: "Alta",
    proximoPasso: "Monitorar retorno do financiador",
    ptScore: 8.0,
    observacao: "Projeto com boa sintonia com o foco do financiador em autonomia econômica e fortalecimento de mulheres.",
    categoriaEdital: "Privado",
    programaInterno: "Inclusão socioprodutiva feminina",
    scoreCompliance: 87,
    scoreRiscoGlosa: 9,
    ptCriterios: [
      { critério: "Aderência", score: 10 },
      { critério: "Força Conceitual", score: 8 },
      { critério: "Adequação Financiador", score: 9 },
      { critério: "Cap. Institucional", score: 8 },
      { critério: "Maturidade", score: 7 },
      { critério: "Competitividade", score: 7 },
      { critério: "Plausibilidade Orçam.", score: 8 },
      { critério: "Risco Doc.", score: 8 }
    ],
    historico: [{ data: new Date().toLocaleDateString("pt-BR"), acao: "Projeto cadastrado no ROTA", autor: "Administrador ROTA" }]
  },
  {
    nome: "Bola Pro Mundo",
    edital: "Claro – Patrocínio",
    financiador: "Claro",
    area: "Esporte",
    valor: 600000,
    status: "Inscrito",
    prazo: new Date("2026-12-31"),
    probabilidade: 45,
    risco: "Médio",
    aderencia: 4,
    territorio: "Recife / territórios populares",
    publico: "Crianças e adolescentes",
    competitividade: "Alta",
    proximoPasso: "Acompanhar análise",
    ptScore: 7.2,
    observacao: "Tem boa narrativa de impacto, mas patrocínio corporativo de maior porte costuma ser altamente competitivo e demandar forte diferenciação institucional.",
    categoriaEdital: "Privado",
    programaInterno: "Desenvolvimento social por meio do esporte",
    scoreCompliance: 80,
    scoreRiscoGlosa: 14,
    ptCriterios: [
      { critério: "Aderência", score: 8 },
      { critério: "Força Conceitual", score: 7 },
      { critério: "Adequação Financiador", score: 8 },
      { critério: "Cap. Institucional", score: 8 },
      { critério: "Maturidade", score: 7 },
      { critério: "Competitividade", score: 6 },
      { critério: "Plausibilidade Orçam.", score: 7 },
      { critério: "Risco Doc.", score: 8 }
    ],
    historico: [{ data: new Date().toLocaleDateString("pt-BR"), acao: "Projeto cadastrado no ROTA", autor: "Administrador ROTA" }]
  },
  {
    nome: "Guia Digital LGBT",
    edital: "18º Edital LGBTQIA+ (Re)Existindo",
    financiador: "Fundo Positivo",
    area: "Direitos humanos",
    valor: 50000,
    status: "Inscrito",
    prazo: new Date("2026-12-31"),
    probabilidade: 74,
    risco: "Baixo",
    aderencia: 5,
    territorio: "Recife / RMR",
    publico: "Jovens LGBTQIA+ em situação de vulnerabilidade",
    competitividade: "Média",
    proximoPasso: "Acompanhar resultado e preparar eventual ajuste documental",
    ptScore: 8.6,
    observacao: "Projeto altamente aderente ao público e à linha temática do edital, com narrativa consistente de inclusão produtiva e direitos.",
    categoriaEdital: "Fundo",
    programaInterno: "Autonomia econômica LGBTQIA+",
    scoreCompliance: 93,
    scoreRiscoGlosa: 5,
    ptCriterios: [
      { critério: "Aderência", score: 10 },
      { critério: "Força Conceitual", score: 9 },
      { critério: "Adequação Financiador", score: 9 },
      { critério: "Cap. Institucional", score: 8 },
      { critério: "Maturidade", score: 8 },
      { critério: "Competitividade", score: 8 },
      { critério: "Plausibilidade Orçam.", score: 9 },
      { critério: "Risco Doc.", score: 8 }
    ],
    historico: [{ data: new Date().toLocaleDateString("pt-BR"), acao: "Projeto cadastrado no ROTA", autor: "Administrador ROTA" }]
  },
  {
    nome: "Guia Digital: Autonomia Econômica para Jovens LGBTQIA+",
    edital: "HEF 2026",
    financiador: "Fundo da Embaixada da Nova Zelândia",
    area: "Direitos humanos",
    valor: 31000,
    status: "Inscrito",
    prazo: new Date("2026-12-31"),
    probabilidade: 66,
    risco: "Médio",
    aderencia: 4,
    territorio: "Recife / RMR",
    publico: "Jovens LGBTQIA+ em situação de vulnerabilidade",
    competitividade: "Média",
    proximoPasso: "Monitorar retorno e manter documentação institucional organizada em inglês, se necessário",
    ptScore: 7.9,
    observacao: "Proposta enxuta, internacionalizável e coerente com o recorte de direitos e autonomia econômica.",
    categoriaEdital: "Internacional",
    programaInterno: "Formação digital e autonomia econômica",
    scoreCompliance: 86,
    scoreRiscoGlosa: 10,
    ptCriterios: [
      { critério: "Aderência", score: 8 },
      { critério: "Força Conceitual", score: 8 },
      { critério: "Adequação Financiador", score: 8 },
      { critério: "Cap. Institucional", score: 8 },
      { critério: "Maturidade", score: 8 },
      { critério: "Competitividade", score: 7 },
      { critério: "Plausibilidade Orçam.", score: 8 },
      { critério: "Risco Doc.", score: 8 }
    ],
    historico: [{ data: new Date().toLocaleDateString("pt-BR"), acao: "Projeto cadastrado no ROTA", autor: "Administrador ROTA" }]
  },
  {
    nome: "CinePaz",
    edital: "Edital de Aquisição de Bens e Serviços – Aldir Blanc PE",
    financiador: "Aldir Blanc PE",
    area: "Cultura",
    valor: 30000,
    status: "Inscrito",
    prazo: new Date("2026-12-31"),
    probabilidade: 61,
    risco: "Médio",
    aderencia: 4,
    territorio: "Pernambuco",
    publico: "Comunidades periféricas e público participante de ações culturais",
    competitividade: "Média",
    proximoPasso: "Acompanhar resultado",
    ptScore: 7.5,
    observacao: "Projeto consistente dentro do campo cultural, com proposta objetiva de fortalecimento operacional.",
    categoriaEdital: "Público",
    programaInterno: "Rede de cineclubes comunitários",
    scoreCompliance: 83,
    scoreRiscoGlosa: 11,
    ptCriterios: [
      { critério: "Aderência", score: 8 },
      { critério: "Força Conceitual", score: 7 },
      { critério: "Adequação Financiador", score: 8 },
      { critério: "Cap. Institucional", score: 8 },
      { critério: "Maturidade", score: 7 },
      { critério: "Competitividade", score: 7 },
      { critério: "Plausibilidade Orçam.", score: 8 },
      { critério: "Risco Doc.", score: 8 }
    ],
    historico: [{ data: new Date().toLocaleDateString("pt-BR"), acao: "Projeto cadastrado no ROTA", autor: "Administrador ROTA" }]
  },
  {
    nome: "Primeiros Laços – Primeira Infância",
    edital: "Edital Tecendo Infâncias",
    financiador: "Tecendo Infâncias",
    area: "Primeira infância",
    valor: 250000,
    status: "Inscrito",
    prazo: new Date("2026-12-31"),
    probabilidade: 63,
    risco: "Médio",
    aderencia: 4,
    territorio: "Recife",
    publico: "Crianças da primeira infância e suas famílias",
    competitividade: "Média",
    proximoPasso: "Acompanhar retorno",
    ptScore: 7.7,
    observacao: "Projeto bem posicionado, com coerência temática e boa legibilidade social.",
    categoriaEdital: "Privado",
    programaInterno: "Fortalecimento de vínculos e cuidado integral",
    scoreCompliance: 85,
    scoreRiscoGlosa: 10,
    ptCriterios: [
      { critério: "Aderência", score: 8 },
      { critério: "Força Conceitual", score: 8 },
      { critério: "Adequação Financiador", score: 8 },
      { critério: "Cap. Institucional", score: 8 },
      { critério: "Maturidade", score: 7 },
      { critério: "Competitividade", score: 7 },
      { critério: "Plausibilidade Orçam.", score: 8 },
      { critério: "Risco Doc.", score: 8 }
    ],
    historico: [{ data: new Date().toLocaleDateString("pt-BR"), acao: "Projeto cadastrado no ROTA", autor: "Administrador ROTA" }]
  },
  {
    nome: "TerriPath — AI-Powered Territorial Intelligence",
    edital: "Google.org Impact Challenge: AI for Government Innovation 2026",
    financiador: "Google.org",
    area: "Inovação",
    valor: 11611351.13,
    status: "Inscrito",
    prazo: new Date("2026-12-31"),
    probabilidade: 38,
    risco: "Alto",
    aderencia: 5,
    territorio: "Recife, com potencial de replicação nacional",
    publico: "Governos locais, gestores públicos e populações vulneráveis beneficiadas por coordenação mais inteligente de serviços",
    competitividade: "Alta",
    proximoPasso: "Acompanhar seleção e fortalecer materiais complementares",
    ptScore: 8.8,
    observacao: "Proposta muito forte conceitualmente, inovadora e altamente alinhada ao edital, mas inserida em competição internacional de altíssimo nível.",
    categoriaEdital: "Internacional",
    programaInterno: "Inteligência territorial e inovação governamental",
    scoreCompliance: 78,
    scoreRiscoGlosa: 18,
    ptCriterios: [
      { critério: "Aderência", score: 10 },
      { critério: "Força Conceitual", score: 9 },
      { critério: "Adequação Financiador", score: 9 },
      { critério: "Cap. Institucional", score: 8 },
      { critério: "Maturidade", score: 8 },
      { critério: "Competitividade", score: 7 },
      { critério: "Plausibilidade Orçam.", score: 9 },
      { critério: "Risco Doc.", score: 9 }
    ],
    historico: [{ data: new Date().toLocaleDateString("pt-BR"), acao: "Projeto cadastrado no ROTA", autor: "Administrador ROTA" }]
  },
  {
    nome: "Raízes que Sustentam",
    edital: "Laboratório de Projetos em Saúde Mental 2026",
    financiador: "Instituto Cactus",
    area: "Saúde mental",
    valor: 70000,
    status: "Inscrito",
    prazo: new Date("2026-12-31"),
    probabilidade: 69,
    risco: "Baixo",
    aderencia: 5,
    territorio: "Territórios periféricos",
    publico: "Mulheres adultas em territórios periféricos",
    competitividade: "Média",
    proximoPasso: "Aguardar resultado e preparar defesa técnica do recorte comunitário",
    ptScore: 8.4,
    observacao: "Projeto muito aderente à chamada, com bom desenho de cuidado coletivo, escuta qualificada e ativação de redes.",
    categoriaEdital: "Privado",
    programaInterno: "Cuidado coletivo e redes comunitárias",
    scoreCompliance: 91,
    scoreRiscoGlosa: 7,
    ptCriterios: [
      { critério: "Aderência", score: 10 },
      { critério: "Força Conceitual", score: 9 },
      { critério: "Adequação Financiador", score: 9 },
      { critério: "Cap. Institucional", score: 8 },
      { critério: "Maturidade", score: 8 },
      { critério: "Competitividade", score: 8 },
      { critério: "Plausibilidade Orçam.", score: 8 },
      { critério: "Risco Doc.", score: 9 }
    ],
    historico: [{ data: new Date().toLocaleDateString("pt-BR"), acao: "Projeto cadastrado no ROTA", autor: "Administrador ROTA" }]
  }
];

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║     ROTA — Inserindo 14 Projetos IGS 2026            ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // Encontrar usuário admin
  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" }
  });
  if (!admin) {
    console.error("✗ Usuário admin não encontrado. Execute o seed primeiro.");
    process.exit(1);
  }
  console.log(`✓ Admin encontrado: ${admin.email}`);

  let inseridos = 0;
  let pulados = 0;
  const valorTotal = PROJETOS.reduce((s, p) => s + p.valor, 0);

  for (const proj of PROJETOS) {
    // Verificar se já existe
    const existe = await prisma.project.findFirst({
      where: { nome: proj.nome }
    });

    if (existe) {
      console.log(`  ⚠ Já existe: ${proj.nome}`);
      pulados++;
      continue;
    }

    await prisma.project.create({
      data: {
        nome: proj.nome,
        edital: proj.edital,
        financiador: proj.financiador,
        area: proj.area,
        valor: proj.valor,
        status: proj.status,
        prazo: proj.prazo,
        responsavelId: admin.id,
        probabilidade: proj.probabilidade,
        risco: proj.risco,
        aderencia: proj.aderencia,
        territorio: proj.territorio,
        publico: proj.publico,
        competitividade: proj.competitividade,
        proximoPasso: proj.proximoPasso,
        ptScore: proj.ptScore,
        observacao: proj.observacao,
        categoriaEdital: proj.categoriaEdital,
        programaInterno: proj.programaInterno,
        ano: 2026,
        scoreCompliance: proj.scoreCompliance,
        scoreRiscoGlosa: proj.scoreRiscoGlosa,
        ptCriterios: proj.ptCriterios,
        historico: proj.historico,
      }
    });

    console.log(`  ✓ ${proj.nome} — R$ ${proj.valor.toLocaleString("pt-BR")} (${proj.probabilidade}%)`);
    inseridos++;
  }

  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║  RESULTADO                                           ║`);
  console.log(`╠══════════════════════════════════════════════════════╣`);
  console.log(`║  ✓ Inseridos : ${String(inseridos).padEnd(36)}║`);
  console.log(`║  ⚠ Pulados   : ${String(pulados).padEnd(36)}║`);
  console.log(`║  Pipeline    : R$ ${valorTotal.toLocaleString("pt-BR").padEnd(33)}║`);
  console.log(`╚══════════════════════════════════════════════════════╝\n`);
  console.log("✓ Acesse o ROTA e recarregue o Dashboard.");

  await prisma.$disconnect();
}

main().catch(e => {
  console.error("Erro:", e.message);
  prisma.$disconnect();
  process.exit(1);
});
