import { useState, useEffect, useCallback, useRef } from 'react';
import type { StudySessionRecord, StudySessionStatus } from '../types/study';
import { StudyService } from '../services/StudyService';
import { StudySession } from '../services/StudySession';

export function useStudySession() {
  const [currentSession, setCurrentSession] = useState<StudySessionRecord | null>(null);
  const [sessionStatus, setSessionStatus] = useState<StudySessionStatus>('WAITING');
  const [elapsedTimeFormatted, setElapsedTimeFormatted] = useState<string>('00:00:00');
  const [loading, setLoading] = useState<boolean>(true);

  const timerRef = useRef<number | null>(null);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const active = await StudyService.getCurrentSession();
      if (active) {
        setCurrentSession(active);
        setSessionStatus('ACTIVE');
        setElapsedTimeFormatted(StudySession.formatElapsed(active.startTime));
      } else {
        setCurrentSession(null);
        setSessionStatus('WAITING');
        setElapsedTimeFormatted('00:00:00');
      }
    } catch {
      setCurrentSession(null);
      setSessionStatus('WAITING');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  // Timer loop for live session elapsed clock
  useEffect(() => {
    if (sessionStatus !== 'ACTIVE' || !currentSession) {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      setElapsedTimeFormatted(StudySession.formatElapsed(currentSession.startTime));
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionStatus, currentSession]);

  const startSession = useCallback(
    async (title: string = 'Evening Study Hour') => {
      setLoading(true);
      const session = await StudyService.startSession(title);
      setCurrentSession(session);
      setSessionStatus('ACTIVE');
      setElapsedTimeFormatted('00:00:00');
      setLoading(false);
      return session;
    },
    []
  );

  const endSession = useCallback(async () => {
    setLoading(true);
    if (currentSession) {
      await StudyService.endSession(currentSession.id);
    }
    setCurrentSession(null);
    setSessionStatus('ENDED');
    setElapsedTimeFormatted('00:00:00');
    setLoading(false);
  }, [currentSession]);

  return {
    currentSession,
    sessionStatus,
    elapsedTimeFormatted,
    loading,
    startSession,
    endSession,
    refreshSession,
  };
}
