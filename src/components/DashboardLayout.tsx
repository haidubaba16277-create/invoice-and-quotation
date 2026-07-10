import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { UserProfile } from '../types/auth';

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
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
