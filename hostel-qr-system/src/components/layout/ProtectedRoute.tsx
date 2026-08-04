import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store';
import type { UserRole } from '@/types';
import { ShieldCheck } from 'lucide-react';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-400">Verifying Authentication Session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to user's valid dashboard if role doesn't match
    const redirectPath = user.role === 'student' ? '/student/dashboard' : '/warden/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};
