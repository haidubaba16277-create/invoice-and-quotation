import React from 'react';

export function GlassCard({ children, className = '', intensity = 'medium', ...props }: {
  children: React.ReactNode;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
} & React.HTMLAttributes<HTMLDivElement>) {
  const intensityStyles = {
    low: 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-xs border-white/20 dark:border-slate-800/20',
    medium: 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-white/30 dark:border-slate-800/30',
    high: 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-white/40 dark:border-slate-800/40',
  };

  return (
    <div
      className={`rounded-2xl border shadow-xs transition-all duration-300 ${intensityStyles[intensity]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
