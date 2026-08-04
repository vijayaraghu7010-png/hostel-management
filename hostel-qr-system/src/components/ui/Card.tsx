import React from 'react';
import { cn } from '@/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'outline' | 'gradient';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'glass',
  ...props
}) => {
  const baseStyles = 'rounded-3xl p-6 transition-all duration-300';

  const variants = {
    glass: 'bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 shadow-2xl shadow-slate-950/80 hover:border-slate-700/80 hover:shadow-blue-950/20',
    solid: 'bg-slate-900 border border-slate-800 shadow-xl',
    outline: 'bg-transparent border border-slate-800 hover:border-slate-700',
    gradient: 'bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/40 border border-blue-500/20 shadow-2xl shadow-blue-950/30',
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
    </div>
  );
};
