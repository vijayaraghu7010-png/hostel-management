export type UserRole = 'student' | 'warden' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  registrationNumber?: string;
  roomNumber?: string;
  department?: string;
  createdAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type SessionStatus = 'SCHEDULED' | 'ACTIVE' | 'CLOSED';

export interface StudySession {
  id: string;
  title: string;
  status: SessionStatus;
  startTime: string;
  endTime: string;
  createdBy: string;
  createdAt: string;
}

export * from './qr';
export * from './scanner';
