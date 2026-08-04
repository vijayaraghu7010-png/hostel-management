import React from 'react';
import { Card, Button } from '@/components/ui';
import { useAuthStore } from '@/store';
import { QrCode, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Student Portal Active
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Welcome, {user?.fullName || 'Student'}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Reg. No: <span className="font-mono text-slate-300">{user?.registrationNumber || 'STU-2026-8901'}</span>
            </p>
          </div>
          <Button variant="secondary" size="sm" className="self-start sm:self-auto">
            <Clock className="w-4 h-4 mr-2 text-indigo-400" />
            Session History
          </Button>
        </div>
      </div>

      {/* Grid Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="flex flex-col items-center justify-center p-8 text-center space-y-4 border-dashed border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <QrCode className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-200">Study Hour Dynamic QR</h3>
            <p className="text-xs text-slate-400 mt-1">QR Module ready for task integration</p>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 font-mono">
            Component Mount Foundation
          </span>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold text-slate-200">Active Status</h3>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Session Status</span>
              <span className="font-semibold text-emerald-400">Ready</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Security Encryption</span>
              <span className="font-mono text-slate-300">AES-256 Enabled</span>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold text-slate-200">System Logs</h3>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Foundation architecture configured cleanly with React Router, Zustand, Supabase client, and TypeScript strict mode.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
