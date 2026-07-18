import { create } from "zustand";

interface UserProfile {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  city?: string;
  state?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem("access_token"),
  user: JSON.parse(localStorage.getItem("ccfd_user") || "null"),
  accessToken: localStorage.getItem("access_token"),
  refreshToken: localStorage.getItem("refresh_token"),
  
  setTokens: (access, refresh) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
  },
  
  setUser: (user) => {
    localStorage.setItem("ccfd_user", JSON.stringify(user));
    set({ user });
  },
  
  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("ccfd_user");
    set({ isAuthenticated: false, user: null, accessToken: null, refreshToken: null });
  },
}));
