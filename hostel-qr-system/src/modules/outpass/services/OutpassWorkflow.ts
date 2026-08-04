import type { OutpassRequest, OutpassStatusType } from '../types/outpass';

export class OutpassWorkflow {
  static canApprove(outpass: OutpassRequest): boolean {
    return outpass.status === 'PENDING';
  }

  static canReject(outpass: OutpassRequest): boolean {
    return outpass.status === 'PENDING';
  }

  static canGenerateQR(outpass: OutpassRequest): boolean {
    return outpass.status === 'APPROVED' && !this.isExpired(outpass);
  }

  static isExpired(outpass: OutpassRequest): boolean {
    if (outpass.status === 'USED' || outpass.status === 'EXPIRED') {
      return true;
    }

    try {
      const returnDateTimeString = `${outpass.expectedReturnDate}T${outpass.expectedReturnTime}`;
      const returnTimeMs = new Date(returnDateTimeString).getTime();
      if (isNaN(returnTimeMs)) return false;
      return Date.now() > returnTimeMs;
    } catch {
      return false;
    }
  }

  static getComputedStatus(outpass: OutpassRequest): OutpassStatusType {
    if (outpass.status === 'APPROVED' && this.isExpired(outpass)) {
      return 'EXPIRED';
    }
    return outpass.status;
  }
}
