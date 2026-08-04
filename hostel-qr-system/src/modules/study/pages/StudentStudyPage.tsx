import React from 'react';
import { useAuthStore } from '@/store';
import { useStudySession } from '../hooks/useStudySession';
import { useAttendance } from '../hooks/useAttendance';
import { StudyQRCard } from '../components/StudyQRCard';
import { StudySessionCard } from '../components/StudySessionCard';

export const StudentStudyPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const studentReg = user?.registrationNumber || 'STU-2026-8901';
  const studentName = user?.fullName || 'Student';

  const { currentSession, sessionStatus, elapsedTimeFormatted } = useStudySession();
  const { records } = useAttendance(currentSession?.id);

  const myAttendanceRecord = records.find((r) => r.studentReg === studentReg);
  const attendanceStatus = myAttendanceRecord ? myAttendanceRecord.status : null;

  return (
    <div className="space-y-6">
      {/* Top Session Banner */}
      <StudySessionCard
        session={currentSession}
        status={sessionStatus}
        elapsedTime={elapsedTimeFormatted}
      />

      {/* Main Student QR Container */}
      <StudentStudyPageContent
        session={currentSession}
        studentReg={studentReg}
        studentName={studentName}
        attendanceStatus={attendanceStatus}
      />
    </div>
  );
};

interface StudentContentProps {
  session: ReturnType<typeof useStudySession>['currentSession'];
  studentReg: string;
  studentName: string;
  attendanceStatus: ReturnType<typeof useAttendance>['records'][number]['status'] | null;
}

const StudentStudyPageContent: React.FC<StudentContentProps> = ({
  session,
  studentReg,
  studentName,
  attendanceStatus,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <StudyQRCard
        session={session}
        studentReg={studentReg}
        studentName={studentName}
        attendanceStatus={attendanceStatus}
      />
    </div>
  );
};

export default StudentStudyPage;
