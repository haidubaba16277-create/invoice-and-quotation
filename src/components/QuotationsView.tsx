import React, { useEffect, useState, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  ArrowUpDown, 
  Pencil, 
  Trash2, 
  Eye, 
  Copy, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Building2, 
  DollarSign, 
  Percent, 
  Printer, 
  ArrowLeft, 
  PlusCircle, 
  User, 
  MapPin, 
  Sparkles,
  Receipt,
  FileSpreadsheet,
  Settings,
  Scale,
  ExternalLink
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { dataService } from '../services/dataService';
import { Quotation, QuoteItem, Customer, Product, CompanySettings } from '../types/business';

interface QuotationsViewProps {
  isSupabaseConnected: boolean;
  onNavigate?: (view: string) => void;
}

type SortField = 'quoteNumber' | 'grandTotal' | 'date';
type SortOrder = 'asc' | 'desc';

export function QuotationsView({ isSupabaseConnected, onNavigate }: QuotationsViewProps) {
  // Application Data States
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  
  // Loading & View States
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'editor' | 'preview'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Interactive Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Editor State
  const [activeQuote, setActiveQuote] = useState<Partial<Quotation> | null>(null);
  const [editorItems, setEditorItems] = useState<QuoteItem[]>([]);
  const [editorLoading, setEditorLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Confirmation Modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Conversion Workflow States
  const [conversionQuote, setConversionQuote] = useState<Quotation | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [quotesData, customersData, productsData, settingsData] = await Promise.all([
        dataService.getQuotations(),
        dataService.getCustomers(),
        dataService.getProducts(),
        dataService.getCompanySettings()
      ]);
      setQuotations(quotesData);
      setCustomers(customersData);
      setProducts(productsData);
      setCompanySettings(settingsData);
    } catch (err) {
      console.error('Failed to load quotation database:', err);
      showToast('Error syncing with data modules.', 'error');
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

  // Convert to Invoice Actions
  const handleConvertToInvoice = (quote: Quotation) => {
    setConversionQuote(quote);
  };

  const handleConfirmConvert = async () => {
    if (!conversionQuote) return;
    setIsConverting(true);
    try {
      await dataService.convertQuotationToInvoice(conversionQuote.id);
      showToast(`Quotation ${conversionQuote.quoteNumber} has been successfully converted to an Invoice!`, 'success');
      setConversionQuote(null);
      await loadData();
      if (onNavigate) {
        onNavigate('invoices');
      }
    } catch (err: any) {
      if (err && err.invoiceNumber) {
        showToast(`Quotation ${conversionQuote.quoteNumber} was already converted to Invoice ${err.invoiceNumber}.`, 'error');
        setConversionQuote(null);
      } else {
        console.error('Failed to convert quote:', err);
        showToast(err.message || 'Failed to convert quotation to invoice.', 'error');
      }
    } finally {
      setIsConverting(false);
    }
  };

  // Auto-generate unique quote number (QT-000001 format)
  const generateNextQuoteNumber = (): string => {
    if (quotations.length === 0) return 'QT-000001';
    
    // Find numeric suffixes from QT-XXXXXX
    const numbers = quotations
      .map(q => {
        const parts = q.quoteNumber.split('-');
        if (parts.length >= 2) {
          const num = parseInt(parts[1], 10);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      })
      .filter(n => n > 0);

    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNum = maxNum + 1;
    return `QT-${nextNum.toString().padStart(6, '0')}`;
  };

  // Calculations for active quotation
  const calculationSummary = useMemo(() => {
    const subtotal = editorItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    
    let discountAmount = 0;
    if (activeQuote?.discountType === 'percentage') {
      discountAmount = subtotal * ((activeQuote.discountValue || 0) / 100);
    } else {
      discountAmount = activeQuote?.discountValue || 0;
    }
    
    const taxableSubtotal = Math.max(0, subtotal - discountAmount);
    const taxRate = activeQuote?.taxPercentage || 0;
    const taxAmount = taxableSubtotal * (taxRate / 100);
    const grandTotal = taxableSubtotal + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxableSubtotal,
      taxAmount,
      grandTotal
    };
  }, [editorItems, activeQuote?.discountType, activeQuote?.discountValue, activeQuote?.taxPercentage]);

  // Filter and Sort calculations
  const filteredAndSortedQuotes = useMemo(() => {
    let result = [...quotations];

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter(q => q.status === statusFilter);
    }

    // Search filter
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(q => 
        q.quoteNumber.toLowerCase().includes(lower) ||
        (q.customerName && q.customerName.toLowerCase().includes(lower)) ||
        (q.companyName && q.companyName.toLowerCase().includes(lower)) ||
        (q.notes && q.notes.toLowerCase().includes(lower))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortField === 'quoteNumber') {
        return sortOrder === 'asc' 
          ? a.quoteNumber.localeCompare(b.quoteNumber) 
          : b.quoteNumber.localeCompare(a.quoteNumber);
      } else if (sortField === 'grandTotal') {
        return sortOrder === 'asc' 
          ? a.grandTotal - b.grandTotal 
          : b.grandTotal - a.grandTotal;
      } else {
        const dateA = new Date(a.createdAt || a.issueDate || 0).getTime();
        const dateB = new Date(b.createdAt || b.issueDate || 0).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });

    return result;
  }, [quotations, searchTerm, statusFilter, sortField, sortOrder]);

  // Pagination (10 per page)
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredAndSortedQuotes.length / itemsPerPage) || 1;
  const paginatedQuotes = useMemo(() => {
    const offset = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedQuotes.slice(offset, offset + itemsPerPage);
  }, [filteredAndSortedQuotes, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortField, sortOrder]);

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleOpenCreator = () => {
    const today = new Date().toISOString().split('T')[0];
    const expiry = new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0]; // +15 days standard
    
    setActiveQuote({
      quoteNumber: generateNextQuoteNumber(),
      customerId: '',
      issueDate: today,
      expiryDate: expiry,
      status: 'Draft',
      discountType: 'fixed',
      discountValue: 0,
      taxPercentage: 18, // Default Punjab/PK Sales Tax
      notes: companySettings?.footerNotes || 'Thank you for choosing us! We appreciate your business.',
      terms: companySettings?.termsConditions || '1. Validity: This quote is valid for 15 days.\n2. Payment: 50% advance, remaining 50% upon delivery.\n3. Taxes: Standard sales tax applies.',
    });
    setEditorItems([]);
    setErrors({});
    setViewMode('editor');
  };

  const handleEditQuote = (quote: Quotation) => {
    setActiveQuote(quote);
    setEditorItems(quote.items || []);
    setErrors({});
    setViewMode('editor');
  };

  const handleDuplicateQuote = (quote: Quotation) => {
    const nextNum = generateNextQuoteNumber();
    const today = new Date().toISOString().split('T')[0];
    const expiry = new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0];

    setActiveQuote({
      ...quote,
      id: undefined,
      quoteNumber: nextNum,
      issueDate: today,
      expiryDate: expiry,
      status: 'Draft',
      createdAt: undefined,
      updatedAt: undefined,
    });
    // Deep copy items
    setEditorItems((quote.items || []).map(item => ({
      ...item,
      id: undefined,
      quotationId: undefined
    })));
    setErrors({});
    setViewMode('editor');
    showToast(`Quotation ${quote.quoteNumber} cloned into a new draft successfully!`, 'success');
  };

  const handlePreviewQuote = (quote: Quotation) => {
    setActiveQuote(quote);
    setEditorItems(quote.items || []);
    setViewMode('preview');
  };

  const handleBackToList = () => {
    setActiveQuote(null);
    setEditorItems([]);
    setErrors({});
    setViewMode('list');
  };

  // Editor Actions
  const handleAddCustomItem = () => {
    const newItem: QuoteItem = {
      productName: '',
      quantity: 1,
      unitPrice: 0,
      taxPercentage: 0,
      lineTotal: 0,
    };
    setEditorItems([...editorItems, newItem]);
  };

  const handleAddCatalogItem = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    // Check if product is already added to avoid duplication (optional, let's allow multi items or increment)
    const newItem: QuoteItem = {
      productId: prod.id,
      productName: prod.productName,
      quantity: 1,
      unitPrice: prod.price,
      taxPercentage: prod.taxPercentage || 0,
      lineTotal: prod.price,
    };

    setEditorItems([...editorItems, newItem]);
  };

  const handleUpdateItem = (index: number, fields: Partial<QuoteItem>) => {
    const updated = [...editorItems];
    const current = updated[index];
    
    // Update fields
    const updatedItem = {
      ...current,
      ...fields
    };

    // Calculate line total
    const qty = updatedItem.quantity || 0;
    const price = updatedItem.unitPrice || 0;
    updatedItem.lineTotal = qty * price;

    updated[index] = updatedItem;
    setEditorItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = editorItems.filter((_, i) => i !== index);
    setEditorItems(updated);
  };

  // Form Validation
  const validateQuote = (): boolean => {
    const errs: { [key: string]: string } = {};
    let isValid = true;

    if (!activeQuote?.quoteNumber?.trim()) {
      errs.quoteNumber = 'Quotation serial number is required.';
      isValid = false;
    }

    if (!activeQuote?.customerId) {
      errs.customerId = 'Please select a recipient customer.';
      isValid = false;
    }

    if (!activeQuote?.issueDate) {
      errs.issueDate = 'Issue date is required.';
      isValid = false;
    }

    if (!activeQuote?.expiryDate) {
      errs.expiryDate = 'Expiry date is required.';
      isValid = false;
    } else if (activeQuote.issueDate && activeQuote.expiryDate < activeQuote.issueDate) {
      errs.expiryDate = 'Expiry date cannot occur before the issue date.';
      isValid = false;
    }

    if (editorItems.length === 0) {
      errs.items = 'Please configure at least one item or service line.';
      isValid = false;
    } else {
      // Validate each item
      editorItems.forEach((item, idx) => {
        if (!item.productName.trim()) {
          errs[`itemName-${idx}`] = 'Name is required.';
          isValid = false;
        }
        if (item.quantity <= 0) {
          errs[`itemQty-${idx}`] = 'Must be > 0.';
          isValid = false;
        }
        if (item.unitPrice < 0) {
          errs[`itemPrice-${idx}`] = 'Invalid price.';
          isValid = false;
        }
      });
    }

    setErrors(errs);
    return isValid;
  };

  const handleSaveQuotation = async () => {
    if (!validateQuote()) {
      showToast('Please correct the validation errors in the editor.', 'error');
      return;
    }

    setEditorLoading(true);
    try {
      const selectedCust = customers.find(c => c.id === activeQuote?.customerId);
      const payload: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'> & { id?: string } = {
        id: activeQuote?.id,
        quoteNumber: activeQuote!.quoteNumber!.trim(),
        customerId: activeQuote!.customerId!,
        customerName: selectedCust?.customerName || 'Direct Client',
        companyName: selectedCust?.companyName || 'N/A',
        issueDate: activeQuote!.issueDate!,
        expiryDate: activeQuote!.expiryDate!,
        status: activeQuote!.status || 'Draft',
        subtotal: calculationSummary.subtotal,
        discountType: activeQuote!.discountType || 'fixed',
        discountValue: parseFloat(activeQuote!.discountValue?.toString() || '0') || 0,
        taxPercentage: parseFloat(activeQuote!.taxPercentage?.toString() || '0') || 0,
        taxAmount: calculationSummary.taxAmount,
        grandTotal: calculationSummary.grandTotal,
        notes: activeQuote?.notes || '',
        terms: activeQuote?.terms || '',
        items: editorItems,
      };

      await dataService.saveQuotation(payload);
      showToast(
        activeQuote?.id 
          ? `Quotation ${payload.quoteNumber} has been updated successfully.` 
          : `New quotation ${payload.quoteNumber} configured successfully!`, 
        'success'
      );
      setViewMode('list');
      loadData();
    } catch (err: any) {
      console.error('Failed to save quotation:', err);
      showToast(err.message || 'An error occurred while saving the quotation.', 'error');
    } finally {
      setEditorLoading(false);
    }
  };

  // Delete Action
  const triggerDelete = (quote: Quotation) => {
    setSelectedQuote(quote);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedQuote) return;
    setDeleteLoading(true);
    try {
      await dataService.deleteQuotation(selectedQuote.id);
      showToast(`Quotation ${selectedQuote.quoteNumber} has been successfully deleted.`, 'success');
      setIsDeleteModalOpen(false);
      setSelectedQuote(null);
      loadData();
    } catch (err: any) {
      console.error('Failed to delete quotation:', err);
      showToast('Could not delete quotation record.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Active customer helper card
  const activeCustomerCard = useMemo(() => {
    if (!activeQuote?.customerId) return null;
    return customers.find(c => c.id === activeQuote.customerId);
  }, [activeQuote?.customerId, customers]);

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

      {/* VIEW 1: MAIN LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500 dark:text-sky-400" />
                Professional Quotation Builder
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Generate professional SLA-bound service catalog estimates and modern itemised sales quotations.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreator}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/10 hover:opacity-95 transition-all shrink-0 active:scale-98"
            >
              <Plus className="h-4 w-4" />
              <span>Create Quotation</span>
            </button>
          </div>

          {/* Quick status counters / filters */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'All Quotes', value: 'All', count: quotations.length, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-100 dark:border-indigo-950/40 dark:text-sky-400' },
              { label: 'Drafts', value: 'Draft', count: quotations.filter(q => q.status === 'Draft').length, color: 'bg-slate-500/10 text-slate-600 border-slate-100 dark:border-slate-900 dark:text-slate-400' },
              { label: 'Sent', value: 'Sent', count: quotations.filter(q => q.status === 'Sent').length, color: 'bg-blue-500/10 text-blue-600 border-blue-100 dark:border-blue-950/40 dark:text-blue-400' },
              { label: 'Accepted', value: 'Accepted', count: quotations.filter(q => q.status === 'Accepted').length, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-100 dark:border-emerald-950/40 dark:text-emerald-400' },
              { label: 'Rejected', value: 'Rejected', count: quotations.filter(q => q.status === 'Rejected').length, color: 'bg-rose-500/10 text-rose-600 border-rose-100 dark:border-rose-950/40 dark:text-rose-400' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                  statusFilter === tab.value
                    ? 'border-indigo-500 bg-white shadow-sm ring-1 ring-indigo-500/10 dark:bg-slate-900 dark:border-sky-500'
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

          {/* Search bar & Sorting Row */}
          <GlassCard className="p-4" intensity="low">
            <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
              
              {/* Search bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by quote serial, client, company name, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white/50 pl-9.5 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all"
                />
                {searchTerm && (
                  <button 
                    type="button" 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Quick Sorting Toggles */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">Sort:</span>
                
                <button
                  onClick={() => handleSort('quoteNumber')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                    sortField === 'quoteNumber'
                      ? 'bg-indigo-50/50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-sky-400'
                      : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  Quote No
                  <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'quoteNumber' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                </button>

                <button
                  onClick={() => handleSort('grandTotal')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                    sortField === 'date'
                      ? 'bg-indigo-50/50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-sky-400'
                      : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  Date
                  <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'date' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                </button>
              </div>

            </div>
          </GlassCard>

          {/* Main List content */}
          {loading ? (
            <div className="flex h-96 items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-sky-400" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">Synchronising Quotation Registers...</p>
              </div>
            </div>
          ) : quotations.length === 0 ? (
            <GlassCard className="p-12 text-center" intensity="medium">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-sky-400 mb-4">
                <FileText className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">No Active Quotations</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                You haven't generated any estimates or client proposals yet. Select a customer and list some deliverables to begin.
              </p>
              <button
                type="button"
                onClick={handleOpenCreator}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/10 focus:outline-hidden transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Build First Quotation</span>
              </button>
            </GlassCard>
          ) : filteredAndSortedQuotes.length === 0 ? (
            <GlassCard className="p-12 text-center" intensity="medium">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">No estimates match the search filter "{searchTerm}"</p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('All');
                }}
                className="mt-3 text-xs text-indigo-600 dark:text-sky-400 hover:underline font-bold"
              >
                Reset Filter Query
              </button>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              <GlassCard className="overflow-hidden border border-slate-200/60 dark:border-slate-800/60" intensity="medium">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/80 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-950/40">
                        <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Quote Number</th>
                        <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Recipient Customer</th>
                        <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Issue / Expiry Date</th>
                        <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Subtotal</th>
                        <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Grand Total</th>
                        <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Status</th>
                        <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {paginatedQuotes.map((quote) => (
                        <tr 
                          key={quote.id}
                          className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                        >
                          {/* Quote Number */}
                          <td className="px-5 py-4 text-xs font-mono font-black text-slate-800 dark:text-slate-200">
                            <span className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              {quote.quoteNumber}
                            </span>
                          </td>

                          {/* Customer Details */}
                          <td className="px-5 py-4 max-w-[200px]">
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                {quote.customerName}
                              </span>
                              {quote.companyName && quote.companyName !== 'N/A' && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                                  {quote.companyName}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Date details */}
                          <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400 font-mono">
                            <div className="space-y-0.5">
                              <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                Iss: {new Date(quote.issueDate).toLocaleDateString()}
                              </span>
                              <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                Exp: {new Date(quote.expiryDate).toLocaleDateString()}
                              </span>
                            </div>
                          </td>

                          {/* Subtotal */}
                          <td className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-400 font-mono">
                            Rs. {quote.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Grand Total */}
                          <td className="px-5 py-4 text-xs font-bold text-indigo-600 dark:text-sky-400 font-mono">
                            Rs. {quote.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4 text-xs">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                              quote.status === 'Accepted'
                                ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-950/20 dark:bg-emerald-950/30 dark:text-emerald-400'
                                : quote.status === 'Sent'
                                ? 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-950/20 dark:bg-blue-950/30 dark:text-blue-400'
                                : quote.status === 'Rejected'
                                ? 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-950/20 dark:bg-rose-950/30 dark:text-rose-400'
                                : quote.status === 'Converted'
                                ? 'border-purple-100 bg-purple-50 text-purple-700 dark:border-purple-950/20 dark:bg-purple-950/30 dark:text-purple-400'
                                : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400'
                            }`}>
                              {quote.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                title="Print/Preview Document"
                                onClick={() => handlePreviewQuote(quote)}
                                className="p-1.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-100/50 text-slate-500 hover:text-slate-800 dark:hover:border-slate-800 dark:hover:bg-slate-800/50 dark:text-slate-400 dark:hover:text-white transition-all"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              
                              <button
                                title="Edit Quotation Draft"
                                onClick={() => handleEditQuote(quote)}
                                className="p-1.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-100/50 text-indigo-500 hover:text-indigo-700 dark:hover:border-slate-800 dark:hover:bg-slate-800/50 dark:text-sky-400 dark:hover:text-sky-300 transition-all"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>

                              <button
                                title="Duplicate (Clone) Quotation"
                                onClick={() => handleDuplicateQuote(quote)}
                                className="p-1.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-100/50 text-emerald-500 hover:text-emerald-700 dark:hover:border-slate-800 dark:hover:bg-slate-800/50 dark:text-emerald-400 dark:hover:text-emerald-300 transition-all"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>

                              {quote.status !== 'Converted' ? (
                                <button
                                  title="Convert to Invoice"
                                  onClick={() => handleConvertToInvoice(quote)}
                                  className="p-1.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-100/50 text-amber-500 hover:text-amber-700 dark:hover:border-slate-800 dark:hover:bg-slate-800/50 dark:text-amber-400 dark:hover:text-amber-300 transition-all"
                                >
                                  <Receipt className="h-3.5 w-3.5" />
                                </button>
                              ) : null}

                              <button
                                title="Delete Quotation"
                                onClick={() => triggerDelete(quote)}
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

              {/* Pagination controls */}
              <div className="flex items-center justify-between px-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Showing <span className="font-bold text-slate-700 dark:text-white">{Math.min(filteredAndSortedQuotes.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredAndSortedQuotes.length, currentPage * itemsPerPage)}</span> of <span className="font-bold text-slate-700 dark:text-white">{filteredAndSortedQuotes.length}</span> items
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

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1.5 rounded-lg border border-slate-200/80 bg-white text-slate-500 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: DYNAMIC EDIT/CREATE WORKBENCH */}
      {viewMode === 'editor' && activeQuote && (
        <div className="space-y-6">
          {/* Header Action Row */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <button
              onClick={handleBackToList}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Register</span>
            </button>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBackToList}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuotation}
                disabled={editorLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/10 hover:opacity-95 disabled:opacity-50 transition-all"
              >
                {editorLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>{activeQuote.id ? 'Save Changes' : 'Publish Quotation'}</span>
              </button>
            </div>
          </div>

          {/* Form Editor Column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Customer Selection, Products List (2 Cols wide) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Box 1: Reference Metadata */}
              <GlassCard className="p-5" intensity="low">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-indigo-500" />
                  Reference & Lifecycle
                </h3>
                
                <div className="grid gap-4 sm:grid-cols-3">
                  
                  {/* Quote Number */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Quotation Number *
                    </label>
                    <input
                      type="text"
                      placeholder="QT-000001"
                      value={activeQuote.quoteNumber || ''}
                      onChange={(e) => setActiveQuote({ ...activeQuote, quoteNumber: e.target.value })}
                      className={`w-full rounded-xl border bg-white/50 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-1 dark:bg-slate-900/50 dark:text-slate-200 transition-all ${
                        errors.quoteNumber 
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-800'
                      }`}
                    />
                    {errors.quoteNumber && (
                      <p className="mt-1 text-[9px] text-rose-500 font-semibold">{errors.quoteNumber}</p>
                    )}
                  </div>

                  {/* Issue Date */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Issue Date *
                    </label>
                    <input
                      type="date"
                      value={activeQuote.issueDate || ''}
                      onChange={(e) => setActiveQuote({ ...activeQuote, issueDate: e.target.value })}
                      className={`w-full rounded-xl border bg-white/50 px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 dark:bg-slate-900/50 dark:text-slate-200 transition-all ${
                        errors.issueDate
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-800'
                      }`}
                    />
                    {errors.issueDate && (
                      <p className="mt-1 text-[9px] text-rose-500 font-semibold">{errors.issueDate}</p>
                    )}
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Expiry Date *
                    </label>
                    <input
                      type="date"
                      value={activeQuote.expiryDate || ''}
                      onChange={(e) => setActiveQuote({ ...activeQuote, expiryDate: e.target.value })}
                      className={`w-full rounded-xl border bg-white/50 px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 dark:bg-slate-900/50 dark:text-slate-200 transition-all ${
                        errors.expiryDate
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-800'
                      }`}
                    />
                    {errors.expiryDate && (
                      <p className="mt-1 text-[9px] text-rose-500 font-semibold">{errors.expiryDate}</p>
                    )}
                  </div>

                </div>
              </GlassCard>

              {/* Box 2: Customer Recipient Card */}
              <GlassCard className="p-5" intensity="low">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-indigo-500" />
                  Client Recipient Details
                </h3>

                <div className="space-y-4">
                  {/* Select Customer Dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Select Customer Recipient *
                    </label>
                    <select
                      value={activeQuote.customerId || ''}
                      onChange={(e) => setActiveQuote({ ...activeQuote, customerId: e.target.value })}
                      className={`w-full rounded-xl border bg-white/50 px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all ${
                        errors.customerId 
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-800'
                      }`}
                    >
                      <option value="">-- Choose an existing Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.customerName} {c.companyName ? `(${c.companyName})` : ''}
                        </option>
                      ))}
                    </select>
                    {errors.customerId && (
                      <p className="mt-1 text-[9px] text-rose-500 font-semibold">{errors.customerId}</p>
                    )}
                  </div>

                  {/* Customer Card Detailed View */}
                  {activeCustomerCard ? (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-900/30 flex flex-col sm:flex-row justify-between gap-4 animate-fade-in">
                      <div className="space-y-1">
                        <span className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wide">
                          {activeCustomerCard.customerName}
                        </span>
                        {activeCustomerCard.companyName && (
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-sky-400 block">
                            {activeCustomerCard.companyName}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                          Phone: {activeCustomerCard.phone}
                        </span>
                        {activeCustomerCard.email && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                            Email: {activeCustomerCard.email}
                          </span>
                        )}
                      </div>
                      
                      {activeCustomerCard.address && (
                        <div className="text-right sm:max-w-[200px] text-[10px] text-slate-400 space-y-1 shrink-0">
                          <span className="font-bold uppercase tracking-wider block text-slate-500">Billing Address</span>
                          <span className="block italic leading-relaxed">{activeCustomerCard.address}</span>
                          {activeCustomerCard.city && <span className="block font-bold">{activeCustomerCard.city}</span>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      <p className="text-[11px] italic text-slate-400">Please choose a client to view billing details and populate terms.</p>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Box 3: Products Line Items Editor */}
              <GlassCard className="p-5" intensity="medium">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
                      Line Items & Estimations *
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">Configure individual scopes. Line totals dynamically incorporate quantity modifiers.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Add Custom Empty Line */}
                    <button
                      type="button"
                      onClick={handleAddCustomItem}
                      className="inline-flex items-center gap-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>Custom Row</span>
                    </button>
                    
                    {/* Add Product from Catalog Select */}
                    {products.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddCatalogItem(e.target.value);
                            e.target.value = ''; // Reset select
                          }
                        }}
                        className="border border-indigo-100 bg-indigo-50/50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold dark:border-indigo-950/20 dark:bg-indigo-950/30 dark:text-sky-400 outline-hidden"
                      >
                        <option value="">+ Add Catalog Product</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.productName} (Rs. {p.price})</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {errors.items && (
                  <p className="mb-3 text-[10px] text-rose-500 font-bold flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.items}
                  </p>
                )}

                {/* Line Items Table */}
                {editorItems.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/20">
                    <p className="text-xs text-slate-400 font-medium">Your quotation is currently empty.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Add a custom row or select a catalog item from the options above.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-400 dark:border-slate-800 pb-2">
                          <th className="py-2 pr-4 w-1/2">Product / Service Description *</th>
                          <th className="py-2 px-3 w-1/12 text-center">Qty *</th>
                          <th className="py-2 px-3 w-2/12 text-right">Unit Price (PKR) *</th>
                          <th className="py-2 px-3 w-2/12 text-right">Line Total (PKR)</th>
                          <th className="py-2 pl-3 text-right w-1/12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {editorItems.map((item, idx) => (
                          <tr key={idx} className="group py-2">
                            {/* Product Name Input */}
                            <td className="py-2.5 pr-4">
                              <input
                                type="text"
                                required
                                placeholder="e.g. Custom React Web App Development"
                                value={item.productName}
                                onChange={(e) => handleUpdateItem(idx, { productName: e.target.value })}
                                className={`w-full rounded-lg border bg-white/50 px-2.5 py-1.5 text-xs text-slate-800 dark:bg-slate-900/50 dark:text-slate-200 focus:outline-hidden ${
                                  errors[`itemName-${idx}`] 
                                    ? 'border-rose-400 focus:border-rose-500' 
                                    : 'border-slate-200 focus:border-indigo-500 dark:border-slate-800'
                                }`}
                              />
                              {errors[`itemName-${idx}`] && (
                                <p className="mt-0.5 text-[9px] text-rose-500 font-semibold">{errors[`itemName-${idx}`]}</p>
                              )}
                            </td>

                            {/* Quantity Input */}
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                required
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
                                className={`w-full rounded-lg border bg-white/50 px-1 py-1.5 text-xs text-center font-mono text-slate-800 dark:bg-slate-900/50 dark:text-slate-200 focus:outline-hidden ${
                                  errors[`itemQty-${idx}`] 
                                    ? 'border-rose-400 focus:border-rose-500' 
                                    : 'border-slate-200 focus:border-indigo-500 dark:border-slate-800'
                                }`}
                              />
                            </td>

                            {/* Unit Price Input */}
                            <td className="py-2.5 px-3">
                              <div className="relative">
                                <span className="absolute left-2 top-2 text-[10px] text-slate-400 font-bold">Rs</span>
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  step="any"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                                  className={`w-full rounded-lg border bg-white/50 pl-6.5 pr-2 py-1.5 text-xs text-right font-mono text-slate-800 dark:bg-slate-900/50 dark:text-slate-200 focus:outline-hidden ${
                                    errors[`itemPrice-${idx}`] 
                                      ? 'border-rose-400 focus:border-rose-500' 
                                      : 'border-slate-200 focus:border-indigo-500 dark:border-slate-800'
                                  }`}
                                />
                              </div>
                            </td>

                            {/* Line Total Display */}
                            <td className="py-2.5 px-3 text-right font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                              Rs. {(item.quantity * item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {/* Remove Line Action */}
                            <td className="py-2.5 pl-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-700 dark:hover:bg-rose-950/20 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>

            </div>

            {/* Right Col: Calculations summary card, notes, terms & conditions */}
            <div className="space-y-6">
              
              {/* Box 1: Calculation and Summary sheet */}
              <GlassCard className="p-5" intensity="high">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-1.5">
                  <Scale className="h-4 w-4 text-indigo-500" />
                  Quotation Valuation
                </h3>

                <div className="space-y-4">
                  {/* Subtotal */}
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <span>Base Subtotal:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      Rs. {calculationSummary.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Discount input controls */}
                  <div className="space-y-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configure Discount</span>
                    <div className="flex gap-2">
                      <select
                        value={activeQuote.discountType || 'fixed'}
                        onChange={(e) => setActiveQuote({ ...activeQuote, discountType: e.target.value as 'fixed' | 'percentage' })}
                        className="rounded-lg border border-slate-200 bg-white/50 px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900 outline-hidden"
                      >
                        <option value="fixed">Flat (PKR)</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                      
                      <div className="relative flex-1">
                        {activeQuote.discountType === 'fixed' && <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold font-sans">Rs.</span>}
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={activeQuote.discountValue || 0}
                          onChange={(e) => setActiveQuote({ ...activeQuote, discountValue: parseFloat(e.target.value) || 0 })}
                          className={`w-full rounded-lg border border-slate-200 bg-white/50 px-2 py-1.5 text-xs font-mono text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 focus:outline-hidden ${
                            activeQuote.discountType === 'fixed' ? 'pl-8' : ''
                          }`}
                        />
                        {activeQuote.discountType === 'percentage' && <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold font-sans">%</span>}
                      </div>
                    </div>
                    {calculationSummary.discountAmount > 0 && (
                      <div className="flex items-center justify-between text-[11px] font-semibold text-rose-500">
                        <span>Discount Applied:</span>
                        <span className="font-mono">- Rs. {calculationSummary.discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>

                  {/* Value Added Tax / GST */}
                  <div className="space-y-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configure Tax</span>
                    <select
                      value={activeQuote.taxPercentage || 0}
                      onChange={(e) => setActiveQuote({ ...activeQuote, taxPercentage: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-200 bg-white/50 px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900 outline-hidden font-mono"
                    >
                      <option value="0">0% GST (Tax Exempt / Zero-Rated)</option>
                      <option value="5">5% GST (Reduced Rate Services)</option>
                      <option value="13">13% GST (Sindh Revenue Board Standard)</option>
                      <option value="16">16% GST (PRA Punjab Revenue standard)</option>
                      <option value="18">18% GST (Pakistan Federal FBR standard)</option>
                    </select>

                    {calculationSummary.taxAmount > 0 && (
                      <div className="flex items-center justify-between text-[11px] font-semibold text-amber-600">
                        <span>Tax Amount ({activeQuote.taxPercentage}%):</span>
                        <span className="font-mono">+ Rs. {calculationSummary.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>

                  {/* Status Picker */}
                  <div className="pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Quote Status</label>
                    <div className="grid grid-cols-4 gap-1">
                      {['Draft', 'Sent', 'Accepted', 'Rejected'].map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setActiveQuote({ ...activeQuote, status: st as any })}
                          className={`py-1 rounded text-[10px] font-bold border transition-all ${
                            activeQuote.status === st
                              ? st === 'Accepted'
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : st === 'Sent'
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : st === 'Rejected'
                                ? 'bg-rose-500 border-rose-500 text-white'
                                : 'bg-slate-600 border-slate-600 text-white'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grand Total display */}
                  <div className="flex items-center justify-between text-sm font-bold text-slate-800 dark:text-white pt-1">
                    <span>Grand Total:</span>
                    <span className="font-mono text-indigo-600 dark:text-sky-400 font-black text-base">
                      Rs. {calculationSummary.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                </div>
              </GlassCard>

              {/* Box 2: Scope Notes */}
              <GlassCard className="p-5" intensity="low">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Internal Scope Notes & Client Greeting
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. This estimate is compiled for our custom development package."
                  value={activeQuote.notes || ''}
                  onChange={(e) => setActiveQuote({ ...activeQuote, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all resize-none"
                />
              </GlassCard>

              {/* Box 3: Terms Conditions */}
              <GlassCard className="p-5" intensity="low">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Terms & Conditions
                </label>
                <textarea
                  rows={4}
                  placeholder="1. Validity of quotation..."
                  value={activeQuote.terms || ''}
                  onChange={(e) => setActiveQuote({ ...activeQuote, terms: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all resize-none font-sans"
                />
              </GlassCard>

            </div>

          </div>
        </div>
      )}

      {/* VIEW 3: PRINT READY PREVIEW & PRINT MODULE */}
      {viewMode === 'preview' && activeQuote && (
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
              onClick={handleBackToList}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Register</span>
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

              {activeQuote.status !== 'Converted' && (
                <button
                  type="button"
                  onClick={() => handleConvertToInvoice(activeQuote as Quotation)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/10 focus:outline-hidden transition-all"
                >
                  <Receipt className="h-4 w-4" />
                  <span>Convert to Invoice</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/10 focus:outline-hidden transition-all"
              >
                <Printer className="h-4 w-4" />
                <span>Print Quotation</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleEditQuote(activeQuote as Quotation)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Edit Draft
              </button>
            </div>
          </div>

          {/* PRINT SHEET - STANDARD INVOICE STYLING */}
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
                <span className="inline-block text-[11px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  Quotation Proposal
                </span>
                
                <div className="text-xs font-mono pt-2 space-y-1">
                  <p><span className="font-bold text-slate-400 uppercase tracking-wider">Quote No:</span> <span className="font-black text-slate-900">{activeQuote.quoteNumber}</span></p>
                  <p><span className="font-bold text-slate-400 uppercase tracking-wider">Issue Date:</span> {activeQuote.issueDate}</p>
                  <p><span className="font-bold text-slate-400 uppercase tracking-wider">Valid Until:</span> {activeQuote.expiryDate}</p>
                  <p><span className="font-bold text-slate-400 uppercase tracking-wider">Status:</span> <span className="font-bold text-indigo-600">{activeQuote.status}</span></p>
                </div>
              </div>
            </div>

            {/* Recipient info & Billing Address block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-slate-200 text-xs">
              <div>
                <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Billing Recipient:</span>
                <span className="block font-black text-slate-900 text-sm">{activeQuote.customerName}</span>
                {activeQuote.companyName && activeQuote.companyName !== 'N/A' && (
                  <span className="block font-bold text-indigo-600 mt-0.5">{activeQuote.companyName}</span>
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
                  <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Shipping / Service Destination:</span>
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
                    <th className="py-2.5 w-6/12">Product / Service Specification</th>
                    <th className="py-2.5 w-1/12 text-center">Qty</th>
                    <th className="py-2.5 w-2/12 text-right">Unit Price (PKR)</th>
                    <th className="py-2.5 w-2/12 text-right">Total (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {editorItems.map((item, idx) => (
                    <tr key={idx} className="py-3">
                      <td className="py-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3">
                        <span className="font-bold text-slate-800 block text-[13px]">{item.productName}</span>
                      </td>
                      <td className="py-3 text-center font-mono text-slate-600">{item.quantity}</td>
                      <td className="py-3 text-right font-mono text-slate-600">
                        Rs. {item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-800">
                        Rs. {(item.quantity * item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary details bottom layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs">
              
              {/* Bank accounts / terms */}
              <div className="space-y-4">
                {companySettings?.bankName && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Banking Details:</span>
                    <div className="text-[10px] space-y-1">
                      <p><span className="font-bold">Bank Name:</span> {companySettings.bankName}</p>
                      <p><span className="font-bold">Account Title:</span> {companySettings.accountTitle}</p>
                      <p><span className="font-bold">Account No / IBAN:</span> <span className="font-mono font-bold">{companySettings.accountNumber}</span></p>
                    </div>
                  </div>
                )}

                {activeQuote.terms && (
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Terms of Service:</span>
                    <p className="text-[10px] text-slate-500 whitespace-pre-line leading-relaxed font-sans">{activeQuote.terms}</p>
                  </div>
                )}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-2.5 self-start md:pl-12 font-mono">
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Itemised Subtotal:</span>
                  <span>Rs. {calculationSummary.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>

                {calculationSummary.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-500 text-[11px] font-semibold">
                    <span>Discount Applied ({activeQuote.discountType === 'percentage' ? `${activeQuote.discountValue}%` : 'Flat'}):</span>
                    <span>- Rs. {calculationSummary.discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {calculationSummary.taxAmount > 0 && (
                  <div className="flex justify-between text-amber-600 text-[11px] font-semibold">
                    <span>GST Tax ({activeQuote.taxPercentage}%):</span>
                    <span>+ Rs. {calculationSummary.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-900 text-xs font-black pt-2.5 border-t border-slate-300">
                  <span>GRAND TOTAL (PKR):</span>
                  <span className="text-[13px] font-black text-indigo-600">Rs. {calculationSummary.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>

                {activeQuote.notes && (
                  <div className="pt-4 border-t border-dashed border-slate-200 font-sans font-normal text-[10px] text-slate-400 italic">
                    <span className="font-bold uppercase not-italic block mb-0.5 text-slate-500">Client Greetings:</span>
                    {activeQuote.notes}
                  </div>
                )}
              </div>

            </div>

            {/* Print Footer */}
            <div className="hidden print:block text-center text-[9px] text-slate-400 font-mono mt-16 pt-8 border-t border-slate-100">
              Generated via QuoteFlow PK. Page 1 of 1.
            </div>

          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {isDeleteModalOpen && selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-rose-200 bg-white p-5 shadow-2xl dark:border-rose-950/30 dark:bg-slate-950">
            
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 mb-3">
              <Trash2 className="h-5 w-5" />
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-center">Delete Quotation</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center leading-relaxed">
              Are you sure you want to delete <strong>{selectedQuote.quoteNumber}</strong> issued to <strong>{selectedQuote.customerName}</strong>?
              This operation is completely irreversible.
            </p>

            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedQuote(null);
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

      {/* CONFIRM CONVERSION MODAL */}
      {conversionQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl dark:border-amber-950/30 dark:bg-slate-950">
            
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 mb-3">
              <Receipt className="h-5 w-5" />
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-center">Convert to Invoice</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center leading-relaxed">
              Are you sure you want to convert quotation <strong>{conversionQuote.quoteNumber}</strong> into an invoice?
              This will automatically clone all line items, generate a new invoice number, and mark this quotation's status as <strong>Converted</strong>.
            </p>

            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setConversionQuote(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmConvert}
                disabled={isConverting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-xs font-bold text-white hover:opacity-95 disabled:opacity-50 transition-all"
              >
                {isConverting && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Convert & View</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
