import * as WebBrowser from "expo-web-browser";
import { create } from "zustand";
import { authClient } from "../lib/auth-client";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      if (!data?.user) throw new Error("Connexion échouée");
      set({
        user: { id: data.user.id, email: data.user.email, name: data.user.name },
        isLoading: false,
      });
    } catch (error) {
      set({ user: null, isLoading: false });
      throw error;
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true });
    try {
      // Fermer toute session browser résiduelle avant d'en ouvrir une nouvelle
      WebBrowser.dismissAuthSession();

      const { data, error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      if (error) throw new Error(error.message);
      // After OAuth redirect, check session
      const session = await authClient.getSession();
      if (session.data?.user) {
        set({
          user: {
            id: session.data.user.id,
            email: session.data.user.email,
            name: session.data.user.name,
          },
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email, name, password) => {
    set({ isLoading: true });
    try {
      const { data, error } = await authClient.signUp.email({
        email,
        name,
        password,
      });
      if (error) throw new Error(error.message);
      if (!data?.user) throw new Error("Inscription échouée");
      set({
        user: { id: data.user.id, email: data.user.email, name: data.user.name },
        isLoading: false,
      });
    } catch (error) {
      set({ user: null, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await authClient.signOut();
    set({ user: null });
  },

  checkSession: async () => {
    try {
      const { data } = await authClient.getSession();
      if (data?.user) {
        set({
          user: {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
          },
        });
      } else {
        set({ user: null });
      }
    } catch {
      set({ user: null });
    }
  },
}));
