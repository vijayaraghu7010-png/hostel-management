import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  QrCode,
  Shield,
  LogIn,
  Clock,
  FileText,
  DoorOpen,
  Camera,
  Activity,
  BarChart2,
  Settings,
  X,
  Sparkles,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/store';
import { cn } from '@/utils';

export const Sidebar: React.FC = () => {
  const { isSidebarOpen, setSidebarOpen } = useAppStore();
  const { user } = useAuthStore();

  const erpCoreItems = [
    { label: 'Login', path: '/login', icon: LogIn, show: !user },
    { label: 'ERP Dashboard', path: '/student/dashboard', icon: LayoutDashboard, show: user?.role === 'student' },
    { label: 'Warden Dashboard', path: '/warden/dashboard', icon: Shield, show: !user || user.role === 'warden' },
  ];

  const qrPortalItems = [
    { label: 'Universal Scanner', path: '/scanner', icon: Camera, show: true, highlight: true },
    { label: 'Student Digital Pass', path: '/student/study', icon: QrCode, show: !user || user.role === 'student' },
    { label: 'Study Hour Control', path: '/warden/study', icon: Clock, show: !user || user.role === 'warden' },
    { label: 'Gate Outpass Control', path: '/warden/outpass', icon: DoorOpen, show: !user || user.role === 'warden' },
    { label: 'Student Outpass', path: '/student/outpass', icon: FileText, show: !user || user.role === 'student' },
    { label: 'Live Analytics', path: '/admin/dashboard', icon: BarChart2, show: true },
    { label: 'Live System Monitor', path: '/admin/dashboard', icon: Activity, show: true },
    { label: 'Settings', path: '/admin/dashboard', icon: Settings, show: true },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/25">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-100 text-sm tracking-tight block">KVCET Hostel ERP</span>
              <span className="text-[10px] font-mono text-blue-400">Enterprise Edition</span>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* ERP Core Section */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
              ERP Core Navigation
            </p>
            {erpCoreItems
              .filter((item) => item.show)
              .map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150',
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    )
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
          </div>

          {/* ⭐ QR Portal Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-400" />
                QR Portal Suite
              </p>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-500/20 text-blue-300">
                PRO
              </span>
            </div>

            {qrPortalItems
              .filter((item) => item.show)
              .map((item) => (
                <NavLink
                  key={item.path + item.label}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150',
                      item.highlight && !isActive
                        ? 'bg-blue-600/10 text-blue-300 border border-blue-500/20 hover:bg-blue-600/20'
                        : isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.highlight && (
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  )}
                </NavLink>
              ))}
          </div>
        </div>

        {/* Footer info badge */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 text-center">
            <p className="text-[11px] font-bold text-slate-300">Tier-1 SaaS Architecture</p>
            <p className="text-[9px] font-mono text-slate-500 mt-0.5">Unified ERP Embedded Engine</p>
          </div>
        </div>
      </aside>
    </>
  );
};
