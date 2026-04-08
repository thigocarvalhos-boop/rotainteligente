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

// ── Diagnóstico de inicialização ─────────────────────────────────────────────
function logStartupDiagnostics() {
  const env = process.env.NODE_ENV || "development";
  const dbConfigured = !!(process.env.DATABASE_URL || process.env.URL_DO_BANCO_DE_DADOS);
  const dbSource = process.env.DATABASE_URL ? "DATABASE_URL" : process.env.URL_DO_BANCO_DE_DADOS ? "URL_DO_BANCO_DE_DADOS" : "NÃO CONFIGURADO";
  const jwtOk = !!process.env.JWT_SECRET;
  const jwtRefreshOk = !!process.env.JWT_REFRESH_SECRET;

  console.log("┌──────────────────────────────────────────┐");
  console.log("│         ROTA — Diagnóstico de Boot       │");
  console.log("├──────────────────────────────────────────┤");
  console.log(`│ NODE_ENV:        ${env.padEnd(23)}│`);
  console.log(`│ DB configurado:  ${(dbConfigured ? "SIM" : "NÃO").padEnd(23)}│`);
  console.log(`│ DB via:          ${dbSource.padEnd(23)}│`);
  console.log(`│ JWT_SECRET:      ${(jwtOk ? "OK" : "AUSENTE").padEnd(23)}│`);
  console.log(`│ JWT_REFRESH:     ${(jwtRefreshOk ? "OK" : "AUSENTE").padEnd(23)}│`);
  console.log("└──────────────────────────────────────────┘");
}

logStartupDiagnostics();

// ── Garante que o schema do banco está sincronizado ─────────────────────────
async function ensureDatabase(): Promise<boolean> {
  console.log("[DB] Sincronizando schema (prisma db push)...");
  try {
    const prismaBin = path.join(process.cwd(), "node_modules", ".bin", "prisma");
    execFileSync(prismaBin, ["db", "push", "--accept-data-loss"], {
      stdio: "inherit",
      timeout: 120000,
      env: { ...process.env },
    });
    console.log("[DB] Schema sincronizado com sucesso.");
    return true;
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (msg.includes("Can't reach database") ||
        msg.includes("connect") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("timeout")) {
      console.error("[DB] Banco indisponível:", msg);
    } else {
      console.error("[DB] Erro ao sincronizar schema:", msg);
    }
    return false;
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

const isProduction = process.env.NODE_ENV === "production";

const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? "" : "rota-dev-secret-key-2026");
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (isProduction ? "" : "rota-dev-refresh-key-2026");

if (isProduction && (!JWT_SECRET || !JWT_REFRESH_SECRET)) {
  console.error("[FATAL] JWT_SECRET e JWT_REFRESH_SECRET são obrigatórios em produção.");
  process.exit(1);
}

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

  const seedData = async () => {
    if (!process.env.DATABASE_URL) {
      console.error("[Seed] ERRO: DATABASE_URL não configurada. Seed abortado.");
      return;
    }

    console.log("[Seed] Iniciando seed de dados...");

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

      if (!admin?.id) {
        console.error("[Seed] ERRO: Falha ao criar/verificar usuário admin. Seed abortado.");
        return;
      }
      console.log("[Seed] Admin user OK —", admin.email, "| id:", admin.id);

      const projectCount = await prisma.project.count();
      console.log("[Seed] Projetos existentes:", projectCount);

      if (projectCount === 0) {
        console.log("[Seed] Criando projeto inicial...");

        const alertPrazo = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

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

        if (!project?.id) {
          console.error("[Seed] ERRO: Falha ao criar projeto inicial.");
        } else {
          console.log("[Seed] Projeto criado — id:", project.id, "| nome:", project.nome);

          await alertService.create({
            projectId: project.id,
            titulo: "Documento Vencendo",
            mensagem: "CND Municipal Recife vence em 15 dias.",
            nivel: "N4",
            tipo: "DOCUMENTO",
            prazo: alertPrazo
          });

          console.log("[Seed] Alerta criado — prazo:", alertPrazo.toISOString());
          console.log("[Seed] Projeto inicial e alertas criados com sucesso.");
        }
      } else {
        console.log("[Seed] Projetos já existem — seed de projeto ignorado.");
      }
    } catch (error: any) {
      console.error("[Seed] ERRO ao popular dados iniciais:", error?.message ?? error);
      console.error("[Seed] Stack:", error?.stack);
    }
  };
  // Garante tabelas antes do seed — com tolerância a banco indisponível
  const dbReady = await ensureDatabase();
  let seedDone = false;
  if (dbReady) {
    seedDone = await seedData();
  } else {
    console.warn("[STARTUP] Banco indisponível no boot. O servidor iniciará e tentará reconectar.");
  }

  // Retry seed em background se falhou no boot (DB temporariamente indisponível)
  if (!seedDone) {
    const retrySeed = async (attempt: number, maxAttempts: number) => {
      if (attempt > maxAttempts) {
        console.error(`[SEED RETRY] Desistindo após ${maxAttempts} tentativas.`);
        return;
      }
      const delay = Math.min(attempt * 10000, 60000); // 10s, 20s, 30s, ... max 60s
      console.log(`[SEED RETRY] Tentativa ${attempt}/${maxAttempts} em ${delay / 1000}s...`);
      setTimeout(async () => {
        try {
          const ready = await ensureDatabase();
          if (ready) {
            const ok = await seedData();
            if (ok) {
              console.log("[SEED RETRY] Seed concluído com sucesso!");
              return;
            }
          }
          retrySeed(attempt + 1, maxAttempts);
        } catch {
          retrySeed(attempt + 1, maxAttempts);
        }
      }, delay);
    };
    retrySeed(1, 6);
  }

  // Verificar expiração de documentos a cada hora
  const dbUrl = process.env.DATABASE_URL || process.env.URL_DO_BANCO_DE_DADOS;
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
  app.get("/api/health", async (req, res) => {
    const result: any = { status: "ok", timestamp: new Date().toISOString() };
    try {
      await prisma.$queryRaw`SELECT 1`;
      result.database = "connected";
      const userCount = await prisma.user.count();
      result.users = userCount;
      const hasAdmin = await prisma.user.findUnique({ where: { email: "admin@guiasocial.org" }, select: { id: true } });
      result.adminSeeded = !!hasAdmin;
    } catch (e: any) {
      result.status = "degraded";
      result.database = "error";
      result.dbError = e?.message;
    }
    res.json(result);
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
    } catch (error: any) {
      console.error("[LOGIN ERROR]", error?.message || error);
      // Distinguish DB connectivity errors from other internal errors
      const isDbError = error?.message?.includes("Can't reach database") ||
                        error?.message?.includes("connect") ||
                        error?.message?.includes("ECONNREFUSED") ||
                        error?.message?.includes("timeout") ||
                        error?.code === "P1001" || // Can't reach database server
                        error?.code === "P1002";   // Database server timed out
      if (isDbError) {
        res.status(503).json({ error: "Banco de dados temporariamente indisponível. Tente novamente em instantes." });
      } else {
        res.status(500).json({ error: "Erro interno no servidor" });
      }
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
      const projects = await prisma.project.findMany({ include: projectInclude });
      res.json(projects.map(mapProjectResponse));
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
        },
        include: projectInclude
      });

      await auditService.log({
        userId: req.user.id,
        projectId: project.id,
        acao: "CREATE",
        entidade: "Project",
        entidadeId: project.id,
        depois: project
      });

      res.status(201).json(mapProjectResponse(project));
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
        data: sanitizedData,
        include: projectInclude
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

      res.json(mapProjectResponse(updated));
    } catch (error) {
      res.status(400).json({ error: "Erro ao atualizar projeto" });
    }
  });

  app.patch("/api/projects/:id/status", authenticate, can("projects:update"), async (req: any, res: any) => {
    const { id } = req.params;
    const { status, justificativa } = req.body;
    
    const allowedStatus = [
      "Oportunidade", "Triagem", "Elaboração", "Revisão", "Pronto",
      "Inscrito", "Diligência", "Aprovado", "Não Aprovado",
      "Captado", "Formalização", "Execução", "Concluído", "Arquivado"
    ];
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
        },
        include: projectInclude
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

      res.json(mapProjectResponse(updated));
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

  // Expense Routes — disabled until Meta/Expense/Etapa models are added to schema
  app.post("/api/expenses", authenticate, can("expenses:create"), async (req: any, res: any) => {
    res.status(501).json({ error: "Módulo de despesas indisponível: modelos Meta, Expense e Etapa ainda não definidos no schema." });
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
    try {
      const logs = await prisma.auditLog.findMany({
        include: { user: true, project: true },
        orderBy: { data: "desc" },
        take: 50
      });
      res.json(logs);
    } catch (error) {
      console.error("[GET /api/audit-logs]", error);
      res.status(500).json({ error: "Erro ao buscar logs de auditoria" });
    }
  });

  // Documents Route
  app.get("/api/documents", authenticate, async (req, res) => {
    try {
      const docs = await prisma.document.findMany({
        include: { project: true },
        orderBy: { nome: "asc" }
      });
      res.json(docs);
    } catch (error) {
      console.error("[GET /api/documents]", error);
      res.status(500).json({ error: "Erro ao buscar documentos" });
    }
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
    try {
      const [totalProjects, approvedProjects, totalValue] = await Promise.all([
        prisma.project.count(),
        prisma.project.count({ where: { status: "Aprovado" } }),
        prisma.project.aggregate({ _sum: { valor: true } })
      ]);

      res.json({
        totalProjects,
        approvedProjects,
        totalValue: totalValue._sum.valor ?? 0,
        approvalRate: totalProjects > 0 ? (approvedProjects / totalProjects) * 100 : 0
      });
    } catch (error) {
      console.error("[GET /api/stats]", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
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
    const host = isProduction ? "0.0.0.0" : "localhost";
    console.log(`ROTA Server running on http://${host}:${PORT} [${process.env.NODE_ENV || "development"}]`);
  });
}

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[uncaughtException]", error);
});

startServer();
