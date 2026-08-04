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

export class AdminService {
  static getOverviewStats(): SystemOverviewStats {
    return {
      onlineUsers: 48,
      activeSessions: 2,
      todaysAttendance: 118,
      todaysScans: 342,
      activeCameras: 4,
    };
  }

  static getActiveStudySessions(): LiveStudySessionItem[] {
    return [
      {
        id: 'SES-901',
        sessionName: 'Evening Study Hour - Block A',
        startTime: new Date(Date.now() - 3600000).toISOString(),
        durationFormatted: '01:00:15',
        presentCount: 84,
        pendingCount: 12,
        status: 'ACTIVE',
      },
      {
        id: 'SES-902',
        sessionName: 'Library Quiet Study Session',
        startTime: new Date(Date.now() - 1800000).toISOString(),
        durationFormatted: '00:30:45',
        presentCount: 34,
        pendingCount: 4,
        status: 'ACTIVE',
      },
    ];
  }

  static getOutpassMetrics(): LiveOutpassMetrics {
    return {
      pendingRequests: 5,
      approved: 28,
      rejected: 3,
      studentsOutside: 14,
      studentsReturned: 14,
    };
  }

  static getRecentScans(): RecentScanItem[] {
    const now = Date.now();
    return [
      {
        id: 'SCN-101',
        studentName: 'Alex Rivera',
        studentReg: 'STU-2026-8901',
        qrType: 'STUDY',
        time: new Date(now - 120000).toLocaleTimeString(),
        result: 'SUCCESS',
        scannerDevice: 'Warden Cam 01 (Rear)',
      },
      {
        id: 'SCN-102',
        studentName: 'Rahul Sharma',
        studentReg: 'STU-2026-8902',
        qrType: 'OUTPASS',
        time: new Date(now - 450000).toLocaleTimeString(),
        result: 'SUCCESS',
        scannerDevice: 'Hostel Gate Control 02',
      },
      {
        id: 'SCN-103',
        studentName: 'Priya Patel',
        studentReg: 'STU-2026-8903',
        qrType: 'STUDY',
        time: new Date(now - 900000).toLocaleTimeString(),
        result: 'EXPIRED',
        scannerDevice: 'Warden Cam 01 (Rear)',
      },
      {
        id: 'SCN-104',
        studentName: 'Karthik Raja',
        studentReg: 'STU-2026-8906',
        qrType: 'MESS',
        time: new Date(now - 1400000).toLocaleTimeString(),
        result: 'SUCCESS',
        scannerDevice: 'Mess Terminal 01',
      },
    ];
  }

  static getSystemHealth(): ServiceHealthItem[] {
    const nowIso = new Date().toISOString();
    return [
      { serviceName: 'Supabase', status: 'HEALTHY', latencyMs: 38, lastChecked: nowIso },
      { serviceName: 'ERP Gateway', status: 'HEALTHY', latencyMs: 64, lastChecked: nowIso },
      { serviceName: 'Scanner Engine', status: 'HEALTHY', latencyMs: 12, lastChecked: nowIso },
      { serviceName: 'Authentication', status: 'HEALTHY', latencyMs: 25, lastChecked: nowIso },
      { serviceName: 'API Gateway', status: 'HEALTHY', latencyMs: 42, lastChecked: nowIso },
    ];
  }

  static getAnalyticsTrends(): AnalyticsTrendPoint[] {
    return [
      { label: 'Mon', attendance: 110, scans: 290 },
      { label: 'Tue', attendance: 118, scans: 342 },
      { label: 'Wed', attendance: 115, scans: 310 },
      { label: 'Thu', attendance: 122, scans: 360 },
      { label: 'Fri', attendance: 108, scans: 280 },
      { label: 'Sat', attendance: 95, scans: 210 },
      { label: 'Sun', attendance: 102, scans: 235 },
    ];
  }

  static getDepartmentStats(): DepartmentStatItem[] {
    return [
      { department: 'CSE', totalStudents: 40, presentCount: 38, rate: 95 },
      { department: 'ECE', totalStudents: 32, presentCount: 30, rate: 93 },
      { department: 'EEE', totalStudents: 28, presentCount: 25, rate: 89 },
      { department: 'MECH', totalStudents: 24, presentCount: 21, rate: 87 },
    ];
  }

  static getErrorLogs(): SystemErrorLog[] {
    return [
      {
        id: 'ERR-501',
        category: 'ERP',
        message: 'PostgREST HTTP 504 Gateway Timeout on endpoint erp_events',
        timestamp: new Date(Date.now() - 3600000).toLocaleTimeString(),
        status: 'RESOLVED',
      },
      {
        id: 'ERR-502',
        category: 'SCANNER',
        message: 'Camera permission denied on mobile webkit fallback',
        timestamp: new Date(Date.now() - 7200000).toLocaleTimeString(),
        status: 'UNRESOLVED',
      },
      {
        id: 'ERR-503',
        category: 'SUPABASE',
        message: 'Transient connection drop during realtime channel subscribe',
        timestamp: new Date(Date.now() - 14400000).toLocaleTimeString(),
        status: 'RESOLVED',
      },
    ];
  }

  static async executeQuickAction(
    actionType: 'REFRESH' | 'FORCE_SYNC' | 'CLEAR_CACHE' | 'RECONNECT_ERP' | 'RESTART_SCANNER'
  ): Promise<{ success: boolean; message: string }> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    switch (actionType) {
      case 'REFRESH':
        return { success: true, message: 'System metrics and dashboard data refreshed.' };
      case 'FORCE_SYNC':
        return { success: true, message: 'ERP background queue flushed & synchronized.' };
      case 'CLEAR_CACHE':
        localStorage.removeItem('hms_study_attendance_v2');
        return { success: true, message: 'Local client cache purged successfully.' };
      case 'RECONNECT_ERP':
        return { success: true, message: 'ERP PostgREST connection re-established.' };
      case 'RESTART_SCANNER':
        return { success: true, message: 'Camera engine hardware interfaces restarted.' };
      default:
        return { success: true, message: 'Action completed.' };
    }
  }
}
