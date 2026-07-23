import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { UserProfile } from '../types/auth';
import { AlertTriangle } from 'lucide-react';
import { isSubscriptionExpired } from '../lib/subscription';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
  user: UserProfile | null;
  onSignOut: () => void;
  isSupabaseConnected: boolean;
}

export function DashboardLayout({ 
  children, 
  currentView, 
  onNavigate, 
  user, 
  onSignOut,
  isSupabaseConnected
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={onNavigate}
        user={user}
        onSignOut={onSignOut}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Universal Header */}
        <Header
          onToggleSidebar={() => setSidebarOpen(true)}
          user={user}
          isSupabaseConnected={isSupabaseConnected}
          onNavigate={onNavigate}
        />

        {/* Dynamic Content Frame */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl flex flex-col min-h-full justify-between">
            <div>
              {isSubscriptionExpired(user) && (
                <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4.5 shadow-md dark:border-rose-950/40 dark:bg-rose-950/20 text-slate-900 dark:text-rose-100 animate-pulse">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-extrabold">Your free trial has ended.</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Upgrade your subscription to continue using <strong>QuoteFlow PK</strong>.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('billing')}
                      className="shrink-0 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2 uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                    >
                      Upgrade Plan
                    </button>
                  </div>
                </div>
              )}
              {children}
            </div>

            {/* Premium App Footer */}
            <footer className="mt-16 border-t border-slate-200/40 dark:border-slate-800/60 pt-6 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 dark:text-slate-500 font-sans">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500 dark:text-slate-400">QuoteFlow PK</span>
                <span>•</span>
                <span>Quotes That Flow, Business That Grows</span>
              </div>
              <div className="flex items-center gap-4">
                <span>© {new Date().getFullYear()}</span>
                <span className="inline-flex items-center rounded-md bg-indigo-50/80 dark:bg-indigo-950/40 px-2 py-0.5 font-mono text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30">
                  v1.0
                </span>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
