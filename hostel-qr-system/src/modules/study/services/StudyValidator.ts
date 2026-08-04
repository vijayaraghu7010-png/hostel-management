import type { ParsedScanResult } from '@/types/scanner';
import type { StudySessionRecord, StudyAttendanceRecord } from '../types/study';

export interface ValidationCheckResult {
  canMark: boolean;
  reason: string;
  studentReg?: string;
}

export class StudyValidator {
  static validateScan(
    scanResult: ParsedScanResult,
    activeSession: StudySessionRecord | null,
    existingAttendance: StudyAttendanceRecord[] = []
  ): ValidationCheckResult {
    if (!scanResult.isValid) {
      return {
        canMark: false,
        reason: scanResult.reason || 'Invalid QR code scanned',
      };
    }

    if (scanResult.type !== 'STUDY') {
      return {
        canMark: false,
        reason: `Invalid QR Type (${scanResult.type}). Please scan a Study Hour QR code.`,
      };
    }

    if (!activeSession || activeSession.status !== 'ACTIVE') {
      return {
        canMark: false,
        reason: 'No active Study Hour session is currently in progress.',
      };
    }

    const payload = scanResult.parsedPayload;
    if (!payload) {
      return {
        canMark: false,
        reason: 'Missing study session payload data.',
      };
    }

    if (payload.id !== activeSession.id && payload.payload?.sessionId !== activeSession.id) {
      return {
        canMark: false,
        reason: 'Scanned QR belongs to a different study session.',
      };
    }

    const studentReg =
      (payload.payload?.studentReg as string) ||
      (payload.payload?.registrationNumber as string) ||
      payload.id;

    if (!studentReg) {
      return {
        canMark: false,
        reason: 'QR payload is missing student registration number.',
      };
    }

    const alreadyMarked = existingAttendance.some(
      (record) => record.studentReg === studentReg && record.status === 'PRESENT'
    );

    if (alreadyMarked) {
      return {
        canMark: false,
        reason: `Attendance already recorded for student (${studentReg}).`,
        studentReg,
      };
    }

    return {
      canMark: true,
      reason: 'Valid Study QR code',
      studentReg,
    };
  }
}
