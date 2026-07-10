import React, { useState } from 'react';
import { Sparkles, AlertCircle, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { authService } from '../services/authService';

export function SupabaseSetupBanner() {
  const [isVisible, setIsVisible] = useState(() => {
    return localStorage.getItem('supabase_banner_dismissed') !== 'true';
  });

  const isConnected = authService.isConfigured();

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('supabase_banner_dismissed', 'true');
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4.5 transition-all ${
      isConnected
        ? 'border-emerald-100 bg-emerald-50/60 dark:border-emerald-950/20 dark:bg-emerald-950/15'
        : 'border-indigo-100 bg-indigo-50/60 dark:border-indigo-950/20 dark:bg-indigo-950/15'
    }`}>
      {/* Background radial highlight */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-sky-500/10 to-indigo-500/10 blur-xl pointer-events-none" />

      <div className="flex items-start gap-3.5 pr-8">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          isConnected
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-sky-300'
        }`}>
          {isConnected ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Sparkles className="h-5 w-5 animate-pulse" />
          )}
        </div>

        <div className="space-y-1">
          <h4 className={`text-xs font-bold uppercase tracking-wider ${
            isConnected ? 'text-emerald-800 dark:text-emerald-400' : 'text-indigo-800 dark:text-sky-300'
          }`}>
            {isConnected ? 'Supabase Database Connected' : 'SaaS Preview Engine Active'}
          </h4>
          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 max-w-2xl">
            {isConnected
              ? 'Your QuoteFlow PK workspace is actively synchronized with live Supabase cloud storage. All settings, logs, and customer modules are permanently saved.'
              : 'QuoteFlow PK is running with Local Storage engine. All CRM profiles, logs, and setting controls are fully simulated in offline sandbox mode.'}
          </p>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
