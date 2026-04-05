/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart,
  Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import {
  LayoutDashboard, GitBranch, Library, Bell, Files, History,
  BarChart3, Search, ChevronRight, AlertCircle, CheckCircle2,
  Clock, ExternalLink, Download, ArrowLeft, Calendar, FileText,
  TrendingUp, ShieldCheck, Info, RefreshCw, Eye, Plus, X,
  Upload, Save, ChevronLeft, MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { B } from "./mockData";
import { Project, ProjectStatus, Alert as AlertType, Edital, Expense } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuthStore } from "./store/authStore";
import { apiClient } from "./api/client";

// ─── UTILS ────────────────────────────────────────────────────────────────

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString("pt-BR"); } catch { return value; }
}

function getResponsavelName(r: string | { name: string } | undefined): string {
  if (!r) return "—";
  return typeof r === "string" ? r : r.name;
}

function downloadCSV(filename: string, rows: string[][], headers: string[]) {
  const BOM = "\uFEFF";
  const csv = BOM + [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["D","S","T","Q","Q","S","S"];

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  "Oportunidade":  { color: B.gray,     bg: B.grayLight,  label: "Oportunidade" },
  "Triagem":       { color: B.orange,   bg: B.orangeBg,   label: "Em Triagem" },
  "Elaboração":    { color: B.blue,     bg: B.blueBg,     label: "Em Elaboração" },
  "Revisão":       { color: B.purple,   bg: B.purpleBg,   label: "Em Revisão" },
  "Pronto":        { color: B.teal,     bg: B.tealLight,  label: "Pronto p/ Envio" },
  "Inscrito":      { color: B.tealDark, bg: "#D0EBEC",    label: "Inscrito" },
  "Diligência":    { color: B.orange,   bg: B.orangeBg,   label: "Diligência" },
  "Aprovado":      { color: B.green,    bg: B.greenBg,    label: "Aprovado" },
  "Não Aprovado":  { color: B.red,      bg: B.redBg,      label: "Não Aprovado" },
  "Captado":       { color: B.blue,     bg: B.blueBg,     label: "Captado" },
  "Formalização":  { color: B.purple,   bg: B.purpleBg,   label: "Formalização" },
  "Execução":      { color: B.purple,   bg: B.purpleBg,   label: "Em Execução" },
  "Concluído":     { color: B.charcoal, bg: "#F9FAFB",    label: "Concluído" },
};

const AREA_COLORS = ["#1A7C7E","#E8A020","#7C3AED","#0369A1","#059669","#DC2626","#D97706","#374151"];

function fmt(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v}`;
}

// ─── COMPONENTES BASE ─────────────────────────────────────────────────────

function StatusBadge({ status, size = "sm" }: { status: ProjectStatus; size?: "sm" | "md" }) {
  const m = STATUS_META[status] || { color: B.gray, bg: B.grayLight, label: status };
  return (
    <span
      className={cn("font-bold rounded border uppercase tracking-wider inline-block",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1")}
      style={{ background: m.bg, color: m.color, borderColor: `${m.color}22` }}
    >{m.label}</span>
  );
}

function RiskBadge({ risco }: { risco: "Baixo" | "Médio" | "Alto" }) {
  const cfg = { "Baixo": { c: B.green, bg: B.greenBg }, "Médio": { c: B.orange, bg: B.orangeBg }, "Alto": { c: B.red, bg: B.redBg } }[risco];
  return (
    <span className="font-bold text-[10px] px-2 py-0.5 rounded border uppercase"
      style={{ background: cfg.bg, color: cfg.c, borderColor: `${cfg.c}22` }}>{risco}</span>
  );
}

function Card({ children, className, title, action }: { children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode }) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", className)}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          {title && <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className={cn("bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto", wide ? "max-w-3xl" : "max-w-2xl")}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all";
const selectCls = "w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition-all";

function Toast({ msg, type, onDone }: { msg: string; type: "success" | "error"; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-sm font-bold",
      type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
    )}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────

function DashboardView({ projects, alerts, onNav, onProject }: {
  projects: Project[]; alerts: AlertType[];
  onNav: (v: string) => void; onProject: (p: Project) => void;
}) {
  const active = projects.filter(p => !["Concluído","Arquivado","Não Aprovado"].includes(p.status));
  const totalPipeline = active.reduce((s, p) => s + p.valor, 0);
  const aprovados = projects.filter(p => p.status === "Aprovado").reduce((s, p) => s + p.valor, 0);
  const captados = projects.filter(p => ["Captado","Execução"].includes(p.status)).reduce((s, p) => s + p.valor, 0);
  const probMedia = active.length > 0 ? Math.round(active.reduce((s, p) => s + p.probabilidade, 0) / active.length) : 0;
  const withC = projects.filter(p => p.scoreCompliance !== undefined);
  const avgC = withC.length > 0 ? Math.round(withC.reduce((s, p) => s + (p.scoreCompliance || 0), 0) / withC.length) : 0;

  const phases = ["Triagem","Elaboração","Revisão","Inscrito","Aprovado","Execução"].map(f => ({
    fase: f,
    count: projects.filter(p => p.status === f).length,
    valor: projects.filter(p => p.status === f).reduce((s, p) => s + p.valor, 0),
  }));

  const areaData = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach(p => { counts[p.area] = (counts[p.area] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [projects]);

  const topChance = [...projects].filter(p => !["Concluído","Não Aprovado","Arquivado"].includes(p.status))
    .sort((a, b) => b.probabilidade - a.probabilidade).slice(0, 3);
  const urgent = alerts.filter(a => a.nivel === "N4" || a.nivel === "N3").slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Painel de Inteligência</h2>
          <p className="text-slate-500 text-sm">Visão executiva do pipeline institucional</p>
        </div>
        <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100 flex items-center gap-2">
          <AlertCircle className="w-3 h-3" />{urgent.length} Alertas Críticos
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Total no Pipeline", val: fmt(totalPipeline), sub: `${active.length} projetos ativos`, border: "border-l-slate-800", color: "text-slate-900" },
          { label: "Aprovados (A Captar)", val: fmt(aprovados), sub: "Aguardando formalização", border: "border-l-emerald-600", color: "text-emerald-700" },
          { label: "Em Execução", val: fmt(captados), sub: "Recursos comprometidos", border: "border-l-indigo-600", color: "text-indigo-700" },
          { label: "Probabilidade Média", val: `${probMedia}%`, sub: "Média ponderada", border: "border-l-amber-500", color: "text-amber-700" },
          { label: "Conformidade Média", val: `${avgC}%`, sub: "Score médio de compliance", border: "border-l-emerald-500", color: "text-emerald-700" },
        ].map(k => (
          <Card key={k.label} className={`border-l-4 ${k.border}`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
            <h3 className={`text-2xl font-bold font-serif ${k.color}`}>{k.val}</h3>
            <p className="text-xs text-slate-500 mt-1">{k.sub}</p>
          </Card>
        ))}
      </div>

      <Card title="Pipeline por Fase">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {phases.map(ph => {
            const m = STATUS_META[ph.fase] || STATUS_META["Inscrito"];
            return (
              <div key={ph.fase} onClick={() => onNav("pipeline")}
                className="p-4 rounded-lg cursor-pointer transition-all hover:translate-y-[-2px] border border-transparent hover:border-slate-200"
                style={{ background: m.bg }}>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: m.color }}>{ph.fase}</p>
                <h4 className="text-xl font-bold text-slate-900 font-serif">{ph.count}</h4>
                <p className="text-[10px] text-slate-500 font-medium">{fmt(ph.valor)}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Alertas Críticos" className="lg:col-span-1">
          <div className="space-y-4">
            {urgent.map(a => (
              <div key={a.id} className="flex items-start gap-3 pb-3 border-b border-slate-50 last:border-0">
                <div className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.cor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{a.projeto}</p>
                  <p className="text-[10px] text-slate-500">{a.tipo}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold" style={{ color: a.cor }}>{a.dias}d</p>
                  <p className="text-[9px] text-slate-400 uppercase">Prazo</p>
                </div>
              </div>
            ))}
            <button onClick={() => onNav("alertas")}
              className="w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">
              Ver todos os alertas
            </button>
          </div>
        </Card>

        <Card title="Áreas Temáticas" className="lg:col-span-1">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={areaData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={4}>
                  {areaData.map((_, i) => <Cell key={i} fill={AREA_COLORS[i % AREA_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {areaData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: AREA_COLORS[i % AREA_COLORS.length] }} />
                <span className="text-[10px] text-slate-600 truncate">{d.name}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Maior Probabilidade" className="lg:col-span-1">
          <div className="space-y-4">
            {topChance.map(p => (
              <div key={p.id} onClick={() => onProject(p)}
                className="group cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{p.nome}</h4>
                  <span className="text-sm font-bold text-emerald-600 font-serif">{p.probabilidade}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-slate-500">{p.financiador}</p>
                  <p className="text-[10px] font-bold text-slate-700">{fmt(p.valor)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── PIPELINE ──────────────────────────────────────────────────────────────

function PipelineView({ projects, onProject, onNewProject }: {
  projects: Project[]; onProject: (p: Project) => void; onNewProject: () => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");

  const filtered = useMemo(() => projects.filter(p => {
    const ms = p.nome.toLowerCase().includes(search.toLowerCase()) || p.financiador.toLowerCase().includes(search.toLowerCase());
    const mf = statusFilter === "Todos" || p.status === statusFilter;
    return ms && mf;
  }), [projects, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Pipeline de Projetos</h2>
          <p className="text-slate-500 text-sm">Gerenciamento completo do ciclo de vida</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onNewProject}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            <Plus className="w-4 h-4" /> Novo Projeto
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Buscar projeto..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="Todos">Todos os Status</option>
            {Object.keys(STATUS_META).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                {["Projeto","Financiador","Valor","Status","Prob.","Risco","Prazo"].map(h => (
                  <th key={h} className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400 italic text-sm">Nenhum projeto encontrado.</td></tr>
              )}
              {filtered.map((p, i) => (
                <tr key={p.id} onClick={() => onProject(p)}
                  className={cn("cursor-pointer transition-colors hover:bg-indigo-50/50 border-b border-slate-100 last:border-0", i % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                  <td className="py-4 px-6">
                    <p className="text-sm font-bold text-slate-900">{p.nome}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{p.id}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-xs text-slate-600">{p.financiador}</p>
                    <p className="text-[10px] text-slate-400">{p.area}</p>
                  </td>
                  <td className="py-4 px-6"><p className="text-sm font-bold text-slate-800">{fmt(p.valor)}</p></td>
                  <td className="py-4 px-6"><StatusBadge status={p.status} /></td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", p.probabilidade >= 70 ? "bg-emerald-500" : p.probabilidade >= 50 ? "bg-indigo-500" : "bg-amber-500")}
                          style={{ width: `${p.probabilidade}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{p.probabilidade}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-6"><RiskBadge risco={p.risco} /></td>
                  <td className="py-4 px-6"><p className="text-xs text-slate-600 font-medium">{formatDate(p.prazo)}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── PROJECT DETAIL ────────────────────────────────────────────────────────

function ProjectDetailView({ project, onBack, onAddDoc, onUpdateStatus, onRefresh, onToast }: {
  project: Project; onBack: () => void;
  onAddDoc: (projectId: string, projectName: string) => void;
  onUpdateStatus: (project: Project) => void;
  onRefresh: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
}) {
  const [activeTab, setActiveTab] = useState("geral");
  const [expenseModal, setExpenseModal] = useState<Expense | null>(null);
  const [commentModal, setCommentModal] = useState(false);

  const tabs = [
    { id: "geral", label: "Visão Geral", icon: Info },
    { id: "analise", label: "Análise Técnica", icon: TrendingUp },
    { id: "docs", label: "Documentação", icon: Files },
    { id: "conformidade", label: "Conformidade", icon: ShieldCheck },
    { id: "relatorios", label: "Relatórios", icon: BarChart3 },
    { id: "historico", label: "Histórico", icon: History },
  ];

  const handleDownloadDoc = (doc: { url?: string; nome: string }) => {
    if (doc.url) {
      window.open(doc.url, "_blank", "noopener,noreferrer");
    } else {
      onToast(`Documento "${doc.nome}" não possui link de acesso cadastrado.`, "error");
    }
  };

  const handleExportRelatorio = (titulo: string) => {
    if (!project) return;
    if (titulo === "Relatório de Conformidade") {
      const rows = (project.complianceChecks || []).map(c => [c.item, c.status, c.data]);
      downloadCSV(`conformidade_${project.id}.csv`, rows, ["Item","Status","Data"]);
      onToast("Relatório de conformidade exportado.", "success");
    } else if (titulo === "Execução Físico-Financeira") {
      const rows = (project.metas || []).map(m => [m.descricao, m.indicador, String(m.meta), String(m.alcancado), m.unidade]);
      downloadCSV(`execucao_${project.id}.csv`, rows, ["Meta","Indicador","Previsto","Alcançado","Unidade"]);
      onToast("Relatório de execução exportado.", "success");
    } else if (titulo === "Dossiê Documental") {
      const rows = project.docs.map(d => [d.nome, d.status, d.validade ? formatDate(d.validade) : "Permanente", d.url || "—"]);
      downloadCSV(`dossie_${project.id}.csv`, rows, ["Documento","Status","Validade","Link"]);
      onToast("Dossiê documental exportado.", "success");
    } else if (titulo === "Parecer de Auditoria") {
      const rows = (project.auditLogs || []).map((l: any) => [
        new Date(l.data).toLocaleString("pt-BR"), l.acao, l.entidade, l.entidadeId || "—", l.user?.name || "Sistema"
      ]);
      downloadCSV(`auditoria_${project.id}.csv`, rows, ["Data","Ação","Entidade","ID","Usuário"]);
      onToast("Parecer de auditoria exportado.", "success");
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold uppercase tracking-widest">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Pipeline
      </button>

      <Card className="border-t-4 border-t-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{project.id}</span>
              <StatusBadge status={project.status} size="md" />
              <RiskBadge risco={project.risco} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 font-serif mb-2">{project.nome}</h2>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Library className="w-4 h-4" /> {project.financiador}</span>
              <span className="flex items-center gap-1.5"><GitBranch className="w-4 h-4" /> {project.area}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Prazo: {formatDate(project.prazo)}</span>
            </div>
          </div>
          <div className="text-right bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[200px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Solicitado</p>
            <p className="text-3xl font-bold text-slate-900 font-serif">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(project.valor)}</p>
            <div className="mt-2 flex items-center justify-end gap-2">
              <span className="text-xs font-bold text-emerald-600">{project.probabilidade}% de chance</span>
              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${project.probabilidade}%` }} />
              </div>
            </div>
          </div>
        </div>
        {project.proximoPasso && (
          <div className="mt-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-0.5">Próximo Passo Crítico</p>
              <p className="text-sm text-amber-900 font-medium">{project.proximoPasso}</p>
            </div>
          </div>
        )}
      </Card>

      <div className="flex border-b border-slate-200 gap-8 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={cn("flex items-center gap-2 py-4 px-2 text-sm font-bold uppercase tracking-widest transition-all border-b-2 -mb-[1px] whitespace-nowrap",
              activeTab === t.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600")}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* ABA GERAL */}
          {activeTab === "geral" && (
            <Card title="Informações Estratégicas">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {[
                  { label: "Edital / Chamamento", value: project.edital },
                  { label: "Público-Alvo", value: project.publico },
                  { label: "Território", value: project.territorio },
                  { label: "Responsável", value: getResponsavelName(project.responsavel) },
                  { label: "Competitividade", value: project.competitividade },
                  { label: "Aderência", value: "★".repeat(project.aderencia) + "☆".repeat(5 - project.aderencia) },
                ].map(item => (
                  <div key={item.label} className="border-b border-slate-50 pb-3 last:border-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-sm text-slate-800 font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
              {project.observacao && (
                <div className="mt-8 p-5 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Observação Estratégica</p>
                  <p className="text-sm text-slate-700 leading-relaxed italic">"{project.observacao}"</p>
                </div>
              )}
            </Card>
          )}

          {/* ABA ANÁLISE */}
          {activeTab === "analise" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Parecer Técnico Interno (PTI)">
                  <div className="space-y-4">
                    {(project.ptCriterios || []).map(c => (
                      <div key={c.critério}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-slate-700">{c.critério}</span>
                          <span className="text-xs font-bold text-indigo-600">{c.score}/10</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", c.score >= 8 ? "bg-emerald-500" : c.score >= 6 ? "bg-indigo-500" : "bg-amber-500")}
                            style={{ width: `${c.score * 10}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title="Radar de Maturidade">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={project.ptCriterios || []}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="critério" tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }} />
                        <Radar name="Score" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <Card title="Módulo Antiglosa & Compliance"
                action={<div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Health Score:</span>
                  <span className={cn("text-sm font-bold", (project.scoreCompliance || 0) > 80 ? "text-emerald-600" : "text-amber-600")}>{project.scoreCompliance}%</span>
                </div>}>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Risco de Glosa</p>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xl font-bold", (project.scoreRiscoGlosa || 0) < 20 ? "text-emerald-600" : "text-red-600")}>{project.scoreRiscoGlosa}%</span>
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className={cn("h-full", (project.scoreRiscoGlosa || 0) < 20 ? "bg-emerald-500" : "bg-red-500")} style={{ width: `${project.scoreRiscoGlosa}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Metas vs Execução</p>
                      <p className="text-xl font-bold text-slate-900">{project.metas?.filter(m => m.alcancado >= m.meta).length || 0} / {project.metas?.length || 0}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Despesas Validadas</p>
                      <p className="text-xl font-bold text-slate-900">{fmt(project.expenses?.filter(e => e.status === "Validado").reduce((s, e) => s + e.valor, 0) || 0)}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Alertas de Auditoria Preventiva</h4>
                    {project.expenses?.filter(e => e.status === "Glosa").map(e => (
                      <div key={e.id} className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-red-800">Risco de Glosa: {e.descricao}</span>
                            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded uppercase">{fmt(e.valor)}</span>
                          </div>
                          <p className="text-xs text-red-700 leading-relaxed">{e.justificativa}</p>
                        </div>
                      </div>
                    ))}
                    {(!project.expenses || project.expenses.filter(e => e.status === "Glosa").length === 0) && (
                      <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                        <ShieldCheck className="w-8 h-8 text-emerald-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">Nenhuma inconsistência crítica detectada pela auditoria preventiva.</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ABA DOCS */}
          {activeTab === "docs" && (
            <Card title="Checklist Documental">
              <div className="space-y-1">
                {project.docs.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      {doc.status === "Aprovado" ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Clock className="w-5 h-5 text-amber-500" />}
                      <div>
                        <p className="text-sm font-bold text-slate-800">{doc.nome}</p>
                        {doc.validade && <p className="text-[10px] text-slate-400">Vencimento: {formatDate(doc.validade)}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                        doc.status === "Aprovado" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                        {doc.status}
                      </span>
                      <button onClick={() => handleDownloadDoc(doc)}
                        title={doc.url ? "Abrir documento" : "Documento sem link"}
                        className={cn("p-2 transition-colors", doc.url ? "text-slate-400 hover:text-indigo-600 cursor-pointer" : "text-slate-200 cursor-not-allowed")}>
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ABA CONFORMIDADE */}
          {activeTab === "conformidade" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-50 border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Health Score</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-slate-900">{project.scoreCompliance}%</span>
                    <span className="text-xs text-emerald-600 font-bold mb-1">Conforme</span>
                  </div>
                </Card>
                <Card className="bg-slate-50 border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Risco de Glosa</p>
                  <div className="flex items-end gap-2">
                    <span className={cn("text-3xl font-bold", (project.scoreRiscoGlosa || 0) < 20 ? "text-emerald-600" : "text-red-600")}>{project.scoreRiscoGlosa}%</span>
                    <span className="text-xs text-slate-500 font-medium mb-1">Calculado</span>
                  </div>
                </Card>
                <Card className="bg-slate-50 border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Metas vs Execução</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-slate-900">{project.metas?.filter(m => m.alcancado >= m.meta).length || 0}/{project.metas?.length || 0}</span>
                    <span className="text-xs text-slate-500 font-medium mb-1">Metas atingidas</span>
                  </div>
                </Card>
              </div>

              <Card title="Auditoria Preventiva de Despesas">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["Despesa","Valor","Status","Cotações","Detalhe"].map(h => (
                          <th key={h} className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest last:text-right">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(project.expenses || []).map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4">
                            <p className="text-sm font-bold text-slate-800">{exp.descricao}</p>
                            <p className="text-[10px] text-slate-400">{exp.categoria} • {exp.data}</p>
                          </td>
                          <td className="py-4"><p className="text-sm font-bold text-slate-900">{fmt(exp.valor)}</p></td>
                          <td className="py-4">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                              exp.status === "Validado" ? "bg-emerald-50 text-emerald-600" :
                              exp.status === "Glosa" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}>
                              {exp.status}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex -space-x-2">
                              {exp.cotacoes.map(c => (
                                <div key={c.id} className={cn("w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold",
                                  c.vencedora ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500")}>
                                  {c.fornecedor[0]}
                                </div>
                              ))}
                              {exp.cotacoes.length === 0 && <span className="text-[10px] text-slate-400 italic">Nenhuma</span>}
                            </div>
                          </td>
                          <td className="py-4 text-right">
                            <button onClick={() => setExpenseModal(exp)}
                              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Ver detalhes">
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Checklist de Conformidade">
                  <div className="space-y-3">
                    {(project.complianceChecks || []).map(check => (
                      <div key={check.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3">
                          {check.status === "Conforme" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
                          <span className="text-xs font-medium text-slate-700">{check.item}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{check.status}</span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title="Log de Auditoria">
                  <div className="space-y-4">
                    {(project.auditLogs || []).length === 0 ? (
                      <div className="p-4 text-center text-slate-400 italic text-xs">Nenhum registro de auditoria.</div>
                    ) : (
                      (project.auditLogs || []).map((log: any) => (
                        <div key={log.id} className="relative pl-4 border-l-2 border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">{new Date(log.data).toLocaleString("pt-BR")}</p>
                          <p className="text-xs font-bold text-slate-800">{log.acao}</p>
                          <p className="text-[10px] text-slate-500">{log.user?.name || "Sistema"} • {log.entidade}</p>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ABA RELATÓRIOS */}
          {activeTab === "relatorios" && (
            <div className="space-y-6">
              <Card title="Central de Relatórios Institucionais">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: "Relatório de Conformidade", desc: "Visão completa do status de compliance e riscos de glosa.", icon: ShieldCheck },
                    { title: "Execução Físico-Financeira", desc: "Comparativo entre metas atingidas e orçamento executado.", icon: TrendingUp },
                    { title: "Dossiê Documental", desc: "Compilado de todos os documentos validados e pendentes.", icon: Files },
                    { title: "Parecer de Auditoria", desc: "Relatório detalhado para prestação de contas final.", icon: FileText },
                  ].map(rel => (
                    <div key={rel.title} onClick={() => handleExportRelatorio(rel.title)}
                      className="p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all group cursor-pointer">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                          <rel.icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-slate-800 mb-1">{rel.title}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">{rel.desc}</p>
                        </div>
                        <Download className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-slate-400 text-center">Exportação em CSV compatível com Excel e Google Sheets</p>
              </Card>

              <Card title="Indicadores de Desempenho do Projeto">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={project.metas || []}>
                      <XAxis dataKey="indicador" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                      <Bar dataKey="meta" name="Meta" fill="#e2e8f0" radius={[4,4,0,0]} />
                      <Bar dataKey="alcancado" name="Alcançado" fill="#4f46e5" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-center gap-6">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-200" /><span className="text-[10px] font-bold text-slate-400 uppercase">Meta Prevista</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-600" /><span className="text-[10px] font-bold text-slate-400 uppercase">Execução Real</span></div>
                </div>
              </Card>
            </div>
          )}

          {/* ABA HISTÓRICO */}
          {activeTab === "historico" && (
            <div className="space-y-6">
              <Card title="Linha do Tempo Institucional">
                <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {(project.historico || []).map((h, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-8 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center z-10">
                        <div className="w-2 h-2 rounded-full bg-indigo-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{h.data}</p>
                        <p className="text-sm font-bold text-slate-800">{h.acao}</p>
                        <p className="text-xs text-slate-500">Responsável: {h.autor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              {project.changeLog && project.changeLog.length > 0 && (
                <Card title="Histórico de Alterações Críticas">
                  <div className="space-y-4">
                    {project.changeLog.map(log => (
                      <div key={log.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-white rounded-lg border border-slate-100">
                              {log.campo === "valor" && <TrendingUp className="w-4 h-4 text-emerald-600" />}
                              {log.campo === "status" && <RefreshCw className="w-4 h-4 text-indigo-600" />}
                              {log.campo === "probabilidade" && <BarChart3 className="w-4 h-4 text-amber-600" />}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campo Alterado</p>
                              <p className="text-sm font-bold text-slate-800 capitalize">{log.campo}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{log.data}</p>
                            <p className="text-xs font-medium text-slate-600">{log.autor}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-100 mb-3">
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Anterior</p>
                            <p className="text-sm font-medium text-slate-500 line-through">{log.campo === "valor" ? fmt(Number(log.valorAnterior)) : log.campo === "probabilidade" ? `${log.valorAnterior}%` : log.valorAnterior}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Novo</p>
                            <p className="text-sm font-bold text-slate-900">{log.campo === "valor" ? fmt(Number(log.valorNovo)) : log.campo === "probabilidade" ? `${log.valorNovo}%` : log.valorNovo}</p>
                          </div>
                        </div>
                        {log.justificativa && (
                          <div className="flex gap-2 items-start">
                            <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                            <p className="text-xs text-slate-500 italic leading-relaxed">"{log.justificativa}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* SIDEBAR DO PROJETO */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-slate-900 text-white border-none">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Resumo Executivo</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <span className="text-xs text-slate-400">Score PTI</span>
                <span className="text-lg font-bold font-serif text-emerald-400">{project.ptScore}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <span className="text-xs text-slate-400">Probabilidade</span>
                <span className="text-lg font-bold font-serif text-indigo-400">{project.probabilidade}%</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <span className="text-xs text-slate-400">Risco</span>
                <span className={cn("text-xs font-bold uppercase", project.risco === "Baixo" ? "text-emerald-400" : project.risco === "Médio" ? "text-amber-400" : "text-red-400")}>{project.risco}</span>
              </div>
            </div>
            <button
              onClick={() => {
                const rows = [
                  ["Projeto", project.nome],
                  ["Financiador", project.financiador],
                  ["Valor", String(project.valor)],
                  ["Status", project.status],
                  ["Score PTI", String(project.ptScore)],
                  ["Probabilidade", `${project.probabilidade}%`],
                  ["Risco", project.risco],
                  ["Prazo", formatDate(project.prazo)],
                  ["Responsável", getResponsavelName(project.responsavel)],
                  ["Observação", project.observacao || ""],
                ];
                downloadCSV(`parecer_${project.id}.csv`, rows, ["Campo","Valor"]);
                onToast("Parecer exportado como CSV.", "success");
              }}
              className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Exportar Parecer (CSV)
            </button>
          </Card>

          <Card title="Ações Rápidas">
            <div className="space-y-2">
              {[
                { label: "Atualizar Status", icon: TrendingUp, action: () => onUpdateStatus(project) },
                { label: "Adicionar Documento", icon: FileText, action: () => onAddDoc(project.id, project.nome) },
                { label: "Registrar Comentário", icon: MessageSquare, action: () => setCommentModal(true) },
              ].map(a => (
                <button key={a.label} onClick={a.action}
                  className="w-full flex items-center gap-3 p-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all border border-transparent hover:border-slate-100">
                  <a.icon className="w-4 h-4" />{a.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* MODAL DETALHE DESPESA */}
      {expenseModal && (
        <Modal title={`Despesa — ${expenseModal.descricao}`} onClose={() => setExpenseModal(null)}>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Valor", value: fmt(expenseModal.valor) },
                { label: "Status", value: expenseModal.status },
                { label: "Categoria", value: expenseModal.categoria },
                { label: "Data", value: expenseModal.data },
                { label: "Meta Vinculada", value: expenseModal.vincMetaId },
                { label: "Etapa Vinculada", value: expenseModal.vincEtapaId },
              ].map(f => (
                <div key={f.label} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{f.label}</p>
                  <p className="text-sm font-bold text-slate-800">{f.value}</p>
                </div>
              ))}
            </div>
            {expenseModal.justificativa && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Justificativa de Glosa</p>
                <p className="text-sm text-red-800">{expenseModal.justificativa}</p>
              </div>
            )}
            {expenseModal.cotacoes.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3">Cotações</p>
                <div className="space-y-2">
                  {expenseModal.cotacoes.map(c => (
                    <div key={c.id} className={cn("flex items-center justify-between p-3 rounded-lg border", c.vencedora ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100")}>
                      <div className="flex items-center gap-2">
                        {c.vencedora && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        <span className="text-sm font-bold text-slate-800">{c.fornecedor}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-900">{fmt(c.valor)}</span>
                        {c.docUrl && (
                          <button onClick={() => window.open(c.docUrl, "_blank")} className="block text-[10px] text-indigo-600 hover:underline mt-0.5">Ver documento</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* MODAL COMENTÁRIO */}
      {commentModal && (
        <ModalComentario
          projectId={project.id}
          onClose={() => setCommentModal(false)}
          onSaved={() => { setCommentModal(false); onRefresh(); onToast("Comentário registrado.", "success"); }}
        />
      )}
    </div>
  );
}

// ─── EDITAIS ───────────────────────────────────────────────────────────────

function EditaisView({ onToast, onProjectCreated }: {
  onToast: (msg: string, type: "success"|"error") => void;
  onProjectCreated: () => void;
}) {
  const [search, setSearch] = useState("");
  const [editais, setEditais] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [novoEditalModal, setNovoEditalModal] = useState(false);
  const [transformModal, setTransformModal] = useState<Edital | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/editais", {
        headers: { Authorization: `Bearer ${localStorage.getItem("rota_token")}` },
      });
      if (!res.ok) throw new Error("Erro ao carregar editais");
      setEditais(await res.json());
    } catch {
      // Fallback: importar mock apenas se API falhar
      try {
        const { EDITAIS } = await import("./mockData");
        setEditais(EDITAIS);
      } catch {
        setError("Não foi possível carregar os editais.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = editais.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.financiador.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Banco de Editais</h2>
          <p className="text-slate-500 text-sm">Oportunidades mapeadas e em monitoramento</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setNovoEditalModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            <Plus className="w-4 h-4" /> Novo Edital
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Buscar edital ou financiador..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-80" />
          </div>
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-700 transition-colors" title="Atualizar"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
      {loading && <div className="p-12 text-center text-slate-400 text-sm">Carregando editais...</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="p-12 text-center text-slate-400 italic text-sm border-2 border-dashed border-slate-200 rounded-xl">
          Nenhum edital encontrado.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(e => (
          <div key={e.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{e.categoria}</span>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                  e.status === "Aberto" ? "bg-emerald-50 text-emerald-600" :
                  e.status === "Em análise" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500")}>
                  {e.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors leading-tight">{e.nome}</h3>
              <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5"><Library className="w-3.5 h-3.5" /> {e.financiador}</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Valor Máx.</p>
                  <p className="text-xs font-bold text-slate-800">{fmt(e.valorMax)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Prazo</p>
                  <p className="text-xs font-bold text-red-600">{formatDate(e.prazo)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-50 gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Aderência</span>
                  <span className="text-amber-400 text-xs">{"★".repeat(e.aderencia)}{"☆".repeat(5 - e.aderencia)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {e.link ? (
                    <button onClick={() => window.open(e.link, "_blank", "noopener,noreferrer")}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                      Ver Edital <ExternalLink className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-xs text-slate-300 italic">Sem link</span>
                  )}
                  {e.status === "Aberto" && (
                    <button onClick={() => setTransformModal(e)}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 ml-2 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors">
                      <Plus className="w-3 h-3" /> Projeto
                    </button>
                  )}
                </div>
              </div>
              {e.observacao && (
                <p className="mt-3 pt-3 border-t border-slate-50 text-[10px] text-slate-400 italic leading-relaxed">{e.observacao}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {novoEditalModal && (
        <ModalNovoEdital
          onClose={() => setNovoEditalModal(false)}
          onSaved={() => { setNovoEditalModal(false); load(); onToast("Edital cadastrado.", "success"); }}
        />
      )}
      {transformModal && (
        <ModalNovoProje
          onClose={() => setTransformModal(null)}
          onSaved={() => { setTransformModal(null); onProjectCreated(); onToast("Projeto criado a partir do edital.", "success"); }}
          prefill={{
            nome: transformModal.nome,
            edital: transformModal.nome,
            financiador: transformModal.financiador,
            valor: String(transformModal.valorMax),
            prazo: transformModal.prazo,
            categoriaEdital: transformModal.categoria,
          }}
        />
      )}
    </div>
  );
}

// ─── ALERTAS ───────────────────────────────────────────────────────────────

function AlertasView({ alerts }: { alerts: AlertType[] }) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const alertsByDay: Record<number, AlertType[]> = {};
  alerts.forEach(a => {
    if (!a.prazo || a.prazo === "N/A") return;
    const parts = a.prazo.split("/");
    if (parts.length !== 3) return;
    const d = parseInt(parts[0]);
    const m = parseInt(parts[1]) - 1;
    const y = parseInt(parts[2]);
    if (y === calYear && m === calMonth && !isNaN(d)) {
      if (!alertsByDay[d]) alertsByDay[d] = [];
      alertsByDay[d].push(a);
    }
  });

  const dayAlerts = selectedDay ? (alertsByDay[selectedDay] || []) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Alertas e Prazos</h2>
          <p className="text-slate-500 text-sm">Monitoramento proativo de datas críticas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card title="Linha do Tempo de Urgências">
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-sm">Nenhum alerta pendente no momento.</div>
              ) : (
                [...alerts].sort((a, b) => (a.dias || 0) - (b.dias || 0)).map(a => (
                  <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0" style={{ background: a.bgCor || "#f1f5f9" }}>
                      <span className="text-[10px] font-bold uppercase" style={{ color: a.cor || "#64748b" }}>{a.nivel}</span>
                      <span className="text-lg font-bold font-serif" style={{ color: a.cor || "#64748b" }}>{a.dias ?? "?"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{a.titulo || a.tipo}</h4>
                      <p className="text-xs text-slate-500">{a.tipo}{a.mensagem ? ` — ${a.mensagem}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">{a.prazo}</p>
                      <p className="text-[9px] text-slate-400 uppercase font-bold">Vencimento</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card title="Resumo por Nível">
            <div className="space-y-4">
              {[
                { nivel: "N4", label: "Crítico", color: B.red },
                { nivel: "N3", label: "Urgente", color: B.orange },
                { nivel: "N2", label: "Atenção", color: B.blue },
                { nivel: "N1", label: "Informativo", color: B.gray },
              ].map(n => (
                <div key={n.nivel} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: n.color }} />
                    <span className="text-xs font-bold text-slate-600">{n.label} ({n.nivel})</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{alerts.filter(a => a.nivel === n.nivel).length}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Calendário">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => { const d = new Date(calYear, calMonth - 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); setSelectedDay(null); }}
                className="p-1 text-slate-400 hover:text-slate-700 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{MESES[calMonth]} {calYear}</span>
              <button onClick={() => { const d = new Date(calYear, calMonth + 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); setSelectedDay(null); }}
                className="p-1 text-slate-400 hover:text-slate-700 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {DIAS_SEMANA.map((d, i) => <span key={i} className="text-[10px] font-bold text-slate-400">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const hasAlert = !!alertsByDay[day];
                const isToday = calYear === today.getFullYear() && calMonth === today.getMonth() && day === today.getDate();
                const isSelected = selectedDay === day;
                return (
                  <button key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={cn("aspect-square flex items-center justify-center text-[10px] rounded-md border transition-colors",
                      isSelected ? "bg-indigo-600 border-indigo-600 text-white font-bold" :
                      hasAlert ? "bg-red-50 border-red-200 text-red-700 font-bold hover:bg-red-100" :
                      isToday ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold" :
                      "bg-white border-slate-50 text-slate-400 hover:bg-slate-50")}>
                    {day}
                  </button>
                );
              })}
            </div>
            {selectedDay && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">{selectedDay} de {MESES[calMonth]}</p>
                {dayAlerts.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhum alerta neste dia.</p>
                ) : (
                  <div className="space-y-2">
                    {dayAlerts.map(a => (
                      <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: a.bgCor }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: a.cor }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold truncate" style={{ color: a.cor }}>{a.projeto}</p>
                          <p className="text-[9px] text-slate-500">{a.tipo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── DOCUMENTOS ────────────────────────────────────────────────────────────

function DocumentosView({ documents, onNewDoc, onToast }: {
  documents: any[]; onNewDoc: () => void;
  onToast: (msg: string, type: "success"|"error") => void;
}) {
  const handleDownload = (doc: any) => {
    if (doc.url) window.open(doc.url, "_blank", "noopener,noreferrer");
    else onToast(`"${doc.nome}" não possui link cadastrado.`, "error");
  };

  const handleExportKit = () => {
    const rows = documents.map(d => [d.nome, d.status, d.validade ? formatDate(d.validade) : "Permanente", d.project?.nome || "Institucional", d.url || "—"]);
    downloadCSV("kit_documental.csv", rows, ["Documento","Status","Validade","Projeto","Link"]);
    onToast("Kit documental exportado como CSV.", "success");
  };

  const handleAtualizarCertidoes = () => {
    window.open("https://www.regularidade.receita.fazenda.gov.br/", "_blank", "noopener,noreferrer");
  };

  const handleConsultarRegularidade = () => {
    window.open("https://sistemasweb.agricultura.gov.br/pages/SICONABPublic.html", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Gestão Documental</h2>
          <p className="text-slate-500 text-sm">Biblioteca institucional e certidões</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onNewDoc}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-200 flex items-center gap-2 hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> Novo Documento
          </button>
          <button onClick={handleExportKit}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-colors">
            <Download className="w-4 h-4" /> Exportar Kit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Documentos Institucionais e de Projetos">
            <div className="space-y-1">
              {documents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-sm">Nenhum documento encontrado.</div>
              ) : (
                documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">{doc.nome}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">
                            Validade: {doc.validade ? new Date(doc.validade).toLocaleDateString("pt-BR") : "Permanente"}
                          </p>
                          {doc.project && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">
                              {doc.project.nome}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                        doc.status === "Aprovado" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                        {doc.status}
                      </span>
                      <button onClick={() => handleDownload(doc)}
                        title={doc.url ? "Abrir documento" : "Sem link disponível"}
                        className={cn("p-2 transition-colors", doc.url ? "text-slate-400 hover:text-indigo-600" : "text-slate-200 cursor-not-allowed")}>
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card title="Status de Certidões">
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800">Regularidade Fiscal</span>
                </div>
                <p className="text-[10px] text-emerald-700">Todas as certidões federais e estaduais estão em dia.</p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-800">Atenção: Municipal</span>
                </div>
                <p className="text-[10px] text-amber-700">CND Municipal Recife vence em 15 dias. Processo de renovação iniciado.</p>
              </div>
            </div>
          </Card>
          <Card title="Ações Rápidas">
            <div className="space-y-2">
              <button onClick={handleAtualizarCertidoes}
                className="w-full p-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 flex items-center gap-2 transition-colors">
                <RefreshCw className="w-4 h-4" /> Atualizar Certidões
              </button>
              <button onClick={handleConsultarRegularidade}
                className="w-full p-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 flex items-center gap-2 transition-colors">
                <Search className="w-4 h-4" /> Consultar Regularidade
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── MEMÓRIA ───────────────────────────────────────────────────────────────

function MemoriaView({ stats, auditLogs, onToast }: {
  stats: any; auditLogs: any[];
  onToast: (msg: string, type: "success"|"error") => void;
}) {
  const [licoes, setLicoes] = useState<any[]>([]);
  const [loadingLicoes, setLoadingLicoes] = useState(true);
  const [novaLicaoModal, setNovaLicaoModal] = useState(false);

  const loadLicoes = useCallback(async () => {
    setLoadingLicoes(true);
    try {
      const res = await fetch("/api/licoes", { headers: { Authorization: `Bearer ${localStorage.getItem("rota_token")}` } });
      if (!res.ok) throw new Error();
      setLicoes(await res.json());
    } catch {
      // Fallback estático enquanto endpoint não existe
      setLicoes([
        { id: "l1", projeto: "Guia Alimenta Recife", licao: "Aumentar detalhamento da metodologia de busca ativa para editais de assistência social.", data: "Mar/2026" },
        { id: "l2", projeto: "Maré Delas", licao: "Confirmar disponibilidade de local parceiro antes da submissão para evitar diligência de infraestrutura.", data: "Fev/2026" },
        { id: "l3", projeto: "Cidadania +60", licao: "Focar em indicadores de inclusão digital para editais de conselhos de idosos.", data: "Jan/2026" },
      ]);
    } finally {
      setLoadingLicoes(false);
    }
  }, []);

  useEffect(() => { loadLicoes(); }, [loadLicoes]);

  const displayStats = [
    { label: "Projetos Submetidos", value: stats?.totalProjects || 0, icon: GitBranch, color: B.blue },
    { label: "Taxa de Aprovação", value: `${(stats?.approvalRate || 0).toFixed(1)}%`, icon: TrendingUp, color: B.green },
    { label: "Total Captado (Histórico)", value: fmt(stats?.totalValue || 0), icon: ShieldCheck, color: B.teal },
    { label: "Audit Logs Recentes", value: auditLogs.length, icon: History, color: B.purple },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Memória Organizacional</h2>
          <p className="text-slate-500 text-sm">Inteligência acumulada e histórico de impacto</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayStats.map(s => (
          <Card key={s.label}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg" style={{ background: `${s.color}15` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 font-serif">{s.value}</h3>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Log de Auditoria Institucional">
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic text-sm">Nenhum registro encontrado.</div>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(log.data).toLocaleString("pt-BR")}</span>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">{log.acao}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">{log.entidade} {log.entidadeId}</p>
                  <p className="text-[10px] text-slate-500">Usuário: {log.user?.name || "Sistema"}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Lições Aprendidas"
          action={
            <button onClick={() => setNovaLicaoModal(true)}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Nova Lição
            </button>
          }>
          <div className="space-y-4">
            {loadingLicoes ? (
              <div className="p-4 text-center text-slate-400 text-sm">Carregando...</div>
            ) : licoes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic text-sm border-2 border-dashed border-slate-200 rounded-xl">Nenhuma lição registrada ainda.</div>
            ) : (
              licoes.map((l, i) => (
                <div key={l.id || i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-xs font-bold text-slate-800">{l.projeto}</h4>
                    <span className="text-[10px] font-bold text-slate-400">{l.data}</span>
                  </div>
                  <p className="text-xs text-slate-600 italic leading-relaxed">"{l.licao}"</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {novaLicaoModal && (
        <ModalNovaLicao
          onClose={() => setNovaLicaoModal(false)}
          onSaved={() => { setNovaLicaoModal(false); loadLicoes(); onToast("Lição registrada.", "success"); }}
        />
      )}
    </div>
  );
}

// ─── RELATÓRIOS ────────────────────────────────────────────────────────────

function RelatoriosView({ projects, onToast }: {
  projects: Project[];
  onToast: (msg: string, type: "success"|"error") => void;
}) {
  const handleExport = (titulo: string) => {
    if (titulo === "Pipeline Executivo") {
      const rows = projects.map(p => [p.nome, p.financiador, String(p.valor), p.status, `${p.probabilidade}%`, p.risco, formatDate(p.prazo)]);
      downloadCSV("pipeline_executivo.csv", rows, ["Projeto","Financiador","Valor","Status","Probabilidade","Risco","Prazo"]);
      onToast("Pipeline exportado.", "success");
    } else if (titulo === "Relatório de Captação") {
      const captados = projects.filter(p => ["Captado","Execução","Aprovado"].includes(p.status));
      const rows = captados.map(p => [p.nome, p.financiador, String(p.valor), p.status, formatDate(p.prazo)]);
      downloadCSV("captacao.csv", rows, ["Projeto","Financiador","Valor","Status","Prazo"]);
      onToast("Relatório de captação exportado.", "success");
    } else if (titulo === "Status Documental") {
      const rows: string[][] = [];
      projects.forEach(p => (p.docs || []).forEach(d => rows.push([p.nome, d.nome, d.status, d.validade ? formatDate(d.validade) : "Permanente"])));
      downloadCSV("status_documental.csv", rows, ["Projeto","Documento","Status","Validade"]);
      onToast("Status documental exportado.", "success");
    } else if (titulo === "Desempenho Técnico") {
      const rows = projects.map(p => [p.nome, String(p.ptScore), `${p.probabilidade}%`, p.risco, String(p.scoreCompliance || "—")]);
      downloadCSV("desempenho_tecnico.csv", rows, ["Projeto","Score PTI","Probabilidade","Risco","Score Compliance"]);
      onToast("Desempenho técnico exportado.", "success");
    } else if (titulo === "Impacto Territorial") {
      const rows = projects.map(p => [p.nome, p.territorio || "—", p.publico || "—", p.area, String(p.valor)]);
      downloadCSV("impacto_territorial.csv", rows, ["Projeto","Território","Público","Área","Valor"]);
      onToast("Impacto territorial exportado.", "success");
    } else if (titulo === "Memória de Editais") {
      const rows = projects.map(p => [p.nome, p.edital, p.financiador, p.categoriaEdital || "—", p.status, String(p.ano || "—")]);
      downloadCSV("memoria_editais.csv", rows, ["Projeto","Edital","Financiador","Categoria","Status","Ano"]);
      onToast("Memória de editais exportada.", "success");
    }
  };

  const reports = [
    { title: "Pipeline Executivo", desc: "Visão completa de valores e probabilidades por fase.", icon: LayoutDashboard },
    { title: "Relatório de Captação", desc: "Histórico de recursos captados e projeção anual.", icon: TrendingUp },
    { title: "Status Documental", desc: "Checklist de certidões e documentos institucionais.", icon: Files },
    { title: "Desempenho Técnico", desc: "Análise de scores PTI e taxas de aprovação.", icon: BarChart3 },
    { title: "Impacto Territorial", desc: "Distribuição de projetos e beneficiários por RPA.", icon: Search },
    { title: "Memória de Editais", desc: "Histórico de submissões por financiador.", icon: Library },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Relatórios e Exportações</h2>
          <p className="text-slate-500 text-sm">Exportação em CSV compatível com Excel e Google Sheets</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map(r => (
          <div key={r.title} onClick={() => handleExport(r.title)}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <div className="w-10 h-10 bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-lg flex items-center justify-center mb-4 transition-colors">
              <r.icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">{r.title}</h3>
            <p className="text-xs text-slate-500 mb-6">{r.desc}</p>
            <div className="w-full py-2 bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2">
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MODAIS ────────────────────────────────────────────────────────────────

function ModalNovoProje({ onClose, onSaved, prefill }: {
  onClose: () => void; onSaved: () => void;
  prefill?: Partial<{ nome: string; edital: string; financiador: string; valor: string; prazo: string; categoriaEdital: string }>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nome: prefill?.nome || "", edital: prefill?.edital || "",
    financiador: prefill?.financiador || "", area: "Digital",
    valor: prefill?.valor || "", status: "Triagem", prazo: prefill?.prazo || "",
    probabilidade: "50", risco: "Médio", aderencia: "3",
    territorio: "", publico: "", competitividade: "Média",
    proximoPasso: "", observacao: "",
    categoriaEdital: prefill?.categoriaEdital || "", programaInterno: "", ptScore: "7.0",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nome || !form.financiador || !form.prazo || !form.valor) {
      setError("Preencha os campos obrigatórios: Nome, Financiador, Valor e Prazo.");
      return;
    }
    setSaving(true); setError("");
    try {
      await apiClient.createProject({
        ...form,
        status: form.status as ProjectStatus,
        risco: form.risco as "Baixo"|"Médio"|"Alto",
        valor: parseFloat(form.valor.replace(/\./g, "").replace(",", ".")),
        probabilidade: parseInt(form.probabilidade),
        aderencia: parseInt(form.aderencia),
        ptScore: parseFloat(form.ptScore),
      });
      onSaved(); onClose();
    } catch (e: any) {
      setError(e.message || "Erro ao salvar projeto.");
    } finally { setSaving(false); }
  };

  return (
    <Modal title="Novo Projeto" onClose={onClose} wide>
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Field label="Nome do Projeto" required><input className={inputCls} value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Ex: Guia Digital Teen 2026" /></Field></div>
          <Field label="Edital / Chamamento" required><input className={inputCls} value={form.edital} onChange={e => set("edital", e.target.value)} /></Field>
          <Field label="Financiador" required><input className={inputCls} value={form.financiador} onChange={e => set("financiador", e.target.value)} /></Field>
          <Field label="Área Temática"><select className={selectCls} value={form.area} onChange={e => set("area", e.target.value)}>{["Digital","Primeira Infância","Saúde Mental / TEA","Esporte","Inclusão Produtiva","Segurança Alimentar","Direitos Humanos","Cultura","Educação","Outro"].map(a => <option key={a}>{a}</option>)}</select></Field>
          <Field label="Programa Interno"><input className={inputCls} value={form.programaInterno} onChange={e => set("programaInterno", e.target.value)} /></Field>
          <Field label="Valor Solicitado (R$)" required><input className={inputCls} type="number" value={form.valor} onChange={e => set("valor", e.target.value)} /></Field>
          <Field label="Prazo / Data Limite" required><input className={inputCls} type="date" value={form.prazo} onChange={e => set("prazo", e.target.value)} /></Field>
          <Field label="Status"><select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>{Object.keys(STATUS_META).map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Categoria do Edital"><select className={selectCls} value={form.categoriaEdital} onChange={e => set("categoriaEdital", e.target.value)}>{["","Fundo Municipal","Fundo Estadual","Ministério","Fundação Privada","Instituto Empresarial","Embaixada / Cooperação Internacional","Prêmio","Convênio Público","Outro"].map(c => <option key={c} value={c}>{c||"Selecione..."}</option>)}</select></Field>
          <Field label="Risco"><select className={selectCls} value={form.risco} onChange={e => set("risco", e.target.value)}>{["Baixo","Médio","Alto"].map(r => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Competitividade"><select className={selectCls} value={form.competitividade} onChange={e => set("competitividade", e.target.value)}>{["Baixa","Média","Alta","Muito Alta"].map(c => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Probabilidade de Aprovação (%)"><input className={inputCls} type="number" min="0" max="100" value={form.probabilidade} onChange={e => set("probabilidade", e.target.value)} /></Field>
          <Field label="Aderência ao Edital (1–5)"><select className={selectCls} value={form.aderencia} onChange={e => set("aderencia", e.target.value)}>{["1","2","3","4","5"].map(n => <option key={n} value={n}>{n} {"★".repeat(parseInt(n))}</option>)}</select></Field>
          <Field label="Território / Local"><input className={inputCls} value={form.territorio} onChange={e => set("territorio", e.target.value)} /></Field>
          <Field label="Público-Alvo"><input className={inputCls} value={form.publico} onChange={e => set("publico", e.target.value)} /></Field>
          <div className="md:col-span-2"><Field label="Próximo Passo"><input className={inputCls} value={form.proximoPasso} onChange={e => set("proximoPasso", e.target.value)} /></Field></div>
          <div className="md:col-span-2"><Field label="Observação Estratégica"><textarea className={inputCls} rows={3} value={form.observacao} onChange={e => set("observacao", e.target.value)} /></Field></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? "Salvando..." : "Salvar Projeto"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ModalNovoDocumento({ projectId, projectName, onClose, onSaved }: {
  projectId?: string; projectName?: string; onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ nome: "", status: "Pendente", validade: "", url: "", projectId: projectId || "" });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nome) { setError("Nome do documento é obrigatório."); return; }
    setSaving(true); setError("");
    try {
      await apiClient.uploadDocument({ nome: form.nome, status: form.status, validade: form.validade || null, url: form.url || null, projectId: form.projectId || null });
      onSaved(); onClose();
    } catch (e: any) {
      setError(e.message || "Erro ao salvar documento.");
    } finally { setSaving(false); }
  };

  return (
    <Modal title={`Adicionar Documento${projectName ? ` — ${projectName}` : ""}`} onClose={onClose}>
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
        <Field label="Nome do Documento" required><input className={inputCls} value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Ex: Estatuto Social, CND Federal..." /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status"><select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>{["Pendente","Em Revisão","Aprovado","A Vencer","Vencido"].map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Validade (se houver)"><input className={inputCls} type="date" value={form.validade} onChange={e => set("validade", e.target.value)} /></Field>
        </div>
        <Field label="Link do Documento (Google Drive, OneDrive etc.)"><input className={inputCls} type="url" value={form.url} onChange={e => set("url", e.target.value)} placeholder="https://drive.google.com/..." /></Field>
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">Cole o link de compartilhamento do documento acima. O arquivo pode estar no Google Drive, OneDrive, Dropbox ou qualquer outro serviço.</div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}{saving ? "Salvando..." : "Adicionar Documento"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ModalAtualizarStatus({ project, onClose, onSaved }: {
  project: Project; onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(project.status);
  const [justificativa, setJustificativa] = useState("");

  const handleSubmit = async () => {
    if (status === project.status) { onClose(); return; }
    setSaving(true); setError("");
    try {
      const token = localStorage.getItem("rota_token");
      const res = await fetch(`/api/projects/${project.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, justificativa }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao atualizar");
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <Modal title={`Atualizar Status — ${project.nome}`} onClose={onClose}>
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
          <div><p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Status atual</p><StatusBadge status={project.status} size="md" /></div>
          <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
          <div><p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Novo status</p><StatusBadge status={status as ProjectStatus} size="md" /></div>
        </div>
        <Field label="Novo Status">
          <select className={selectCls} value={status} onChange={e => setStatus(e.target.value as ProjectStatus)}>
            {["Oportunidade","Triagem","Elaboração","Revisão","Pronto","Inscrito","Diligência","Aprovado","Não Aprovado","Captado","Formalização","Execução","Concluído","Arquivado"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Justificativa (opcional)">
          <textarea className={inputCls} rows={3} value={justificativa} onChange={e => setJustificativa(e.target.value)} placeholder="Descreva o motivo da mudança de status..." />
        </Field>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}{saving ? "Salvando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ModalNovoEdital({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ nome: "", financiador: "", valorMax: "", prazo: "", status: "Aberto", aderencia: "3", categoria: "", linha: "", porte: "Médio", link: "", observacao: "" });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nome || !form.financiador || !form.prazo) { setError("Nome, Financiador e Prazo são obrigatórios."); return; }
    setSaving(true); setError("");
    try {
      const token = localStorage.getItem("rota_token");
      const res = await fetch("/api/editais", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, valorMax: parseFloat(form.valorMax) || 0, aderencia: parseInt(form.aderencia) }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao salvar edital");
      onSaved(); onClose();
    } catch (e: any) { setError(e.message || "Erro ao salvar edital."); } finally { setSaving(false); }
  };

  return (
    <Modal title="Novo Edital" onClose={onClose} wide>
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Field label="Nome do Edital" required><input className={inputCls} value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Ex: Chamamento Público COMDICA 2026" /></Field></div>
          <Field label="Financiador" required><input className={inputCls} value={form.financiador} onChange={e => set("financiador", e.target.value)} /></Field>
          <Field label="Valor Máximo (R$)"><input className={inputCls} type="number" value={form.valorMax} onChange={e => set("valorMax", e.target.value)} /></Field>
          <Field label="Prazo de Submissão" required><input className={inputCls} type="date" value={form.prazo} onChange={e => set("prazo", e.target.value)} /></Field>
          <Field label="Status"><select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>{["Aberto","Em análise","Encerrado"].map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Categoria"><input className={inputCls} value={form.categoria} onChange={e => set("categoria", e.target.value)} placeholder="Ex: Fundo Municipal" /></Field>
          <Field label="Linha / Eixo"><input className={inputCls} value={form.linha} onChange={e => set("linha", e.target.value)} placeholder="Ex: Eixo I — Proteção Básica" /></Field>
          <Field label="Porte"><select className={selectCls} value={form.porte} onChange={e => set("porte", e.target.value)}>{["Micro","Pequeno","Médio","Grande"].map(p => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Aderência (1–5)"><select className={selectCls} value={form.aderencia} onChange={e => set("aderencia", e.target.value)}>{["1","2","3","4","5"].map(n => <option key={n} value={n}>{n} {"★".repeat(parseInt(n))}</option>)}</select></Field>
          <div className="md:col-span-2"><Field label="Link do Edital"><input className={inputCls} type="url" value={form.link} onChange={e => set("link", e.target.value)} placeholder="https://..." /></Field></div>
          <div className="md:col-span-2"><Field label="Observação"><textarea className={inputCls} rows={2} value={form.observacao} onChange={e => set("observacao", e.target.value)} /></Field></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? "Salvando..." : "Salvar Edital"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ModalComentario({ projectId, onClose, onSaved }: {
  projectId: string; onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [texto, setTexto] = useState("");

  const handleSubmit = async () => {
    if (!texto.trim()) { setError("O comentário não pode estar vazio."); return; }
    setSaving(true); setError("");
    try {
      const token = localStorage.getItem("rota_token");
      const res = await fetch(`/api/projects/${projectId}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ texto }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao registrar comentário");
      onSaved(); onClose();
    } catch (e: any) { setError(e.message || "Erro ao salvar."); } finally { setSaving(false); }
  };

  return (
    <Modal title="Registrar Comentário" onClose={onClose}>
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
        <Field label="Comentário" required>
          <textarea className={inputCls} rows={5} value={texto} onChange={e => setTexto(e.target.value)}
            placeholder="Registre uma observação, decisão ou ponto de atenção sobre este projeto..." autoFocus />
        </Field>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}{saving ? "Salvando..." : "Registrar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ModalNovaLicao({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ projeto: "", licao: "" });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.projeto.trim() || !form.licao.trim()) { setError("Preencha o nome do projeto e a lição aprendida."); return; }
    setSaving(true); setError("");
    try {
      const token = localStorage.getItem("rota_token");
      const res = await fetch("/api/licoes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, data: new Date().toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao salvar lição");
      onSaved(); onClose();
    } catch (e: any) { setError(e.message || "Erro ao salvar."); } finally { setSaving(false); }
  };

  return (
    <Modal title="Nova Lição Aprendida" onClose={onClose}>
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
        <Field label="Projeto de Referência" required><input className={inputCls} value={form.projeto} onChange={e => set("projeto", e.target.value)} placeholder="Nome do projeto relacionado" /></Field>
        <Field label="Lição Aprendida" required><textarea className={inputCls} rows={4} value={form.licao} onChange={e => set("licao", e.target.value)} placeholder="Descreva a lição aprendida de forma clara e aplicável..." autoFocus /></Field>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? "Salvando..." : "Registrar Lição"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────

function LoginView() {
  const { setUser, setToken, setRefreshToken } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data = await apiClient.login(email, password);
      setToken(data.accessToken);
      if (setRefreshToken) setRefreshToken(data.refreshToken);
      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credenciais inválidas");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-8 bg-slate-800 text-white text-center border-b border-white/10">
          <h1 className="text-4xl font-bold tracking-tighter font-serif">ROTA</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Guia Social Intelligence</p>
        </div>
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Acesso Institucional</h2>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">E-mail</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="exemplo@guiasocial.org" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Senha</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="••••••••" />
            </div>
            <button disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-lg hover:bg-slate-800 transition-all uppercase tracking-widest text-xs shadow-lg disabled:opacity-50">
              {loading ? "Autenticando..." : "Entrar no Sistema"}
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Plataforma de Inteligência para Gestão de Projetos</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── APP PRINCIPAL ─────────────────────────────────────────────────────────

export default function App() {
  const { user, token, setUser, setToken, logout } = useAuthStore();
  const setRefreshToken = (useAuthStore as any).getState?.()?.setRefreshToken;
  const [view, setView] = useState("dashboard");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success"|"error" } | null>(null);

  const [modalNovoProj, setModalNovoProj] = useState(false);
  const [modalNovoDoc, setModalNovoDoc] = useState<{ projectId?: string; projectName?: string } | null>(null);
  const [modalStatus, setModalStatus] = useState<Project | null>(null);

  const showToast = useCallback((msg: string, type: "success"|"error") => {
    setToast({ msg, type });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [pData, aData, sData, lData, dData] = await Promise.all([
        apiClient.getProjects(), apiClient.getAlerts(), apiClient.getStats(),
        apiClient.getAuditLogs(), apiClient.getDocuments(),
      ]);
      setProjects(pData);
      setStats(sData);
      setAuditLogs(lData);
      setDocuments(dData);
      const mappedAlerts: AlertType[] = aData.map((a: any) => ({
        id: a.id, titulo: a.titulo, nivel: a.nivel, tipo: a.tipo,
        projeto: a.project?.nome || "Geral",
        prazo: a.prazo ? formatDate(a.prazo) : "N/A",
        dias: a.prazo ? Math.max(0, Math.ceil((new Date(a.prazo).getTime() - Date.now()) / 86400000)) : 0,
        cor: a.nivel === "N4" ? B.red : a.nivel === "N3" ? B.orange : a.nivel === "N2" ? B.blue : B.gray,
        bgCor: a.nivel === "N4" ? B.redBg : a.nivel === "N3" ? B.orangeBg : a.nivel === "N2" ? B.blueBg : B.grayLight,
        mensagem: a.mensagem,
      }));
      setAlerts(mappedAlerts);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (token) fetchData(); }, [token, fetchData]);

  if (!token) return <LoginView />;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "pipeline", label: "Pipeline", icon: GitBranch },
    { id: "editais", label: "Editais", icon: Library },
    { id: "alertas", label: "Alertas", icon: Bell },
    { id: "documentos", label: "Documentos", icon: Files },
    { id: "memoria", label: "Memória", icon: History },
    { id: "relatorios", label: "Relatórios", icon: BarChart3 },
  ];

  const handleProjectSelect = (p: Project) => { setSelectedProject(p); setView("projeto"); };
  const handleBack = () => { setSelectedProject(null); setView("pipeline"); };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-50">
        <div className="p-8 border-b border-white/5">
          <h1 className="text-3xl font-bold tracking-tighter font-serif text-white">ROTA</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Guia Social Intelligence</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setView(item.id); setSelectedProject(null); }}
              className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all uppercase tracking-widest",
                view === item.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "text-slate-400 hover:text-white hover:bg-white/5")}>
              <item.icon className="w-4 h-4" />{item.label}
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-xs">
                {user?.name?.split(" ").map(n => n[0]).join("") || "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{user?.name || "Usuário"}</p>
                <p className="text-[10px] text-slate-500 uppercase">{user?.role || "Perfil"}</p>
              </div>
            </div>
            <button onClick={logout} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors" title="Sair">
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-64 min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
              {view === "projeto" ? "Detalhes do Projeto" : navItems.find(n => n.id === view)?.label}
            </h2>
            {loading && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Calendar className="w-4 h-4" />{new Date().toLocaleDateString("pt-BR")}
            </div>
            <button onClick={() => setView("alertas")} className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell className="w-5 h-5" />
              {alerts.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />}
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm font-medium">
              <AlertCircle className="w-5 h-5" />{error}
              <button onClick={fetchData} className="ml-auto text-xs font-bold underline">Tentar novamente</button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={view + (selectedProject?.id || "")}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {view === "dashboard" && <DashboardView projects={projects} alerts={alerts} onNav={setView} onProject={handleProjectSelect} />}
              {view === "pipeline" && <PipelineView projects={projects} onProject={handleProjectSelect} onNewProject={() => setModalNovoProj(true)} />}
              {view === "editais" && <EditaisView onToast={showToast} onProjectCreated={() => { fetchData(); setView("pipeline"); }} />}
              {view === "alertas" && <AlertasView alerts={alerts} />}
              {view === "documentos" && <DocumentosView documents={documents} onNewDoc={() => setModalNovoDoc({})} onToast={showToast} />}
              {view === "memoria" && <MemoriaView stats={stats} auditLogs={auditLogs} onToast={showToast} />}
              {view === "relatorios" && <RelatoriosView projects={projects} onToast={showToast} />}
              {view === "projeto" && selectedProject && (
                <ProjectDetailView
                  project={selectedProject}
                  onBack={handleBack}
                  onAddDoc={(pid, pname) => setModalNovoDoc({ projectId: pid, projectName: pname })}
                  onUpdateStatus={p => setModalStatus(p)}
                  onRefresh={fetchData}
                  onToast={showToast}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {modalNovoProj && (
        <ModalNovoProje
          onClose={() => setModalNovoProj(false)}
          onSaved={() => { setModalNovoProj(false); fetchData(); showToast("Projeto criado com sucesso.", "success"); }}
        />
      )}
      {modalNovoDoc !== null && (
        <ModalNovoDocumento
          projectId={modalNovoDoc.projectId}
          projectName={modalNovoDoc.projectName}
          onClose={() => setModalNovoDoc(null)}
          onSaved={() => { setModalNovoDoc(null); fetchData(); showToast("Documento adicionado.", "success"); }}
        />
      )}
      {modalStatus !== null && (
        <ModalAtualizarStatus
          project={modalStatus}
          onClose={() => setModalStatus(null)}
          onSaved={() => {
            const pid = modalStatus.id;
            setModalStatus(null);
            fetchData().then(() => {
              if (selectedProject?.id === pid) {
                apiClient.getProjects().then((ps: Project[]) => {
                  const updated = ps.find(p => p.id === pid);
                  if (updated) setSelectedProject(updated);
                }).catch(() => {});
              }
            });
            showToast("Status atualizado.", "success");
          }}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
