import React, { useEffect, useState } from 'react';
import { ThemeProvider } from './components/ThemeContext';
import { AuthPages } from './components/AuthPages';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardView } from './components/DashboardView';
import { CustomersView } from './components/CustomersView';
import { ProductsView } from './components/ProductsView';
import { QuotationsView } from './components/QuotationsView';
import { InvoicesView } from './components/InvoicesView';
import { PublicQuotationView } from './components/PublicQuotationView';
import { SettingsView } from './components/SettingsView';
import { ReportsView } from './components/ReportsView';
import { authService } from './services/authService';
import { UserProfile } from './types/auth';
import { Sparkles, Loader2, ShieldAlert } from 'lucide-react';
import { QuoteFlowLogo } from './components/QuoteFlowLogo';
import { AdminPanel } from './components/AdminPanel';
import { AdminLogin } from './components/AdminLogin';

function AppContent() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [publicQuoteNumber, setPublicQuoteNumber] = useState<string | null>(null);
  
  // Admin System States
  const [isAdminArea, setIsAdminArea] = useState(false);
  const [originalAdminUser, setOriginalAdminUser] = useState<UserProfile | null>(null);

  // Path routing helper
  const navigateToPath = (path: string) => {
    window.history.pushState({}, '', path);
    if (path.startsWith('/admin')) {
      setIsAdminArea(true);
    } else {
      setIsAdminArea(false);
    }
  };

  useEffect(() => {
    // Check Supabase connection
    setIsSupabaseConnected(authService.isConfigured());

    // Path check on initial mount
    const checkPath = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path.startsWith('/admin') || hash.startsWith('#/admin') || hash === '#admin') {
        setIsAdminArea(true);
      } else {
        setIsAdminArea(false);
      }
    };

    checkPath();
    window.addEventListener('popstate', checkPath);
    window.addEventListener('hashchange', checkPath);

    // Detect public quotation views from path, search, or hash parameters
    const checkPublicQuoteLink = () => {
      // 1. Check pathname (e.g. /q/QT-2026-001)
      const path = window.location.pathname;
      if (path.startsWith('/q/')) {
        const quoteNum = path.substring(3);
        if (quoteNum) {
          setPublicQuoteNumber(decodeURIComponent(quoteNum));
          return true;
        }
      }

      // 2. Check query params (e.g. ?q=QT-2026-001)
      const params = new URLSearchParams(window.location.search);
      const qParam = params.get('q');
      if (qParam) {
        setPublicQuoteNumber(qParam);
        return true;
      }

      // 3. Check hash routes (e.g. #/q/QT-2026-001 or #q=QT-2026-001)
      const hash = window.location.hash;
      if (hash.startsWith('#/q/')) {
        const quoteNum = hash.substring(4);
        if (quoteNum) {
          setPublicQuoteNumber(decodeURIComponent(quoteNum));
          return true;
        }
      } else if (hash.startsWith('#q=')) {
        const quoteNum = hash.substring(3);
        if (quoteNum) {
          setPublicQuoteNumber(decodeURIComponent(quoteNum));
          return true;
        }
      }
      return false;
    };

    checkPublicQuoteLink();

    // Restore session on startup if not a public link view
    const checkSession = async () => {
      try {
        const session = await authService.getSession();
        if (session) {
          setUser(session.user);
          if (window.location.pathname === '/login') {
            window.history.replaceState({}, '', '/');
          }
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    return () => {
      window.removeEventListener('popstate', checkPath);
      window.removeEventListener('hashchange', checkPath);
    };
  }, []);

  const handleAuthSuccess = (profile: UserProfile) => {
    setUser(profile);
    setCurrentView('dashboard');
    if (window.location.pathname === '/login') {
      window.history.replaceState({}, '', '/');
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
      setOriginalAdminUser(null);
      window.history.replaceState({}, '', '/login');
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="relative flex flex-col items-center">
          <QuoteFlowLogo size={70} className="animate-pulse" />
          <Loader2 className="mt-6 h-6 w-6 animate-spin text-indigo-600 dark:text-sky-400" />
          <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono tracking-wider uppercase">
            Loading QuoteFlow PK...
          </p>
        </div>
      </div>
    );
  }

  // Public Proposal Portal Guard
  if (publicQuoteNumber) {
    return (
      <PublicQuotationView
        quoteNumber={publicQuoteNumber}
        onBackToApp={() => {
          // Reset the URL address bar cleanly and exit portal
          window.history.pushState({}, '', window.location.origin + window.location.pathname);
          setPublicQuoteNumber(null);
        }}
      />
    );
  }

  // ========================================================
  // OWNER ADMIN PORTAL WORKSPACE
  // ========================================================
  if (isAdminArea) {
    if (!user) {
      return (
        <AdminLogin
          isSupabaseConfigured={isSupabaseConnected}
          onLoginSuccess={(ownerUser) => {
            setUser(ownerUser);
            navigateToPath('/admin');
          }}
          onBackToApp={() => navigateToPath('/')}
        />
      );
    }

    const isOwner = user.role === 'owner' || user.email.toLowerCase().includes('admin');
    if (!isOwner) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xl dark:border-rose-950/40 dark:bg-slate-900">
            <ShieldAlert className="mx-auto h-12 w-12 text-rose-500" />
            <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Admin Access Restricted</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Only platform owners or administrator personnel with authorized roles can access this control workspace.
            </p>
            <button 
              onClick={() => navigateToPath('/')}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors"
            >
              Go to Customer Site
            </button>
          </div>
        </div>
      );
    }

    return (
      <AdminPanel
        user={user}
        onExitAdmin={() => navigateToPath('/')}
        onImpersonate={(targetUser) => {
          setOriginalAdminUser(user);
          setUser(targetUser);
          navigateToPath('/');
        }}
        isSupabaseConnected={isSupabaseConnected}
      />
    );
  }

  // ========================================================
  // STANDARD CUSTOMER / END-USER ENVIRONMENT
  // ========================================================
  if (!user) {
    if (window.location.pathname !== '/login' && !publicQuoteNumber) {
      window.history.replaceState({}, '', '/login');
    }
    return (
      <AuthPages
        onAuthSuccess={handleAuthSuccess}
        isSupabaseConfigured={isSupabaseConnected}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Impersonation alert ribbon banner */}
      {originalAdminUser && (
        <div className="flex h-11 shrink-0 items-center justify-between bg-amber-500 px-6 text-xs font-bold text-slate-950 shadow-md">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 animate-pulse text-slate-950" />
            <span>Active Impersonation Mode: Simulating customer workspace for {user.fullName} ({user.companyName})</span>
          </div>
          <button
            onClick={() => {
              setUser(originalAdminUser);
              setOriginalAdminUser(null);
              navigateToPath('/admin');
            }}
            className="rounded-lg bg-slate-950 px-3.5 py-1.5 text-[10px] font-black text-white hover:bg-slate-800 transition-colors"
          >
            Exit Impersonation
          </button>
        </div>
      )}

      <DashboardLayout
        currentView={currentView}
        onNavigate={setCurrentView}
        user={user}
        onSignOut={handleSignOut}
        isSupabaseConnected={isSupabaseConnected}
      >
        {currentView === 'dashboard' && (
          <DashboardView
            user={user}
            isSupabaseConnected={isSupabaseConnected}
            onNavigate={setCurrentView}
          />
        )}
        {currentView === 'customers' && (
          <CustomersView
            isSupabaseConnected={isSupabaseConnected}
          />
        )}
        {currentView === 'products' && (
          <ProductsView
            isSupabaseConnected={isSupabaseConnected}
          />
        )}
        {currentView === 'quotations' && (
          <QuotationsView
            isSupabaseConnected={isSupabaseConnected}
            onNavigate={setCurrentView}
          />
        )}
        {currentView === 'invoices' && (
          <InvoicesView
            isSupabaseConnected={isSupabaseConnected}
          />
        )}
        {currentView === 'settings' && (
          <SettingsView
            isSupabaseConnected={isSupabaseConnected}
          />
        )}
        {currentView === 'reports' && (
          <ReportsView />
        )}
      </DashboardLayout>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
