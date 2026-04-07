import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import { prisma } from "./src/lib/prisma";
import { auditService } from "./src/services/auditService";
import { alertService } from "./src/services/alertService";

// ── Garante que as tabelas existem antes de qualquer coisa ─────────────────
async function ensureDatabase(): Promise<void> {
  console.log("[DB] Verificando banco de dados...");
  try {
    await prisma.$queryRaw`SELECT 1 FROM "User" LIMIT 1`;
    console.log("[DB] Tabelas já existem — ok.");
  } catch {
    console.log("[DB] Tabelas não encontradas. Criando...");
    try {
      // Usa o binário local do prisma — funciona com Node.js e Bun
      const prismaBin = path.join(process.cwd(), "node_modules", ".bin", "prisma");
      execFileSync(prismaBin, ["db", "push", "--accept-data-loss"], {
        stdio: "inherit",
        timeout: 120000,
        env: { ...process.env },
      });
      console.log("[DB] Banco criado com sucesso.");
    } catch (e: any) {
      console.error("[DB] Erro ao criar banco:", e.message);
    }
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "rota-dev-secret-key-2026";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "rota-dev-refresh-key-2026";

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn("AVISO: JWT_SECRET ou JWT_REFRESH_SECRET não configurados. Usando chaves de desenvolvimento.");
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  const projectAllowlist = [
    "nome", "edital", "financiador", "area", "valor", "status", "prazo",
    "probabilidade", "risco", "aderencia", "territorio", "publico",
    "competitividade", "proximoPasso", "ptScore", "observacao", "ano",
    "categoriaEdital", "programaInterno", "vigenciaInicio", "vigenciaFim",
    "progressoFisico", "progressoFinanceiro", "scoreCompliance", "scoreRiscoGlosa",
    "ptCriterios", "historico", "changeLog"
  ];

  const sanitizeProjectData = (body: any) => {
    const sanitized: any = {};
    projectAllowlist.forEach(field => {
      if (body[field] !== undefined) {
        if (["prazo", "vigenciaInicio", "vigenciaFim"].includes(field) && body[field]) {
          sanitized[field] = new Date(body[field]);
        } else {
          sanitized[field] = body[field];
        }
      }
    });
    return sanitized;
  };

  // Seed Initial Data — roda em todos os ambientes via upsert (seguro repetir)
  const seedData = async () => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error("ERRO: DATABASE_URL não configurada.");
      return;
    }

    try {
      const adminEmail = "admin@guiasocial.org";
      const hashedPassword = await bcrypt.hash("admin123", 12);

      // upsert: cria se não existe, mantém se já existe
      const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
          email: adminEmail,
          passwordHash: hashedPassword,
          name: "Administrador ROTA",
          role: "ADMIN"
        }
      });
      console.log("Seed: Admin user OK —", admin.email);

      const projectCount = await prisma.project.count();
      if (projectCount === 0) {
        const project = await prisma.project.create({
          data: {
            nome: "Guia Digital Teen 2026",
            financiador: "Fundo Municipal da Criança",
            area: "Digital",
            valor: 320000,
            status: "Inscrito",
            prazo: new Date("2026-04-15"),
            responsavelId: admin.id,
            probabilidade: 72,
            risco: "Médio",
            aderencia: 5,
            territorio: "RPA 6 — Pina / Ipsep",
            publico: "Adolescentes 12–18 anos",
            competitividade: "Alta",
            proximoPasso: "Aguardar resultado do edital",
          }
        });

        // Create documents for the project
        await prisma.document.createMany({
          data: [
            { nome: "Estatuto Social", status: "Aprovado", validade: null, projectId: project.id },
            { nome: "CNPJ", status: "Aprovado", validade: null, projectId: project.id },
            { nome: "CND Federal", status: "Aprovado", validade: new Date("2026-05-20"), projectId: project.id }
          ]
        });

        await alertService.create({
          projectId: project.id,
          titulo: "Documento Vencendo",
          mensagem: "CND Municipal Recife vence em 15 dias.",
          nivel: "N4",
          tipo: "DOCUMENTO",
          prazo: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        });

        console.log("Seed: Initial project and alerts created.");
      }

      // Seed editais if empty
      const editalCount = await prisma.edital.count();
      if (editalCount === 0) {
        await prisma.edital.createMany({
          data: [
            { nome: "Chamamento Público COMDICA 2026", financiador: "Prefeitura do Recife / COMDICA", valorMax: 400000, prazo: new Date("2026-05-15"), status: "Aberto", aderencia: 5, categoria: "Fundo Municipal", linha: "Eixo I — Proteção Básica", porte: "Grande", link: "https://recife.pe.gov.br/comdica", observacao: "Edital recorrente. IGS tem histórico de 100% de aprovação neste financiador." },
            { nome: "Edital Tecendo Infâncias", financiador: "Fundação Maria Cecilia Souto Vidigal", valorMax: 150000, prazo: new Date("2026-04-24"), status: "Aberto", aderencia: 4, categoria: "Fundação Privada", linha: "Primeira Infância", porte: "Pequeno", link: "https://fmcsv.org.br", observacao: "Exige vídeo de apresentação e portfólio detalhado." },
            { nome: "BrazilFoundation — Ciclo 2026", financiador: "BrazilFoundation", valorMax: 100000, prazo: new Date("2026-06-30"), status: "Em análise", aderencia: 3, categoria: "Cooperação Internacional", linha: "Educação e Cidadania", porte: "Médio", observacao: "Aguardando publicação do guia do proponente." },
            { nome: "Edital Itaú Social — Unicef", financiador: "Itaú Social", valorMax: 250000, prazo: new Date("2026-04-10"), status: "Encerrado", aderencia: 5, categoria: "Instituto Privado", linha: "Educação Integral", porte: "Médio", observacao: "IGS não submeteu este ano por conflito de agenda com COMDICA." },
          ],
        });
        console.log("Seed: Initial editais created.");
      }
    } catch (error) {
      console.error("Seed: Erro ao popular dados iniciais. Verifique a conexão com o banco de dados.", error);
    }
  };
  // Garante tabelas antes do seed
  await ensureDatabase();
  await seedData();

  // Verificar expiração de documentos a cada hora
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      await alertService.checkDocumentExpirations();
      setInterval(() => alertService.checkDocumentExpirations(), 60 * 60 * 1000);
    } catch (error) {
      console.error("AlertService: Erro ao verificar expirações.", error);
    }
  }

  // CORS — allows browser requests from any origin in development,
  // tighten ALLOWED_ORIGIN in production via env var
  app.use((req: any, res: any, next: any) => {
    const origin = process.env.ALLOWED_ORIGIN || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.use(express.json());

  // Logging Middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Acesso negado" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Token inválido" });
    }
  };

  // RBAC Middleware
  const PERMISSIONS: Record<string, string[]> = {
    "expenses:create":   ["ADMIN", "SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "FINANCEIRO"],
    "documents:create":  ["ADMIN", "SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "DOCUMENTAL"],
    "audit-logs:read":   ["ADMIN", "SUPER_ADMIN", "DIRETORIA", "MONITORAMENTO"],
    "alerts:read":       ["ADMIN", "SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "MONITORAMENTO", "FINANCEIRO", "ELABORADOR"],
    "projects:create":   ["ADMIN", "SUPER_ADMIN", "DIRETORIA", "COORDENACAO"],
    "projects:update":   ["ADMIN", "SUPER_ADMIN", "DIRETORIA", "COORDENACAO"],
    "projects:delete":   ["ADMIN", "SUPER_ADMIN", "DIRETORIA"],
    "stats:read":        ["ADMIN", "SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "MONITORAMENTO"],
  };

  const can = (permission: string) => (req: any, res: any, next: any) => {
    const allowed = PERMISSIONS[permission] || [];
    if (!allowed.includes(req.user?.role)) {
      return res.status(403).json({
        error: "Acesso negado",
        requiredRoles: allowed,
        currentRole: req.user?.role || "desconhecido"
      });
    }
    next();
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Auth Endpoint
  app.post("/api/auth/login", [
    body("email").isEmail(),
    body("password").isLength({ min: 6 })
  ], async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) return res.status(401).json({ error: "Credenciais inválidas" });

      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "15m" }
      );
      const refreshToken = jwt.sign(
        { id: user.id },
        JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );
      
      await auditService.log({
        userId: user.id,
        acao: "LOGIN",
        entidade: "User",
        entidadeId: user.id
      });

      res.json({
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    } catch (error) {
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  });

  app.post("/api/auth/refresh", async (req: any, res: any) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "Refresh token ausente" });
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) return res.status(401).json({ error: "Usuário não encontrado" });
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "15m" }
      );
      res.json({ accessToken });
    } catch {
      res.status(401).json({ error: "Refresh token inválido ou expirado" });
    }
  });

  // Project Routes
  app.get("/api/projects", authenticate, async (req, res) => {
    try {
      const projects = await prisma.project.findMany({
        include: {
          responsavel: true,
          alerts: true,
          documents: true,
          complianceChecks: true,
          auditLogs: { include: { user: true } },
        }
      });
      // Map relation names to match frontend interface and ensure non-null arrays for Json fields
      const mapped = projects.map(({ documents, ...rest }) => ({
        ...rest,
        docs: documents,
        ptCriterios: Array.isArray(rest.ptCriterios) ? rest.ptCriterios : [],
        historico: Array.isArray(rest.historico) ? rest.historico : [],
        changeLog: Array.isArray(rest.changeLog) ? rest.changeLog : [],
      }));
      res.json(mapped);
    } catch (error) {
      console.error("[GET /api/projects]", error);
      res.status(500).json({ error: "Erro ao buscar projetos" });
    }
  });

  app.post("/api/projects", authenticate, can("projects:create"), async (req: any, res: any) => {
    try {
      const sanitizedData = sanitizeProjectData(req.body);
      const project = await prisma.project.create({
        data: {
          ...sanitizedData,
          responsavelId: req.user.id,
          status: sanitizedData.status || "Triagem"
        }
      });

      await auditService.log({
        userId: req.user.id,
        projectId: project.id,
        acao: "CREATE",
        entidade: "Project",
        entidadeId: project.id,
        depois: project
      });

      res.status(201).json(project);
    } catch (error) {
      console.error("[POST /api/projects]", error);
      res.status(400).json({ error: "Erro ao criar projeto" });
    }
  });

  app.patch("/api/projects/:id", authenticate, can("projects:update"), async (req: any, res: any) => {
    const { id } = req.params;
    try {
      const existing = await prisma.project.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: "Projeto não encontrado" });

      const sanitizedData = sanitizeProjectData(req.body);
      const updated = await prisma.project.update({
        where: { id },
        data: sanitizedData
      });

      await auditService.log({
        userId: req.user.id,
        projectId: id,
        acao: "UPDATE",
        entidade: "Project",
        entidadeId: id,
        antes: existing,
        depois: updated
      });

      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: "Erro ao atualizar projeto" });
    }
  });

  app.patch("/api/projects/:id/status", authenticate, can("projects:update"), async (req: any, res: any) => {
    const { id } = req.params;
    const { status, justificativa } = req.body;
    
    const allowedStatus = ["Triagem", "Inscrito", "Em análise", "Aprovado", "Reprovado", "Em execução", "Concluído", "Cancelado"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }

    try {
      const existing = await prisma.project.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: "Projeto não encontrado" });

      const logEntry = {
        id: Math.random().toString(36).substr(2, 9),
        data: new Date().toISOString(),
        autor: req.user.name || req.user.email,
        campo: "status",
        valorAnterior: existing.status,
        valorNovo: status,
        justificativa
      };

      const currentLog = Array.isArray(existing.changeLog) ? existing.changeLog : [];
      const updated = await prisma.project.update({
        where: { id },
        data: {
          status,
          changeLog: [...currentLog, logEntry]
        }
      });

      await auditService.log({
        userId: req.user.id,
        projectId: id,
        acao: "UPDATE_STATUS",
        entidade: "Project",
        entidadeId: id,
        antes: { status: existing.status },
        depois: { status: updated.status, logEntry }
      });

      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: "Erro ao atualizar status" });
    }
  });

  app.delete("/api/projects/:id", authenticate, can("projects:delete"), async (req: any, res: any) => {
    const { id } = req.params;
    try {
      const existing = await prisma.project.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: "Projeto não encontrado" });

      await prisma.project.delete({ where: { id } });

      await auditService.log({
        userId: req.user.id,
        projectId: id,
        acao: "DELETE",
        entidade: "Project",
        entidadeId: id,
        antes: existing
      });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar projeto" });
    }
  });

  // Expense Routes with Anti-glosa
  app.post("/api/expenses", authenticate, can("expenses:create"), async (req: any, res: any) => {
    const { projectId, descricao, valor, vincMetaId, vincEtapaId, cotacoes, data, categoria } = req.body;
    
    try {
      // 1. Basic Validation
      if (!vincMetaId || !vincEtapaId) {
        return res.status(400).json({ error: "Vínculo com Meta e Etapa é obrigatório para evitar glosa." });
      }

      // 2. Economicity Check
      if (valor > 1000 && (!cotacoes || cotacoes.length < 3)) {
        return res.status(400).json({ 
          error: "Despesas acima de R$ 1.000,00 exigem no mínimo 3 cotações para conformidade institucional.",
          actionRequired: "Anexar cotações faltantes"
        });
      }

      // 3. Budget Validation
      const meta = await prisma.meta.findUnique({ where: { id: vincMetaId } });
      if (!meta) return res.status(404).json({ error: "Meta não encontrada" });

      const existingExpenses = await prisma.expense.findMany({
        where: { vincMetaId, status: "VALIDADO" }
      });
      const totalSpent = existingExpenses.reduce((sum, e) => sum + e.valor, 0);

      if (totalSpent + valor > meta.budget) {
        await alertService.create({
          projectId,
          titulo: "Tentativa de Estouro de Orçamento",
          mensagem: `Tentativa de lançar despesa de R$ ${valor} na meta ${meta.descricao} (Saldo: R$ ${meta.budget - totalSpent})`,
          nivel: "N4",
          tipo: "ORCAMENTO"
        });
        return res.status(400).json({ error: "Saldo insuficiente na meta para esta despesa." });
      }

      // 4. Schedule Validation
      const etapa = await prisma.etapa.findUnique({ where: { id: vincEtapaId } });
      if (!etapa) return res.status(404).json({ error: "Etapa não encontrada" });
      
      const expenseDate = new Date(data);
      if (expenseDate < etapa.inicio || expenseDate > etapa.fim) {
        return res.status(400).json({ error: "Data da despesa fora do cronograma da etapa vinculada." });
      }

      // 5. Persistence
      const expense = await prisma.expense.create({
        data: {
          projectId,
          descricao,
          valor,
          data: expenseDate,
          categoria,
          status: "VALIDADO",
          vincMetaId,
          vincEtapaId,
          cotacoes: {
            create: cotacoes?.map((c: any) => ({
              fornecedor: c.fornecedor,
              valor: c.valor,
              data: new Date(c.data),
              vencedora: c.vencedora,
              docUrl: c.docUrl
            }))
          }
        }
      });

      await auditService.log({
        userId: req.user.id,
        projectId,
        acao: "CREATE",
        entidade: "Expense",
        entidadeId: expense.id,
        depois: expense
      });

      res.status(201).json(expense);
    } catch (error) {
      res.status(500).json({ error: "Erro ao processar despesa" });
    }
  });

  // Document Routes
  app.post("/api/documents", authenticate, can("documents:create"), async (req: any, res: any) => {
    const { projectId, nome, validade, url } = req.body;
    try {
      const doc = await prisma.document.create({
        data: {
          projectId,
          nome,
          validade: validade ? new Date(validade) : null,
          url,
          status: "Pendente"
        }
      });

      await auditService.log({
        userId: req.user.id,
        projectId,
        acao: "UPLOAD",
        entidade: "Document",
        entidadeId: doc.id,
        depois: doc
      });

      res.status(201).json(doc);
    } catch (error) {
      res.status(400).json({ error: "Erro ao salvar documento" });
    }
  });

  // Alerts Route
  app.get("/api/alerts", authenticate, can("alerts:read"), async (req: any, res: any) => {
    try {
      const isAdmin = ["SUPER_ADMIN", "DIRETORIA"].includes(req.user.role);
      const alerts = await prisma.alert.findMany({
        where: {
          status: "PENDENTE",
          ...(isAdmin ? {} : { project: { responsavelId: req.user.id } })
        },
        include: { project: true },
        orderBy: { createdAt: "desc" }
      });
      res.json(alerts);
    } catch (error) {
      console.error("[GET /api/alerts]", error);
      res.status(500).json({ error: "Erro ao buscar alertas" });
    }
  });

  app.patch("/api/alerts/:id/read", authenticate, async (req: any, res: any) => {
    try {
      const alert = await prisma.alert.update({
        where: { id: req.params.id },
        data: { lido: true, lidoEm: new Date(), lidoPor: req.user.id }
      });
      res.json(alert);
    } catch {
      res.status(404).json({ error: "Alerta não encontrado" });
    }
  });

  app.patch("/api/alerts/:id/resolve", authenticate, async (req: any, res: any) => {
    const { resolucao } = req.body;
    if (!resolucao?.trim()) {
      return res.status(400).json({ error: "Campo 'resolucao' é obrigatório para encerrar o alerta" });
    }
    try {
      const alert = await prisma.alert.update({
        where: { id: req.params.id },
        data: { status: "RESOLVIDO", resolucao, lido: true, lidoEm: new Date(), lidoPor: req.user.id }
      });
      res.json(alert);
    } catch {
      res.status(404).json({ error: "Alerta não encontrado" });
    }
  });

  // Audit Logs Route
  app.get("/api/audit-logs", authenticate, can("audit-logs:read"), async (req, res) => {
    const logs = await prisma.auditLog.findMany({
      include: { user: true, project: true },
      orderBy: { data: "desc" },
      take: 50
    });
    res.json(logs);
  });

  // Documents Route
  app.get("/api/documents", authenticate, async (req, res) => {
    const docs = await prisma.document.findMany({
      include: { project: true },
      orderBy: { nome: "asc" }
    });
    res.json(docs);
  });

  app.patch("/api/documents/:id", authenticate, can("documents:create"), async (req: any, res: any) => {
    const { id } = req.params;
    try {
      const existing = await prisma.document.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: "Documento não encontrado" });

      const { nome, status, validade, url, projectId } = req.body;
      const updated = await prisma.document.update({
        where: { id },
        data: {
          ...(nome !== undefined && { nome }),
          ...(status !== undefined && { status }),
          ...(validade !== undefined && { validade: validade ? new Date(validade) : null }),
          ...(url !== undefined && { url }),
          ...(projectId !== undefined && { projectId: projectId || null }),
        },
      });

      await auditService.log({
        userId: req.user.id,
        projectId: updated.projectId || undefined,
        acao: "UPDATE",
        entidade: "Document",
        entidadeId: id,
        antes: existing,
        depois: updated,
      });

      res.json(updated);
    } catch (error) {
      console.error("[PATCH /api/documents/:id]", error);
      res.status(400).json({ error: "Erro ao atualizar documento" });
    }
  });

  app.delete("/api/documents/:id", authenticate, can("documents:create"), async (req: any, res: any) => {
    const { id } = req.params;
    try {
      const existing = await prisma.document.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: "Documento não encontrado" });

      await prisma.document.delete({ where: { id } });

      await auditService.log({
        userId: req.user.id,
        projectId: existing.projectId || undefined,
        acao: "DELETE",
        entidade: "Document",
        entidadeId: id,
        antes: existing,
      });

      res.status(204).send();
    } catch (error) {
      console.error("[DELETE /api/documents/:id]", error);
      res.status(500).json({ error: "Erro ao deletar documento" });
    }
  });

  // ── Editais CRUD ─────────────────────────────────────────────────────────
  const editalAllowlist = [
    "nome", "financiador", "valorMax", "prazo", "status",
    "aderencia", "categoria", "linha", "porte", "link", "observacao", "area"
  ];

  const sanitizeEditalData = (body: any) => {
    const sanitized: any = {};
    editalAllowlist.forEach(field => {
      if (body[field] !== undefined) {
        if (field === "prazo" && body[field]) {
          sanitized[field] = new Date(body[field]);
        } else if (field === "valorMax") {
          sanitized[field] = parseFloat(body[field]) || 0;
        } else if (field === "aderencia") {
          sanitized[field] = parseInt(body[field]) || 3;
        } else {
          sanitized[field] = body[field];
        }
      }
    });
    return sanitized;
  };

  app.get("/api/editais", authenticate, async (req, res) => {
    try {
      const editais = await prisma.edital.findMany({ orderBy: { createdAt: "desc" } });
      res.json(editais);
    } catch (error) {
      console.error("[GET /api/editais]", error);
      res.status(500).json({ error: "Erro ao buscar editais" });
    }
  });

  app.post("/api/editais", authenticate, async (req: any, res: any) => {
    try {
      const { nome, financiador } = req.body;
      if (!nome || !financiador) {
        return res.status(400).json({ error: "Nome e financiador são obrigatórios" });
      }
      const sanitized = sanitizeEditalData(req.body);
      const edital = await prisma.edital.create({ data: sanitized });

      await auditService.log({
        userId: req.user.id,
        acao: "CREATE",
        entidade: "Edital",
        entidadeId: edital.id,
        depois: edital,
      });

      res.status(201).json(edital);
    } catch (error) {
      console.error("[POST /api/editais]", error);
      res.status(400).json({ error: "Erro ao criar edital" });
    }
  });

  app.patch("/api/editais/:id", authenticate, async (req: any, res: any) => {
    const { id } = req.params;
    try {
      const existing = await prisma.edital.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: "Edital não encontrado" });

      const sanitized = sanitizeEditalData(req.body);
      const updated = await prisma.edital.update({ where: { id }, data: sanitized });

      await auditService.log({
        userId: req.user.id,
        acao: "UPDATE",
        entidade: "Edital",
        entidadeId: id,
        antes: existing,
        depois: updated,
      });

      res.json(updated);
    } catch (error) {
      console.error("[PATCH /api/editais/:id]", error);
      res.status(400).json({ error: "Erro ao atualizar edital" });
    }
  });

  app.delete("/api/editais/:id", authenticate, async (req: any, res: any) => {
    const { id } = req.params;
    try {
      const existing = await prisma.edital.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: "Edital não encontrado" });

      await prisma.edital.delete({ where: { id } });

      await auditService.log({
        userId: req.user.id,
        acao: "DELETE",
        entidade: "Edital",
        entidadeId: id,
        antes: existing,
      });

      res.status(204).send();
    } catch (error) {
      console.error("[DELETE /api/editais/:id]", error);
      res.status(500).json({ error: "Erro ao deletar edital" });
    }
  });

  // Stats Route
  app.get("/api/stats", authenticate, can("stats:read"), async (req, res) => {
    const [totalProjects, approvedProjects, totalValue] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: "Aprovado" } }),
      prisma.project.aggregate({ _sum: { valor: true } })
    ]);

    res.json({
      totalProjects,
      approvedProjects,
      totalValue: totalValue._sum.valor || 0,
      approvalRate: totalProjects > 0 ? (approvedProjects / totalProjects) * 100 : 0
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ROTA Production-Ready Server running on http://localhost:${PORT}`);
  });
}

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[uncaughtException]", error);
});

startServer();
