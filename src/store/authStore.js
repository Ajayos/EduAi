import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      updateUser: (data) => set((state) => ({ user: { ...state.user, ...data } })),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: "eduai-auth",
    },
  ),
);
