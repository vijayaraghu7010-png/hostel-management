import { useState, useCallback, useEffect } from 'react';
import type { ERPResponse } from '../types/erp';
import { ERPConnector } from '../ERPConnector';

export function useERP() {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastResponse, setLastResponse] = useState<ERPResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queuedCount, setQueuedCount] = useState<number>(0);

  const updateQueueCount = useCallback(() => {
    setQueuedCount(ERPConnector.getQueuedEvents().length);
  }, []);

  useEffect(() => {
    updateQueueCount();
  }, [updateQueueCount]);

  const sendStudyAttendance = useCallback(
    async (attendanceData: Record<string, unknown>): Promise<ERPResponse> => {
      setIsSyncing(true);
      setError(null);
      try {
        const response = await ERPConnector.sendStudyAttendance(attendanceData);
        setLastResponse(response);
        updateQueueCount();
        return response;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'ERP sync failed';
        setError(msg);
        updateQueueCount();
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [updateQueueCount]
  );

  const sendOutpassScan = useCallback(
    async (
      outpassData: Record<string, unknown>,
      actionType: 'EXIT' | 'ENTRY'
    ): Promise<ERPResponse> => {
      setIsSyncing(true);
      setError(null);
      try {
        const response = await ERPConnector.sendOutpassScan(outpassData, actionType);
        setLastResponse(response);
        updateQueueCount();
        return response;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'ERP sync failed';
        setError(msg);
        updateQueueCount();
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [updateQueueCount]
  );

  const sendSessionEvent = useCallback(
    async (
      sessionData: Record<string, unknown>,
      eventType: 'SESSION_STARTED' | 'SESSION_ENDED'
    ): Promise<ERPResponse> => {
      setIsSyncing(true);
      setError(null);
      try {
        const response = await ERPConnector.sendSessionEvent(sessionData, eventType);
        setLastResponse(response);
        updateQueueCount();
        return response;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'ERP sync failed';
        setError(msg);
        updateQueueCount();
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [updateQueueCount]
  );

  const flushPendingQueue = useCallback(async (): Promise<number> => {
    setIsSyncing(true);
    try {
      const flushedCount = await ERPConnector.flushQueue();
      updateQueueCount();
      return flushedCount;
    } finally {
      setIsSyncing(false);
    }
  }, [updateQueueCount]);

  return {
    isSyncing,
    lastResponse,
    queuedCount,
    error,
    sendStudyAttendance,
    sendOutpassScan,
    sendSessionEvent,
    flushPendingQueue,
  };
}
