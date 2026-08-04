import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/services/auth';
import { supabase } from '@/services/supabase/client';
import type { UserProfile } from '@/types';
import type { Session } from '@supabase/supabase-js';

interface AuthStoreState {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  rememberMe: boolean;
  setRememberMe: (remember: boolean) => void;
  login: (email: string, password: string) => Promise<UserProfile | null>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      error: null,
      rememberMe: true,

      setRememberMe: (rememberMe) => set({ rememberMe }),

      setUser: (user) => set({ user }),

      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const res = await authService.login(email, password);
          if (res.error) {
            set({ error: res.error, loading: false });
            return null;
          }

          set({
            user: res.user,
            session: res.session,
            loading: false,
            error: null,
          });

          return res.user;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Login failed';
          set({ error: msg, loading: false });
          return null;
        }
      },

      logout: async () => {
        set({ loading: true });
        await authService.logout();
        set({ user: null, session: null, loading: false, error: null });
      },

      initialize: async () => {
        set({ loading: true });
        try {
          // Listen to Supabase auth changes
          supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
              const currentUser = await authService.getCurrentUser();
              set({ session, user: currentUser, loading: false });
            } else {
              // Keep existing state if offline/demo fallback user is present
              const currentUser = get().user;
              set({ session: null, user: currentUser, loading: false });
            }
          });

          const currentSession = await authService.getCurrentSession();
          if (currentSession) {
            const currentUser = await authService.getCurrentUser();
            set({ session: currentSession, user: currentUser, loading: false });
          } else {
            set({ loading: false });
          }
        } catch {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'hostel-qr-auth-storage',
      partialize: (state) => ({
        user: state.user,
        rememberMe: state.rememberMe,
      }),
    }
  )
);
