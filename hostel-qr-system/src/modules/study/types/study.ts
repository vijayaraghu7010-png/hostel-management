export type StudySessionStatus = 'WAITING' | 'ACTIVE' | 'ENDED';

export type StudyAttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export interface StudySessionRecord {
  id: string;
  title: string;
  status: StudySessionStatus;
  startTime: string;
  endTime?: string;
  createdBy: string;
  createdAt: string;
}

export interface StudyAttendanceRecord {
  id: string;
  sessionId: string;
  studentReg: string;
  studentName: string;
  department: string;
  roomNumber: string;
  status: StudyAttendanceStatus;
  scannedAt: string;
}

export interface StudentProfileData {
  registrationNumber: string;
  fullName: string;
  department: string;
  roomNumber: string;
}

export interface StudySummaryMetrics {
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  pendingCount: number;
  attendanceRate: number;
}
