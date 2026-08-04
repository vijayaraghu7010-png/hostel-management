import React from 'react';
import { Card } from '@/components/ui';
import type { DepartmentStatItem } from '../types/admin';
import { BarChart3, PieChart } from 'lucide-react';

export interface AnalyticsCardsProps {
  departments: DepartmentStatItem[];
}

export const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({ departments }) => {
  return (
    <Card className="p-6 bg-slate-900/90 border-slate-800 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          Department Attendance Performance Breakdown
        </h3>
        <PieChart className="w-4 h-4 text-indigo-400" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {departments.map((dept) => (
          <div
            key={dept.department}
            className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-100">{dept.department}</span>
              <span className="text-xs font-mono font-bold text-emerald-400">{dept.rate}%</span>
            </div>

            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${dept.rate}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400 flex justify-between pt-1">
              <span>Enrolled: {dept.totalStudents}</span>
              <span className="font-bold text-slate-200">Present: {dept.presentCount}</span>
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
};
