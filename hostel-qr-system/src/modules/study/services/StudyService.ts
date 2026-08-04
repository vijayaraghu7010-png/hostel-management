import type {
  StudySessionRecord,
  StudyAttendanceRecord,
  StudyAttendanceStatus,
  StudentProfileData,
  StudySummaryMetrics,
} from '../types/study';
import { StudySession } from './StudySession';

export const MOCK_STUDENTS: StudentProfileData[] = [
  { registrationNumber: 'STU-2026-8901', fullName: 'Alex Rivera', department: 'CSE', roomNumber: '101' },
  { registrationNumber: 'STU-2026-8902', fullName: 'Rahul Sharma', department: 'CSE', roomNumber: '101' },
  { registrationNumber: 'STU-2026-8903', fullName: 'Priya Patel', department: 'ECE', roomNumber: '102' },
  { registrationNumber: 'STU-2026-8904', fullName: 'Ananya Roy', department: 'ECE', roomNumber: '102' },
  { registrationNumber: 'STU-2026-8905', fullName: 'David Chen', department: 'EEE', roomNumber: '103' },
  { registrationNumber: 'STU-2026-8906', fullName: 'Karthik Raja', department: 'MECH', roomNumber: '104' },
  { registrationNumber: 'STU-2026-8907', fullName: 'Sneha Reddy', department: 'CSE', roomNumber: '104' },
  { registrationNumber: 'STU-2026-8908', fullName: 'Vikram Singh', department: 'MECH', roomNumber: '103' },
];

const SESSIONS_STORAGE_KEY = 'hms_study_sessions_v2';
const ATTENDANCE_STORAGE_KEY = 'hms_study_attendance_v2';

export class StudyService {
  private static getStoredSessions(): StudySessionRecord[] {
    try {
      const data = localStorage.getItem(SESSIONS_STORAGE_KEY);
      return data ? (JSON.parse(data) as StudySessionRecord[]) : [];
    } catch {
      return [];
    }
  }

  private static setStoredSessions(sessions: StudySessionRecord[]): void {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Storage write error ignore
    }
  }

  private static getStoredAttendance(): StudyAttendanceRecord[] {
    try {
      const data = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      return data ? (JSON.parse(data) as StudyAttendanceRecord[]) : [];
    } catch {
      return [];
    }
  }

  private static setStoredAttendance(records: StudyAttendanceRecord[]): void {
    try {
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Storage write error ignore
    }
  }

  static async getCurrentSession(): Promise<StudySessionRecord | null> {
    const sessions = this.getStoredSessions();
    const active = sessions.find((s) => s.status === 'ACTIVE');
    return active || null;
  }

  static async startSession(
    title: string = 'Evening Study Hour',
    createdBy: string = 'Warden'
  ): Promise<StudySessionRecord> {
    const active = await this.getCurrentSession();
    if (active) {
      return active;
    }

    const newSession = StudySession.createNew(title, createdBy);
    const sessions = this.getStoredSessions();
    sessions.unshift(newSession);
    this.setStoredSessions(sessions);

    return newSession;
  }

  static async endSession(sessionId?: string): Promise<StudySessionRecord | null> {
    const sessions = this.getStoredSessions();
    const activeIndex = sessions.findIndex(
      (s) => s.status === 'ACTIVE' && (!sessionId || s.id === sessionId)
    );

    if (activeIndex === -1) {
      return null;
    }

    const updatedSession: StudySessionRecord = {
      ...sessions[activeIndex],
      status: 'ENDED',
      endTime: new Date().toISOString(),
    };

    sessions[activeIndex] = updatedSession;
    this.setStoredSessions(sessions);

    return updatedSession;
  }

  static async getAttendance(sessionId: string): Promise<StudyAttendanceRecord[]> {
    const records = this.getStoredAttendance();
    return records.filter((r) => r.sessionId === sessionId);
  }

  static async getStudentAttendance(
    sessionId: string,
    studentReg: string
  ): Promise<StudyAttendanceRecord | null> {
    const records = await this.getAttendance(sessionId);
    return records.find((r) => r.studentReg === studentReg) || null;
  }

  static async markAttendance(
    sessionId: string,
    studentReg: string,
    status: StudyAttendanceStatus = 'PRESENT'
  ): Promise<{ success: boolean; record?: StudyAttendanceRecord; message: string }> {
    const session = (await this.getStoredSessions()).find((s) => s.id === sessionId);
    if (!session || session.status !== 'ACTIVE') {
      return { success: false, message: 'Study Session is not active' };
    }

    const allRecords = this.getStoredAttendance();
    const existingIndex = allRecords.findIndex(
      (r) => r.sessionId === sessionId && r.studentReg === studentReg
    );

    const studentData = MOCK_STUDENTS.find((s) => s.registrationNumber === studentReg) || {
      registrationNumber: studentReg,
      fullName: `Student ${studentReg}`,
      department: 'CSE',
      roomNumber: '101',
    };

    const newRecord: StudyAttendanceRecord = {
      id: `ATT-${Date.now()}`,
      sessionId,
      studentReg: studentData.registrationNumber,
      studentName: studentData.fullName,
      department: studentData.department,
      roomNumber: studentData.roomNumber,
      status,
      scannedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      allRecords[existingIndex] = newRecord;
    } else {
      allRecords.push(newRecord);
    }

    this.setStoredAttendance(allRecords);

    return {
      success: true,
      record: newRecord,
      message: `Attendance marked as ${status} for ${studentData.fullName}`,
    };
  }

  static calculateMetrics(
    attendanceRecords: StudyAttendanceRecord[],
    totalStudentsCount: number = MOCK_STUDENTS.length
  ): StudySummaryMetrics {
    const presentCount = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
    const lateCount = attendanceRecords.filter((r) => r.status === 'LATE').length;
    const pendingCount = Math.max(0, totalStudentsCount - (presentCount + lateCount));
    const attendanceRate = totalStudentsCount > 0
      ? Math.round(((presentCount + lateCount) / totalStudentsCount) * 100)
      : 0;

    return {
      totalStudents: totalStudentsCount,
      presentCount,
      lateCount,
      pendingCount,
      attendanceRate,
    };
  }
}
