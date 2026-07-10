import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  Database, 
  Users, 
  FileText, 
  TrendingUp,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { UserProfile } from '../types/auth';
import { GlassCard } from './GlassCard';

interface DashboardViewProps {
  user: UserProfile | null;
  isSupabaseConnected: boolean;
  onNavigate: (view: string) => void;
}

export function DashboardView({ user, isSupabaseConnected, onNavigate }: DashboardViewProps) {
  const stats = [
    { label: 'Draft quotations', value: 'Rs. 0.00', icon: FileText, change: '0 proposals' },
    { label: 'Active clients', value: '0 Clients', icon: Users, change: '0 corporate leads' },
    { label: 'Approved proposals', value: '0.00%', icon: TrendingUp, change: '0% conversion' },
  ];

  const steps = [
    {
      title: 'Deploy SaaS UI & Theme Shell',
      desc: 'Phase 1 workspace, responsive glassmorphic layout, and theme toggler.',
      status: 'complete',
    },
    {
      title: 'Initialize Supabase Routing Client',
      desc: 'Dual-mode client handles local sandboxes and live Supabase projects seamlessly.',
      status: 'complete',
    },
    {
      title: 'Configure environment secrets',
      desc: 'Bind VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY inside your .env configuration file.',
      status: isSupabaseConnected ? 'complete' : 'pending',
    },
    {
      title: 'Create Quotations & Catalogues',
      desc: 'Formulate dynamic pricing matrices, items databases, and download corporate PDFs.',
      status: 'locked',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <GlassCard className="relative overflow-hidden p-6 sm:p-8" intensity="medium">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-sky-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-sky-300">
              <Sparkles className="h-3.5 w-3.5" />
              SaaS Workspace Live
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Assalam-o-Alaikum, {user?.fullName || 'Manager'}!
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Welcome to QuoteFlow PK. Your core SaaS setup for <span className="font-semibold">{user?.companyName || 'Corporate Client'}</span> is active.
            </p>
          </div>
          <button 
            onClick={() => onNavigate('settings')}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 transition-all active:scale-95"
          >
            <span>Configure Database</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </GlassCard>

      {/* Stats Overview Grid (Locked visual indicators) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={idx} className="relative p-5" intensity="low">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100/60 pt-3 dark:border-slate-800/40">
                <span>{stat.change}</span>
                <div className="flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-semibold dark:text-amber-400">
                  <Lock className="h-2.5 w-2.5" />
                  <span>Phase 2</span>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Main Grid: Checklist & Dev Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Step-by-Step Activation Checklist */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6" intensity="medium">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Workspace Checklist & Milestone Plan
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Complete the setup blocks below to graduate QuoteFlow PK from Sandbox to Production.
            </p>

            <div className="mt-6 space-y-4">
              {steps.map((step, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-start gap-4 rounded-xl border p-4 transition-all duration-200 ${
                    step.status === 'complete'
                      ? 'border-emerald-100 bg-emerald-500/5 dark:border-emerald-950/20'
                      : step.status === 'pending'
                        ? 'border-amber-100 bg-amber-500/5 dark:border-amber-950/20'
                        : 'border-slate-200/50 bg-slate-50/20 opacity-60 dark:border-slate-800/50'
                  }`}
                >
                  <div className="mt-0.5">
                    {step.status === 'complete' && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    )}
                    {step.status === 'pending' && (
                      <div className="h-5 w-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                    )}
                    {step.status === 'locked' && (
                      <Lock className="h-4.5 w-4.5 text-slate-400 dark:text-slate-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {step.title}
                    </h4>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right side: Phase 1 Tech Specs Card */}
        <div className="space-y-6">
          <GlassCard className="p-6" intensity="medium">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Phase 1 Tech Specifications
            </h3>
            <div className="mt-4 space-y-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Framework</span>
                <span className="font-semibold text-slate-900 dark:text-white">React v19 + Vite</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Styling System</span>
                <span className="font-semibold text-slate-900 dark:text-white">Tailwind CSS v4</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Auth Engine</span>
                <span className="font-semibold text-slate-900 dark:text-white">Supabase JWT</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Theme Engine</span>
                <span className="font-semibold text-slate-900 dark:text-white">Responsive Dual Mode</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Local Sandbox</span>
                <span className="font-semibold text-slate-900 dark:text-white">Interactive State DB</span>
              </div>
            </div>

            <hr className="my-4 border-slate-100 dark:border-slate-800" />

            <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-900/60">
              <h5 className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
                Wait for Phase 1 Sign-Off
              </h5>
              <p className="mt-1 text-[10px] leading-normal text-slate-500 dark:text-slate-400">
                Phase 1 is now feature-complete! Please verify all navigation flows, theme changes, responsive drawers, and auth page mock-ups. Provide confirmation in the chat to proceed to Phase 2 (Products & Client Catalogues).
              </p>
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
}
