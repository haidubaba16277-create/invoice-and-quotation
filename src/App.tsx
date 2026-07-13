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
import { Sparkles, Loader2 } from 'lucide-react';
import { QuoteFlowLogo } from './components/QuoteFlowLogo';

function AppContent() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [publicQuoteNumber, setPublicQuoteNumber] = useState<string | null>(null);

  useEffect(() => {
    // Check Supabase connection
    setIsSupabaseConnected(authService.isConfigured());

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

    const isPublicQuote = checkPublicQuoteLink();

    // Restore session on startup if not a public link view
    const checkSession = async () => {
      try {
        const session = await authService.getSession();
        if (session) {
          setUser(session.user);
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleAuthSuccess = (profile: UserProfile) => {
    setUser(profile);
    setCurrentView('dashboard');
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
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

  // Auth Guard
  if (!user) {
    return (
      <AuthPages
        onAuthSuccess={handleAuthSuccess}
        isSupabaseConfigured={isSupabaseConnected}
      />
    );
  }

  // Dashboard Area
  return (
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
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
