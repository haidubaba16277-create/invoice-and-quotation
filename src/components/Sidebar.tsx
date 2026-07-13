import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  FileText, 
  Receipt, 
  BarChart3, 
  Settings, 
  LogOut,
  Sparkles,
  Lock
} from 'lucide-react';
import { UserProfile } from '../types/auth';
import { QuoteFlowLogo } from './QuoteFlowLogo';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  user: UserProfile | null;
  onSignOut: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ currentView, onNavigate, user, onSignOut, isOpen, onClose }: SidebarProps) {
  // Navigation categories and links
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, isLocked: false },
    { id: 'customers', label: 'Customers', icon: Users, isLocked: false },
    { id: 'products', label: 'Products & Items', icon: Package, isLocked: false },
    { id: 'quotations', label: 'Quotations', icon: FileText, isLocked: false },
    { id: 'invoices', label: 'Invoices', icon: Receipt, isLocked: false },
    { id: 'reports', label: 'Reports', icon: BarChart3, isLocked: false },
  ];

  const bottomItems = [
    { id: 'settings', label: 'Settings & Config', icon: Settings, isLocked: false },
  ];

  const handleItemClick = (id: string, isLocked: boolean) => {
    if (isLocked) return;
    onNavigate(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/80 bg-white/95 px-6 py-6 transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-950/95 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Section */}
        <div className="flex items-center gap-3 px-1">
          <QuoteFlowLogo size={42} className="transition-transform duration-300 hover:scale-105" />
          <div className="min-w-0">
            <h1 className="font-sans text-[17px] font-black tracking-tight text-slate-900 dark:text-white leading-none">
              QuoteFlow <span className="bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">PK</span>
            </h1>
            <p className="font-sans text-[9px] font-bold text-indigo-500 dark:text-sky-400 mt-1 leading-tight tracking-tight uppercase">
              Quotes That Flow, Business That Grows
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="mt-8 flex flex-1 flex-col justify-between">
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id, item.isLocked)}
                  className={`group flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    item.isLocked 
                      ? 'cursor-not-allowed text-slate-400 dark:text-slate-600'
                      : isActive
                        ? 'bg-gradient-to-r from-sky-50/80 to-indigo-50/80 text-indigo-600 dark:from-slate-900/60 dark:to-indigo-950/40 dark:text-sky-400 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/50 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-105 ${
                      isActive && !item.isLocked ? 'text-indigo-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'
                    }`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="space-y-4">
            <hr className="border-slate-100 dark:border-slate-800" />
            
            <nav className="space-y-1.5">
              {bottomItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id, item.isLocked)}
                    className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-sky-50/80 to-indigo-50/80 text-indigo-600 dark:from-slate-900/60 dark:to-indigo-950/40 dark:text-sky-400 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/50 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-600 dark:text-sky-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <button
                onClick={onSignOut}
                className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-rose-600 transition-all duration-200 hover:bg-rose-50/80 dark:text-rose-400 dark:hover:bg-rose-950/20"
              >
                <LogOut className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                <span>Sign Out</span>
              </button>
            </nav>

            {/* Profile Bar */}
            {user && (
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-900 dark:bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-950 dark:text-sky-300">
                    {user.fullName ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'Q'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                      {user.fullName || 'User Profile'}
                    </p>
                    <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                      {user.companyName || 'Corporate Client'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/40 dark:border-slate-800/60 pt-2 text-[9px] font-mono font-medium text-slate-400 dark:text-slate-500 tracking-wider">
                  <span>SYSTEM ACTIVE</span>
                  <span>VERSION 1.0</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
