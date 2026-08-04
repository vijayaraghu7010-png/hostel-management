import { useState, useEffect, useCallback } from 'react';
import type {
  SystemOverviewStats,
  LiveStudySessionItem,
  LiveOutpassMetrics,
  RecentScanItem,
  ServiceHealthItem,
  AnalyticsTrendPoint,
  DepartmentStatItem,
  SystemErrorLog,
} from '../types/admin';
import { AdminService } from '../services/AdminService';

export function useAdminDashboard() {
  const [overview, setOverview] = useState<SystemOverviewStats>(AdminService.getOverviewStats());
  const [activeSessions, setActiveSessions] = useState<LiveStudySessionItem[]>(AdminService.getActiveStudySessions());
  const [outpassMetrics, setOutpassMetrics] = useState<LiveOutpassMetrics>(AdminService.getOutpassMetrics());
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>(AdminService.getRecentScans());
  const [systemHealth, setSystemHealth] = useState<ServiceHealthItem[]>(AdminService.getSystemHealth());
  const [analyticsTrends, setAnalyticsTrends] = useState<AnalyticsTrendPoint[]>(AdminService.getAnalyticsTrends());
  const [departmentStats, setDepartmentStats] = useState<DepartmentStatItem[]>(AdminService.getDepartmentStats());
  const [errorLogs, setErrorLogs] = useState<SystemErrorLog[]>(AdminService.getErrorLogs());

  const [loading, setLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const refreshDashboard = useCallback(() => {
    setOverview(AdminService.getOverviewStats());
    setActiveSessions(AdminService.getActiveStudySessions());
    setOutpassMetrics(AdminService.getOutpassMetrics());
    setRecentScans(AdminService.getRecentScans());
    setSystemHealth(AdminService.getSystemHealth());
    setAnalyticsTrends(AdminService.getAnalyticsTrends());
    setDepartmentStats(AdminService.getDepartmentStats());
    setErrorLogs(AdminService.getErrorLogs());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshDashboard();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshDashboard]);

  const executeAction = useCallback(
    async (actionType: 'REFRESH' | 'FORCE_SYNC' | 'CLEAR_CACHE' | 'RECONNECT_ERP' | 'RESTART_SCANNER') => {
      setLoading(true);
      setActionMessage(null);
      try {
        const res = await AdminService.executeQuickAction(actionType);
        setActionMessage(res.message);
        refreshDashboard();
        setTimeout(() => setActionMessage(null), 4000);
        return res;
      } finally {
        setLoading(false);
      }
    },
    [refreshDashboard]
  );

  return {
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
    refreshDashboard,
    executeAction,
  };
}
