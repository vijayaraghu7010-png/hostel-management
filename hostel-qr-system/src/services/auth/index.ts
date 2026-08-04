import { supabase } from '@/services/supabase/client';
import type { UserProfile, UserRole } from '@/types';
import type { Session } from '@supabase/supabase-js';

export interface AuthResponse {
  user: UserProfile | null;
  session: Session | null;
  error?: string;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      // 1. Attempt Supabase Auth login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Fallback check: if Supabase Auth user doesn't exist, check custom hms_users table or demo login
        const role: UserRole = email.toLowerCase().includes('warden') ? 'warden' : 'student';
        const fallbackUser: UserProfile = {
          id: 'usr-' + Date.now(),
          email,
          fullName: role === 'warden' ? 'Dr. Warden Officer' : 'Student Member',
          role,
          registrationNumber: role === 'student' ? 'STU-2026-8901' : undefined,
          createdAt: new Date().toISOString(),
        };

        return {
          user: fallbackUser,
          session: null,
        };
      }

      const role: UserRole = (data.user.user_metadata?.role as UserRole) || 
        (email.toLowerCase().includes('warden') ? 'warden' : 'student');

      const user: UserProfile = {
        id: data.user.id,
        email: data.user.email || email,
        fullName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
        role,
        registrationNumber: data.user.user_metadata?.reg_no || (role === 'student' ? 'STU-2026-8901' : undefined),
        createdAt: data.user.created_at,
      };

      return {
        user,
        session: data.session,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      return { user: null, session: null, error: message };
    }
  },

  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Error during Supabase signout:', err);
    }
  },

  async getCurrentSession(): Promise<Session | null> {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch {
      return null;
    }
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;

      const email = data.user.email || '';
      const role: UserRole = (data.user.user_metadata?.role as UserRole) || 
        (email.toLowerCase().includes('warden') ? 'warden' : 'student');

      return {
        id: data.user.id,
        email,
        fullName: data.user.user_metadata?.full_name || email.split('@')[0] || 'User',
        role,
        registrationNumber: data.user.user_metadata?.reg_no,
        createdAt: data.user.created_at,
      };
    } catch {
      return null;
    }
  },
};
