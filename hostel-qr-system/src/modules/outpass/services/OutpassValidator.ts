import type { ParsedScanResult } from '@/types/scanner';
import type { OutpassRequest, OutpassVerificationResult } from '../types/outpass';
import { OutpassWorkflow } from './OutpassWorkflow';

export class OutpassValidator {
  static validateScan(
    scanResult: ParsedScanResult,
    outpassesList: OutpassRequest[]
  ): OutpassVerificationResult {
    if (!scanResult.isValid) {
      return {
        isValid: false,
        message: scanResult.reason || 'Invalid QR code scanned',
      };
    }

    if (scanResult.type !== 'OUTPASS') {
      return {
        isValid: false,
        message: `Invalid QR Type (${scanResult.type}). Please scan an Outpass QR code.`,
      };
    }

    const payload = scanResult.parsedPayload;
    if (!payload) {
      return {
        isValid: false,
        message: 'Missing outpass payload data',
      };
    }

    const outpassId =
      (payload.payload?.outpassId as string) ||
      (payload.id as string);

    if (!outpassId) {
      return {
        isValid: false,
        message: 'Outpass identifier is missing from QR payload',
      };
    }

    const outpass = outpassesList.find((o) => o.id === outpassId);

    if (!outpass) {
      return {
        isValid: false,
        message: `Outpass request #${outpassId} not found in database`,
      };
    }

    if (outpass.status === 'REJECTED') {
      return {
        isValid: false,
        message: `Outpass request #${outpassId} was REJECTED by Warden`,
        outpass,
      };
    }

    if (OutpassWorkflow.isExpired(outpass)) {
      return {
        isValid: false,
        message: `Outpass #${outpassId} has EXPIRED`,
        outpass,
      };
    }

    if (outpass.status === 'USED' && outpass.entryVerifiedAt) {
      return {
        isValid: false,
        message: `Outpass #${outpassId} has already been fully USED (Hostel Return Complete)`,
        outpass,
      };
    }

    if (outpass.status !== 'APPROVED') {
      return {
        isValid: false,
        message: `Outpass #${outpassId} is currently in status: ${outpass.status}`,
        outpass,
      };
    }

    // Determine verification action type
    const actionType = !outpass.exitVerifiedAt ? 'EXIT' : 'ENTRY';

    return {
      isValid: true,
      message: actionType === 'EXIT'
        ? `Valid Outpass for ${outpass.studentName} (Hostel Exit Gate)`
        : `Valid Outpass for ${outpass.studentName} (Hostel Re-Entry Gate)`,
      outpass,
      actionType,
    };
  }
}
