import { useState, useEffect, useCallback } from 'react';
import type {
  StudyAttendanceRecord,
  StudyAttendanceStatus,
  StudySummaryMetrics,
} from '../types/study';
import { StudyService } from '../services/StudyService';

export function useAttendance(sessionId?: string) {
  const [records, setRecords] = useState<StudyAttendanceRecord[]>([]);
  const [metrics, setMetrics] = useState<StudySummaryMetrics>({
    totalStudents: 0,
    presentCount: 0,
    lateCount: 0,
    pendingCount: 0,
    attendanceRate: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);

  const refreshAttendance = useCallback(async () => {
    if (!sessionId) {
      setRecords([]);
      setMetrics(StudyService.calculateMetrics([]));
      return;
    }

    setLoading(true);
    try {
      const data = await StudyService.getAttendance(sessionId);
      setRecords(data);
      setMetrics(StudyService.calculateMetrics(data));
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void refreshAttendance();
  }, [refreshAttendance]);

  const markAttendance = useCallback(
    async (studentReg: string, status: StudyAttendanceStatus = 'PRESENT') => {
      if (!sessionId) {
        return { success: false, message: 'No active session provided' };
      }

      const result = await StudyService.markAttendance(sessionId, studentReg, status);
      if (result.success) {
        await refreshAttendance();
      }
      return result;
    },
    [sessionId, refreshAttendance]
  );

  return {
    records,
    metrics,
    loading,
    markAttendance,
    refreshAttendance,
  };
}
