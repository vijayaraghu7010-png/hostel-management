import React, { useState, useMemo } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { StudyStatusBadge } from './StudyStatusBadge';
import type {
  StudyAttendanceRecord,
  StudyAttendanceStatus,
  StudentProfileData,
} from '../types/study';
import { MOCK_STUDENTS } from '../services/StudyService';
import { Search, User, Check, Clock } from 'lucide-react';

export interface AttendanceListProps {
  attendanceRecords: StudyAttendanceRecord[];
  onMarkAttendance?: (studentReg: string, status: StudyAttendanceStatus) => void;
  isLoading?: boolean;
}

export const AttendanceList: React.FC<AttendanceListProps> = ({
  attendanceRecords,
  onMarkAttendance,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Map students with their recorded status
  const studentRows = useMemo(() => {
    const recordsMap = new Map<string, StudyAttendanceRecord>();
    attendanceRecords.forEach((r) => recordsMap.set(r.studentReg, r));

    return MOCK_STUDENTS.map((student: StudentProfileData) => {
      const record = recordsMap.get(student.registrationNumber);
      const status: StudyAttendanceStatus = record ? record.status : 'ABSENT';
      return {
        ...student,
        record,
        status,
      };
    });
  }, [attendanceRecords]);

  // Filtered rows based on controls
  const filteredStudents = useMemo(() => {
    return studentRows.filter((item) => {
      const matchesSearch =
        item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept = !selectedDept || item.department === selectedDept;
      const matchesRoom = !selectedRoom || item.roomNumber === selectedRoom;
      const matchesStatus = !selectedStatus || item.status === selectedStatus;

      return matchesSearch && matchesDept && matchesRoom && matchesStatus;
    });
  }, [studentRows, searchTerm, selectedDept, selectedRoom, selectedStatus]);

  const departments = Array.from(new Set(MOCK_STUDENTS.map((s) => s.department))).sort();
  const rooms = Array.from(new Set(MOCK_STUDENTS.map((s) => s.roomNumber))).sort();

  return (
    <Card className="w-full bg-slate-900/90 border-slate-800 space-y-6 p-6">
      {/* Header & Filter Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400" />
            Student Attendance Roster
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time student check-in status and manual override
          </p>
        </div>

        {/* Filter Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
          <Input
            placeholder="Search student..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-3.5 h-3.5" />}
            className="text-xs py-1.5"
          />

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Depts</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Rooms</option>
            {rooms.map((r) => (
              <option key={r} value={r}>
                Room {r}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="ABSENT">Pending / Absent</option>
          </select>
        </div>
      </div>

      {/* Grid of Student Cards */}
      {filteredStudents.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs">
          No matching students found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStudents.map((item) => (
            <div
              key={item.registrationNumber}
              className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-slate-700/80 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-200">{item.fullName}</h4>
                  <p className="text-[11px] font-mono text-slate-400">{item.registrationNumber}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 font-semibold">{item.department}</span>
                    <span>Room {item.roomNumber}</span>
                  </div>
                </div>

                <StudyStatusBadge status={item.status} type="attendance" />
              </div>

              {/* Action Buttons for Warden manual logging */}
              {onMarkAttendance && item.status !== 'PRESENT' && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onMarkAttendance(item.registrationNumber, 'PRESENT')}
                    disabled={isLoading}
                    className="flex-1 text-[11px] py-1"
                  >
                    <Check className="w-3 h-3 mr-1 text-emerald-400" />
                    Mark Present
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onMarkAttendance(item.registrationNumber, 'LATE')}
                    disabled={isLoading}
                    className="text-[11px] py-1 text-amber-400 hover:bg-amber-500/10"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Late
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
