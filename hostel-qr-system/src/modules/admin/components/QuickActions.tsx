import React from 'react';
import { Card, Button } from '@/components/ui';
import { RefreshCw, Database, Trash2, Wifi, Camera } from 'lucide-react';

export interface QuickActionsProps {
  onExecute: (
    actionType: 'REFRESH' | 'FORCE_SYNC' | 'CLEAR_CACHE' | 'RECONNECT_ERP' | 'RESTART_SCANNER'
  ) => void;
  isLoading?: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onExecute, isLoading = false }) => {
  const actions = [
    { label: 'Refresh Dashboard', key: 'REFRESH' as const, icon: RefreshCw, variant: 'secondary' as const },
    { label: 'Force ERP Sync', key: 'FORCE_SYNC' as const, icon: Database, variant: 'primary' as const },
    { label: 'Clear Cache', key: 'CLEAR_CACHE' as const, icon: Trash2, variant: 'secondary' as const },
    { label: 'Reconnect ERP', key: 'RECONNECT_ERP' as const, icon: Wifi, variant: 'secondary' as const },
    { label: 'Restart Scanner', key: 'RESTART_SCANNER' as const, icon: Camera, variant: 'secondary' as const },
  ];

  return (
    <Card className="p-6 bg-slate-900/90 border-slate-800 space-y-4">
      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
        <RefreshCw className="w-4 h-4 text-indigo-400" />
        Admin System Quick Actions
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((act) => (
          <Button
            key={act.key}
            variant={act.variant}
            size="sm"
            onClick={() => onExecute(act.key)}
            isLoading={isLoading}
            className="w-full text-xs justify-center py-2.5"
          >
            <act.icon className="w-3.5 h-3.5 mr-1.5" />
            {act.label}
          </Button>
        ))}
      </div>
    </Card>
  );
};
