import React from 'react';
import { motion } from 'framer-motion';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import { SystemOverview } from '../components/SystemOverview';
import { ActiveSessions } from '../components/ActiveSessions';
import { LiveAttendance } from '../components/LiveAttendance';
import { RecentScans } from '../components/RecentScans';
import { SystemHealth } from '../components/SystemHealth';
import { SyncStatus } from '../components/SyncStatus';
import { ErrorLogs } from '../components/ErrorLogs';
import { QuickActions } from '../components/QuickActions';
import { AnalyticsCards } from '../components/AnalyticsCards';
import { AttendanceChart } from '../components/Charts/AttendanceChart';
import { ScanChart } from '../components/Charts/ScanChart';
import { Card } from '@/components/ui';
import { Shield, CheckCircle2 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    overview,
    activeSessions,
    outpassMetrics,
    recentScans,
    systemHealth,
    analyticsTrends,
    departmentStats,
    errorLogs,
    loading,
    actionMessage,
    executeAction,
  } = useAdminDashboard();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 pb-12"
    >
      {/* Toast Notification Banner */}
      {actionMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-950 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20 mb-2">
            <Shield className="w-3.5 h-3.5" />
            Universal QR Portal • Master Command Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Admin System Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Realtime monitoring across study sessions, gate outpass verification, infrastructure health, and ERP pipelines
          </p>
        </div>
      </div>

      {/* 1. System Overview Section */}
      <SystemOverview stats={overview} />

      {/* Quick Actions Toolbar & Sync Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <QuickActions onExecute={(act) => void executeAction(act)} isLoading={loading} />
        </div>
        <div className="lg:col-span-4">
          <SyncStatus queuedCount={0} />
        </div>
      </div>

      {/* 2 & 3. Live Sessions & Outpass Gate Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <ActiveSessions sessions={activeSessions} />
        </div>
        <div className="lg:col-span-5">
          <LiveAttendance metrics={outpassMetrics} />
        </div>
      </div>

      {/* 4 & 5. Recent Scans & Infrastructure Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <RecentScans scans={recentScans} />
        </div>
        <div className="lg:col-span-6">
          <SystemHealth services={systemHealth} />
        </div>
      </div>

      {/* 6. Analytics Section (Charts & Department Stats) */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-slate-900/90 border-slate-800">
            <AttendanceChart data={analyticsTrends} />
          </Card>
          <Card className="p-6 bg-slate-900/90 border-slate-800">
            <ScanChart data={analyticsTrends} />
          </Card>
        </div>

        <AnalyticsCards departments={departmentStats} />
      </div>

      {/* 8. Diagnostic Error Monitor */}
      <ErrorLogs logs={errorLogs} />
    </motion.div>
  );
};

export default AdminDashboard;
