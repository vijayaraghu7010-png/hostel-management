import React from 'react';
import { Menu, LogOut, ShieldCheck, User, Wifi } from 'lucide-react';
import { useAppStore, useAuthStore } from '@/store';
import { Button } from '@/components/ui';

export const Header: React.FC = () => {
  const { isSidebarOpen, setSidebarOpen } = useAppStore();
  const { user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-100 tracking-tight flex items-center gap-2">
                KVCET Universal QR Engine
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse hidden sm:inline-block" />
              </h1>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Tier-1 SaaS Enterprise Infrastructure
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection pulse badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-mono font-bold border border-blue-500/20">
            <Wifi className="w-3 h-3 text-blue-400" />
            LIVE PIPELINE
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-200 leading-none">{user.fullName}</p>
                  <p className="text-[10px] text-slate-400 capitalize mt-0.5 font-mono">{user.role}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
              >
                <LogOut className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-bold px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
              Guest Mode
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
