import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'live' | 'paused' | 'completed' | 'paid' | 'partially_paid' | 'pending' | 'spike' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className }) => {
  const variantStyles = {
    live: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    paused: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-slate-100 text-slate-700 border-slate-200',
    paid: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    partially_paid: 'bg-orange-50 text-orange-700 border-orange-200',
    pending: 'bg-slate-100 text-slate-600 border-slate-200',
    spike: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold animate-pulse',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
};
