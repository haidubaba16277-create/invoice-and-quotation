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
    return () => {
      active = false;
    };
  }, []);

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
              Assalam-o-Alaikum, {user?.fullName || 'Manager'}!
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
                    <p className="font-semibold text-slate-800 dark:text-slate-300">{companySettings.bankName || 'HBL Pakistan'}</p>
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
