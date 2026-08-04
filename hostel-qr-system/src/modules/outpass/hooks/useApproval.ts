import { useState, useEffect, useCallback } from 'react';
import type { OutpassRequest, OutpassVerificationResult } from '../types/outpass';
import type { ParsedScanResult } from '@/types/scanner';
import { OutpassService } from '../services/OutpassService';
import { OutpassValidator } from '../services/OutpassValidator';

export function useApproval() {
  const [allRequests, setAllRequests] = useState<OutpassRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await OutpassService.getAllOutpasses();
      setAllRequests(data);
    } catch {
      setAllRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRequests();
  }, [refreshRequests]);

  const approve = useCallback(
    async (id: string, wardenName: string = 'Warden') => {
      setLoading(true);
      const res = await OutpassService.approveOutpass(id, wardenName);
      await refreshRequests();
      return res;
    },
    [refreshRequests]
  );

  const reject = useCallback(
    async (id: string, reason: string = 'Rejected by warden', wardenName: string = 'Warden') => {
      setLoading(true);
      const res = await OutpassService.rejectOutpass(id, reason, wardenName);
      await refreshRequests();
      return res;
    },
    [refreshRequests]
  );

  const verifyScanResult = useCallback(
    async (scanResult: ParsedScanResult): Promise<OutpassVerificationResult> => {
      const currentList = await OutpassService.getAllOutpasses();
      const validation = OutpassValidator.validateScan(scanResult, currentList);

      if (!validation.isValid || !validation.outpass) {
        return validation;
      }

      // Automatically record gate exit or entry verification
      if (validation.actionType === 'EXIT') {
        await OutpassService.verifyExit(validation.outpass.id);
      } else if (validation.actionType === 'ENTRY') {
        await OutpassService.verifyEntry(validation.outpass.id);
      }

      await refreshRequests();

      return {
        ...validation,
        message: validation.actionType === 'EXIT'
          ? `✅ Exit Gate Verified for ${validation.outpass.studentName} (#${validation.outpass.id})`
          : `✅ Re-Entry Verified for ${validation.outpass.studentName} (#${validation.outpass.id})`,
      };
    },
    [refreshRequests]
  );

  return {
    allRequests,
    loading,
    approve,
    reject,
    verifyScanResult,
    refreshRequests,
  };
}
