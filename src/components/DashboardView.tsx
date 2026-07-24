import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Users, 
  FileText, 
  TrendingUp,
  Coins,
  Receipt,
  Package,
  ChevronRight,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  CreditCard,
  Plus,
  Loader2,
  Calendar
} from 'lucide-react';
import { UserProfile } from '../types/auth';
import { GlassCard } from './GlassCard';
import { dataService } from '../services/dataService';
import { Customer, Product, Quotation, Invoice, CompanySettings } from '../types/business';
import { QuoteFlowLogo } from './QuoteFlowLogo';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface DashboardViewProps {
  user: UserProfile | null;
  isSupabaseConnected: boolean;
  onNavigate: (view: string) => void;
}

export function DashboardView({ user, isSupabaseConnected, onNavigate }: DashboardViewProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 'Rs. 0.00',
    activeProposals: '0 Proposals',
    activeClients: '0 Clients',
    activeProducts: '0 SKUs',
  });

  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentQuotations, setRecentQuotations] = useState<Quotation[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  const [liveSub, setLiveSub] = useState<{
    subscription_status: string;
    plan: string;
    expiry_date: string;
    start_date: string;
    days_remaining: number;
    trial_status: string;
    trial_ends_at: string | null;
  } | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    let active = true;
    
    async function fetchLiveSubscription() {
      try {
        let dbStatus = 'Trial';
        let dbPlan = 'Trial';
        let dbExpiryDate = '';
        let dbStartDate = '';
        let dbTrialStatus = 'Active';
        let dbTrialEndsAt: string | null = null;

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);

        if (isSupabaseConfigured && supabase && isUuid) {
          // Fetch live from Supabase
          const [profileRes, subRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
            supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle()
          ]);

          if (profileRes && profileRes.data) {
            if (profileRes.data.subscription_status) dbStatus = profileRes.data.subscription_status;
            if (profileRes.data.current_plan) dbPlan = profileRes.data.current_plan;
            if (profileRes.data.trial_status) dbTrialStatus = profileRes.data.trial_status;
          }

          if (subRes && subRes.data) {
            if (subRes.data.status) dbStatus = subRes.data.status;
            if (subRes.data.plan) dbPlan = subRes.data.plan;
            dbStartDate = subRes.data.start_date || dbStartDate;
            dbExpiryDate = subRes.data.expiry_date || dbExpiryDate;
            if (subRes.data.expiry_date) {
              try {
                const parsedDate = new Date(subRes.data.expiry_date);
                if (!isNaN(parsedDate.getTime())) {
                  dbTrialEndsAt = parsedDate.toISOString();
                }
              } catch (dateErr) {
                console.warn('Failed to parse subscriptions expiry_date:', subRes.data.expiry_date, dateErr);
              }
            }
          }
        }

        // Always reconcile with local storage (admin users, admin subs, and verified payments)
        const cachedUsersStr = localStorage.getItem('quoteflow_admin_users') || '[]';
        const users = JSON.parse(cachedUsersStr);
        const matchedUser = users.find((u: any) => 
          u.id === user.id || 
          (u.email && user?.email && u.email.trim().toLowerCase() === user.email.trim().toLowerCase()) ||
          (u.fullName && user?.fullName && u.fullName.trim().toLowerCase() === user.fullName.trim().toLowerCase()) ||
          (u.companyName && user?.companyName && u.companyName.trim().toLowerCase() === user.companyName.trim().toLowerCase())
        );
        if (matchedUser) {
          if (matchedUser.subscription_status === 'Active' || matchedUser.status === 'active') {
            dbStatus = 'Active';
            dbPlan = (matchedUser.plan && matchedUser.plan !== 'Trial') ? matchedUser.plan : ((matchedUser.selected_plan && matchedUser.selected_plan !== 'Trial') ? matchedUser.selected_plan : dbPlan);
            dbTrialStatus = 'Active';
          } else if (dbStatus === 'Trial' && matchedUser.plan && matchedUser.plan !== 'Trial') {
            dbStatus = matchedUser.subscription_status || 'Active';
            dbPlan = matchedUser.plan;
          }
        }

        const cachedSubsStr = localStorage.getItem('quoteflow_admin_subs') || '[]';
        const subs = JSON.parse(cachedSubsStr);
        const matchedSub = subs.find((s: any) => s.userId === user.id || (matchedUser && s.userId === matchedUser.id));
        if (matchedSub && (matchedSub.status === 'active' || matchedSub.status === 'Active')) {
          dbStatus = 'Active';
          if (matchedSub.plan && matchedSub.plan !== 'Trial') dbPlan = matchedSub.plan;
          dbStartDate = matchedSub.startsAt || dbStartDate;
          dbExpiryDate = matchedSub.expiresAt || dbExpiryDate;
        }

        // Also check if any payment for this user was verified or paid!
        const cachedPaymentsStr = localStorage.getItem('quoteflow_payments') || '[]';
        const localPayList = JSON.parse(cachedPaymentsStr);
        const verifiedPay = localPayList.find((p: any) => 
          (p.userId === user.id || 
           (matchedUser && p.userId === matchedUser.id) || 
           (user.email && p.userName && p.userName.trim().toLowerCase() === user.fullName?.trim().toLowerCase()) ||
           (user.fullName && p.userName && p.userName.trim().toLowerCase() === user.fullName.trim().toLowerCase())) && 
          (p.status === 'Verified' || p.status === 'Paid')
        );
        if (verifiedPay) {
          dbStatus = 'Active';
          if (verifiedPay.plan && verifiedPay.plan !== 'Trial') {
            dbPlan = verifiedPay.plan;
          }
        }

        // Check local session as well
        const localSessStr = localStorage.getItem('quoteflow_local_session');
        if (localSessStr) {
          try {
            const sess = JSON.parse(localSessStr);
            if (sess?.user && (sess.user.id === user.id || sess.user.email?.toLowerCase() === user.email?.toLowerCase())) {
              if (sess.user.subscription_status === 'Active' || sess.user.status === 'active') {
                dbStatus = 'Active';
                if (sess.user.plan && sess.user.plan !== 'Trial') dbPlan = sess.user.plan;
              }
            }
          } catch {}
        }

        if (dbStatus === 'Active' && (dbPlan === 'Trial' || !dbPlan)) {
          dbPlan = 'Business Plan';
        }

        // Calculate days remaining from expiry date if active/expired, or trial_ends_at if trial
        let daysRemaining = 30;
        const targetDateStr = dbExpiryDate || dbTrialEndsAt || user?.trial_ends_at;
        if (targetDateStr) {
          try {
            const targetTime = new Date(targetDateStr).getTime();
            const todayTime = new Date().getTime();
            if (!isNaN(targetTime)) {
              daysRemaining = Math.max(0, Math.ceil((targetTime - todayTime) / (1000 * 3600 * 24)));
            }
          } catch (calcErr) {
            console.error('Failed to calculate days remaining:', targetDateStr, calcErr);
          }
        } else if (dbStatus === 'Active') {
          daysRemaining = 30;
        }

        const isTrialAccount = dbStatus.toUpperCase() === 'TRIAL' || dbPlan.toUpperCase() === 'TRIAL';
        if (isTrialAccount && daysRemaining > 3) {
          daysRemaining = 3;
        }

        if (!active) return;

        // Automatically elevate owner/admin users to permanent Active Enterprise status
        const isOwnerUser = user?.email?.toLowerCase().includes('admin') || user?.email?.toLowerCase() === 'haidubaba16277@gmail.com' || user?.role === 'owner';
        if (isOwnerUser) {
          dbStatus = 'Active';
          dbPlan = 'Enterprise';
          dbTrialStatus = 'Active';
          dbExpiryDate = '';
          dbTrialEndsAt = null;
          daysRemaining = 3650; // Unlimited lifetime access
        }

        // DEBUG logging exactly as requested in Requirement 7
        console.log('=== DASHBOARD LIVE QUERY DEBUG ===');
        console.log('subscription_status:', dbStatus);
        console.log('trial_status:', dbTrialStatus);
        console.log('trial_ends_at:', dbTrialEndsAt);
        console.log('expiry_date:', dbExpiryDate);
        console.log('days_remaining:', daysRemaining);
        console.log('Current Plan:', dbPlan);
        console.log('===================================');

        setLiveSub({
          subscription_status: dbStatus,
          plan: dbPlan,
          expiry_date: dbExpiryDate,
          start_date: dbStartDate,
          days_remaining: daysRemaining,
          trial_status: dbTrialStatus,
          trial_ends_at: dbTrialEndsAt
        });
      } catch (err) {
        console.error('Failed to query live subscription data in Dashboard:', err);
      }
    }

    fetchLiveSubscription();

    // Fast polling interval to refresh automatically without browser reload (Requirement 6)
    const intervalId = setInterval(fetchLiveSubscription, 3000);

    const handleSubUpdated = () => {
      fetchLiveSubscription();
    };
    window.addEventListener('subscription-updated', handleSubUpdated);
    window.addEventListener('payments-updated', handleSubUpdated);
    window.addEventListener('storage', handleSubUpdated);

    return () => {
      active = false;
      clearInterval(intervalId);
      window.removeEventListener('subscription-updated', handleSubUpdated);
      window.removeEventListener('payments-updated', handleSubUpdated);
      window.removeEventListener('storage', handleSubUpdated);
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [customers, products, quotations, invoices, settings] = await Promise.all([
          dataService.getCustomers(),
          dataService.getProducts(),
          dataService.getQuotations(),
          dataService.getInvoices(),
          dataService.getCompanySettings()
        ]);

        if (!active) return;

        // Compute total revenue (collected payments from invoices)
        const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.amountPaid) || 0), 0);

        setStats({
          revenue: `Rs. ${totalRevenue.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          activeProposals: `${quotations.length} Active Document${quotations.length === 1 ? '' : 's'}`,
          activeClients: `${customers.length} Corporate Partner${customers.length === 1 ? '' : 's'}`,
          activeProducts: `${products.length} SKU${products.length === 1 ? '' : 's'} Catalogued`,
        });

        // Slice top 3 recent records
        setRecentInvoices(invoices.slice(0, 3));
        setRecentQuotations(quotations.slice(0, 3));
        setCompanySettings(settings);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    const handleDataSync = () => {
      loadData();
    };

    window.addEventListener('quotationStatusUpdated', handleDataSync);
    window.addEventListener('storage', handleDataSync);
    window.addEventListener('focus', handleDataSync);

    const syncInterval = setInterval(handleDataSync, 3000);

    return () => {
      active = false;
      window.removeEventListener('quotationStatusUpdated', handleDataSync);
      window.removeEventListener('storage', handleDataSync);
      window.removeEventListener('focus', handleDataSync);
      clearInterval(syncInterval);
    };
  }, []);

  // Live computed subscription variables
  const subscription_status = liveSub?.subscription_status || user?.subscription_status || 'Trial';
  const plan = liveSub?.plan || user?.selected_plan || user?.plan || 'Trial';
  const is_trial = subscription_status.toUpperCase() === 'TRIAL' || plan.toUpperCase() === 'TRIAL';
  const expiry_date = liveSub?.expiry_date || '';
  const rawDaysRemaining = liveSub !== null 
    ? liveSub.days_remaining 
    : Math.max(0, Math.ceil((new Date(user?.trial_ends_at || Date.now()).getTime() - Date.now()) / (1000 * 3600 * 24)));
  const days_remaining = is_trial ? Math.min(3, rawDaysRemaining) : rawDaysRemaining;

  const getBadgeStyles = (status: string) => {
    const normStatus = status.toUpperCase();
    if (normStatus === 'ACTIVE') {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30';
    } else if (normStatus === 'EXPIRED') {
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30';
    } else if (normStatus === 'SUSPENDED') {
      return 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200/50 dark:border-orange-900/30';
    } else {
      // DEFAULT/TRIAL
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30';
    }
  };

  const getCardAccentStyles = (status: string) => {
    const normStatus = status.toUpperCase();
    if (normStatus === 'ACTIVE') {
      return {
        border: 'border-emerald-500',
        iconContainer: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
      };
    } else if (normStatus === 'EXPIRED') {
      return {
        border: 'border-rose-500',
        iconContainer: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
      };
    } else if (normStatus === 'SUSPENDED') {
      return {
        border: 'border-orange-500',
        iconContainer: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
      };
    } else {
      return {
        border: 'border-amber-500',
        iconContainer: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
      };
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-sky-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading business insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <GlassCard className="relative overflow-hidden p-6 sm:p-8" intensity="medium">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50/80 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-sky-300 border border-indigo-100/60 dark:border-indigo-900/30">
              <QuoteFlowLogo size={16} />
              QuoteFlow Portal Active
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Welcome, {user?.fullName || 'Manager'}!
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Welcome back to <span className="font-semibold">{companySettings?.companyName || user?.companyName || 'Corporate Client'}</span> digital workspace.
            </p>
          </div>
          <button 
            onClick={() => onNavigate('quotations')}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 transition-all active:scale-95"
          >
            <span>Create New Quotation</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </GlassCard>

      {/* Subscription Status Card (Requirement 4) */}
      <GlassCard 
        className={`p-5 overflow-hidden relative border-l-4 ${getCardAccentStyles(subscription_status).border}`} 
        intensity="medium"
      >
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-36 w-36 rounded-full bg-indigo-500/5 blur-xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${getCardAccentStyles(subscription_status).iconContainer}`}>
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Subscription Status</span>
                {subscription_status.toUpperCase() === 'ACTIVE' ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-500 border border-emerald-500/20">
                    Active
                  </span>
                ) : (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getBadgeStyles(subscription_status)}`}>
                    {subscription_status}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
                <span className="text-slate-800 dark:text-slate-200">
                  Current Plan: <strong className="font-extrabold text-indigo-600 dark:text-sky-400">{plan}</strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                {subscription_status.toUpperCase() === 'ACTIVE' ? (
                  <>
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" /> Expiry Date: <strong className="font-extrabold text-slate-800 dark:text-slate-200">
                        {expiry_date ? new Date(expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Never'}
                      </strong>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      Renewal Date: <strong className="font-extrabold text-slate-800 dark:text-slate-200">
                        {expiry_date ? new Date(expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Never'}
                      </strong>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      Days Until Expiry: <strong className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {days_remaining} days
                      </strong>
                    </span>
                  </>
                ) : (
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" /> Days Remaining: <strong className="font-extrabold text-amber-600 dark:text-amber-400">
                      {days_remaining} days
                    </strong>
                  </span>
                )}
              </div>
            </div>
          </div>
          {subscription_status.toUpperCase() === 'ACTIVE' ? (
            <button
              onClick={() => onNavigate('billing')}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 shadow-md hover:scale-[1.01]"
            >
              Renew Plan
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => onNavigate('billing')}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer bg-amber-600 text-white hover:bg-amber-500 shadow-md shadow-amber-600/15 hover:scale-[1.01]"
            >
              Upgrade Now
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </GlassCard>

      {/* Stats Overview Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Collected */}
        <GlassCard className="p-5" intensity="low">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Sales Collected</p>
              <p className="mt-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{stats.revenue}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400 border-t border-slate-100/60 pt-3 dark:border-slate-800/40">
            <span>Cumulative invoice payments</span>
          </div>
        </GlassCard>

        {/* Proposals */}
        <GlassCard className="p-5" intensity="low">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Quotations</p>
              <p className="mt-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{stats.activeProposals.split(' ')[0]}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400 border-t border-slate-100/60 pt-3 dark:border-slate-800/40">
            <span>{stats.activeProposals}</span>
          </div>
        </GlassCard>

        {/* Customers */}
        <GlassCard className="p-5" intensity="low">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Corporate Clients</p>
              <p className="mt-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{stats.activeClients.split(' ')[0]}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400 border-t border-slate-100/60 pt-3 dark:border-slate-800/40">
            <span>{stats.activeClients}</span>
          </div>
        </GlassCard>

        {/* Products */}
        <GlassCard className="p-5" intensity="low">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Items Catalog</p>
              <p className="mt-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{stats.activeProducts.split(' ')[0]}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400 border-t border-slate-100/60 pt-3 dark:border-slate-800/40">
            <span>{stats.activeProducts}</span>
          </div>
        </GlassCard>
      </div>

      {/* Quick Business Actions Panel */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5">
          Quick Workflows
        </h3>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <button 
            onClick={() => onNavigate('quotations')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200/60 bg-white/40 hover:bg-white/80 dark:border-slate-800/60 dark:bg-slate-900/30 dark:hover:bg-slate-900/60 transition-all text-center group"
          >
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
              <FileText className="h-5 w-5" />
            </div>
            <span className="mt-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">New Quotation</span>
          </button>

          <button 
            onClick={() => onNavigate('invoices')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200/60 bg-white/40 hover:bg-white/80 dark:border-slate-800/60 dark:bg-slate-900/30 dark:hover:bg-slate-900/60 transition-all text-center group"
          >
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Receipt className="h-5 w-5" />
            </div>
            <span className="mt-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">New Invoice</span>
          </button>

          <button 
            onClick={() => onNavigate('customers')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200/60 bg-white/40 hover:bg-white/80 dark:border-slate-800/60 dark:bg-slate-900/30 dark:hover:bg-slate-900/60 transition-all text-center group"
          >
            <div className="h-9 w-9 rounded-xl bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <span className="mt-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">Add Client</span>
          </button>

          <button 
            onClick={() => onNavigate('products')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200/60 bg-white/40 hover:bg-white/80 dark:border-slate-800/60 dark:bg-slate-900/30 dark:hover:bg-slate-900/60 transition-all text-center group"
          >
            <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Package className="h-5 w-5" />
            </div>
            <span className="mt-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">Add Product</span>
          </button>

          <button 
            onClick={() => onNavigate('reports')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200/60 bg-white/40 hover:bg-white/80 dark:border-slate-800/60 dark:bg-slate-900/30 dark:hover:bg-slate-900/60 transition-all text-center col-span-2 sm:col-span-1 group"
          >
            <div className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="mt-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">View Reports</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Activity Ledger & Company Profile */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Invoices & Quotations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Invoices Ledger */}
          <GlassCard className="p-6" intensity="medium">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-500" />
                Latest Accounts Ledger
              </h3>
              <button 
                onClick={() => onNavigate('invoices')}
                className="text-xs font-semibold text-indigo-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>View all ledger</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {recentInvoices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                <p className="text-xs text-slate-400 dark:text-slate-500">No invoices generated yet.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {recentInvoices.map((inv) => (
                  <div 
                    key={inv.id}
                    onClick={() => onNavigate('invoices')}
                    className="flex items-center justify-between rounded-xl border border-slate-100/60 bg-white/20 p-3.5 hover:bg-white/40 dark:border-slate-800/40 dark:bg-slate-900/10 dark:hover:bg-slate-900/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Receipt className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{inv.invoiceNumber}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{inv.customerName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">Rs. {inv.grandTotal.toLocaleString('en-PK')}</span>
                      <div className="mt-1 flex justify-end">
                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          String(inv.status).toLowerCase() === 'paid' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                            : String(inv.status).toLowerCase() === 'partial'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Recent Quotations */}
          <GlassCard className="p-6" intensity="medium">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                Latest Proposals Sent
              </h3>
              <button 
                onClick={() => onNavigate('quotations')}
                className="text-xs font-semibold text-indigo-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>View all proposals</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {recentQuotations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                <p className="text-xs text-slate-400 dark:text-slate-500">No quotations generated yet.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {recentQuotations.map((quote) => (
                  <div 
                    key={quote.id}
                    onClick={() => onNavigate('quotations')}
                    className="flex items-center justify-between rounded-xl border border-slate-100/60 bg-white/20 p-3.5 hover:bg-white/40 dark:border-slate-800/40 dark:bg-slate-900/10 dark:hover:bg-slate-900/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-sky-400">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{quote.quoteNumber}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{quote.customerName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">Rs. {quote.grandTotal.toLocaleString('en-PK')}</span>
                      <div className="mt-1 flex justify-end">
                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          quote.status === 'Accepted' || quote.status === 'Converted'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                            : quote.status === 'Sent'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {quote.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right side: Active Corporate Identity Profile */}
        <div>
          <GlassCard className="p-6" intensity="medium">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-indigo-500" />
              Company Identity
            </h3>

            {companySettings ? (
              <div className="space-y-4">
                {companySettings.logoUrl && (
                  <div className="flex justify-center pb-2">
                    <img 
                      src={companySettings.logoUrl} 
                      alt="Company Logo" 
                      className="h-14 object-contain rounded-lg max-w-full"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                    {companySettings.companyName}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    NTN: {companySettings.taxNumber || 'Not Configured'}
                  </p>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{companySettings.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate">{companySettings.email || 'N/A'}</span>
                  </div>
                  {companySettings.website && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Globe className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">{companySettings.website}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span className="leading-tight">{companySettings.address || 'N/A'}</span>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-900/60 space-y-2">
                  <h5 className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
                    Active Bank Account
                  </h5>
                  <div className="text-[11px] space-y-1 text-slate-500 dark:text-slate-400 leading-normal">
                    <p className="font-semibold text-slate-800 dark:text-slate-300">{companySettings.bankName || 'Standard Chartered Bank'}</p>
                    <p>Title: <span className="font-medium text-slate-700 dark:text-slate-300">{companySettings.accountTitle || 'N/A'}</span></p>
                    <p className="font-mono text-[10px] tracking-wide">Account: {companySettings.accountNumber || 'N/A'}</p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('settings')}
                  className="w-full mt-2 inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Edit Company Profile
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Loading settings...</p>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
