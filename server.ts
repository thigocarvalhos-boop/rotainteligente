import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import { prisma } from "./src/lib/prisma";
import { auditService } from "./src/services/auditService";
import { alertService } from "./src/services/alertService";

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

  // Seed Initial Data
  const seedData = async () => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error("ERRO: DATABASE_URL não configurada.");
      return;
    }

    if (process.env.NODE_ENV === "production") {
      console.warn("SEED: ignorado em ambiente de produção. Execute manualmente via npm run seed.");
      return;
    }

    try {
      const adminEmail = "admin@guiasocial.org";
      let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
      
      if (!admin) {
        const hashedPassword = await bcrypt.hash("admin123", 12);
        admin = await prisma.user.create({
          data: {
            email: adminEmail,
            password: hashedPassword,
            name: "Administrador ROTA",
            role: "SUPER_ADMIN"
          }
        });
        console.log("Seed: Admin user created.");
      }

      const projectCount = await prisma.project.count();
      if (projectCount === 0) {
        const project = await prisma.project.create({
          data: {
            nome: "Guia Digital Teen 2026",
            edital: "FMCA/COMDICA",
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
            ptScore: 8,
            metas: {
              create: [
                { descricao: "Certificar jovens em tecnologia", indicador: "Jovens certificados", meta: 500, alcancado: 380, unidade: "Jovens", budget: 150000 },
                { descricao: "Inserção no mercado de trabalho", indicador: "Jovens empregados", meta: 50, alcancado: 12, unidade: "Jovens", budget: 100000 }
              ]
            },
            etapas: {
              create: [
                { nome: "Mobilização", inicio: new Date("2026-01-01"), fim: new Date("2026-02-28"), status: "Concluído", peso: 20 },
                { nome: "Execução das Aulas", inicio: new Date("2026-03-01"), fim: new Date("2026-07-31"), status: "Em curso", peso: 60 }
              ]
            },
            docs: {
              create: [
                { nome: "Estatuto Social", status: "Aprovado", validade: null },
                { nome: "CNPJ", status: "Aprovado", validade: null },
                { nome: "CND Federal", status: "Aprovado", validade: new Date("2026-05-20") }
              ]
            }
          }
        });

        await prisma.alert.create({
          data: {
            projectId: project.id,
            titulo: "Documento Vencendo",
            mensagem: "CND Municipal Recife vence em 15 dias.",
            nivel: "N4",
            status: "PENDENTE",
            tipo: "DOCUMENTO"
          }
        });

        console.log("Seed: Initial project and alerts created.");
      }
    } catch (error) {
      console.error("Seed: Erro ao popular dados iniciais. Verifique a conexão com o banco de dados.", error);
    }
  };
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
    "expenses:create":   ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "FINANCEIRO"],
    "documents:create":  ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "DOCUMENTAL"],
    "audit-logs:read":   ["SUPER_ADMIN", "DIRETORIA", "MONITORAMENTO"],
    "alerts:read":       ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "MONITORAMENTO", "FINANCEIRO", "ELABORADOR"],
    "projects:create":   ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO"],
    "projects:update":   ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO"],
    "projects:delete":   ["SUPER_ADMIN", "DIRETORIA"],
    "stats:read":        ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "MONITORAMENTO"],
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

      const validPassword = await bcrypt.compare(password, user.password);
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
          metas: true,
          etapas: true,
          docs: true,
          expenses: { include: { cotacoes: true } },
          compliance: true
        }
      });
      res.json(projects);
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
