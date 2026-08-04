import React from 'react';
import { cn } from '@/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'electric';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500 shadow-lg shadow-blue-600/25 border border-blue-500/40',
    electric: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white focus:ring-blue-500 shadow-lg shadow-blue-500/30 border border-blue-400/30',
    secondary: 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 focus:ring-slate-500',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500 shadow-lg shadow-rose-600/25 border border-rose-500/30',
    ghost: 'bg-transparent hover:bg-slate-900 text-slate-300 hover:text-white focus:ring-slate-500',
    outline: 'bg-transparent border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 hover:text-white focus:ring-slate-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </span>
      ) : (
        children
      )}
    </button>
  );
};
