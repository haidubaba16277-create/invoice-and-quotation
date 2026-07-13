import React, { useEffect, useState, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  ArrowUpDown, 
  Eye, 
  Trash2, 
  Printer, 
  Share2, 
  ArrowLeft, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronLeft, 
  Copy, 
  ExternalLink,
  MessageSquare,
  BadgeAlert,
  Coins,
  Check,
  Calendar,
  Building2,
  Scale
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { dataService } from '../services/dataService';
import { Invoice, Customer, CompanySettings, QuoteItem } from '../types/business';

interface InvoicesViewProps {
  isSupabaseConnected: boolean;
}

type SortField = 'invoiceNumber' | 'grandTotal' | 'date';
type SortOrder = 'asc' | 'desc';

export function InvoicesView({ isSupabaseConnected }: InvoicesViewProps) {
  // Application Data States
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  
  // Loading & View States
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'preview'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Interactive Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Active view invoice state
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  // Status update modal states
  const [statusInvoice, setStatusInvoice] = useState<Invoice | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<'Pending' | 'Partial' | 'Paid'>('Pending');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [statusLoading, setStatusLoading] = useState(false);

  // Delete Confirmation Modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Share Modal States
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareInvoice, setShareInvoice] = useState<Invoice | null>(null);

  const itemsPerPage = 6;

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [invoicesData, customersData, settingsData] = await Promise.all([
        dataService.getInvoices(),
        dataService.getCustomers(),
        dataService.getCompanySettings()
      ]);
      setInvoices(invoicesData);
      setCustomers(customersData);
      setCompanySettings(settingsData);
    } catch (err) {
      console.error('Failed to load invoice register:', err);
      showToast('Error synchronising invoice datasets.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sort and Filter logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const filteredAndSortedInvoices = useMemo(() => {
    let result = [...invoices];

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter(inv => inv.paymentStatus === statusFilter);
    }

    // Search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        inv =>
          inv.invoiceNumber.toLowerCase().includes(term) ||
          inv.customerName.toLowerCase().includes(term) ||
          (inv.companyName && inv.companyName.toLowerCase().includes(term)) ||
          (inv.notes && inv.notes.toLowerCase().includes(term))
      );
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'invoiceNumber') {
        comparison = a.invoiceNumber.localeCompare(b.invoiceNumber);
      } else if (sortField === 'grandTotal') {
        comparison = a.grandTotal - b.grandTotal;
      } else if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [invoices, statusFilter, searchTerm, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedInvoices.slice(start, start + itemsPerPage);
  }, [filteredAndSortedInvoices, currentPage]);

  const triggerDelete = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedInvoice) return;
    setDeleteLoading(true);
    try {
      await dataService.deleteInvoice(selectedInvoice.id);
      showToast(`Invoice ${selectedInvoice.invoiceNumber} has been successfully deleted.`, 'success');
      setIsDeleteModalOpen(false);
      setSelectedInvoice(null);
      loadData();
    } catch (err: any) {
      console.error('Failed to delete invoice:', err);
      showToast('Could not delete invoice record.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Status modification triggers
  const openStatusEditor = (inv: Invoice) => {
    setStatusInvoice(inv);
    setNewStatus(inv.paymentStatus || 'Pending');
    setAmountPaid(inv.amountPaid || 0);
    setIsStatusModalOpen(true);
  };

  const handleSaveStatusUpdate = async () => {
    if (!statusInvoice) return;
    setStatusLoading(true);
    try {
      const updatedAmountPaid = newStatus === 'Paid' 
        ? statusInvoice.grandTotal 
        : newStatus === 'Pending' 
          ? 0 
          : amountPaid;

      const payload: Invoice = {
        ...statusInvoice,
        paymentStatus: newStatus,
        status: newStatus, // Sync duplicate status tags
        amountPaid: updatedAmountPaid,
        notes: statusInvoice.notes || ''
      };

      await dataService.saveInvoice(payload);
      showToast(`Invoice ${statusInvoice.invoiceNumber} payment details updated.`, 'success');
      setIsStatusModalOpen(false);
      setStatusInvoice(null);
      loadData();
      
      // If active invoice is open, sync it
      if (activeInvoice && activeInvoice.id === statusInvoice.id) {
        setActiveInvoice(payload);
      }
    } catch (err) {
      console.error('Failed to save status update:', err);
      showToast('Failed to update invoice status.', 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  // Sharing utilities
  const openShareMenu = (inv: Invoice) => {
    setShareInvoice(inv);
    setIsShareModalOpen(true);
  };

  const handleCopyLink = () => {
    if (!shareInvoice) return;
    // Generate beautiful public proposal view query link
    const shareUrl = `${window.location.origin}/?q=${shareInvoice.quoteNumber}`;
    navigator.clipboard.writeText(shareUrl);
    showToast('Copied public proposal share link to clipboard!', 'success');
  };

  const handleWhatsAppShare = () => {
    if (!shareInvoice) return;
    const shareUrl = `${window.location.origin}/?q=${shareInvoice.quoteNumber}`;
    const company = companySettings?.companyName || 'QuoteFlow Merchant';
    
    // Formulate pre-filled customized, highly professional text message template
    const message = `Dear *${shareInvoice.customerName}*,\n\nWe have generated *Invoice ${shareInvoice.invoiceNumber}* under quotation ${shareInvoice.quoteNumber} for your approval.\n\n*Invoice Summary:*\n• Subtotal: Rs. ${shareInvoice.subtotal.toLocaleString()}\n• Grand Total: *Rs. ${shareInvoice.grandTotal.toLocaleString()}*\n• Payment Status: ${shareInvoice.paymentStatus}\n• Due Date: ${new Date(shareInvoice.dueDate).toLocaleDateString()}\n\nYou can inspect the online proposal details and place sign-offs directly here:\n${shareUrl}\n\nThank you for choosing *${company}*!`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  // Preview helper card
  const activeCustomerCard = useMemo(() => {
    if (!activeInvoice?.customerId) return null;
    return customers.find(c => c.id === activeInvoice.customerId);
  }, [activeInvoice?.customerId, customers]);

  return (
    <div className="space-y-6">
      
      {/* Dynamic Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-bold shadow-lg animate-slide-in ${
          toast.type === 'success'
            ? 'border-emerald-100 bg-emerald-50 text-emerald-800 dark:border-emerald-950/20 dark:bg-emerald-950/30 dark:text-emerald-400'
            : 'border-rose-100 bg-rose-50 text-rose-800 dark:border-rose-950/20 dark:bg-rose-950/30 dark:text-rose-400'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* VIEW 1: INVOICE MAIN LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="h-5 w-5 text-indigo-500 dark:text-sky-400 animate-pulse" />
                SaaS Invoicing Module
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Monitor invoice lifecycles, accept payments, track partial dues, and share professional printable billing sheets.
              </p>
            </div>
          </div>

          {/* Quick status tabs / metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'All Invoices', value: 'All', count: invoices.length, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-100 dark:border-indigo-950/40 dark:text-sky-400' },
              { label: 'Pending Dues', value: 'Pending', count: invoices.filter(i => i.paymentStatus === 'Pending').length, color: 'bg-amber-500/10 text-amber-600 border-amber-100 dark:border-amber-900 dark:text-amber-400' },
              { label: 'Partially Paid', value: 'Partial', count: invoices.filter(i => i.paymentStatus === 'Partial').length, color: 'bg-blue-500/10 text-blue-600 border-blue-100 dark:border-blue-950/40 dark:text-blue-400' },
              { label: 'Settled Paid', value: 'Paid', count: invoices.filter(i => i.paymentStatus === 'Paid').length, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-100 dark:border-emerald-950/40 dark:text-emerald-400' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); setCurrentPage(1); }}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                  statusFilter === tab.value
                    ? 'border-indigo-500 bg-white shadow-xs ring-1 ring-indigo-500/10 dark:bg-slate-900 dark:border-sky-500'
                    : 'bg-white/60 hover:bg-white border-slate-200 dark:bg-slate-950/50 dark:border-slate-800 dark:hover:bg-slate-900'
                }`}
              >
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{tab.label}</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{tab.count}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${tab.color}`}>
                  Live
                </span>
              </button>
            ))}
          </div>

          {/* Filters card */}
          <GlassCard className="p-4" intensity="low">
            <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
              
              {/* Search bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by invoice #, client name, company, notes..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full rounded-xl border border-slate-200 bg-white/50 pl-9.5 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all"
                />
                {searchTerm && (
                  <button 
                    type="button" 
                    onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Sorting triggers */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">Sort By:</span>
                
                <button
                  onClick={() => handleSort('invoiceNumber')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap ${
                    sortField === 'invoiceNumber'
                      ? 'bg-indigo-50/50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-sky-400'
                      : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  Invoice No
                  <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'invoiceNumber' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                </button>

                <button
                  onClick={() => handleSort('grandTotal')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap ${
                    sortField === 'grandTotal'
                      ? 'bg-indigo-50/50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-sky-400'
                      : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  Grand Total
                  <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'grandTotal' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                </button>

                <button
                  onClick={() => handleSort('date')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap ${
                    sortField === 'date'
                      ? 'bg-indigo-50/50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-sky-400'
                      : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  Issue Date
                  <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'date' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                </button>
              </div>

            </div>
          </GlassCard>

          {/* Invoices List Content */}
          {loading ? (
            <div className="flex h-96 items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-sky-400" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">Synchronising Invoice Registers...</p>
              </div>
            </div>
          ) : invoices.length === 0 ? (
            <GlassCard className="p-12 text-center" intensity="medium">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-sky-400 mb-4 animate-bounce">
                <Receipt className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">No Active Invoices</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed font-sans">
                You haven't converted any estimates into invoices. To get started, head to the <strong>Quotations Register</strong>, select an Accepted quotation, and click <strong>Convert to Invoice</strong>.
              </p>
            </GlassCard>
          ) : filteredAndSortedInvoices.length === 0 ? (
            <GlassCard className="p-12 text-center" intensity="medium">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">No invoices match the filter search query "{searchTerm}"</p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('All');
                }}
                className="mt-3 text-xs text-indigo-600 dark:text-sky-400 hover:underline font-bold"
              >
                Reset Search Filters
              </button>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              <GlassCard className="overflow-hidden border border-slate-200/60 dark:border-slate-800/60" intensity="medium">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/80 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-950/40">
                        <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Invoice #</th>
                        <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Recipient Customer</th>
                        <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Issue / Due Date</th>
                        <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Quotation Ref</th>
                        <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Valuation</th>
                        <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Settled Dues</th>
                        <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Status</th>
                        <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {paginatedInvoices.map((inv) => (
                        <tr key={inv.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          
                          {/* Invoice Number */}
                          <td className="px-5 py-4 text-xs font-mono font-black text-slate-800 dark:text-slate-200">
                            <span className="flex items-center gap-1.5">
                              <Receipt className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              {inv.invoiceNumber}
                            </span>
                          </td>

                          {/* Recipient Customer */}
                          <td className="px-5 py-4 max-w-[200px]">
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                {inv.customerName}
                              </span>
                              {inv.companyName && inv.companyName !== 'N/A' && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                                  {inv.companyName}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Date Details */}
                          <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400 font-mono">
                            <div className="space-y-0.5">
                              <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                Iss: {new Date(inv.date).toLocaleDateString()}
                              </span>
                              <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                Due: {new Date(inv.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          </td>

                          {/* Quotation Reference */}
                          <td className="px-5 py-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                            {inv.quoteNumber || 'Direct'}
                          </td>

                          {/* Grand Total */}
                          <td className="px-5 py-4 text-xs font-bold text-indigo-600 dark:text-sky-400 font-mono">
                            Rs. {inv.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Amount Paid / Settled */}
                          <td className="px-5 py-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                            <div className="space-y-0.5">
                              <span className="block font-bold">Rs. {(inv.amountPaid || 0).toLocaleString()}</span>
                              {inv.grandTotal - (inv.amountPaid || 0) > 0 && (
                                <span className="block text-[9px] text-rose-500 font-semibold">
                                  Bal: Rs. {(inv.grandTotal - (inv.amountPaid || 0)).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="px-5 py-4 text-xs">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                              inv.paymentStatus === 'Paid'
                                ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-950/20 dark:bg-emerald-950/30 dark:text-emerald-400'
                                : inv.paymentStatus === 'Partial'
                                ? 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-950/20 dark:bg-blue-950/30 dark:text-blue-400'
                                : 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-950/20 dark:bg-amber-950/30 dark:text-amber-400'
                            }`}>
                              {inv.paymentStatus || 'Pending'}
                            </span>
                          </td>

                          {/* Action controls */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              
                              <button
                                title="View & Print Invoice Layout"
                                onClick={() => { setActiveInvoice(inv); setViewMode('preview'); }}
                                className="p-1.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-100/50 text-slate-500 hover:text-slate-800 dark:hover:border-slate-800 dark:hover:bg-slate-800/50 dark:text-slate-400 dark:hover:text-white transition-all"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              <button
                                title="Record Payment Receipt"
                                onClick={() => openStatusEditor(inv)}
                                className="p-1.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-100/50 text-amber-500 hover:text-amber-700 dark:hover:border-slate-800 dark:hover:bg-slate-800/50 dark:text-amber-400 dark:hover:text-amber-300 transition-all"
                              >
                                <Coins className="h-3.5 w-3.5" />
                              </button>

                              <button
                                title="Share / Copy Online Links"
                                onClick={() => openShareMenu(inv)}
                                className="p-1.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-100/50 text-emerald-500 hover:text-emerald-700 dark:hover:border-slate-800 dark:hover:bg-slate-800/50 dark:text-emerald-400 dark:hover:text-emerald-300 transition-all"
                              >
                                <Share2 className="h-3.5 w-3.5" />
                              </button>

                              <button
                                title="Delete Invoice permanently"
                                onClick={() => triggerDelete(inv)}
                                className="p-1.5 rounded-lg border border-transparent hover:border-rose-100 hover:bg-rose-50/50 text-rose-500 hover:text-rose-700 dark:hover:border-rose-950/20 dark:hover:bg-rose-950/10 dark:text-rose-400 dark:hover:text-rose-300 transition-all"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>

                            </div>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>

              {/* Pagination Row */}
              <div className="flex items-center justify-between px-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Showing <span className="font-bold text-slate-700 dark:text-white">{Math.min(filteredAndSortedInvoices.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredAndSortedInvoices.length, currentPage * itemsPerPage)}</span> of <span className="font-bold text-slate-700 dark:text-white">{filteredAndSortedInvoices.length}</span> invoices
                </span>

                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-lg border border-slate-200/80 bg-white text-slate-500 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-7 w-7 rounded-lg text-xs font-bold transition-all ${
                        currentPage === page
                          ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* VIEW 2: DETAILED INVOICE PRINT READY LAYOUT */}
      {viewMode === 'preview' && activeInvoice && (
        <div className="space-y-6">
          
          {/* iframe warning banner */}
          {typeof window !== 'undefined' && window.self !== window.top && (
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/70 p-4 text-slate-800 dark:border-amber-950/20 dark:bg-amber-950/20 dark:text-amber-300 print:hidden flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-xs animate-fade-in">
              <div className="flex gap-3 items-start">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 font-sans">PDF Download & Printing Guide</p>
                  <p className="text-[11px] leading-relaxed font-sans text-slate-600 dark:text-slate-400">
                    Standard PDF downloads and browser printing are restricted within the sandboxed development iframe. 
                    Please open this application in a <strong>new tab</strong> to download or print high-quality documents successfully!
                  </p>
                </div>
              </div>
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-md shadow-amber-500/10 shrink-0 active:scale-98"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open in New Tab</span>
              </a>
            </div>
          )}
          
          {/* Action Row */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 print:hidden">
            <button
              onClick={() => { setActiveInvoice(null); setViewMode('list'); }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Invoice Registry</span>
            </button>
            
            <div className="flex items-center gap-2">
              {typeof window !== 'undefined' && window.self !== window.top && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100/80 px-4 py-2.5 text-xs font-bold text-amber-800 dark:border-amber-950/40 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50 transition-all"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open in New Tab</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => openShareMenu(activeInvoice)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                <span>Share options</span>
              </button>

              <button
                type="button"
                onClick={() => openStatusEditor(activeInvoice)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                <Coins className="h-4 w-4" />
                <span>Record Receipt</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/10 focus:outline-hidden transition-all"
              >
                <Printer className="h-4 w-4" />
                <span>Print Invoice (A4)</span>
              </button>
            </div>
          </div>

          {/* PRINT CARD */}
          <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl border border-slate-200 max-w-4xl mx-auto shadow-sm print:shadow-none print:border-none print:p-0 font-sans print:bg-transparent">
            
            {/* Header Brand */}
            <div className="flex flex-col sm:flex-row justify-between gap-6 border-b border-slate-200 pb-8">
              <div className="space-y-2">
                {companySettings?.logoUrl ? (
                  <img 
                    src={companySettings.logoUrl} 
                    alt="Company Logo" 
                    className="max-h-12 w-auto object-contain referrerPolicy='no-referrer'" 
                  />
                ) : (
                  <div className="h-10 w-10 flex items-center justify-center bg-indigo-600 text-white font-black rounded-lg">
                    QF
                  </div>
                )}
                
                <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                  {companySettings?.companyName || 'Your Company Name (Pvt) Ltd'}
                </h1>
                
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <p>{companySettings?.address || 'Street address, Office details'}</p>
                  <p>Phone: {companySettings?.phone || 'N/A'} | Email: {companySettings?.email || 'N/A'}</p>
                  {companySettings?.website && <p>Website: {companySettings.website}</p>}
                  {companySettings?.taxNumber && <p className="font-bold">NTN / STRN: {companySettings.taxNumber}</p>}
                </div>
              </div>

              <div className="sm:text-right space-y-2">
                <span className={`inline-block text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${
                  activeInvoice.paymentStatus === 'Paid'
                    ? 'bg-emerald-50 text-emerald-700'
                    : activeInvoice.paymentStatus === 'Partial'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-amber-50 text-amber-700'
                }`}>
                  TAX INVOICE - {activeInvoice.paymentStatus || 'Pending'}
                </span>
                
                <div className="text-xs font-mono pt-2 space-y-1">
                  <p><span className="font-bold text-slate-400 uppercase tracking-wider">Invoice No:</span> <span className="font-black text-slate-900">{activeInvoice.invoiceNumber}</span></p>
                  <p><span className="font-bold text-slate-400 uppercase tracking-wider">Reference Quote:</span> {activeInvoice.quoteNumber || 'N/A'}</p>
                  <p><span className="font-bold text-slate-400 uppercase tracking-wider">Issue Date:</span> {activeInvoice.date}</p>
                  <p><span className="font-bold text-slate-400 uppercase tracking-wider">Due Date:</span> {activeInvoice.dueDate}</p>
                </div>
              </div>
            </div>

            {/* Recipient details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-slate-200 text-xs">
              <div>
                <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Invoice To Recipient:</span>
                <span className="block font-black text-slate-900 text-sm">{activeInvoice.customerName}</span>
                {activeInvoice.companyName && activeInvoice.companyName !== 'N/A' && (
                  <span className="block font-bold text-indigo-600 mt-0.5">{activeInvoice.companyName}</span>
                )}
                
                {activeCustomerCard && (
                  <div className="text-slate-500 space-y-0.5 mt-2">
                    <p>Phone: {activeCustomerCard.phone}</p>
                    {activeCustomerCard.email && <p>Email: {activeCustomerCard.email}</p>}
                  </div>
                )}
              </div>

              {activeCustomerCard?.address && (
                <div className="sm:text-right">
                  <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Billing / Postal Destination:</span>
                  <p className="text-slate-600 leading-relaxed italic">{activeCustomerCard.address}</p>
                  {activeCustomerCard.city && <p className="font-bold text-slate-900 mt-1">{activeCustomerCard.city}</p>}
                </div>
              )}
            </div>

            {/* Items Table details */}
            <div className="py-8">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-300 text-[9px] font-black uppercase tracking-widest text-slate-400 pb-2">
                    <th className="py-2.5 w-1/12 text-center">#</th>
                    <th className="py-2.5 w-6/12">Itemized Product / Service Deliverables</th>
                    <th className="py-2.5 w-1/12 text-center">Qty</th>
                    <th className="py-2.5 w-2/12 text-right">Unit Rate (PKR)</th>
                    <th className="py-2.5 w-2/12 text-right">Line Total (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeInvoice.items && activeInvoice.items.length > 0 ? (
                    activeInvoice.items.map((item, idx) => (
                      <tr key={idx} className="py-3">
                        <td className="py-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3">
                          <span className="font-bold text-slate-800 block text-[13px]">{item.productName}</span>
                        </td>
                        <td className="py-3 text-center font-mono text-slate-600">{item.quantity}</td>
                        <td className="py-3 text-right font-mono text-slate-600">
                          Rs. {item.unitPrice.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-slate-800">
                          Rs. {item.lineTotal.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center italic text-slate-400">No individual line items registered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary details bottom layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs">
              
              {/* Banking & Scope notes */}
              <div className="space-y-4">
                {companySettings?.bankName && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Settlement Account Details:</span>
                    <div className="text-[10px] space-y-1">
                      <p><span className="font-bold">Remittance Bank:</span> {companySettings.bankName}</p>
                      <p><span className="font-bold">Account Title:</span> {companySettings.accountTitle}</p>
                      <p><span className="font-bold">Account / IBAN:</span> <span className="font-mono font-bold">{companySettings.accountNumber}</span></p>
                    </div>
                  </div>
                )}

                <div className="text-slate-400 text-[10px] space-y-1 leading-relaxed">
                  <span className="font-bold uppercase block text-slate-500 text-[9px] tracking-widest">Notice to Client:</span>
                  <p>1. Please reference Invoice Number <strong>{activeInvoice.invoiceNumber}</strong> in any bank wire notifications.</p>
                  <p>2. Payment within {new Date(activeInvoice.dueDate).getDate() - new Date(activeInvoice.date).getDate() || 15} days from generation is highly appreciated.</p>
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-2.5 self-start md:pl-12 font-mono text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>Gross Subtotal:</span>
                  <span>Rs. {activeInvoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>

                {activeInvoice.discount && activeInvoice.discount > 0 ? (
                  <div className="flex justify-between text-rose-500 font-semibold">
                    <span>Discount Applied:</span>
                    <span>- Rs. {activeInvoice.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : null}

                {activeInvoice.taxAmount && activeInvoice.taxAmount > 0 ? (
                  <div className="flex justify-between text-amber-600 font-semibold">
                    <span>GST Tax Amount:</span>
                    <span>+ Rs. {activeInvoice.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : null}

                <div className="flex justify-between text-slate-900 text-xs font-black pt-2.5 border-t border-slate-300">
                  <span>GRAND TOTAL (PKR):</span>
                  <span className="text-[13px] text-indigo-600">Rs. {activeInvoice.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between text-emerald-600 font-bold pt-1">
                  <span>Settled / Paid:</span>
                  <span>Rs. {(activeInvoice.amountPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>

                {activeInvoice.grandTotal - (activeInvoice.amountPaid || 0) > 0 && (
                  <div className="flex justify-between text-rose-500 font-black border-t border-dashed border-slate-200 pt-2 text-xs">
                    <span>NET OUTSTANDING DUE:</span>
                    <span>Rs. {(activeInvoice.grandTotal - (activeInvoice.amountPaid || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {activeInvoice.notes && (
                  <div className="pt-4 border-t border-dashed border-slate-200 font-sans font-normal text-[10px] text-slate-400 italic">
                    <span className="font-bold uppercase not-italic block mb-0.5 text-slate-500">Invoice Note:</span>
                    {activeInvoice.notes}
                  </div>
                )}
              </div>

            </div>

            {/* Print Footer */}
            <div className="hidden print:block text-center text-[9px] text-slate-400 font-mono mt-16 pt-8 border-t border-slate-100">
              Tax Invoice generated on QuoteFlow PK. Verified corporate seal. Page 1 of 1.
            </div>

          </div>
        </div>
      )}

      {/* MODAL 1: STATUS / PAYMENT RECORDING MODAL */}
      {isStatusModalOpen && statusInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            
            <button
              onClick={() => { setIsStatusModalOpen(false); setStatusInvoice(null); }}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-sky-300 rounded-lg">
                <Coins className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Record Payment Receipt</h3>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <p className="text-slate-500 leading-relaxed">
                Update billing lifecycle status for invoice <strong>{statusInvoice.invoiceNumber}</strong>. Total Grand value is <strong>Rs. {statusInvoice.grandTotal.toLocaleString()}</strong>.
              </p>

              {/* Status Picker dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Payment State</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 bg-white/50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Pending">Pending (Not yet paid)</option>
                  <option value="Partial">Partial (Down payment / Installment)</option>
                  <option value="Paid">Paid Settled (Fully settled)</option>
                </select>
              </div>

              {/* Conditional Partial Amount Paid */}
              {newStatus === 'Partial' && (
                <div className="animate-slide-down">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Amount Settled (PKR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 font-bold text-slate-400">Rs.</span>
                    <input
                      type="number"
                      max={statusInvoice.grandTotal}
                      min={0}
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(Math.min(statusInvoice.grandTotal, parseFloat(e.target.value) || 0))}
                      className="w-full rounded-lg border border-slate-200 bg-white/50 pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <span className="block text-[9px] text-slate-400 mt-1">Remaining Balance: Rs. {(statusInvoice.grandTotal - amountPaid).toLocaleString()}</span>
                </div>
              )}

              {newStatus === 'Paid' && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-xl flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                  <Check className="h-4 w-4 shrink-0" />
                  <span className="text-[10px]">Fully paid status automatically records total settlement of <strong>Rs. {statusInvoice.grandTotal.toLocaleString()}</strong>.</span>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => { setIsStatusModalOpen(false); setStatusInvoice(null); }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStatusUpdate}
                  disabled={statusLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {statusLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Record Settle</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: SHARING POPUP MODAL */}
      {isShareModalOpen && shareInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            
            <button
              onClick={() => { setIsShareModalOpen(false); setShareInvoice(null); }}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Share2 className="h-5 w-5 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Share Invoice Options</h3>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <p className="text-slate-500 mb-4">
                Distribute <strong>{shareInvoice.invoiceNumber}</strong> issued to <strong>{shareInvoice.customerName}</strong> via several channels.
              </p>

              {/* Option 1: Print / Save PDF */}
              <button
                type="button"
                onClick={() => {
                  setIsShareModalOpen(false);
                  setActiveInvoice(shareInvoice);
                  setViewMode('preview');
                  // Trigger browser print soon after layout transitions
                  setTimeout(() => window.print(), 350);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 font-bold transition-all"
              >
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-indigo-500" />
                  <span>Download PDF / Print</span>
                </div>
                <ChevronLeft className="h-4 w-4 rotate-180 text-slate-400" />
              </button>

              {/* Option 2: Copy link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 font-bold transition-all"
              >
                <div className="flex items-center gap-2">
                  <Copy className="h-4 w-4 text-sky-500" />
                  <span>Copy Public Proposal Link</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {/* Option 3: WhatsApp */}
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-100 hover:border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/60 dark:border-emerald-950/20 dark:bg-emerald-950/10 text-emerald-800 dark:text-emerald-400 font-bold transition-all"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  <span>Send via WhatsApp Message</span>
                </div>
                <ChevronLeft className="h-4 w-4 rotate-180 text-slate-400" />
              </button>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => { setIsShareModalOpen(false); setShareInvoice(null); }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                >
                  Done
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {isDeleteModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-rose-200 bg-white p-5 shadow-2xl dark:border-rose-950/30 dark:bg-slate-950">
            
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 mb-3">
              <Trash2 className="h-5 w-5" />
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-center">Delete Invoice</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center leading-relaxed">
              Are you sure you want to delete invoice <strong>{selectedInvoice.invoiceNumber}</strong> issued to <strong>{selectedInvoice.customerName}</strong>?
              This operation is completely irreversible.
            </p>

            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedInvoice(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {deleteLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
