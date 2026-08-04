import React from 'react';
import { Card } from '@/components/ui';
import type { SystemOverviewStats } from '../types/admin';
import { Users, Clock, CheckCircle2, QrCode, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

export interface SystemOverviewProps {
  stats: SystemOverviewStats;
}

export const SystemOverview: React.FC<SystemOverviewProps> = ({ stats }) => {
  const items = [
    { label: 'Online Users', value: stats.onlineUsers, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Active Sessions', value: stats.activeSessions, icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: "Today's Attendance", value: stats.todaysAttendance, icon: CheckCircle2, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { label: "Today's Scans", value: stats.todaysScans, icon: QrCode, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Active Cameras', value: stats.activeCameras, icon: Camera, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {items.map((item, idx) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.05 }}
        >
          <Card className="p-4 space-y-2 bg-slate-900/90 border-slate-800 hover:border-slate-700/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {item.label}
              </span>
              <div className={`p-1.5 rounded-lg ${item.bg} ${item.color}`}>
                <item.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-100">{item.value}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
