import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Bell, 
  Search, 
  Menu, 
  Database, 
  ShieldAlert, 
  CheckCircle2, 
  HelpCircle,
  X,
  Laptop
} from 'lucide-react';
import { useTheme } from './ThemeContext';
import { UserProfile } from '../types/auth';

interface HeaderProps {
  onToggleSidebar: () => void;
  user: UserProfile | null;
  isSupabaseConnected: boolean;
  onNavigate: (view: string) => void;
}

export function Header({ onToggleSidebar, user, isSupabaseConnected, onNavigate }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    {
      id: 1,
      title: 'Welcome to QuoteFlow PK',
      desc: 'Phase 1 core setup loaded successfully. Supabase dynamic router initialized.',
      time: 'Just now',
      unread: true,
    },
    {
      id: 2,
      title: 'Sandbox Engine Active',
      desc: 'All features run in secure local sandbox. To connect live DB, visit settings.',
      time: '5 mins ago',
      unread: false,
    }
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/70 px-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/70 sm:px-6 lg:px-8">
      {/* Left side: Search & Mobile Menu Trigger */}
      <div className="flex flex-1 items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search Input (Visual Mock) */}
        <div className="relative hidden max-w-md flex-1 sm:block">
          <Search className="absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search quotations, invoices, clients... (Press ⌘K)"
            disabled
            className="h-10 w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 text-xs font-medium text-slate-500 placeholder-slate-400 outline-hidden transition-all dark:border-slate-800/80 dark:bg-slate-900/40 dark:placeholder-slate-500"
          />
          <div className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            ⌘K
          </div>
        </div>
      </div>

      {/* Right side: Database State, Light/Dark, Notifications, User */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        
        {/* Database Mode Pill */}
        <button 
          onClick={() => onNavigate('settings')}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
            isSupabaseConnected 
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' 
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30'
          }`}
        >
          {isSupabaseConnected ? (
            <>
              <Database className="h-3.5 w-3.5 animate-pulse" />
              <span className="hidden sm:inline">Supabase Connected</span>
              <span className="sm:hidden">Live</span>
            </>
          ) : (
            <>
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sandbox Demo Mode</span>
              <span className="sm:hidden">Demo</span>
            </>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-2xs transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800/80 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-2xs transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800/80 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white ${
              showNotifications ? 'bg-slate-50 dark:bg-slate-800' : ''
            }`}
          >
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-indigo-600 dark:bg-sky-400" />
          </button>

          {/* Notifications Dropdown (Glassmorphic design) */}
          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)} 
              />
              <div className="absolute right-0 mt-2.5 z-50 w-80 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-sky-400">
                    {notifications.filter(n => n.unread).length} New
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`group relative rounded-xl p-2.5 transition-colors ${
                        n.unread 
                          ? 'bg-slate-50/80 dark:bg-slate-900/40' 
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/20'
                      }`}
                    >
                      <p className="text-xs font-semibold text-slate-950 dark:text-white flex items-center gap-1.5">
                        {n.unread && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-sky-400" />}
                        {n.title}
                      </p>
                      <p className="mt-1 text-[11px] leading-normal text-slate-500 dark:text-slate-400">
                        {n.desc}
                      </p>
                      <p className="mt-2 text-[9px] font-medium text-slate-400">
                        {n.time}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Info & Avatar */}
        {user && (
          <div className="flex items-center gap-2.5 pl-1">
            <div className="hidden text-right lg:block">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                {user.fullName || 'Member'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {user.companyName || 'Corporate'}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
