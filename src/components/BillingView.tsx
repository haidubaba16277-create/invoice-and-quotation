import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ArrowLeft, 
  Check, 
  HelpCircle, 
  Calendar, 
  AlertCircle, 
  History, 
  Download, 
  Coins, 
  Lock, 
  ShieldCheck, 
  Smartphone,
  ChevronRight,
  Info,
  Loader2
} from 'lucide-react';
import { UserProfile } from '../types/auth';
import { authService } from '../services/authService';
import { GlassCard } from './GlassCard';
import { QuoteFlowLogo } from './QuoteFlowLogo';
import { paymentService } from '../services/paymentService';
import { PaymentSubmission, PaymentMethod } from '../types/payment';
import { dataService } from '../services/dataService';
import { PLAN_LIMITS } from '../lib/subscription';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface BillingViewProps {
  user: UserProfile | null;
  onNavigate: (view: string) => void;
  onRefreshUser: () => void;
}

export function BillingView({ user, onNavigate, onRefreshUser }: BillingViewProps) {
  const [selectedPlan, setSelectedPlan] = useState<'Professional' | 'Business' | 'Enterprise'>('Business');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Real database payment states
  const [payments, setPayments] = useState<PaymentSubmission[]>([]);
  const [transactionId, setTransactionId] = useState('');
  const [amountInput, setAmountInput] = useState('4500'); // prefilled based on plan
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [screenshotBase64, setScreenshotBase64] = useState('');
  const [screenshotName, setScreenshotName] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const [liveSub, setLiveSub] = useState<{
    subscription_status: string;
    plan: string;
    expiry_date: string;
    start_date: string;
    days_remaining: number;
    trial_status: string;
    trial_ends_at: string | null;
  } | null>(null);

  const loadPayments = async () => {
    if (!user) return;
    try {
      const data = await paymentService.getPaymentsForUser(user.id);
      setPayments(data);
    } catch (err) {
      console.error('Failed to load user payments:', err);
    }
  };

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
          const [profileRes, subRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
            supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle()
          ]);

          if (profileRes.data) {
            dbStatus = profileRes.data.subscription_status || dbStatus;
            dbPlan = profileRes.data.current_plan || dbPlan;
            dbTrialStatus = profileRes.data.trial_status || dbTrialStatus;
          }

          if (subRes.data) {
            dbStatus = subRes.data.status || dbStatus;
            dbPlan = subRes.data.plan || dbPlan;
            dbStartDate = subRes.data.start_date || dbStartDate;
            dbExpiryDate = subRes.data.expiry_date || dbExpiryDate;
            if (subRes.data.expiry_date) {
              dbTrialEndsAt = new Date(subRes.data.expiry_date).toISOString();
            }
          }
        }

        // Reconcile with local storage and payment records as well
        const cachedUsersStr = localStorage.getItem('quoteflow_admin_users') || '[]';
        const users = JSON.parse(cachedUsersStr);
        const matchedUser = users.find((u: any) => u.id === user.id || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()));
        if (matchedUser) {
          if (matchedUser.subscription_status === 'Active' || matchedUser.status === 'active') {
            dbStatus = 'Active';
            dbPlan = matchedUser.plan || dbPlan;
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
          dbPlan = matchedSub.plan || dbPlan;
          dbStartDate = matchedSub.startsAt || dbStartDate;
          dbExpiryDate = matchedSub.expiresAt || dbExpiryDate;
        }

        // Also check if any payment for this user was verified
        const cachedPaymentsStr = localStorage.getItem('quoteflow_payments') || '[]';
        const localPayList = JSON.parse(cachedPaymentsStr);
        const verifiedPay = localPayList.find((p: any) => 
          (p.userId === user.id || (matchedUser && p.userId === matchedUser.id) || (user.email && p.userName && p.userName.toLowerCase() === user.fullName?.toLowerCase())) && 
          (p.status === 'Verified' || p.status === 'Paid')
        );
        if (verifiedPay) {
          dbStatus = 'Active';
          if (verifiedPay.plan && verifiedPay.plan !== 'Trial') {
            dbPlan = verifiedPay.plan;
          }
        }

        // Calculate days remaining from expiry date if active, or trial_ends_at if trial
        let daysRemaining = 0;
        const targetDateStr = dbExpiryDate || dbTrialEndsAt || user?.trial_ends_at;
        if (targetDateStr) {
          const targetTime = new Date(targetDateStr).getTime();
          const todayTime = new Date().getTime();
          daysRemaining = Math.max(0, Math.ceil((targetTime - todayTime) / (1000 * 3600 * 24)));
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
        console.error('Failed to query live subscription inside BillingView:', err);
      }
    }

    fetchLiveSubscription();
    loadPayments();
    const intervalId = setInterval(() => {
      fetchLiveSubscription();
      loadPayments();
    }, 3000);

    const handleSubUpdated = () => {
      fetchLiveSubscription();
      loadPayments();
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

  // Live database entity counts
  const [counts, setCounts] = useState({
    customers: 0,
    products: 0,
    quotations: 0,
    invoices: 0
  });

  const loadCounts = async () => {
    try {
      const [custs, prods, quotes, invs] = await Promise.all([
        dataService.getCustomers(),
        dataService.getProducts(),
        dataService.getQuotations(),
        dataService.getInvoices()
      ]);
      const currentMonth = new Date().toISOString().substring(0, 7);
      const quotesThisMonth = quotes.filter(q => (q.createdAt || q.issueDate || '').startsWith(currentMonth)).length;
      const invsThisMonth = invs.filter(i => (i.createdAt || i.date || '').startsWith(currentMonth)).length;

      setCounts({
        customers: custs.length,
        products: prods.length,
        quotations: quotesThisMonth,
        invoices: invsThisMonth
      });
    } catch (err) {
      console.error('Failed to load counts for billing page:', err);
    }
  };

  // Sync amount with plan
  useEffect(() => {
    const price = 
      selectedPlan === 'Professional' ? '1500' : 
      selectedPlan === 'Business' ? '3000' : 
      selectedPlan === 'Enterprise' ? '5000' : '3000';
    setAmountInput(price);
  }, [selectedPlan]);

  useEffect(() => {
    loadPayments();
    loadCounts();
  }, [user]);

  // File upload drag & drop handlers
  const handleFileChange = (file: File) => {
    if (!file) return;
    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!transactionId.trim()) {
      setErrorMsg('Please enter a valid Transaction ID.');
      return;
    }
    if (!screenshotBase64) {
      setErrorMsg('Please upload a screenshot of your payment receipt as proof.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await paymentService.submitPayment({
        transactionId: transactionId.trim(),
        userId: user.id,
        userName: user.fullName,
        companyName: user.companyName,
        plan: selectedPlan,
        amount: parseFloat(amountInput),
        paymentDate: paymentDate,
        screenshot: screenshotBase64,
        notes: `${paymentMethod} Transfer. Notes: ${notesInput.trim()}`
      });

      setSuccessMsg('Payment submission logged successfully! Our team will verify and activate your subscription shortly.');
      setTransactionId('');
      setScreenshotBase64('');
      setScreenshotName('');
      setNotesInput('');
      
      // Reload history
      await loadPayments();
      onRefreshUser();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit payment.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = (txn: PaymentSubmission) => {
    const receiptContent = `
==================================================
              QUOTEFLOW PRO - RECEIPT
==================================================
Receipt ID:     ${txn.id || txn.transactionId}
Date:           ${txn.paymentDate}
Customer Name:  ${user?.fullName || 'Manager'}
Company Name:   ${user?.companyName || 'My Company'}
Email Address:  ${user?.email || ''}

--------------------------------------------------
TRANSACTION DETAILS:
--------------------------------------------------
Plan Subscribed:  ${txn.plan} Plan
Amount Charged:   ${txn.amount} PKR
Payment Date:     ${txn.paymentDate}
Payment Status:   ${txn.status}

==================================================
Thank you for subscribing to QuoteFlow Pro.
For any issues, contact support@quoteflow.com
==================================================
`;
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt-${txn.id || txn.transactionId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const subscription_status = liveSub?.subscription_status || user?.subscription_status || 'Trial';
  const plan = liveSub?.plan || user?.selected_plan || user?.plan || 'Trial';
  const isTrial = subscription_status.toUpperCase() === 'TRIAL' || plan.toUpperCase() === 'TRIAL';
  const trialEndsAt = liveSub?.expiry_date 
    ? new Date(liveSub.expiry_date) 
    : (user?.trial_ends_at ? new Date(user.trial_ends_at) : new Date(Date.now() + 3 * 24 * 3600 * 1000));
  const rawDaysRemaining = liveSub !== null 
    ? liveSub.days_remaining 
    : Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 3600 * 24)));
  const daysRemaining = isTrial ? Math.min(3, rawDaysRemaining) : rawDaysRemaining;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors uppercase tracking-wider mb-2 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Workspace
          </button>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Billing & Subscription Management</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitor limits, manage subscription plans, and process secure payments instantly.
          </p>
        </div>
      </div>

      {/* Main Stats Summary Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Current Plan Card */}
        <GlassCard className="p-5 relative overflow-hidden" intensity="low">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Plan</p>
          <p className="mt-2.5 text-2xl font-black text-indigo-600 dark:text-sky-400">
            {plan}
          </p>
          <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            isTrial 
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30' 
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30'
          }`}>
            Status: {subscription_status}
          </span>
        </GlassCard>

        {/* Selected Plan Card */}
        <GlassCard className="p-5" intensity="low">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Selected Plan Tier</p>
          <p className="mt-2.5 text-2xl font-black text-slate-900 dark:text-white">
            {plan}
          </p>
          <span className="mt-2 inline-flex items-center text-xs font-medium text-slate-400">
            Base platform features enabled
          </span>
        </GlassCard>

        {/* Trial Remaining / Renewal Date Card */}
        <GlassCard className="p-5" intensity="low">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {isTrial ? 'Trial Remaining' : 'Renewal Date'}
          </p>
          <p className="mt-2.5 text-2xl font-black text-slate-900 dark:text-white">
            {isTrial ? `${daysRemaining} Days` : trialEndsAt.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
          <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            Ends {trialEndsAt.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </GlassCard>
      </div>

      {/* Main Billing Workspace Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left 2 Columns: Payment Processing and Upgrade Panel */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6 space-y-5" intensity="medium">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Upgrade or Renew Your Workspace Plan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Instant activation. Select plan tier & payment method below.</p>
                </div>
              </div>
            </div>

            {/* Notification messages */}
            {successMsg && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 dark:border-emerald-950/30 dark:bg-emerald-950/20 dark:text-emerald-400">
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:border-rose-950/30 dark:bg-rose-950/20 dark:text-rose-400">
                {errorMsg}
              </div>
            )}

            {/* Step 1: Select Plan Tier */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Step 1: Choose Your Premium Tier
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { name: 'Professional', price: '1,500 PKR', desc: 'Up to 500 customers, 1000 products, 500 quotes & invoices/mo', recommended: false },
                  { name: 'Business', price: '3,000 PKR', desc: 'Up to 5000 customers, 10000 products, unlimited quotes & invoices', recommended: true },
                  { name: 'Enterprise', price: '5,000 PKR', desc: 'Unlimited customers, products, quotes & invoices, custom support', recommended: false }
                ].map((tier) => (
                  <button
                    key={tier.name}
                    type="button"
                    onClick={() => setSelectedPlan(tier.name as any)}
                    className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all hover:border-indigo-500/50 cursor-pointer ${
                      selectedPlan === tier.name
                        ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/20'
                    }`}
                  >
                    {tier.recommended && (
                      <span className="absolute -top-2.5 right-3 bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                        <Check className="h-2.5 w-2.5" /> Recommended
                      </span>
                    )}
                    <div className="flex justify-between w-full items-center mb-1">
                      <span className="font-extrabold text-[10px] text-slate-900 dark:text-white uppercase truncate">{tier.name}</span>
                      {selectedPlan === tier.name && <Check className="h-4 w-4 text-indigo-500 shrink-0" />}
                    </div>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{tier.price}<span className="text-[9px] text-slate-400 font-semibold font-sans">/mo</span></span>
                    <p className="mt-1.5 text-[9px] text-slate-400 leading-relaxed line-clamp-3">{tier.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Payment Provider Selection - Localized Gateways */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Step 2: Choose Local Deposit Channel
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 dark:text-emerald-400">
                  <Lock className="h-3 w-3" /> Secure Verification
                </span>
              </div>
              
              <div className="grid gap-2.5 sm:grid-cols-3">
                {[
                  { id: 'Bank Transfer', name: 'Bank Wire', desc: 'Direct IBAN Deposit' },
                  { id: 'JazzCash', name: 'JazzCash Wallet', desc: 'Mobile till code / Account' },
                  { id: 'Easypaisa', name: 'Easypaisa Wallet', desc: 'Instant Wallet Transfer' }
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      paymentMethod === method.id
                        ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/20'
                    }`}
                  >
                    <CreditCard className={`h-5 w-5 mb-1.5 ${paymentMethod === method.id ? 'text-indigo-500' : 'text-slate-400'}`} />
                    <span className="font-bold text-[10px] text-slate-950 dark:text-white leading-none">{method.name}</span>
                    <span className="text-[8px] text-slate-400 mt-1 leading-none">{method.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Deposit Channel Instructions */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                How to Pay via {paymentMethod}
              </h4>
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {paymentMethod === 'Bank Transfer' && (
                  <div className="space-y-1">
                    <p>Bhai, please transfer the exact amount of <strong className="text-indigo-600 dark:text-sky-400 font-extrabold">{parseFloat(amountInput).toLocaleString()} PKR</strong> to our official bank account:</p>
                    <ul className="list-disc list-inside space-y-0.5 pl-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      <li><strong>Bank Name:</strong> Meezan Bank Limited</li>
                      <li><strong>Account Title:</strong> Muhammad Tariq Qureshi</li>
                      <li><strong>Account Number:</strong> 0136 0102570108</li>
                    </ul>
                  </div>
                )}
                {paymentMethod === 'JazzCash' && (
                  <div className="space-y-1 py-1">
                    <p className="text-slate-500 dark:text-slate-400 font-medium italic">
                      JazzCash deposit details are currently blank / temporarily unavailable. Please use Bank Wire or Easypaisa Wallet.
                    </p>
                  </div>
                )}
                {paymentMethod === 'Easypaisa' && (
                  <div className="space-y-1">
                    <p>Bhai, please transfer <strong className="text-indigo-600 dark:text-sky-400 font-extrabold">{parseFloat(amountInput).toLocaleString()} PKR</strong> using your Easypaisa app:</p>
                    <ul className="list-disc list-inside space-y-0.5 pl-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      <li><strong>Mobile Account:</strong> 0321-2373713</li>
                      <li><strong>Account Title:</strong> Muhammad Tariq Qureshi (QuoteFlow Pro Owner)</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Submission form with file upload */}
            <form onSubmit={handleFormSubmit} className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                  Step 3: Submit Receipt & Transaction Details
                </h4>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Transaction ID / Reference Token *
                  </label>
                  <input
                    type="text"
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 109384918491 or wire-ref"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white/40 px-3 text-xs font-semibold focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Deposited Amount (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="e.g. 4500"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white/40 px-3 text-xs font-semibold focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white/40 px-3 text-xs font-semibold focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Payment Notes / Sender Account Details
                  </label>
                  <input
                    type="text"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="e.g. Sent from account 03451234567"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white/40 px-3 text-xs font-semibold focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Drag & Drop File Upload Receipt Screenshot */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Upload Payment Screenshot / Transfer Receipt Proof *
                </label>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                    dragActive 
                      ? 'border-indigo-500 bg-indigo-500/10' 
                      : 'border-slate-200 hover:border-slate-300 bg-white/20 dark:border-slate-800 dark:hover:border-slate-700 dark:bg-slate-900/20'
                  }`}
                  onClick={() => document.getElementById('screenshot-file')?.click()}
                >
                  <input
                    id="screenshot-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                  />
                  {screenshotBase64 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center text-emerald-500 font-bold gap-1 text-xs">
                        <Check className="h-4 w-4" /> Screenshot Proof Selected
                      </div>
                      <p className="text-[10px] text-slate-400 max-w-xs truncate mx-auto">{screenshotName}</p>
                      <img 
                        src={screenshotBase64} 
                        alt="Preview" 
                        referrerPolicy="no-referrer"
                        className="max-h-24 mx-auto rounded border border-slate-100 dark:border-slate-800 shadow-xs mt-2" 
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Download className="h-6 w-6 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Drag and drop your transaction screenshot here, or <span className="text-indigo-500 hover:underline">browse files</span>
                      </p>
                      <p className="text-[10px] text-slate-400">PNG, JPG, JPEG up to 5MB are supported</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-sky-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:brightness-105 active:scale-[0.99] disabled:opacity-55 disabled:pointer-events-none transition-all cursor-pointer shadow-lg shadow-indigo-500/15 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Submitting payment proof securely...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Payment Proof for Verification</span>
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </GlassCard>

          {/* Payment History Card */}
          <GlassCard className="p-6" intensity="medium">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Payment History</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Download receipt vouchers for tax logs.</p>
                </div>
              </div>
            </div>

            {/* Transaction List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-2">Invoice ID</th>
                    <th className="py-3 px-2">Date</th>
                    <th className="py-3 px-2">Plan</th>
                    <th className="py-3 px-2">Method</th>
                    <th className="py-3 px-2">Amount</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-medium divide-y divide-slate-100/40 dark:divide-slate-800/20">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                        No payment submissions found. Fill out Step 3 above to upgrade your workspace.
                      </td>
                    </tr>
                  ) : (
                    payments.map((txn) => (
                      <tr key={txn.id || txn.transactionId} className="hover:bg-slate-500/5 transition-colors">
                        <td className="py-3 px-2 font-mono text-slate-700 dark:text-slate-300 font-bold max-w-[120px] truncate">{txn.id || txn.transactionId}</td>
                        <td className="py-3 px-2 text-slate-400">{txn.paymentDate}</td>
                        <td className="py-3 px-2 text-slate-800 dark:text-slate-200">{txn.plan} Plan</td>
                        <td className="py-3 px-2">
                          <span className="font-semibold text-slate-500 dark:text-slate-400">
                            {txn.notes?.split(' Transfer')[0] || 'Bank Deposit'}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-mono text-slate-800 dark:text-slate-200 font-bold">{txn.amount.toLocaleString()} PKR</td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            txn.status === 'Pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                              : txn.status === 'Verified'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}>
                            {txn.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button
                            onClick={() => handleDownloadReceipt(txn)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-500 dark:text-sky-400 dark:hover:text-sky-300 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" /> Download
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* Right 1 Column: Platform limits & details */}
        <div className="space-y-6">
          {/* Active Platform Rules Card */}
          <GlassCard className="p-5 space-y-4" intensity="medium">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-sky-400">Current Plan Limits</h4>
            
            <div className="space-y-3.5">
              {[
                { 
                  name: 'Cloud Storage Usage', 
                  display: isTrial ? '0.8 GB / 2 GB' : user?.selected_plan === 'Starter' ? '1.1 GB / 2 GB' : user?.selected_plan === 'Professional' ? '2.4 GB / 10 GB' : user?.selected_plan === 'Business' ? '5.1 GB / 50 GB' : '12.8 GB / Unlimited', 
                  pct: isTrial ? 40 : user?.selected_plan === 'Starter' ? 55 : user?.selected_plan === 'Professional' ? 24 : user?.selected_plan === 'Business' ? 10 : 5 
                },
                { 
                  name: 'Customer Profiles', 
                  display: `${counts.customers} / ${PLAN_LIMITS[user?.plan || user?.selected_plan || 'Trial']?.customers === Infinity ? 'Unlimited' : PLAN_LIMITS[user?.plan || user?.selected_plan || 'Trial']?.customers || 10}`, 
                  pct: PLAN_LIMITS[user?.plan || user?.selected_plan || 'Trial']?.customers === Infinity ? 0 : Math.min(100, (counts.customers / (PLAN_LIMITS[user?.plan || user?.selected_plan || 'Trial']?.customers || 10)) * 100) 
                },
                { 
                  name: 'Product/SKU Records', 
                  display: `${counts.products} / ${PLAN_LIMITS[user?.plan || user?.selected_plan || 'Trial']?.products === Infinity ? 'Unlimited' : PLAN_LIMITS[user?.plan || user?.selected_plan || 'Trial']?.products || 20}`, 
                  pct: PLAN_LIMITS[user?.plan || user?.selected_plan || 'Trial']?.products === Infinity ? 0 : Math.min(100, (counts.products / (PLAN_LIMITS[user?.plan || user?.selected_plan || 'Trial']?.products || 20)) * 100) 
                },
                { 
                  name: 'Monthly Quotations', 
                  display: `${counts.quotations} / ${PLAN_LIMITS[user?.plan || user?.selected_plan || 'Trial']?.quotations === Infinity ? 'Unlimited' : PLAN_LIMITS[user?.plan || user?.selected_plan || 'Trial']?.quotations || 15}`, 
                  pct: PLAN_LIMITS[user?.plan || user?.selected_plan || 'Trial']?.quotations === Infinity ? 0 : Math.min(100, (counts.quotations / (PLAN_LIMITS[user?.plan || user?.selected_plan || 'Trial']?.quotations || 15)) * 100) 
                },
                { 
                  name: 'Monthly Invoices', 
                  display: `${counts.invoices} / ${PLAN_LIMITS[user?.plan || user?.selected_plan || 'Trial']?.invoices === Infinity ? 'Unlimited' : PLAN_LIMITS[user?.plan || user?.selected_plan || 'Trial']?.invoices || 10}`, 
                  pct: PLAN_LIMITS[user?.plan || user?.selected_plan || 'Trial']?.invoices === Infinity ? 0 : Math.min(100, (counts.invoices / (PLAN_LIMITS[user?.plan || user?.selected_plan || 'Trial']?.invoices || 10)) * 100) 
                }
              ].map((lim) => (
                <div key={lim.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">{lim.name}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">{lim.display}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${lim.pct >= 90 ? 'bg-rose-500 animate-pulse' : lim.pct >= 75 ? 'bg-amber-500' : 'bg-indigo-500'}`} 
                      style={{ width: `${lim.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Secure Workspace Badges */}
          <GlassCard className="p-5 text-center space-y-3" intensity="low">
            <ShieldCheck className="h-8 w-8 text-indigo-500 mx-auto" />
            <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Secured Platform Protection</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              All transactions are secured by TLS 1.3 encryption. Bank wire details or wallet callbacks are verified through compliance algorithms automatically.
            </p>
          </GlassCard>
        </div>

      </div>
    </div>
  );
}
