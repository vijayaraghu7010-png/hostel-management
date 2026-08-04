import { useState, useEffect, useCallback } from 'react';
import type { OutpassRequest, CreateOutpassDTO } from '../types/outpass';
import { OutpassService } from '../services/OutpassService';
import { OutpassWorkflow } from '../services/OutpassWorkflow';

export function useOutpass(studentReg: string = 'STU-2026-8901') {
  const [outpasses, setOutpasses] = useState<OutpassRequest[]>([]);
  const [activeApprovedOutpass, setActiveApprovedOutpass] = useState<OutpassRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshOutpasses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await OutpassService.getStudentOutpasses(studentReg);
      setOutpasses(data);

      const approved = data.find((o) => OutpassWorkflow.canGenerateQR(o));
      setActiveApprovedOutpass(approved || null);
    } catch {
      setOutpasses([]);
      setActiveApprovedOutpass(null);
    } finally {
      setLoading(false);
    }
  }, [studentReg]);

  useEffect(() => {
    void refreshOutpasses();
  }, [refreshOutpasses]);

  const applyOutpass = useCallback(
    async (
      studentName: string,
      department: string,
      roomNumber: string,
      dto: CreateOutpassDTO
    ) => {
      setLoading(true);
      const newOutpass = await OutpassService.applyOutpass(
        studentReg,
        studentName,
        department,
        roomNumber,
        dto
      );
      await refreshOutpasses();
      return newOutpass;
    },
    [studentReg, refreshOutpasses]
  );

  return {
    outpasses,
    activeApprovedOutpass,
    loading,
    applyOutpass,
    refreshOutpasses,
  };
}
