// src/store/authStore.ts
import { create } from "zustand";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  logout: () => void;
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

const storedToken = localStorage.getItem("rota_token");
const tokenValid = storedToken ? !isTokenExpired(storedToken) : false;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: tokenValid ? storedToken : null,
  refreshToken: localStorage.getItem("rota_refresh_token"),
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem("rota_token", token);
    else localStorage.removeItem("rota_token");
    set({ token });
  },
  setRefreshToken: (token) => {
    if (token) localStorage.setItem("rota_refresh_token", token);
    else localStorage.removeItem("rota_refresh_token");
    set({ refreshToken: token });
  },
  logout: () => {
    localStorage.removeItem("rota_token");
    localStorage.removeItem("rota_refresh_token");
    set({ user: null, token: null, refreshToken: null });
  },
}));

// Limpar token inválido do localStorage se estava expirado
if (storedToken && !tokenValid) {
  localStorage.removeItem("rota_token");
}
