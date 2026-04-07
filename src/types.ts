export type ProjectStatus = 
  | "Oportunidade"
  | "Triagem"
  | "Elaboração"
  | "Revisão"
  | "Pronto"
  | "Inscrito"
  | "Diligência"
  | "Aprovado"
  | "Não Aprovado"
  | "Captado"
  | "Formalização"
  | "Execução"
  | "Concluído"
  | "Arquivado";

export interface PTICriterion {
  critério: string;
  score: number;
}

export interface ProjectHistory {
  data: string;
  acao: string;
  autor: string;
  detalhes?: string;
}

export interface ChangeLog {
  id: string;
  data: string;
  autor: string;
  campo: "valor" | "status" | "probabilidade";
  valorAnterior: string | number;
  valorNovo: string | number;
  justificativa?: string;
}

export interface Document {
  id: string;
  nome: string;
  status: "Aprovado" | "Pendente" | "Em Revisão" | "A Vencer" | "Vencido" | "Em Análise";
  validade: string | null;
  url?: string;
  project?: { id: string; nome: string };
  obrigatorio?: boolean;
  versao?: number;
}

export interface Meta {
  id: string;
  descricao: string;
  indicador: string;
  meta: number;
  alcancado: number;
  unidade: string;
}

export interface Etapa {
  id: string;
  nome: string;
  inicio: string;
  fim: string;
  status: "Planejado" | "Em curso" | "Concluído" | "Atrasado";
  peso: number; // % no cronograma
}

export interface Cotacao {
  id: string;
  fornecedor: string;
  valor: number;
  data: string;
  vencedora: boolean;
  docUrl?: string;
}

export interface Expense {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  status: "Pendente" | "Validado" | "Glosa" | "Em Análise";
  justificativa?: string;
  vincMetaId: string;
  vincEtapaId: string;
  cotacoes: Cotacao[];
}

export interface Edital {
  id: string;
  nome: string;
  financiador: string;
  valorMax: number;
  prazo: string;
  status: string;
  aderencia: number;
  categoria: string;
  linha: string;
  porte: string;
  link?: string;
  observacao?: string;
}

export interface ComplianceCheck {
  id: string;
  item: string;
  status: "Conforme" | "Não Conforme" | "N/A";
  observacao?: string;
  data: string;
}

export interface AuditLog {
  id: string;
  data: string;
  usuario: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  detalhes: string;
}

export interface UserRef {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Project {
  id: string;
  nome: string;
  edital: string;
  financiador: string;
  area: string;
  valor: number;
  status: ProjectStatus;
  prazo: string;
  responsavel: string | UserRef;
  probabilidade: number;
  risco: "Baixo" | "Médio" | "Alto";
  aderencia: number;
  territorio: string;
  publico: string;
  competitividade: string;
  proximoPasso: string;
  ptScore: number;
  ptCriterios: PTICriterion[];
  historico: ProjectHistory[];
  changeLog?: ChangeLog[];
  docs: Document[];
  observacao?: string;
  ano?: number;
  programaInterno?: string;
  categoriaEdital?: string;
  vigenciaInicio?: string;
  vigenciaFim?: string;
  progressoFisico?: number;
  progressoFinanceiro?: number;
  scoreCompliance?: number;
  scoreRiscoGlosa?: number;
  
  // Compliance & Execution
  metas?: Meta[];
  etapas?: Etapa[];
  expenses?: Expense[];
  complianceChecks?: ComplianceCheck[];
  auditLogs?: AuditLog[];
}

export interface AlertType {
  id: string | number;
  nivel: "N1" | "N2" | "N3" | "N4";
  tipo: string;
  projeto: string;
  prazo: string;
  dias: number;
  cor: string;
  bgCor: string;
  titulo?: string;
  mensagem?: string;
  doc?: string;
  acaoRecomendada?: string;
}
