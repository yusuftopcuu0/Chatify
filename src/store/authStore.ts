import { create } from "zustand";

interface AuthState {
  user: {
    email: string;
    uid: string;
  } | null;
  setUser: (user: { email: string; uid: string }) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
