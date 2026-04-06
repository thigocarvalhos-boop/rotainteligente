/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, Legend
} from "recharts";
import {
  LayoutDashboard, GitBranch, Library, Bell, Files, History, BarChart3,
  Search, ChevronRight, AlertCircle, CheckCircle2, Clock, ExternalLink,
  Download, ArrowLeft, Calendar, FileText, TrendingUp, ShieldCheck,
  Info, RefreshCw, Eye, Plus, X, Upload, Save, ChevronLeft,
  Link2, Award, Target, Zap, BookOpen, Edit2, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { B, EDITAIS } from "./mockData";
import { Project, ProjectStatus, AlertType, Edital } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuthStore } from "./store/authStore";
import { apiClient } from "./api/client";

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("pt-BR");
  } catch {
    return value;
  }
}

function getResponsavelName(responsavel: string | { name: string } | undefined): string {
  if (!responsavel) return "—";
  if (typeof responsavel === "string") return responsavel;
  return responsavel.name;
}

// Export data as CSV file download
function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const bom = "\uFEFF";
  const csv = bom + [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  "Oportunidade":    { color: B.gray,     bg: B.grayLight,   label: "Oportunidade" },
  "Triagem":         { color: B.orange,   bg: B.orangeBg,    label: "Em Triagem" },
  "Elaboração":      { color: B.blue,     bg: B.blueBg,      label: "Em Elaboração" },
  "Revisão":         { color: B.purple,   bg: B.purpleBg,    label: "Em Revisão" },
  "Pronto":          { color: B.teal,     bg: B.tealLight,   label: "Pronto p/ Envio" },
  "Inscrito":        { color: B.tealDark, bg: "#D0EBEC",     label: "Inscrito" },
  "Diligência":      { color: B.orange,   bg: B.orangeBg,    label: "Diligência" },
  "Aprovado":        { color: B.green,    bg: B.greenBg,     label: "Aprovado" },
  "Não Aprovado":    { color: B.red,      bg: B.redBg,       label: "Não Aprovado" },
  "Captado":         { color: B.blue,     bg: B.blueBg,      label: "Captado" },
  "Formalização":    { color: B.purple,   bg: B.purpleBg,    label: "Formalização" },
  "Execução":        { color: B.purple,   bg: B.purpleBg,    label: "Em Execução" },
  "Concluído":       { color: B.charcoal, bg: "#F9FAFB",     label: "Concluído" },
};

const AREA_COLORS = ["#1A7C7E", "#E8A020", "#7C3AED", "#0369A1", "#059669", "#DC2626", "#D97706", "#374151"];

function fmt(v: number) {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return `R$ ${v}`;
}

// ─── EXPORT CSV ─────────────────────────────────────────────────────────────
function downloadCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const bom = "\uFEFF";
  const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = bom + [headers, ...rows].map(r => r.map(escape).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename + ".csv"; a.click();
  URL.revokeObjectURL(url);
}

// ─── CALENDÁRIO REAL ────────────────────────────────────────────────────────
function CalendarioAlertas({ alerts }: { alerts: AlertType[] }) {
  const today = new Date();
  const [cur, setCur] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const firstDay = new Date(cur.year, cur.month, 1).getDay();
  const daysInMonth = new Date(cur.year, cur.month + 1, 0).getDate();
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  const alertDays = useMemo(() => {
    const map: Record<number, string> = {};
    alerts.forEach(a => {
      if (!a.prazo || a.prazo === "N/A") return;
      try {
        // Handle both "DD/MM/AAAA" and ISO formats
        let d: Date;
        if (a.prazo.includes("/")) {
          const [day, mon, yr] = a.prazo.split("/");
          d = new Date(parseInt(yr), parseInt(mon) - 1, parseInt(day));
        } else {
          d = new Date(a.prazo);
        }
        if (!isNaN(d.getTime()) && d.getFullYear() === cur.year && d.getMonth() === cur.month) {
          map[d.getDate()] = a.nivel;
        }
      } catch { /* ignore */ }
    });
    return map;
  }, [alerts, cur]);

  const prev = () => setCur(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 });
  const next = () => setCur(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prev} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
        <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">
          {meses[cur.month]} {cur.year}
        </span>
        <button onClick={next} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {["D","S","T","Q","Q","S","S"].map((d, i) => (
          <span key={i} className="text-[9px] font-bold text-slate-400">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = day === today.getDate() && cur.month === today.getMonth() && cur.year === today.getFullYear();
          const nivel = alertDays[day];
          const alertColor = nivel === "N4" ? "bg-red-50 border-red-300 text-red-700" :
                             nivel === "N3" ? "bg-orange-50 border-orange-300 text-orange-700" :
                             nivel ? "bg-blue-50 border-blue-300 text-blue-700" : "";
          return (
            <div key={day} title={nivel ? `Alerta ${nivel}` : undefined}
              className={cn("aspect-square flex items-center justify-center text-[10px] rounded-md border font-medium cursor-default",
                isToday ? "bg-indigo-600 text-white border-indigo-600 font-bold" :
                nivel ? alertColor + " font-bold" :
                "bg-white border-slate-100 text-slate-400")}>
              {day}
            </div>
          );
        })}
      </div>
      {Object.keys(alertDays).length > 0 && (
        <div className="mt-3 flex gap-3 text-[10px] text-slate-500">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-indigo-600" /> Hoje</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-50 border border-red-300" /> Alerta</div>
        </div>
      )}
    </div>
  );
}


// --- COMPONENTS ---

function StatusBadge({ status, size = "sm" }: { status: ProjectStatus; size?: "sm" | "md" }) {
  const m = STATUS_META[status] || { color: B.gray, bg: B.grayLight, label: status };
  return (
    <span 
      className={cn(
        "font-bold rounded border uppercase tracking-wider inline-block",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1"
      )}
      style={{ background: m.bg, color: m.color, borderColor: `${m.color}22` }}
    >
      {m.label}
    </span>
  );
}

function RiskBadge({ risco }: { risco: "Baixo" | "Médio" | "Alto" }) {
  const cfg = {
    "Baixo": { c: B.green, bg: B.greenBg },
    "Médio": { c: B.orange, bg: B.orangeBg },
    "Alto":  { c: B.red, bg: B.redBg },
  }[risco];
  return (
    <span 
      className="font-bold text-[10px] px-2 py-0.5 rounded border uppercase"
      style={{ background: cfg.bg, color: cfg.c, borderColor: `${cfg.c}22` }}
    >
      {risco}
    </span>
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

// --- VIEWS ---

function DashboardView({ projects, alerts, onNav, onProject }: { projects: Project[]; alerts: AlertType[]; onNav: (v: string) => void; onProject: (p: Project) => void }) {
  const activeProjects = projects.filter(p => !["Concluído", "Arquivado", "Não Aprovado"].includes(p.status));
  const totalPipeline = activeProjects.reduce((s, p) => s + p.valor, 0);
  const aprovados = projects.filter(p => p.status === "Aprovado").reduce((s, p) => s + p.valor, 0);
  const captados = projects.filter(p => ["Captado", "Execução"].includes(p.status)).reduce((s, p) => s + p.valor, 0);
  const probMedia = activeProjects.length > 0 ? Math.round(activeProjects.reduce((s, p, _, a) => s + p.probabilidade / a.length, 0)) : 0;
  const withCompliance = projects.filter(p => p.scoreCompliance !== undefined);
  const avgCompliance = withCompliance.length > 0 ? Math.round(withCompliance.reduce((s, p) => s + (p.scoreCompliance || 0), 0) / withCompliance.length) : 0;
  
  const pipelineByPhase = [
    { fase: "Triagem", count: projects.filter(p => p.status === "Triagem").length, valor: projects.filter(p => p.status === "Triagem").reduce((s, p) => s + p.valor, 0) },
    { fase: "Elaboração", count: projects.filter(p => p.status === "Elaboração").length, valor: projects.filter(p => p.status === "Elaboração").reduce((s, p) => s + p.valor, 0) },
    { fase: "Revisão", count: projects.filter(p => p.status === "Revisão").length, valor: projects.filter(p => p.status === "Revisão").reduce((s, p) => s + p.valor, 0) },
    { fase: "Inscrito", count: projects.filter(p => p.status === "Inscrito").length, valor: projects.filter(p => p.status === "Inscrito").reduce((s, p) => s + p.valor, 0) },
    { fase: "Aprovado", count: projects.filter(p => p.status === "Aprovado").length, valor: projects.filter(p => p.status === "Aprovado").reduce((s, p) => s + p.valor, 0) },
    { fase: "Execução", count: projects.filter(p => p.status === "Execução").length, valor: projects.filter(p => p.status === "Execução").reduce((s, p) => s + p.valor, 0) },
  ];

  const areaData = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach(p => {
      counts[p.area] = (counts[p.area] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [projects]);

  const topChance = [...projects].filter(p => !["Concluído", "Não Aprovado", "Arquivado"].includes(p.status)).sort((a, b) => b.probabilidade - a.probabilidade).slice(0, 3);
  const urgentAlerts = alerts.filter(a => a.nivel === "N4" || a.nivel === "N3").slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Painel de Inteligência</h2>
          <p className="text-slate-500 text-sm">Visão executiva do pipeline institucional</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100 flex items-center gap-2">
            <AlertCircle className="w-3 h-3" />
            {urgentAlerts.length} Alertas Críticos
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total no Pipeline</p>
          <h3 className="text-2xl font-bold text-slate-900 font-serif">{fmt(totalPipeline)}</h3>
          <p className="text-xs text-slate-500 mt-1">{activeProjects.length} projetos ativos</p>
        </Card>
        <Card className="border-l-4 border-l-emerald-600">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aprovados (A Captar)</p>
          <h3 className="text-2xl font-bold text-emerald-700 font-serif">{fmt(aprovados)}</h3>
          <p className="text-xs text-slate-500 mt-1">Aguardando formalização</p>
        </Card>
        <Card className="border-l-4 border-l-indigo-600">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Em Execução</p>
          <h3 className="text-2xl font-bold text-indigo-700 font-serif">{fmt(captados)}</h3>
          <p className="text-xs text-slate-500 mt-1">Recursos comprometidos</p>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Probabilidade Média</p>
          <h3 className="text-2xl font-bold text-amber-700 font-serif">{probMedia}%</h3>
          <p className="text-xs text-slate-500 mt-1">Média ponderada do pipeline</p>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Conformidade Média</p>
          <h3 className="text-2xl font-bold text-emerald-700 font-serif">{avgCompliance}%</h3>
          <p className="text-xs text-slate-500 mt-1">Score médio de compliance</p>
        </Card>
      </div>

      {/* Funnel Row */}
      <Card title="Pipeline por Fase">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {pipelineByPhase.map(ph => {
            const m = STATUS_META[ph.fase] || STATUS_META["Inscrito"];
            return (
              <div 
                key={ph.fase} 
                onClick={() => onNav("pipeline")}
                className="p-4 rounded-lg cursor-pointer transition-all hover:translate-y-[-2px] border border-transparent hover:border-slate-200"
                style={{ background: m.bg }}
              >
                <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: m.color }}>{ph.fase}</p>
                <h4 className="text-xl font-bold text-slate-900 font-serif">{ph.count}</h4>
                <p className="text-[10px] text-slate-500 font-medium">{fmt(ph.valor)}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts */}
        <Card title="Alertas Críticos" className="lg:col-span-1">
          <div className="space-y-4">
            {urgentAlerts.map(a => (
              <div key={a.id} className="flex items-start gap-3 pb-3 border-b border-slate-50 last:border-0">
                <div className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.cor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{a.projeto}</p>
                  <p className="text-[10px] text-slate-500">{a.tipo}{a.doc ? ` — ${a.doc}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold" style={{ color: a.cor }}>{a.dias}d</p>
                  <p className="text-[9px] text-slate-400 uppercase">Prazo</p>
                </div>
              </div>
            ))}
            <button 
              onClick={() => onNav("alertas")}
              className="w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
            >
              Ver todos os alertas
            </button>
          </div>
        </Card>

        {/* Charts */}
        <Card title="Áreas Temáticas" className="lg:col-span-1">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={areaData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={50} 
                  outerRadius={75} 
                  dataKey="value" 
                  paddingAngle={4}
                >
                  {areaData.map((_, i) => <Cell key={i} fill={AREA_COLORS[i % AREA_COLORS.length]} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                />
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

        {/* Top Probability */}
        <Card title="Maior Probabilidade" className="lg:col-span-1">
          <div className="space-y-4">
            {topChance.map(p => (
              <div 
                key={p.id} 
                onClick={() => onProject(p)}
                className="group cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
              >
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

function PipelineView({ projects, onProject, onNewProject, onEditProject }: { projects: Project[]; onProject: (p: Project) => void; onNewProject: () => void; onEditProject: (p: Project) => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");

  const filtered = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.nome.toLowerCase().includes(search.toLowerCase()) || p.financiador.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "Todos" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Pipeline de Projetos</h2>
          <p className="text-slate-500 text-sm">Gerenciamento completo do ciclo de vida</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onNewProject}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            <Plus className="w-4 h-4" /> Novo Projeto
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar projeto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
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
                <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest">Projeto</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest">Financiador</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest">Valor</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest">Status</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest">Prob.</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest">Risco</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest">Prazo</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr 
                  key={p.id} 
                  onClick={() => onProject(p)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-indigo-50/50 border-b border-slate-100 last:border-0",
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                  )}
                >
                  <td className="py-4 px-6">
                    <p className="text-sm font-bold text-slate-900">{p.nome}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{p.id}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-xs text-slate-600">{p.financiador}</p>
                    <p className="text-[10px] text-slate-400">{p.area}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-bold text-slate-800">{fmt(p.valor)}</p>
                  </td>
                  <td className="py-4 px-6">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            p.probabilidade >= 70 ? "bg-emerald-500" : p.probabilidade >= 50 ? "bg-indigo-500" : "bg-amber-500"
                          )}
                          style={{ width: `${p.probabilidade}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{p.probabilidade}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <RiskBadge risco={p.risco} />
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-xs text-slate-600 font-medium">{formatDate(p.prazo)}</p>
                  </td>
                  <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onEditProject(p)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Editar projeto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ProjectDetailView({ project, onBack, onAddDoc, onUpdateStatus, onEditProject }: {
  project: Project;
  onBack: () => void;
  onAddDoc: (projectId: string, projectName: string) => void;
  onUpdateStatus: (project: Project) => void;
  onEditProject: (project: Project) => void;
}) {
  const [activeTab, setActiveTab] = useState("geral");
  
  const tabs = [
    { id: "geral", label: "Visão Geral", icon: Info },
    { id: "analise", label: "Análise Técnica", icon: TrendingUp },
    { id: "docs", label: "Documentação", icon: Files },
    { id: "conformidade", label: "Conformidade", icon: ShieldCheck },
    { id: "relatorios", label: "Relatórios", icon: BarChart3 },
    { id: "historico", label: "Histórico", icon: History },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Pipeline
        </button>
        <button
          onClick={() => onEditProject(project)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          <Edit2 className="w-4 h-4" /> Editar Projeto
        </button>
      </div>

      {/* Header Card */}
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
            <p className="text-3xl font-bold text-slate-900 font-serif">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.valor)}</p>
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-8">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex items-center gap-2 py-4 px-2 text-sm font-bold uppercase tracking-widest transition-all border-b-2 -mb-[1px]",
              activeTab === t.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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

          {activeTab === "analise" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Parecer Técnico Interno (PTI)">
                  <div className="space-y-4">
                    {project.ptCriterios.map(c => (
                      <div key={c.critério}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-slate-700">{c.critério}</span>
                          <span className="text-xs font-bold text-indigo-600">{c.score}/10</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              c.score >= 8 ? "bg-emerald-500" : c.score >= 6 ? "bg-indigo-500" : "bg-amber-500"
                            )}
                            style={{ width: `${c.score * 10}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title="Radar de Maturidade">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={project.ptCriterios}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="critério" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                        <Radar 
                          name="Score" 
                          dataKey="score" 
                          stroke="#4f46e5" 
                          fill="#4f46e5" 
                          fillOpacity={0.2} 
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* Anti-glosa Section */}
              <Card 
                title="Módulo Antiglosa & Compliance" 
                action={
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Health Score:</span>
                    <span className={cn("text-sm font-bold", (project.scoreCompliance || 0) > 80 ? "text-emerald-600" : "text-amber-600")}>
                      {project.scoreCompliance}%
                    </span>
                  </div>
                }
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Risco de Glosa</p>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xl font-bold", (project.scoreRiscoGlosa || 0) < 20 ? "text-emerald-600" : "text-red-600")}>
                          {project.scoreRiscoGlosa}%
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full", (project.scoreRiscoGlosa || 0) < 20 ? "bg-emerald-500" : "bg-red-500")} 
                            style={{ width: `${project.scoreRiscoGlosa}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Metas vs Execução</p>
                      <p className="text-xl font-bold text-slate-900">{project.metas?.filter(m => m.alcancado >= m.meta).length || 0} / {project.metas?.length || 0}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Despesas Validadas</p>
                      <p className="text-xl font-bold text-slate-900">
                        {fmt(project.expenses?.filter(e => e.status === "Validado").reduce((s, e) => s + e.valor, 0) || 0)}
                      </p>
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
                          <div className="mt-2 flex gap-2">
                            <button className="text-[10px] font-bold text-red-800 underline">Anexar Justificativa Técnica</button>
                            <button className="text-[10px] font-bold text-red-800 underline">Vincular Cotações</button>
                          </div>
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
                      <span 
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                          doc.status === "Aprovado" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}
                      >
                        {doc.status}
                      </span>
                      <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === "conformidade" && (
            <div className="space-y-6">
              {/* Dashboard de Conformidade */}
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
                    <span className={cn("text-3xl font-bold", (project.scoreRiscoGlosa || 0) < 20 ? "text-emerald-600" : "text-red-600")}>
                      {project.scoreRiscoGlosa}%
                    </span>
                    <span className="text-xs text-slate-500 font-medium mb-1">Calculado</span>
                  </div>
                </Card>
                <Card className="bg-slate-50 border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Metas vs Execução</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-slate-900">
                      {project.metas?.filter(m => m.alcancado >= m.meta).length || 0}/{project.metas?.length || 0}
                    </span>
                    <span className="text-xs text-slate-500 font-medium mb-1">Metas atingidas</span>
                  </div>
                </Card>
              </div>

              {/* Auditoria de Despesas */}
              <Card title="Auditoria Preventiva de Despesas" action={<button className="text-xs font-bold text-indigo-600 hover:underline">Nova Despesa</button>}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Despesa</th>
                        <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                        <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cotações</th>
                        <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {project.expenses?.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4">
                            <p className="text-sm font-bold text-slate-800">{exp.descricao}</p>
                            <p className="text-[10px] text-slate-400">{exp.categoria} • {exp.data}</p>
                          </td>
                          <td className="py-4">
                            <p className="text-sm font-bold text-slate-900">{fmt(exp.valor)}</p>
                          </td>
                          <td className="py-4">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                              exp.status === "Validado" ? "bg-emerald-50 text-emerald-600" : 
                              exp.status === "Glosa" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                            )}>
                              {exp.status}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex -space-x-2">
                              {exp.cotacoes.map((c, i) => (
                                <div key={c.id} className={cn(
                                  "w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold",
                                  c.vencedora ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                                )}>
                                  {c.fornecedor[0]}
                                </div>
                              ))}
                              {exp.cotacoes.length === 0 && <span className="text-[10px] text-slate-400 italic">Nenhuma</span>}
                            </div>
                          </td>
                          <td className="py-4 text-right">
                            <button className="p-2 text-slate-400 hover:text-indigo-600">
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Checklist de Compliance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Checklist de Conformidade">
                  <div className="space-y-3">
                    {project.complianceChecks?.map((check) => (
                      <div key={check.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3">
                          {check.status === "Conforme" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          )}
                          <span className="text-xs font-medium text-slate-700">{check.item}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{check.status}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Log de Auditoria">
                  <div className="space-y-4">
                    {project.auditLogs?.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 italic text-xs">Nenhum registro de auditoria.</div>
                    ) : (
                      project.auditLogs?.map((log: any) => (
                        <div key={log.id} className="relative pl-4 border-l-2 border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                            {new Date(log.data).toLocaleString('pt-BR')}
                          </p>
                          <p className="text-xs font-bold text-slate-800">{log.acao}</p>
                          <p className="text-[10px] text-slate-500">
                            {log.user?.name || "Sistema"} • {log.entidade} {log.entidadeId}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "relatorios" && (
            <div className="space-y-6">
              <Card title="Central de Relatórios Institucionais">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: "Relatório de Conformidade", desc: "Visão completa do status de compliance e riscos de glosa.", icon: ShieldCheck },
                    { title: "Execução Físico-Financeira", desc: "Comparativo entre metas atingidas e orçamento executado.", icon: TrendingUp },
                    { title: "Dossiê Documental", desc: "Compilado de todos os documentos validados e pendentes.", icon: Files },
                    { title: "Parecer de Auditoria", desc: "Relatório detalhado para prestação de contas final.", icon: FileText },
                  ].map((rel, i) => (
                    <div key={i} className="p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all group cursor-pointer">
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
              </Card>

              <Card title="Indicadores de Desempenho do Projeto">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={project.metas}>
                      <XAxis dataKey="indicador" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="meta" name="Meta" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="alcancado" name="Alcançado" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-200" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Meta Prevista</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-600" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Execução Real</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "historico" && (
            <div className="space-y-6">
              <Card title="Linha do Tempo Institucional">
                <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {project.historico.map((h, idx) => (
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
                    {project.changeLog.map((log) => (
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
                            <p className="text-sm font-medium text-slate-500 line-through">
                              {log.campo === "valor" ? fmt(Number(log.valorAnterior)) : log.campo === "probabilidade" ? `${log.valorAnterior}%` : log.valorAnterior}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Novo</p>
                            <p className="text-sm font-bold text-slate-900">
                              {log.campo === "valor" ? fmt(Number(log.valorNovo)) : log.campo === "probabilidade" ? `${log.valorNovo}%` : log.valorNovo}
                            </p>
                          </div>
                        </div>

                        {log.justificativa && (
                          <div className="flex gap-2 items-start">
                            <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                            <p className="text-xs text-slate-500 italic leading-relaxed">
                              &quot;{log.justificativa}&quot;
                            </p>
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
            <button className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold uppercase tracking-widest transition-all">
              Exportar Parecer PDF
            </button>
          </Card>

          <Card title="Ações Rápidas">
            <div className="space-y-2">
              {[
                { label: "Editar Projeto", icon: Edit2, action: () => onEditProject(project) },
                { label: "Atualizar Status", icon: TrendingUp, action: () => onUpdateStatus(project) },
                { label: "Adicionar Documento", icon: FileText, action: () => onAddDoc(project.id, project.nome) },
              ].map(action => (
                <button
                  key={action.label}
                  onClick={action.action}
                  className="w-full flex items-center gap-3 p-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all border border-transparent hover:border-slate-100"
                >
                  <action.icon className="w-4 h-4" />
                  {action.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EditalCard({ edital }: { edital: Edital }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{edital.categoria}</span>
          <span 
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
              edital.status === "Aberto" ? "bg-emerald-50 text-emerald-600" : edital.status === "Em análise" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
            )}
          >
            {edital.status}
          </span>
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors leading-tight">{edital.nome}</h3>
        <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5"><Library className="w-3.5 h-3.5" /> {edital.financiador}</p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Valor Máx.</p>
            <p className="text-xs font-bold text-slate-800">{fmt(edital.valorMax)}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Prazo</p>
            <p className="text-xs font-bold text-red-600">{formatDate(edital.prazo)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Aderência</span>
            <div className="flex text-amber-400">
              {"★".repeat(edital.aderencia)}{"☆".repeat(5 - edital.aderencia)}
            </div>
          </div>
          {edital.link && (
            <a href={edital.link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" />Ver Edital
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function EditaisView({ onNewProject }: { onNewProject: (prefill?: Partial<Edital>) => void }) {
  const [search, setSearch] = useState("");
  const [editais, setEditais] = useState<Edital[]>(EDITAIS);
  const [showForm, setShowForm] = useState(false);
  const [formEdital, setFormEdital] = useState({ nome:"", financiador:"", valorMax:"", prazo:"", status:"Aberto", aderencia:"3", categoria:"Fundo Municipal", linha:"", porte:"Médio", link:"", observacao:"" });
  const setF = (k: string, v: string) => setFormEdital(f => ({ ...f, [k]: v }));

  const filtered = editais.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.financiador.toLowerCase().includes(search.toLowerCase())
  );

  const salvarEdital = () => {
    if (!formEdital.nome || !formEdital.financiador) return;
    const novo: Edital = {
      id: `ED-${Date.now()}`, nome: formEdital.nome, financiador: formEdital.financiador,
      valorMax: parseFloat(formEdital.valorMax)||0, prazo: formEdital.prazo,
      status: formEdital.status as "Aberto"|"Encerrado"|"Em análise",
      aderencia: parseInt(formEdital.aderencia), categoria: formEdital.categoria,
      linha: formEdital.linha, porte: formEdital.porte as "Micro"|"Pequeno"|"Médio"|"Grande",
      link: formEdital.link||undefined, observacao: formEdital.observacao||undefined,
    };
    setEditais(prev => [novo, ...prev]);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Banco de Editais</h2>
          <p className="text-slate-500 text-sm">Oportunidades mapeadas e em monitoramento</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            <Plus className="w-4 h-4" />Novo Edital
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Buscar edital ou financiador..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-72" />
          </div>
        </div>
      </div>

      {showForm && (
        <Modal title="Novo Edital" onClose={() => setShowForm(false)} wide>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Field label="Nome do Edital" required><input className={inputCls} value={formEdital.nome} onChange={e=>setF("nome",e.target.value)} placeholder="Ex: Chamamento Público COMDICA 2026" /></Field></div>
            <Field label="Financiador" required><input className={inputCls} value={formEdital.financiador} onChange={e=>setF("financiador",e.target.value)} placeholder="Ex: Prefeitura do Recife" /></Field>
            <Field label="Valor Máximo (R$)"><input className={inputCls} type="number" value={formEdital.valorMax} onChange={e=>setF("valorMax",e.target.value)} /></Field>
            <Field label="Prazo de Submissão"><input className={inputCls} type="date" value={formEdital.prazo} onChange={e=>setF("prazo",e.target.value)} /></Field>
            <Field label="Status"><select className={selectCls} value={formEdital.status} onChange={e=>setF("status",e.target.value)}>{["Aberto","Em análise","Encerrado"].map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Categoria"><select className={selectCls} value={formEdital.categoria} onChange={e=>setF("categoria",e.target.value)}>{["Fundo Municipal","Fundo Estadual","Ministério","Fundação Privada","Instituto Empresarial","Embaixada / Cooperação Internacional","Prêmio","Convênio Público","Outro"].map(c=><option key={c}>{c}</option>)}</select></Field>
            <Field label="Aderência IGS (1–5)"><select className={selectCls} value={formEdital.aderencia} onChange={e=>setF("aderencia",e.target.value)}>{["1","2","3","4","5"].map(n=><option key={n} value={n}>{n} {"★".repeat(parseInt(n))}</option>)}</select></Field>
            <div className="md:col-span-2"><Field label="Link do Edital"><input className={inputCls} type="url" value={formEdital.link} onChange={e=>setF("link",e.target.value)} placeholder="https://..." /></Field></div>
            <div className="md:col-span-2"><Field label="Observações"><textarea className={inputCls} rows={2} value={formEdital.observacao} onChange={e=>setF("observacao",e.target.value)} placeholder="Notas estratégicas..." /></Field></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="flex-1 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button onClick={salvarEdital} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"><Save className="w-4 h-4" />Salvar Edital</button>
          </div>
        </Modal>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(e => (
          <div key={e.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{e.categoria}</span>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase", e.status==="Aberto"?"bg-emerald-50 text-emerald-600":e.status==="Em análise"?"bg-amber-50 text-amber-600":"bg-slate-100 text-slate-500")}>{e.status}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors leading-tight">{e.nome}</h3>
              <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5"><Library className="w-3.5 h-3.5" />{e.financiador}</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Valor Máx.</p><p className="text-xs font-bold text-slate-800">{fmt(e.valorMax)}</p></div>
                <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Prazo</p><p className="text-xs font-bold text-red-600">{formatDate(e.prazo)}</p></div>
              </div>
              {e.observacao && <p className="text-[10px] text-slate-500 italic mb-3 line-clamp-2">"{e.observacao}"</p>}
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase">Aderência</span><span className="text-amber-400">{"★".repeat(e.aderencia)}{"☆".repeat(5-e.aderencia)}</span></div>
                <div className="flex items-center gap-2">
                  {e.link && <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"><ExternalLink className="w-3.5 h-3.5" />Ver Edital</a>}
                  {e.status === "Aberto" && <button onClick={() => onNewProject(e)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors"><Plus className="w-3 h-3" />Criar Projeto</button>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertasView({ alerts }: { alerts: AlertType[] }) {
  const [mode, setMode] = useState<"lista" | "calendario">("lista");

  const exportar = () => downloadCSV("alertas_rota",
    ["Título","Tipo","Nível","Projeto","Prazo","Dias Restantes"],
    alerts.map(a => [a.titulo || a.tipo, a.tipo, a.nivel, a.projeto, a.prazo, a.dias])
  );

  const sorted = [...alerts].sort((a, b) => (a.dias ?? 999) - (b.dias ?? 999));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Alertas e Prazos</h2>
          <p className="text-slate-500 text-sm">{alerts.length} alerta(s) pendente(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button onClick={() => setMode("lista")} className={cn("px-3 py-2 text-xs font-bold transition-colors", mode === "lista" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>Lista</button>
            <button onClick={() => setMode("calendario")} className={cn("px-3 py-2 text-xs font-bold transition-colors", mode === "calendario" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>Calendário</button>
          </div>
          <button onClick={exportar} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {mode === "lista" ? (
            <Card title="Urgências por Prazo">
              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="py-12 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-200 mx-auto mb-3" />
                    <p className="text-slate-400 italic text-sm">Nenhum alerta pendente</p>
                  </div>
                ) : sorted.map(a => (
                  <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border"
                      style={{ background: a.bgCor || "#f1f5f9", borderColor: a.cor }}>
                      <span className="text-[9px] font-bold uppercase" style={{ color: a.cor }}>{a.nivel}</span>
                      <span className="text-xl font-bold font-serif leading-tight" style={{ color: a.cor }}>{a.dias ?? "?"}</span>
                      <span className="text-[8px]" style={{ color: a.cor }}>dias</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900">{a.titulo || a.tipo}</h4>
                      <p className="text-xs text-slate-500">{a.projeto}</p>
                      {a.mensagem && <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{a.mensagem}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-slate-800">{a.prazo}</p>
                      <p className="text-[9px] text-slate-400 uppercase font-bold">vencimento</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card title="Calendário de Prazos">
              <div className="max-w-xs mx-auto py-2">
                <CalendarioAlertas alerts={alerts} />
              </div>
              {sorted.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alertas neste mês</p>
                  {sorted.filter(a => a.prazo && a.prazo !== "N/A").map(a => (
                    <div key={a.id} className="flex items-center gap-3 text-xs">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.cor }} />
                      <span className="font-bold text-slate-700 truncate">{a.titulo || a.tipo}</span>
                      <span className="text-slate-400 flex-shrink-0">{a.prazo}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Resumo por Nível">
            {[
              { nivel: "N4", label: "Crítico",    color: B.red,    bg: B.redBg    },
              { nivel: "N3", label: "Urgente",    color: B.orange, bg: B.orangeBg },
              { nivel: "N2", label: "Atenção",    color: B.blue,   bg: B.blueBg   },
              { nivel: "N1", label: "Informativo",color: B.gray,   bg: B.grayLight},
            ].map(n => {
              const count = alerts.filter(a => a.nivel === n.nivel).length;
              return (
                <div key={n.nivel} className={cn("flex items-center justify-between p-3 rounded-lg mb-2 last:mb-0", count === 0 && "opacity-40")}
                  style={{ background: n.bg }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: n.color }} />
                    <span className="text-xs font-bold" style={{ color: n.color }}>{n.label}</span>
                  </div>
                  <span className="text-lg font-bold font-serif" style={{ color: n.color }}>{count}</span>
                </div>
              );
            })}
          </Card>

          <Card title="Calendário">
            <CalendarioAlertas alerts={alerts} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function DocumentosView({ documents, onNewDoc }: { documents: any[]; onNewDoc: () => void }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");

  const filtered = documents.filter(d => {
    const q = search.toLowerCase();
    const matchQ = d.nome.toLowerCase().includes(q) || (d.project?.nome || "").toLowerCase().includes(q);
    const matchS = filterStatus === "Todos" || d.status === filterStatus;
    return matchQ && matchS;
  });

  const exportar = () => downloadCSV("documentos_rota",
    ["Nome","Status","Validade","Projeto","Link"],
    filtered.map(d => [d.nome, d.status, d.validade ? formatDate(d.validade) : "Permanente", d.project?.nome || "Institucional", d.url || "—"])
  );

  const vencendo = documents.filter(d => {
    if (!d.validade) return false;
    const diff = Math.ceil((new Date(d.validade).getTime() - Date.now()) / 86400000);
    return diff > 0 && diff <= 30;
  });
  const vencidos = documents.filter(d => d.validade && new Date(d.validade) < new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Gestão Documental</h2>
          <p className="text-slate-500 text-sm">{documents.length} documento(s) • Biblioteca institucional</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onNewDoc} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            <Plus className="w-4 h-4" /> Novo Documento
          </button>
          <button onClick={exportar} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {(vencidos.length > 0 || vencendo.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vencidos.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-800">{vencidos.length} documento(s) vencido(s)</p>
                <p className="text-xs text-red-600 mt-0.5 line-clamp-2">{vencidos.map((d: any) => d.nome).join(" • ")}</p>
              </div>
            </div>
          )}
          {vencendo.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">{vencendo.length} doc(s) vencendo em 30 dias</p>
                <p className="text-xs text-amber-600 mt-0.5 line-clamp-2">{vencendo.map((d: any) => d.nome).join(" • ")}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar documento ou projeto..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="Todos">Todos os Status</option>
          {["Aprovado","Pendente","Em Revisão","A Vencer","Vencido"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title={`Documentos (${filtered.length})`}>
            <div className="space-y-1">
              {filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <Files className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 italic text-sm">Nenhum documento encontrado</p>
                  <button onClick={onNewDoc} className="mt-3 text-xs font-bold text-indigo-600 hover:underline">+ Adicionar documento</button>
                </div>
              ) : filtered.map((doc: any, idx: number) => {
                const isVencido = doc.validade && new Date(doc.validade) < new Date();
                const diasVenc = doc.validade ? Math.ceil((new Date(doc.validade).getTime() - Date.now()) / 86400000) : null;
                return (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        doc.status === "Aprovado" ? "bg-emerald-50" : isVencido ? "bg-red-50" : "bg-amber-50")}>
                        {doc.status === "Aprovado"
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          : isVencido
                          ? <AlertCircle className="w-4 h-4 text-red-600" />
                          : <Clock className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{doc.nome}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {doc.validade && (
                            <p className={cn("text-[10px] font-medium",
                              isVencido ? "text-red-600 font-bold" :
                              diasVenc && diasVenc <= 30 ? "text-amber-600 font-bold" : "text-slate-400")}>
                              {isVencido ? `Vencido em ${formatDate(doc.validade)}` : `Vence: ${formatDate(doc.validade)}`}
                              {diasVenc && diasVenc > 0 && diasVenc <= 30 && ` (${diasVenc}d)`}
                            </p>
                          )}
                          {!doc.validade && <p className="text-[10px] text-slate-400">Sem vencimento</p>}
                          {doc.project && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold truncate max-w-[120px]">{doc.project.nome}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                        doc.status === "Aprovado" ? "bg-emerald-50 text-emerald-600" :
                        isVencido ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}>
                        {isVencido ? "Vencido" : doc.status}
                      </span>
                      {doc.url ? (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                          title="Abrir documento"
                          className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <div className="p-2 text-slate-200 cursor-not-allowed" title="Sem link cadastrado">
                          <Download className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Painel de Status">
            {[
              { label: "Aprovados",     count: documents.filter(d => d.status === "Aprovado").length,  color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
              { label: "Pendentes",     count: documents.filter(d => d.status === "Pendente").length,  color: "text-amber-600",   bg: "bg-amber-50",   icon: Clock },
              { label: "Vencidos",      count: vencidos.length,   color: "text-red-600",     bg: "bg-red-50",     icon: AlertCircle },
              { label: "A vencer (30d)",count: vencendo.length,   color: "text-orange-600",  bg: "bg-orange-50",  icon: AlertCircle },
            ].map(item => (
              <div key={item.label} className={cn("flex items-center justify-between p-3 rounded-lg mb-2 last:mb-0", item.bg)}>
                <div className="flex items-center gap-2">
                  <item.icon className={cn("w-4 h-4", item.color)} />
                  <span className={cn("text-xs font-bold", item.color)}>{item.label}</span>
                </div>
                <span className={cn("text-xl font-bold font-serif", item.color)}>{item.count}</span>
              </div>
            ))}
          </Card>
          <Card title="Ações">
            <div className="space-y-2">
              <button onClick={onNewDoc} className="w-full flex items-center gap-2 p-3 text-left text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg border border-transparent hover:border-indigo-100 transition-colors">
                <Plus className="w-4 h-4" /> Novo Documento
              </button>
              <button onClick={exportar} className="w-full flex items-center gap-2 p-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors">
                <Download className="w-4 h-4" /> Exportar Lista CSV
              </button>
              <a href="https://www.receita.fazenda.gov.br/Aplicacoes/ATSPO/CERTIDAO/CndConjuntaInter/InformaNICertidao.asp"
                target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center gap-2 p-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors">
                <ExternalLink className="w-4 h-4" /> Consultar CND Federal
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MemoriaView({ projects, stats, auditLogs }: { projects: Project[]; stats: any; auditLogs: any[] }) {
  const [licoes, setLicoes] = useState([
    { projeto: "Guia Alimenta Recife", licao: "Aumentar detalhamento da metodologia de busca ativa para editais de assistência social.", data: "Mar/2026" },
    { projeto: "Maré Delas", licao: "Confirmar disponibilidade de local parceiro antes da submissão para evitar diligência de infraestrutura.", data: "Fev/2026" },
    { projeto: "Cidadania +60", licao: "Focar em indicadores de inclusão digital para editais de conselhos de idosos.", data: "Jan/2026" },
  ]);
  const [novaLicao, setNovaLicao] = useState("");
  const [novaProjeto, setNovaProjeto] = useState("");

  const displayStats = [
    { label: "Projetos Submetidos", value: stats?.totalProjects || 0, icon: GitBranch, color: B.blue },
    { label: "Taxa de Aprovação", value: `${(stats?.approvalRate || 0).toFixed(1)}%`, icon: TrendingUp, color: B.green },
    { label: "Total Captado", value: fmt(stats?.totalValue || 0), icon: Award, color: B.teal },
    { label: "Audit Logs", value: auditLogs.length, icon: History, color: "#7C3AED" },
  ];

  const addLicao = () => {
    if (!novaLicao.trim() || !novaProjeto.trim()) return;
    const mes = new Date().toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    setLicoes(l => [{ projeto: novaProjeto, licao: novaLicao, data: mes }, ...l]);
    setNovaLicao(""); setNovaProjeto("");
  };

  const exportar = () => downloadCSV("memoria_organizacional",
    ["Projeto","Lição Aprendida","Data"],
    licoes.map(l => [l.projeto, l.licao, l.data])
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Memória Organizacional</h2>
          <p className="text-slate-500 text-sm">Inteligência acumulada e histórico de impacto</p>
        </div>
        <button onClick={exportar} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4" /> Exportar
        </button>
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
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic text-sm">Nenhum registro encontrado.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(log.data).toLocaleString('pt-BR')}</span>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">{log.acao}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">{log.entidade} {log.entidadeId?.substring(0, 8)}</p>
                  <p className="text-[10px] text-slate-500">Usuário: {log.user?.name || "Sistema"}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Lições Aprendidas" action={
          <button onClick={exportar} className="text-[10px] font-bold text-indigo-600 hover:underline">Exportar CSV</button>
        }>
          {/* Formulário para nova lição */}
          <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Registrar Nova Lição</p>
            <select
              value={novaProjeto} onChange={e => setNovaProjeto(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500">
              <option value="">Selecionar projeto...</option>
              {projects.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
              <option value="Institucional">Institucional / Geral</option>
            </select>
            <textarea
              value={novaLicao} onChange={e => setNovaLicao(e.target.value)}
              rows={2} placeholder="Descreva a lição aprendida..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={addLicao} disabled={!novaLicao.trim() || !novaProjeto.trim()}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Registrar Lição
            </button>
          </div>

          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
            {licoes.map((l, i) => (
              <div key={i} className="p-4 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors group">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-xs font-bold text-slate-800">{l.projeto}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">{l.data}</span>
                    <button onClick={() => setLicoes(prev => prev.filter((_, idx) => idx !== i))}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 italic leading-relaxed">"{l.licao}"</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function RelatoriosView({ projects, documents, alerts, auditLogs }: {
  projects: Project[]; documents: any[]; alerts: AlertType[]; auditLogs: any[];
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const gerar = async (key: string, fn: () => void) => {
    setLoading(key);
    await new Promise(r => setTimeout(r, 350));
    fn();
    setLoading(null);
  };

  const reports = [
    {
      key: "pipeline",
      title: "Pipeline Executivo",
      desc: "Todos os projetos: valor, status, probabilidade, risco, prazo e responsável.",
      icon: LayoutDashboard,
      action: () => downloadCSV("pipeline_executivo",
        ["Nome","Financiador","Área","Valor (R$)","Status","Probabilidade","Risco","Prazo","Responsável","Próx. Passo"],
        projects.map(p => [p.nome, p.financiador, p.area, p.valor, p.status, `${p.probabilidade}%`, p.risco, formatDate(p.prazo), getResponsavelName(p.responsavel), p.proximoPasso])
      )
    },
    {
      key: "captacao",
      title: "Relatório de Captação",
      desc: "Projetos aprovados, captados e em execução para prestação de contas.",
      icon: TrendingUp,
      action: () => downloadCSV("captacao_recursos",
        ["Nome","Status","Valor (R$)","Financiador","Área","Prazo","Responsável"],
        projects.filter(p => ["Aprovado","Captado","Formalização","Execução","Concluído"].includes(p.status))
          .map(p => [p.nome, p.status, p.valor, p.financiador, p.area, formatDate(p.prazo), getResponsavelName(p.responsavel)])
      )
    },
    {
      key: "fases",
      title: "Análise por Fase",
      desc: "Quantitativo e valor total de projetos agrupados por fase do pipeline.",
      icon: BarChart3,
      action: () => {
        const fases = Object.keys(STATUS_META).map(f => ({
          fase: f,
          count: projects.filter(p => p.status === f).length,
          valor: projects.filter(p => p.status === f).reduce((s, p) => s + p.valor, 0),
        }));
        downloadCSV("analise_por_fase", ["Fase","Nº Projetos","Valor Total (R$)"],
          fases.map(f => [f.fase, f.count, f.valor]));
      }
    },
    {
      key: "docs",
      title: "Status Documental",
      desc: "Todos os documentos com status, validade e links para acesso.",
      icon: Files,
      action: () => downloadCSV("status_documental",
        ["Documento","Status","Validade","Projeto","Link"],
        documents.map(d => [d.nome, d.status, d.validade ? formatDate(d.validade) : "Permanente", d.project?.nome || "Institucional", d.url || "—"])
      )
    },
    {
      key: "alertas",
      title: "Alertas e Prazos",
      desc: "Todos os alertas ativos com nível de urgência e dias restantes.",
      icon: Bell,
      action: () => downloadCSV("alertas_prazos",
        ["Título","Tipo","Nível","Projeto","Prazo","Dias Restantes"],
        alerts.map(a => [a.titulo || a.tipo, a.tipo, a.nivel, a.projeto, a.prazo, a.dias])
      )
    },
    {
      key: "audit",
      title: "Log de Auditoria",
      desc: "Histórico completo de ações: criações, atualizações e acessos.",
      icon: History,
      action: () => downloadCSV("log_auditoria",
        ["Data","Usuário","Ação","Entidade","ID Entidade"],
        auditLogs.map(l => [new Date(l.data).toLocaleString("pt-BR"), l.user?.name || "Sistema", l.acao, l.entidade, l.entidadeId || "—"])
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-serif">Relatórios e Exportações</h2>
        <p className="text-slate-500 text-sm">Geração de relatórios em CSV — compatível com Excel, Google Sheets e LibreOffice</p>
      </div>

      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-indigo-800">Como usar os relatórios</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            Clique em "Gerar CSV" para baixar o arquivo. Abra no Excel ou Google Planilhas.
            O arquivo usa ponto-e-vírgula como separador e codificação UTF-8 para acentos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map(r => (
          <div key={r.key} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="w-10 h-10 bg-slate-50 group-hover:bg-indigo-50 rounded-xl flex items-center justify-center mb-4 transition-colors">
              <r.icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">{r.title}</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">{r.desc}</p>
            <button onClick={() => gerar(r.key, r.action)}
              disabled={loading !== null}
              className={cn(
                "w-full py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2",
                loading === r.key
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-600"
              )}>
              {loading === r.key
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
                : <><Download className="w-3.5 h-3.5" /> Gerar CSV</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MODAL BASE ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.16 }}
        className={cn("bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto", wide ? "max-w-3xl" : "max-w-2xl")}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all";
const selectCls = "w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition-all";

// ─── MODAL PROJETO (CREATE + EDIT) ────────────────────────────────────────
function ModalProjet({ project, onClose, onSaved }: {
  project?: Project | null;   // null/undefined = criar, Project = editar
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(project?.id);

  // Converte o prazo ISO do banco para formato date input (YYYY-MM-DD)
  const toDateInput = (iso: string | null | undefined) => {
    if (!iso) return "";
    try { return new Date(iso).toISOString().split("T")[0]; } catch { return ""; }
  };

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"basico" | "avancado">("basico");
  const [form, setForm] = useState({
    nome:            project?.nome || "",
    edital:          project?.edital || "",
    financiador:     project?.financiador || "",
    area:            project?.area || "Digital",
    valor:           project ? String(project.valor) : "",
    status:          project?.status || "Triagem",
    prazo:           toDateInput(project?.prazo),
    probabilidade:   project ? String(project.probabilidade) : "50",
    risco:           project?.risco || "Médio",
    aderencia:       project ? String(project.aderencia) : "3",
    territorio:      project?.territorio || "",
    publico:         project?.publico || "",
    competitividade: project?.competitividade || "Média",
    proximoPasso:    project?.proximoPasso || "",
    observacao:      project?.observacao || "",
    categoriaEdital: project?.categoriaEdital || "",
    programaInterno: project?.programaInterno || "",
    ptScore:         project ? String(project.ptScore) : "7.0",
  });

  // Se o projeto mudar externamente (troca de registro), re-popula
  useEffect(() => {
    if (project) {
      setForm({
        nome:            project.nome || "",
        edital:          project.edital || "",
        financiador:     project.financiador || "",
        area:            project.area || "Digital",
        valor:           String(project.valor),
        status:          project.status || "Triagem",
        prazo:           toDateInput(project.prazo),
        probabilidade:   String(project.probabilidade),
        risco:           project.risco || "Médio",
        aderencia:       String(project.aderencia),
        territorio:      project.territorio || "",
        publico:         project.publico || "",
        competitividade: project.competitividade || "Média",
        proximoPasso:    project.proximoPasso || "",
        observacao:      project.observacao || "",
        categoriaEdital: project.categoriaEdital || "",
        programaInterno: project.programaInterno || "",
        ptScore:         String(project.ptScore),
      });
    }
  }, [project?.id]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nome || !form.financiador || !form.prazo || !form.valor) {
      setError("Preencha os campos obrigatórios: Nome, Financiador, Valor e Prazo.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        status:        form.status as ProjectStatus,
        risco:         form.risco as "Baixo" | "Médio" | "Alto",
        valor:         parseFloat(form.valor.replace(/\./g, "").replace(",", ".")),
        probabilidade: parseInt(form.probabilidade),
        aderencia:     parseInt(form.aderencia),
        ptScore:       parseFloat(form.ptScore),
      };
      if (isEdit && project?.id) {
        await apiClient.updateProject(project.id, payload);
      } else {
        await apiClient.createProject(payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || "Erro ao salvar projeto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? `Editar — ${project!.nome}` : "Novo Projeto"} onClose={onClose} wide>
      <div className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {isEdit && (
          <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <p className="text-xs text-indigo-700 font-medium">
              Modo edição — alterações serão salvas no registro existente (ID: {project!.id.substring(0, 8)}…)
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button onClick={() => setTab("basico")} className={cn("flex-1 py-2 text-xs font-bold transition-colors", tab === "basico" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>
            Dados Básicos
          </button>
          <button onClick={() => setTab("avancado")} className={cn("flex-1 py-2 text-xs font-bold transition-colors", tab === "avancado" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>
            Análise e Contexto
          </button>
        </div>

        {tab === "basico" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Nome do Projeto" required>
                <input className={inputCls} value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Ex: Guia Digital Teen 2026" />
              </Field>
            </div>
            <Field label="Edital / Chamamento">
              <input className={inputCls} value={form.edital} onChange={e => set("edital", e.target.value)} placeholder="Ex: FMCA/COMDICA 2026" />
            </Field>
            <Field label="Financiador" required>
              <input className={inputCls} value={form.financiador} onChange={e => set("financiador", e.target.value)} placeholder="Ex: Fundo Municipal da Criança" />
            </Field>
            <Field label="Valor Solicitado (R$)" required>
              <input className={inputCls} type="number" value={form.valor} onChange={e => set("valor", e.target.value)} placeholder="Ex: 320000" />
            </Field>
            <Field label="Prazo / Data Limite" required>
              <input className={inputCls} type="date" value={form.prazo} onChange={e => set("prazo", e.target.value)} />
            </Field>
            <Field label="Status">
              <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
                {["Oportunidade","Triagem","Elaboração","Revisão","Pronto","Inscrito","Diligência","Aprovado","Não Aprovado","Captado","Formalização","Execução","Concluído","Arquivado"].map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Área Temática">
              <select className={selectCls} value={form.area} onChange={e => set("area", e.target.value)}>
                {["Digital","Primeira Infância","Saúde Mental / TEA","Esporte","Inclusão Produtiva","Segurança Alimentar","Direitos Humanos","Cultura","Educação","Outro"].map(a => <option key={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Categoria do Edital">
              <select className={selectCls} value={form.categoriaEdital} onChange={e => set("categoriaEdital", e.target.value)}>
                {["","Fundo Municipal","Fundo Estadual","Ministério","Fundação Privada","Instituto Empresarial","Embaixada","Prêmio","Convênio Público","Outro"].map(c => <option key={c} value={c}>{c || "Selecione..."}</option>)}
              </select>
            </Field>
            <Field label="Programa Interno">
              <input className={inputCls} value={form.programaInterno} onChange={e => set("programaInterno", e.target.value)} placeholder="Ex: Inclusão Digital" />
            </Field>
            <Field label="Território / Local">
              <input className={inputCls} value={form.territorio} onChange={e => set("territorio", e.target.value)} placeholder="Ex: RPA 6 — Ipsep / Ibura" />
            </Field>
            <Field label="Público-Alvo">
              <input className={inputCls} value={form.publico} onChange={e => set("publico", e.target.value)} placeholder="Ex: Adolescentes 14–18 anos" />
            </Field>
          </div>
        )}

        {tab === "avancado" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Probabilidade de Aprovação (%)">
              <div className="flex items-center gap-3">
                <input className="flex-1" type="range" min="0" max="100" value={form.probabilidade} onChange={e => set("probabilidade", e.target.value)} />
                <span className="text-sm font-bold text-indigo-600 w-10 text-right">{form.probabilidade}%</span>
              </div>
            </Field>
            <Field label="Aderência ao Edital (1–5)">
              <select className={selectCls} value={form.aderencia} onChange={e => set("aderencia", e.target.value)}>
                {["1","2","3","4","5"].map(n => <option key={n} value={n}>{n} {"★".repeat(parseInt(n))}</option>)}
              </select>
            </Field>
            <Field label="Risco">
              <select className={selectCls} value={form.risco} onChange={e => set("risco", e.target.value)}>
                {["Baixo","Médio","Alto"].map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Competitividade">
              <select className={selectCls} value={form.competitividade} onChange={e => set("competitividade", e.target.value)}>
                {["Baixa","Média","Alta","Muito Alta"].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Score PTI (0–10)" hint="Parecer Técnico Interno">
              <input className={inputCls} type="number" min="0" max="10" step="0.1" value={form.ptScore} onChange={e => set("ptScore", e.target.value)} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Próximo Passo">
                <input className={inputCls} value={form.proximoPasso} onChange={e => set("proximoPasso", e.target.value)} placeholder="Ex: Finalizar orçamento detalhado" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Observação Estratégica">
                <textarea className={inputCls} rows={3} value={form.observacao} onChange={e => set("observacao", e.target.value)} placeholder="Histórico IGS com este financiador, pontos fortes, riscos..." />
              </Field>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Criar Projeto"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Alias mantido para retrocompatibilidade com qualquer referência de criação simples
function ModalNovoProje({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  return <ModalProjet project={null} onClose={onClose} onSaved={onSaved} />;
}

// ─── MODAL NOVO DOCUMENTO ──────────────────────────────────────────────────
function ModalNovoDocumento({ projectId, projectName, projects, onClose, onSaved }: {
  projectId?: string; projectName?: string; projects?: Project[]; onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nome: "", status: "Pendente", validade: "", url: "", projectId: projectId || "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nome) { setError("Nome do documento é obrigatório."); return; }
    setSaving(true);
    setError("");
    try {
      await apiClient.uploadDocument({
        nome: form.nome,
        status: form.status,
        validade: form.validade || null,
        url: form.url || null,
        projectId: form.projectId || null,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || "Erro ao salvar documento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Adicionar Documento${projectName ? ` — ${projectName}` : ""}`} onClose={onClose}>
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}
        <Field label="Nome do Documento" required>
          <input className={inputCls} value={form.nome} onChange={e => set("nome", e.target.value)}
            placeholder="Ex: Estatuto Social, CND Federal, Plano de Trabalho..." />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
              {["Pendente","Em Revisão","Aprovado","A Vencer","Vencido"].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Validade (se houver)">
            <input className={inputCls} type="date" value={form.validade} onChange={e => set("validade", e.target.value)} />
          </Field>
        </div>
        <Field label="Link do Documento (Google Drive, OneDrive, Dropbox...)" hint="Cole o link de compartilhamento para acesso direto">
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className={cn(inputCls, "pl-10")} type="url" value={form.url} onChange={e => set("url", e.target.value)}
              placeholder="https://drive.google.com/file/..." />
          </div>
        </Field>
        {!projectId && projects && projects.length > 0 && (
          <Field label="Vincular a um Projeto (opcional)">
            <select className={selectCls} value={form.projectId} onChange={e => set("projectId", e.target.value)}>
              <option value="">Documento Institucional (sem vínculo)</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Field>
        )}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {saving ? "Salvando..." : "Adicionar Documento"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── MODAL ATUALIZAR STATUS ────────────────────────────────────────────────
function ModalAtualizarStatus({ project, onClose, onSaved }: {
  project: Project; onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(project.status);
  const [justificativa, setJustificativa] = useState("");

  const handleSubmit = async () => {
    if (status === project.status) { onClose(); return; }
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("rota_token");
      const res = await fetch(`/api/projects/${project.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, justificativa }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao atualizar");
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Atualizar Status — ${project.nome}`} onClose={onClose}>
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Status atual</p>
            <StatusBadge status={project.status} size="md" />
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Novo status</p>
            <StatusBadge status={status as ProjectStatus} size="md" />
          </div>
        </div>
        <Field label="Novo Status">
          <select className={selectCls} value={status} onChange={e => setStatus(e.target.value as ProjectStatus)}>
            {["Oportunidade","Triagem","Elaboração","Revisão","Pronto","Inscrito","Diligência","Aprovado","Não Aprovado","Captado","Formalização","Execução","Concluído","Arquivado"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Justificativa (opcional)">
          <textarea className={inputCls} rows={3} value={justificativa}
            onChange={e => setJustificativa(e.target.value)}
            placeholder="Descreva o motivo da mudança de status..." />
        </Field>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? "Salvando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// --- MAIN APP ---

function LoginView() {
  const { setUser, setToken, setRefreshToken } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiClient.login(email, password);
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
    } catch (err) {
      alert("Erro ao entrar: " + (err instanceof Error ? err.message : "Credenciais inválidas"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-8 bg-slate-800 text-white text-center border-b border-white/10">
          <h1 className="text-4xl font-bold tracking-tighter font-serif">ROTA</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Guia Social Intelligence</p>
        </div>
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Acesso Institucional</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">E-mail</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="exemplo@guiasocial.org"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Senha</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-lg hover:bg-slate-800 transition-all uppercase tracking-widest text-xs shadow-lg disabled:opacity-50"
            >
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

export default function App() {
  const { user, token, setUser, setToken, logout } = useAuthStore();
  const [view, setView] = useState("dashboard");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Modais globais ────────────────────────────────────────────────────────
  // null = fechado | false = criar novo | Project = editar existente
  const [modalNovoProj, setModalNovoProj] = useState<Project | false | null>(null);
  const [modalNovoDoc, setModalNovoDoc] = useState<{ projectId?: string; projectName?: string; doc?: any } | null>(null);
  const [modalStatus, setModalStatus] = useState<Project | null>(null);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pData, aData, sData, lData, dData] = await Promise.all([
        apiClient.getProjects(),
        apiClient.getAlerts(),
        apiClient.getStats(),
        apiClient.getAuditLogs(),
        apiClient.getDocuments()
      ]);
      setProjects(pData);
      setStats(sData);
      setAuditLogs(lData);
      setDocuments(dData);
      // Map backend alerts to frontend AlertType
      const mappedAlerts: AlertType[] = aData.map((a: any) => ({
        id: a.id,
        titulo: a.titulo,
        nivel: a.nivel,
        tipo: a.tipo,
        projeto: a.project?.nome || "Geral",
        prazo: a.prazo ? formatDate(a.prazo) : "N/A",
        dias: a.prazo
          ? Math.max(0, Math.ceil((new Date(a.prazo).getTime() - Date.now()) / 86400000))
          : 0,
        cor: a.nivel === "N4" ? B.red : a.nivel === "N3" ? B.orange : a.nivel === "N2" ? B.blue : B.gray,
        bgCor: a.nivel === "N4" ? B.redBg : a.nivel === "N3" ? B.orangeBg : a.nivel === "N2" ? B.blueBg : B.grayLight,
        mensagem: a.mensagem
      }));
      setAlerts(mappedAlerts);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

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

  const handleProjectSelect = (p: Project) => {
    setSelectedProject(p);
    setView("projeto");
  };

  const handleBack = () => {
    setSelectedProject(null);
    setView("pipeline");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-50">
        <div className="p-8 border-b border-white/5">
          <h1 className="text-3xl font-bold tracking-tighter font-serif text-white">ROTA</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Guia Social Intelligence</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setSelectedProject(null); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all uppercase tracking-widest",
                view === item.id 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
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
            <button 
              onClick={logout}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Sair"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
              {view === "projeto" ? "Detalhes do Projeto" : navItems.find(n => n.id === view)?.label}
            </h2>
            {loading && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString('pt-BR')}
            </div>
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors" onClick={() => { setView("alertas"); setSelectedProject(null); }}>
              <Bell className="w-5 h-5" />
              {alerts.filter(a => a.nivel === "N4" || a.nivel === "N3").length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[8px] font-bold text-white flex items-center justify-center">
                  {Math.min(alerts.filter(a => a.nivel === "N4" || a.nivel === "N3").length, 9)}
                </span>
              )}
            </button>
            <button onClick={fetchData} title="Atualizar dados" className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* View Container */}
        <div className="p-8 max-w-7xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm font-medium">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={view + (selectedProject?.id || "")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === "dashboard" && <DashboardView projects={projects} alerts={alerts} onNav={setView} onProject={handleProjectSelect} />}
              {view === "pipeline" && <PipelineView projects={projects} onProject={handleProjectSelect} onNewProject={() => setModalNovoProj(false)} onEditProject={(p) => setModalNovoProj(p)} />}
              {view === "editais" && <EditaisView onNewProject={(e) => { setModalNovoProj(false); }} />}
              {view === "alertas" && <AlertasView alerts={alerts} />}
              {view === "documentos" && <DocumentosView documents={documents} onNewDoc={() => setModalNovoDoc({})} />}
              {view === "memoria" && <MemoriaView projects={projects} stats={stats} auditLogs={auditLogs} />}
              {view === "relatorios" && <RelatoriosView projects={projects} documents={documents} alerts={alerts} auditLogs={auditLogs} />}
              {view === "projeto" && selectedProject && (
                <ProjectDetailView
                  project={selectedProject}
                  onBack={handleBack}
                  onAddDoc={(projectId, projectName) => setModalNovoDoc({ projectId, projectName })}
                  onUpdateStatus={(p) => setModalStatus(p)}
                  onEditProject={(p) => setModalNovoProj(p)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Modais globais ── */}
      {modalNovoProj !== null && (
        <ModalProjet
          project={modalNovoProj === false ? null : modalNovoProj}
          onClose={() => setModalNovoProj(null)}
          onSaved={() => {
            const editedId = modalNovoProj && typeof modalNovoProj === "object" ? (modalNovoProj as Project).id : null;
            setModalNovoProj(null);
            fetchData().then(() => {
              if (editedId && selectedProject?.id === editedId) {
                apiClient.getProjects().then(ps => {
                  const updated = ps.find((p: Project) => p.id === editedId);
                  if (updated) setSelectedProject(updated);
                }).catch(() => {});
              }
            }).catch(() => {});
          }}
        />
      )}
      {modalNovoDoc !== null && (
        <ModalNovoDocumento
          projectId={modalNovoDoc.projectId}
          projectName={modalNovoDoc.projectName}
          projects={projects}
          onClose={() => setModalNovoDoc(null)}
          onSaved={() => { setModalNovoDoc(null); fetchData(); }}
        />
      )}
      {modalStatus !== null && (
        <ModalAtualizarStatus
          project={modalStatus}
          onClose={() => setModalStatus(null)}
          onSaved={() => {
            setModalStatus(null);
            fetchData();
            if (selectedProject && selectedProject.id === modalStatus.id) {
              // refresh selectedProject
              apiClient.getProjects().then(ps => {
                const updated = ps.find((p: Project) => p.id === modalStatus.id);
                if (updated) setSelectedProject(updated);
              }).catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}
