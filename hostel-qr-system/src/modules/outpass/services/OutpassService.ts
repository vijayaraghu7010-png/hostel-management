import type { OutpassRequest, CreateOutpassDTO } from '../types/outpass';
import { OutpassWorkflow } from './OutpassWorkflow';

const OUTPASS_STORAGE_KEY = 'hms_outpass_requests_v2';

const MOCK_OUTPASSES: OutpassRequest[] = [
  {
    id: 'OUT-2026-901',
    studentReg: 'STU-2026-8901',
    studentName: 'Alex Rivera',
    department: 'CSE',
    roomNumber: '101',
    type: 'LOCAL_OUTING',
    reason: 'Personal errand in town center',
    destination: 'City Mall, Downtown',
    outDate: new Date().toISOString().split('T')[0],
    outTime: '17:00',
    expectedReturnDate: new Date().toISOString().split('T')[0],
    expectedReturnTime: '21:00',
    status: 'APPROVED',
    approvedBy: 'Dr. Sarah Connor',
    approvedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'OUT-2026-902',
    studentReg: 'STU-2026-8902',
    studentName: 'Rahul Sharma',
    department: 'CSE',
    roomNumber: '101',
    type: 'HOME_LEAVE',
    reason: 'Family event over the weekend',
    destination: 'Home Town',
    outDate: '2026-08-05',
    outTime: '09:00',
    expectedReturnDate: '2026-08-07',
    expectedReturnTime: '18:00',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'OUT-2026-903',
    studentReg: 'STU-2026-8903',
    studentName: 'Priya Patel',
    department: 'ECE',
    roomNumber: '102',
    type: 'EMERGENCY',
    reason: 'Medical appointment',
    destination: 'City Hospital',
    outDate: new Date().toISOString().split('T')[0],
    outTime: '14:00',
    expectedReturnDate: new Date().toISOString().split('T')[0],
    expectedReturnTime: '18:00',
    status: 'APPROVED',
    approvedBy: 'Dr. Sarah Connor',
    approvedAt: new Date(Date.now() - 1800000).toISOString(),
    exitVerifiedAt: new Date(Date.now() - 900000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export class OutpassService {
  private static getStoredOutpasses(): OutpassRequest[] {
    try {
      const data = localStorage.getItem(OUTPASS_STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as OutpassRequest[];
      }
      // Seed mock outpasses on first access
      localStorage.setItem(OUTPASS_STORAGE_KEY, JSON.stringify(MOCK_OUTPASSES));
      return MOCK_OUTPASSES;
    } catch {
      return MOCK_OUTPASSES;
    }
  }

  private static setStoredOutpasses(requests: OutpassRequest[]): void {
    try {
      localStorage.setItem(OUTPASS_STORAGE_KEY, JSON.stringify(requests));
    } catch {
      // Storage write error fallback
    }
  }

  static async getAllOutpasses(): Promise<OutpassRequest[]> {
    const list = this.getStoredOutpasses();
    return list.map((item) => ({
      ...item,
      status: OutpassWorkflow.getComputedStatus(item),
    }));
  }

  static async getStudentOutpasses(studentReg: string): Promise<OutpassRequest[]> {
    const list = await this.getAllOutpasses();
    return list.filter((o) => o.studentReg === studentReg);
  }

  static async applyOutpass(
    studentReg: string,
    studentName: string,
    department: string,
    roomNumber: string,
    dto: CreateOutpassDTO
  ): Promise<OutpassRequest> {
    const newRequest: OutpassRequest = {
      id: `OUT-${Date.now().toString().slice(-6)}`,
      studentReg,
      studentName,
      department,
      roomNumber,
      type: dto.type,
      reason: dto.reason,
      destination: dto.destination,
      outDate: dto.outDate,
      outTime: dto.outTime,
      expectedReturnDate: dto.expectedReturnDate,
      expectedReturnTime: dto.expectedReturnTime,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const list = this.getStoredOutpasses();
    list.unshift(newRequest);
    this.setStoredOutpasses(list);

    return newRequest;
  }

  static async approveOutpass(id: string, wardenName: string = 'Warden'): Promise<OutpassRequest | null> {
    const list = this.getStoredOutpasses();
    const index = list.findIndex((o) => o.id === id);

    if (index === -1) return null;

    const updated: OutpassRequest = {
      ...list[index],
      status: 'APPROVED',
      approvedBy: wardenName,
      approvedAt: new Date().toISOString(),
    };

    list[index] = updated;
    this.setStoredOutpasses(list);
    return updated;
  }

  static async rejectOutpass(
    id: string,
    reason: string = 'Not approved by warden',
    wardenName: string = 'Warden'
  ): Promise<OutpassRequest | null> {
    const list = this.getStoredOutpasses();
    const index = list.findIndex((o) => o.id === id);

    if (index === -1) return null;

    const updated: OutpassRequest = {
      ...list[index],
      status: 'REJECTED',
      rejectionReason: reason,
      approvedBy: wardenName,
      approvedAt: new Date().toISOString(),
    };

    list[index] = updated;
    this.setStoredOutpasses(list);
    return updated;
  }

  static async verifyExit(id: string): Promise<OutpassRequest | null> {
    const list = this.getStoredOutpasses();
    const index = list.findIndex((o) => o.id === id);

    if (index === -1) return null;

    const updated: OutpassRequest = {
      ...list[index],
      exitVerifiedAt: new Date().toISOString(),
    };

    list[index] = updated;
    this.setStoredOutpasses(list);
    return updated;
  }

  static async verifyEntry(id: string): Promise<OutpassRequest | null> {
    const list = this.getStoredOutpasses();
    const index = list.findIndex((o) => o.id === id);

    if (index === -1) return null;

    const updated: OutpassRequest = {
      ...list[index],
      status: 'USED',
      entryVerifiedAt: new Date().toISOString(),
    };

    list[index] = updated;
    this.setStoredOutpasses(list);
    return updated;
  }
}
