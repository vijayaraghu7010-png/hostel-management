export interface SystemOverviewStats {
  onlineUsers: number;
  activeSessions: number;
  todaysAttendance: number;
  todaysScans: number;
  activeCameras: number;
}

export interface LiveStudySessionItem {
  id: string;
  sessionName: string;
  startTime: string;
  durationFormatted: string;
  presentCount: number;
  pendingCount: number;
  status: 'ACTIVE' | 'WAITING' | 'ENDED';
}

export interface LiveOutpassMetrics {
  pendingRequests: number;
  approved: number;
  rejected: number;
  studentsOutside: number;
  studentsReturned: number;
}

export interface RecentScanItem {
  id: string;
  studentName: string;
  studentReg: string;
  qrType: 'STUDY' | 'OUTPASS' | 'VISITOR' | 'LIBRARY' | 'MESS';
  time: string;
  result: 'SUCCESS' | 'FAILED' | 'EXPIRED';
  scannerDevice: string;
}

export type HealthStatusType = 'HEALTHY' | 'DEGRADED' | 'OFFLINE';

export interface ServiceHealthItem {
  serviceName: 'Supabase' | 'ERP Gateway' | 'Scanner Engine' | 'Authentication' | 'API Gateway';
  status: HealthStatusType;
  latencyMs: number;
  lastChecked: string;
}

export interface AnalyticsTrendPoint {
  label: string;
  attendance: number;
  scans: number;
}

export interface DepartmentStatItem {
  department: string;
  totalStudents: number;
  presentCount: number;
  rate: number;
}

export interface SystemErrorLog {
  id: string;
  category: 'NETWORK' | 'SCANNER' | 'AUTH' | 'ERP' | 'SUPABASE';
  message: string;
  timestamp: string;
  status: 'UNRESOLVED' | 'RESOLVED';
}
