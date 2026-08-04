import type { StudySessionRecord, StudySessionStatus } from '../types/study';

export class StudySession {
  static createNew(
    title: string = 'Evening Study Hour',
    createdBy: string = 'Warden'
  ): StudySessionRecord {
    const now = new Date().toISOString();
    return {
      id: `SES-${Date.now()}`,
      title,
      status: 'ACTIVE' as StudySessionStatus,
      startTime: now,
      createdBy,
      createdAt: now,
    };
  }

  static formatElapsed(startTimeIso: string): string {
    const startMs = new Date(startTimeIso).getTime();
    const nowMs = Date.now();
    const elapsedSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));

    const hrs = String(Math.floor(elapsedSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
    const secs = String(elapsedSec % 60).padStart(2, '0');

    return `${hrs}:${mins}:${secs}`;
  }
}
