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
import { PricingView } from './components/PricingView';
import { BillingView } from './components/BillingView';
import { authService } from './services/authService';
import { supabase, isSupabaseConfigured } from './lib/supabase';
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
  const [showPricing, setShowPricing] = useState(false);
  
  // Admin System States
  const [isAdminArea, setIsAdminArea] = useState(false);
  const [originalAdminUser, setOriginalAdminUser] = useState<UserProfile | null>(null);

  // Path routing helper
  const navigateToPath = (path: string) => {
    window.history.pushState({}, '', path);
    if (path.startsWith('/admin')) {
      setIsAdminArea(true);
      setShowPricing(false);
    } else if (path.startsWith('/pricing')) {
      setIsAdminArea(false);
      setShowPricing(true);
    } else {
      setIsAdminArea(false);
      setShowPricing(false);
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
        setShowPricing(false);
      } else if (path.startsWith('/pricing') || hash === '#pricing' || hash === '#/pricing') {
        setShowPricing(true);
        setIsAdminArea(false);
      } else {
        setIsAdminArea(false);
        setShowPricing(false);
      }
    };

    checkPath();
    window.addEventListener('popstate', checkPath);
    window.addEventListener('hashchange', checkPath);

    // Detect public quotation views from path, search, or hash parameters
    const checkPublicQuoteLink = () => {
      // 1. Check pathname (e.g. /q/QT-2026-001 or /quote/public/token)
      const path = window.location.pathname;
      if (path.startsWith('/q/')) {
        const quoteNum = path.substring(3);
        if (quoteNum) {
          setPublicQuoteNumber(decodeURIComponent(quoteNum));
          return true;
        }
      } else if (path.startsWith('/quote/public/')) {
        const token = path.substring(14);
        if (token) {
          setPublicQuoteNumber(decodeURIComponent(token));
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

      // 3. Check hash routes (e.g. #/q/QT-2026-001 or #/quote/public/token)
      const hash = window.location.hash;
      if (hash.startsWith('#/q/')) {
        const quoteNum = hash.substring(4);
        if (quoteNum) {
          setPublicQuoteNumber(decodeURIComponent(quoteNum));
          return true;
        }
      } else if (hash.startsWith('#/quote/public/')) {
        const token = hash.substring(15);
        if (token) {
          setPublicQuoteNumber(decodeURIComponent(token));
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
          let activeUser = session.user;
          // Auto suspension and Expiry date enforcement system
          if (
            activeUser.subscription_status !== 'Expired' &&
            activeUser.subscription_status !== 'Suspended' &&
            activeUser.trial_ends_at &&
            Date.now() > new Date(activeUser.trial_ends_at).getTime() &&
            activeUser.role !== 'owner' &&
            !activeUser.email.toLowerCase().includes('admin')
          ) {
            await authService.updateSubscription(activeUser.id, activeUser.plan || 'Trial', 'Expired', 0);
            const fresh = await authService.getSession();
            if (fresh) {
              activeUser = fresh.user;
            }
          }
          setUser(activeUser);
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

  // Real-time polling to synchronize user subscription/profile updates without manual refresh
  useEffect(() => {
    if (!user?.id) return;
    if (originalAdminUser) return; // Skip polling when impersonating a customer to prevent session state pollution

    // Do not poll if the logged-in user is an admin/owner to avoid redundant checks
    const isOwner = user.role === 'owner' || user.email.toLowerCase().includes('admin');
    if (isOwner) return;

    const intervalId = setInterval(async () => {
      try {
        const freshSession = await authService.getSession();
        if (freshSession && freshSession.user) {
          const freshUser = freshSession.user;
          // Compare relevant fields using primitive properties to prevent unnecessary state triggers and re-renders
          if (
            freshUser.plan !== user.plan ||
            freshUser.selected_plan !== user.selected_plan ||
            freshUser.subscription_status !== user.subscription_status ||
            freshUser.status !== user.status ||
            freshUser.trial_ends_at !== user.trial_ends_at
          ) {
            console.log('Real-Time Sync: Subscription update detected!', freshUser);
            setUser(freshUser);
          }
        }
      } catch (err) {
        console.error('Failed to auto-refresh live session data:', err);
      }
    }, 4000); // 4 seconds polling is highly responsive and database-friendly

    return () => {
      clearInterval(intervalId);
    };
  }, [user?.id, user?.plan, user?.selected_plan, user?.subscription_status, user?.status, user?.trial_ends_at, originalAdminUser]);

  // Immediately synchronize parent session state on subscription updates
  useEffect(() => {
    const handleSubUpdated = async () => {
      if (originalAdminUser) {
        // When impersonating, refresh the customer's profile live from Supabase or localStorage
        try {
          const userId = user?.id;
          if (userId) {
            let freshCustomer = { ...user };
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
            if (isSupabaseConfigured && supabase && isUuid) {
              const [profileRes, subRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
                supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()
              ]);
              if (profileRes && profileRes.data) {
                freshCustomer.plan = profileRes.data.current_plan || freshCustomer.plan;
                freshCustomer.selected_plan = profileRes.data.current_plan || freshCustomer.selected_plan;
                freshCustomer.subscription_status = profileRes.data.subscription_status || freshCustomer.subscription_status;
              }
              if (subRes && subRes.data) {
                freshCustomer.status = subRes.data.status === 'Active' ? 'active' : subRes.data.status?.toLowerCase() || freshCustomer.status;
                freshCustomer.plan = subRes.data.plan || freshCustomer.plan;
                if (subRes.data.expiry_date) {
                  freshCustomer.trial_ends_at = new Date(subRes.data.expiry_date).toISOString();
                }
              }
            } else {
              const cachedUsersStr = localStorage.getItem('quoteflow_admin_users') || '[]';
              const users = JSON.parse(cachedUsersStr);
              const matched = users.find((u: any) => u.id === userId);
              if (matched) {
                freshCustomer = { ...freshCustomer, ...matched };
              }
            }
            setUser(freshCustomer as UserProfile);
          }
        } catch (e) {
          console.error('Failed to sync impersonated customer session on event:', e);
        }
        return;
      }

      try {
        const freshSession = await authService.getSession();
        if (freshSession && freshSession.user) {
          console.log('Immediate parent session sync on event:', freshSession.user);
          setUser(freshSession.user);
        }
      } catch (e) {
        console.error('Failed to sync parent session on event:', e);
      }
    };

    window.addEventListener('subscription-updated', handleSubUpdated);
    window.addEventListener('payments-updated', handleSubUpdated);
    window.addEventListener('storage', handleSubUpdated);
    return () => {
      window.removeEventListener('subscription-updated', handleSubUpdated);
      window.removeEventListener('payments-updated', handleSubUpdated);
      window.removeEventListener('storage', handleSubUpdated);
    };
  }, [user?.id, originalAdminUser]);

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
    if (showPricing) {
      return (
        <PricingView
          onBackToAuth={() => {
            setShowPricing(false);
            navigateToPath('/login');
          }}
          onSelectPlan={(plan) => {
            setShowPricing(false);
            navigateToPath('/login');
          }}
          isLoggedIn={false}
        />
      );
    }

    if (window.location.pathname !== '/login' && window.location.pathname !== '/pricing' && !publicQuoteNumber) {
      window.history.replaceState({}, '', '/login');
    }
    return (
      <AuthPages
        onAuthSuccess={handleAuthSuccess}
        isSupabaseConfigured={isSupabaseConnected}
        onViewPricing={() => {
          setShowPricing(true);
          navigateToPath('/pricing');
        }}
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
            user={user}
          />
        )}
        {currentView === 'products' && (
          <ProductsView
            isSupabaseConnected={isSupabaseConnected}
            user={user}
          />
        )}
        {currentView === 'quotations' && (
          <QuotationsView
            isSupabaseConnected={isSupabaseConnected}
            onNavigate={setCurrentView}
            user={user}
          />
        )}
        {currentView === 'invoices' && (
          <InvoicesView
            isSupabaseConnected={isSupabaseConnected}
            user={user}
          />
        )}
        {currentView === 'billing' && (
          <BillingView
            user={user}
            onNavigate={setCurrentView}
            onRefreshUser={async () => {
              const freshSession = await authService.getSession();
              if (freshSession) {
                setUser(freshSession.user);
              }
            }}
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
