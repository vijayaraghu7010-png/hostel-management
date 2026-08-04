import React from 'react';
import { Card, Button } from '@/components/ui';
import { useAuthStore } from '@/store';
import { Shield, Camera, Users, Play } from 'lucide-react';

export const WardenDashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 mb-2">
              <Shield className="w-3.5 h-3.5" />
              Warden Administration Mode
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Control Panel: {user?.fullName || 'Warden'}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Hostel Live Session & Attendance Management Center
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm">
              <Play className="w-4 h-4 mr-1.5" />
              Start Session
            </Button>
            <Button variant="secondary" size="sm">
              <Camera className="w-4 h-4 mr-1.5" />
              Scanner
            </Button>
          </div>
        </div>
      </div>

      {/* Grid Stats Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Registered', value: '124', icon: Users, color: 'text-indigo-400' },
          { title: 'Present Today', value: '--', icon: Shield, color: 'text-emerald-400' },
          { title: 'Pending Scan', value: '--', icon: Camera, color: 'text-amber-400' },
          { title: 'Attendance Rate', value: '--%', icon: Play, color: 'text-sky-400' },
        ].map((stat, idx) => (
          <Card key={idx} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {stat.title}
              </span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-black text-slate-100">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-8 text-center space-y-3 border-dashed border-slate-800">
        <h3 className="text-base font-bold text-slate-200">Universal Warden Control Panel</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Foundation scaffold ready for scanner and session management hooks in upcoming tasks.
        </p>
      </Card>
    </div>
  );
};

export default WardenDashboard;
