import React from 'react';
import { cn } from '@/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  className,
  label,
  error,
  icon,
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </label>
      )}
      <div className="relative rounded-xl shadow-sm">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full bg-slate-950/90 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm rounded-xl py-2.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            icon ? 'pl-10 pr-4' : 'px-4',
            error ? 'border-rose-500/80 focus:ring-rose-500' : 'hover:border-slate-700',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-400 mt-1 font-medium">{error}</p>}
    </div>
  );
};
