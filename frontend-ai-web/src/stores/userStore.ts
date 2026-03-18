import { create } from "zustand";

interface UserState {
  user: { name: string; email: string; role: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loadToken: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      // Mock API call — replace with real API later
      // const data = await apiPost("/auth/login", { email, password });
      await new Promise((r) => setTimeout(r, 1500));

      // Mock response
      if (email && password) {
        const mockToken = "mock_jwt_token_" + Date.now();
        const mockUser = { name: "ผู้ดูแลระบบ", email, role: "admin" };
        localStorage.setItem("guardian_token", mockToken);
        localStorage.setItem("guardian_user", JSON.stringify(mockUser));
        set({ token: mockToken, user: mockUser, isAuthenticated: true });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  register: async (name: string, email: string, password: string) => {
    try {
      await new Promise((r) => setTimeout(r, 1500));
      if (name && email && password) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("guardian_token");
    localStorage.removeItem("guardian_user");
    set({ token: null, user: null, isAuthenticated: false });
  },

  loadToken: () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("guardian_token");
    const userStr = localStorage.getItem("guardian_user");
    if (token && userStr) {
      set({
        token,
        user: JSON.parse(userStr),
        isAuthenticated: true,
      });
    }
  },
}));
