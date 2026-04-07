// src/api/client.ts
import { Project, AlertType, Document } from "../types";
import { useAuthStore } from "../store/authStore";

const API_BASE = "/api";

const getHeaders = () => {
  const token = localStorage.getItem("rota_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function fetchWithRefresh(url: string, options: RequestInit): Promise<Response> {
  let res = await fetch(url, options);

  if (res.status === 401) {
    const refreshToken = localStorage.getItem("rota_refresh_token");
    if (!refreshToken) {
      useAuthStore.getState().logout();
      return res;
    }
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!refreshRes.ok) throw new Error("refresh failed");
      const { accessToken } = await refreshRes.json();
      useAuthStore.getState().setToken(accessToken);
      // Retry original request with new token
      const retryOptions = {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      };
      res = await fetch(url, retryOptions);
    } catch {
      useAuthStore.getState().logout();
    }
  }
  return res;
}

export const apiClient = {
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha na autenticação");
    // Servidor retorna accessToken + refreshToken
    return data;
  },

  async getProjects(): Promise<Project[]> {
    const res = await fetchWithRefresh(`${API_BASE}/projects`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao buscar projetos");
    return res.json();
  },

  async createProject(project: Partial<Project>) {
    const res = await fetchWithRefresh(`${API_BASE}/projects`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(project),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao criar projeto");
    return data;
  },

  async updateProject(id: string, project: Partial<Project>) {
    const res = await fetchWithRefresh(`${API_BASE}/projects/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(project),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar projeto");
    return data;
  },

  async getAlerts(): Promise<AlertType[]> {
    const res = await fetchWithRefresh(`${API_BASE}/alerts`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao buscar alertas");
    return res.json();
  },

  async readAlert(id: string) {
    const res = await fetchWithRefresh(`${API_BASE}/alerts/${id}/read`, {
      method: "PATCH",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao marcar alerta como lido");
    return res.json();
  },

  async resolveAlert(id: string, resolucao: string) {
    const res = await fetchWithRefresh(`${API_BASE}/alerts/${id}/resolve`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ resolucao }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao resolver alerta");
    return data;
  },

  async createExpense(expense: any) {
    const res = await fetchWithRefresh(`${API_BASE}/expenses`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(expense),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao processar despesa");
    return data;
  },

  async uploadDocument(doc: any) {
    const res = await fetchWithRefresh(`${API_BASE}/documents`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(doc),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao salvar documento");
    return data;
  },

  async updateDocument(id: string, doc: any) {
    const res = await fetchWithRefresh(`${API_BASE}/documents/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(doc),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar documento");
    return data;
  },

  async deleteProject(id: string): Promise<void> {
    const res = await fetchWithRefresh(`${API_BASE}/projects/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao excluir projeto");
    }
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetchWithRefresh(`${API_BASE}/documents/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao excluir documento");
    }
  },

  async getEditais() {
    const res = await fetchWithRefresh(`${API_BASE}/editais`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao buscar editais");
    return res.json();
  },

  async createEdital(edital: any) {
    const res = await fetchWithRefresh(`${API_BASE}/editais`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(edital),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao criar edital");
    return data;
  },

  async updateEdital(id: string, edital: any) {
    const res = await fetchWithRefresh(`${API_BASE}/editais/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(edital),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar edital");
    return data;
  },

  async deleteEdital(id: string): Promise<void> {
    const res = await fetchWithRefresh(`${API_BASE}/editais/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao excluir edital");
    }
  },

  async getAuditLogs() {
    const res = await fetchWithRefresh(`${API_BASE}/audit-logs`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao buscar logs de auditoria");
    return res.json();
  },

  async getDocuments() {
    const res = await fetchWithRefresh(`${API_BASE}/documents`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao buscar documentos");
    return res.json();
  },

  async getStats() {
    const res = await fetchWithRefresh(`${API_BASE}/stats`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao buscar estatísticas");
    return res.json();
  },

  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },
};
