export type OutpassStatusType = 'PENDING' | 'APPROVED' | 'REJECTED' | 'USED' | 'EXPIRED';

export type OutpassType = 'LOCAL_OUTING' | 'HOME_LEAVE' | 'EMERGENCY';

export interface OutpassRequest {
  id: string;
  studentReg: string;
  studentName: string;
  department: string;
  roomNumber: string;
  type: OutpassType;
  reason: string;
  destination: string;
  outDate: string;
  outTime: string;
  expectedReturnDate: string;
  expectedReturnTime: string;
  status: OutpassStatusType;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  exitVerifiedAt?: string;
  entryVerifiedAt?: string;
  createdAt: string;
}

export interface CreateOutpassDTO {
  type: OutpassType;
  reason: string;
  destination: string;
  outDate: string;
  outTime: string;
  expectedReturnDate: string;
  expectedReturnTime: string;
}

export interface OutpassVerificationResult {
  isValid: boolean;
  message: string;
  outpass?: OutpassRequest;
  actionType?: 'EXIT' | 'ENTRY';
}
