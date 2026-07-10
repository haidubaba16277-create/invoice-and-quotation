import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  ArrowUpDown, 
  Pencil, 
  Trash2, 
  Eye, 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Building2, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Calendar,
  Globe
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { dataService } from '../services/dataService';
import { Customer } from '../types/business';

interface CustomersViewProps {
  isSupabaseConnected: boolean;
}

type SortField = 'name' | 'date';
type SortOrder = 'asc' | 'desc';

export function CustomersView({ isSupabaseConnected }: CustomersViewProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals / Dialogs
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formFields, setFormFields] = useState({
    customerName: '',
    companyName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<{
    customerName?: string;
    phone?: string;
    email?: string;
  }>({});

  // Customer to view / delete
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load Customers
  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await dataService.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
      showToast('Failed to load customers list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Filter and Sort Customers
  const filteredAndSortedCustomers = useMemo(() => {
    let result = [...customers];

    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.customerName.toLowerCase().includes(searchLower) ||
        (c.companyName && c.companyName.toLowerCase().includes(searchLower)) ||
        c.phone.includes(searchLower) ||
        (c.email && c.email.toLowerCase().includes(searchLower)) ||
        (c.city && c.city.toLowerCase().includes(searchLower))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortField === 'name') {
        const nameA = a.customerName.toLowerCase();
        const nameB = b.customerName.toLowerCase();
        return sortOrder === 'asc' 
          ? nameA.localeCompare(nameB) 
          : nameB.localeCompare(nameA);
      } else {
        // Date sort
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });

    return result;
  }, [customers, searchTerm, sortField, sortOrder]);

  // Pagination (10 per page)
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredAndSortedCustomers.length / itemsPerPage) || 1;
  
  const paginatedCustomers = useMemo(() => {
    const offset = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedCustomers.slice(offset, offset + itemsPerPage);
  }, [filteredAndSortedCustomers, currentPage]);

  // Reset page on search or sort
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Form Validation
  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};
    let isValid = true;

    if (!formFields.customerName.trim()) {
      errors.customerName = 'Customer Name is required.';
      isValid = false;
    }

    if (!formFields.phone.trim()) {
      errors.phone = 'Phone number is required.';
      isValid = false;
    }

    if (formFields.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formFields.email.trim())) {
        errors.email = 'Please enter a valid email format (e.g. name@company.com).';
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  // Open Form modal for creation/edition
  const openFormModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormFields({
        customerName: customer.customerName,
        companyName: customer.companyName || '',
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        city: customer.city || '',
        notes: customer.notes || '',
      });
    } else {
      setEditingCustomer(null);
      setFormFields({
        customerName: '',
        companyName: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        notes: '',
      });
    }
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Save Customer (Create/Update)
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormLoading(true);
    try {
      const customerPayload = {
        ...formFields,
        id: editingCustomer?.id,
      };

      await dataService.saveCustomer(customerPayload);
      showToast(
        editingCustomer 
          ? 'Customer details updated successfully!' 
          : 'New customer profile registered successfully!', 
        'success'
      );
      setIsFormModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      console.error('Failed to save customer:', err);
      showToast(err.message || 'An error occurred while saving the customer.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Trigger Delete confirmation
  const triggerDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCustomer) return;
    setDeleteLoading(true);
    try {
      await dataService.deleteCustomer(selectedCustomer.id);
      showToast('Customer contacts successfully deleted.', 'success');
      setIsDeleteModalOpen(false);
      setSelectedCustomer(null);
      loadCustomers();
    } catch (err: any) {
      console.error('Failed to delete customer:', err);
      showToast(err.message || 'Failed to delete customer record.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const viewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
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

      {/* Header section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500 dark:text-sky-400" />
            Customer Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Store, validate, search, and manage your contacts, business associations, and private profiles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openFormModal()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/10 hover:opacity-95 focus:outline-hidden transition-all shrink-0 active:scale-98"
        >
          <Plus className="h-4 w-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* CRM Actions card */}
      <GlassCard className="p-4" intensity="low">
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, company, email, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/50 pl-9.5 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all font-sans"
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

          {/* Quick Filter Sort Toggle Indicators */}
          <div className="flex items-center gap-2.5 self-end md:self-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">Sort by:</span>
            
            <button
              onClick={() => handleSort('name')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                sortField === 'name'
                  ? 'bg-indigo-50/50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-sky-400'
                  : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              Customer Name
              <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'name' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
            </button>

            <button
              onClick={() => handleSort('date')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                sortField === 'date'
                  ? 'bg-indigo-50/50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-sky-400'
                  : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              Registration Date
              <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'date' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
            </button>
          </div>

        </div>
      </GlassCard>

      {/* Main Table Screen */}
      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-sky-400" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">Loading Contact Database...</p>
          </div>
        </div>
      ) : customers.length === 0 ? (
        /* Empty State */
        <GlassCard className="p-12 text-center" intensity="medium">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-sky-400 mb-4">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">No Customers Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
            There are no customer records in your profile. Click the button below to register your first corporate contact.
          </p>
          <button
            type="button"
            onClick={() => openFormModal()}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/10 focus:outline-hidden transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create First Customer</span>
          </button>
        </GlassCard>
      ) : filteredAndSortedCustomers.length === 0 ? (
        /* Search Query No Results */
        <GlassCard className="p-12 text-center" intensity="medium">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">No matching results for search query: "{searchTerm}"</p>
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="mt-3 text-xs text-indigo-600 dark:text-sky-400 hover:underline font-bold"
          >
            Clear Search Filters
          </button>
        </GlassCard>
      ) : (
        /* Customer Table */
        <div className="space-y-4">
          <GlassCard className="overflow-hidden border border-slate-200/60 dark:border-slate-800/60" intensity="medium">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-950/40">
                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Contact / Name</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Company Name</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Phone</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">City</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Reg. Date</th>
                    <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {paginatedCustomers.map((customer) => (
                    <tr 
                      key={customer.id}
                      className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                    >
                      {/* Name / Email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50/80 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-sky-300">
                            {customer.customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-sky-400 transition-colors">
                              {customer.customerName}
                            </span>
                            {customer.email ? (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate max-w-[150px]">
                                {customer.email}
                              </span>
                            ) : (
                              <span className="text-[10px] italic text-slate-400 dark:text-slate-600 block">No Email</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {customer.companyName ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>{customer.companyName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 italic">Individual Contact</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4 text-xs font-mono font-medium text-slate-700 dark:text-slate-400">
                        {customer.phone}
                      </td>

                      {/* City */}
                      <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
                        {customer.city ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            {customer.city}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 italic">—</span>
                        )}
                      </td>

                      {/* Reg Date */}
                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-500">
                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }) : 'N/A'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="View Customer Details"
                            onClick={() => viewDetails(customer)}
                            className="p-1.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-100/50 text-slate-500 hover:text-slate-800 dark:hover:border-slate-800 dark:hover:bg-slate-800/50 dark:text-slate-400 dark:hover:text-white transition-all"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          
                          <button
                            title="Edit Customer"
                            onClick={() => openFormModal(customer)}
                            className="p-1.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-100/50 text-indigo-500 hover:text-indigo-700 dark:hover:border-slate-800 dark:hover:bg-slate-800/50 dark:text-sky-400 dark:hover:text-sky-300 transition-all"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          <button
                            title="Delete Customer"
                            onClick={() => triggerDelete(customer)}
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

          {/* Pagination Selector bar */}
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Showing <span className="font-bold text-slate-700 dark:text-white">{Math.min(filteredAndSortedCustomers.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredAndSortedCustomers.length, currentPage * itemsPerPage)}</span> of <span className="font-bold text-slate-700 dark:text-white">{filteredAndSortedCustomers.length}</span> customers
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
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-xs'
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

      {/* MODAL 1: ADD / EDIT CUSTOMER */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            
            {/* Modal close */}
            <button
              onClick={() => setIsFormModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Heading */}
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-indigo-500" />
              {editingCustomer ? 'Modify Customer Profile' : 'Register New Customer'}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-5">
              Enter customer metadata. Phone numbers are strictly unique triggers on contact profile registration.
            </p>

            {/* Form */}
            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                
                {/* Customer Name */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Haris Rehman"
                    value={formFields.customerName}
                    onChange={(e) => setFormFields({ ...formFields, customerName: e.target.value })}
                    className={`w-full rounded-xl border bg-white/50 px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 dark:bg-slate-900/50 dark:text-slate-200 transition-all ${
                      formErrors.customerName 
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-800'
                    }`}
                  />
                  {formErrors.customerName && (
                    <p className="mt-1 text-[9px] text-rose-500 font-semibold">{formErrors.customerName}</p>
                  )}
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nexus Tech Ltd"
                    value={formFields.companyName}
                    onChange={(e) => setFormFields({ ...formFields, companyName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +92 300 1234567"
                    value={formFields.phone}
                    onChange={(e) => setFormFields({ ...formFields, phone: e.target.value })}
                    className={`w-full rounded-xl border bg-white/50 px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 dark:bg-slate-900/50 dark:text-slate-200 transition-all ${
                      formErrors.phone 
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-800'
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-[9px] text-rose-500 font-semibold">{formErrors.phone}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. client@domain.com"
                    value={formFields.email}
                    onChange={(e) => setFormFields({ ...formFields, email: e.target.value })}
                    className={`w-full rounded-xl border bg-white/50 px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 dark:bg-slate-900/50 dark:text-slate-200 transition-all ${
                      formErrors.email 
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-800'
                    }`}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-[9px] text-rose-500 font-semibold">{formErrors.email}</p>
                  )}
                </div>

                {/* City */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Karachi"
                    value={formFields.city}
                    onChange={(e) => setFormFields({ ...formFields, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all"
                  />
                </div>

                {/* Full Address */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Physical Address
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Suit 402, Dolmen Mall Clifton, Karachi"
                    value={formFields.address}
                    onChange={(e) => setFormFields({ ...formFields, address: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all resize-none"
                  />
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    CRM & Client Profile Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Notes regarding quotation preference, pricing discounts, specific milestones..."
                    value={formFields.notes}
                    onChange={(e) => setFormFields({ ...formFields, notes: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all resize-none"
                  />
                </div>

              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 mt-5">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/10 hover:opacity-95 focus:outline-hidden disabled:opacity-50 transition-all"
                >
                  {formLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>{formLoading ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM DELETE */}
      {isDeleteModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-rose-200 bg-white p-5 shadow-2xl dark:border-rose-950/30 dark:bg-slate-950">
            
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 mb-3">
              <Trash2 className="h-5 w-5" />
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-center">Confirm Deletion</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center leading-relaxed">
              Are you absolutely sure you want to delete customer <strong>{selectedCustomer.customerName}</strong>?
              This action is permanent and cannot be undone.
            </p>

            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedCustomer(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                No, Keep Record
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

      {/* MODAL 3: VIEW CUSTOMER DETAILS */}
      {isDetailModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            
            {/* Close button */}
            <button
              onClick={() => {
                setIsDetailModalOpen(false);
                setSelectedCustomer(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Profile Avatar Card */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-base font-bold text-white shadow-md shadow-indigo-500/10">
                {selectedCustomer.customerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{selectedCustomer.customerName}</h3>
                <span className="text-[10px] text-indigo-600 dark:text-sky-400 font-bold flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3" />
                  {selectedCustomer.companyName || 'Registered Individual'}
                </span>
              </div>
            </div>

            {/* Profile Details fields */}
            <div className="space-y-4">
              
              {/* Phone info */}
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Contact Number</span>
                  <span className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200">{selectedCustomer.phone}</span>
                </div>
              </div>

              {/* Email info */}
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email Address</span>
                  <span className="text-xs text-slate-800 dark:text-slate-200">
                    {selectedCustomer.email || <span className="italic text-slate-400">None Provided</span>}
                  </span>
                </div>
              </div>

              {/* City info */}
              <div className="flex items-start gap-3">
                <Globe className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Registered City</span>
                  <span className="text-xs text-slate-800 dark:text-slate-200">
                    {selectedCustomer.city || <span className="italic text-slate-400">Not Specified</span>}
                  </span>
                </div>
              </div>

              {/* Physical Address info */}
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Delivery Address</span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                    {selectedCustomer.address || <span className="italic text-slate-400">None Specified</span>}
                  </p>
                </div>
              </div>

              {/* Notes info */}
              <div className="flex items-start gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <MessageSquare className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Private CRM Comments</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 mt-1 leading-relaxed italic max-h-[140px] overflow-y-auto">
                    {selectedCustomer.notes || 'No notes added for this contact profile yet.'}
                  </p>
                </div>
              </div>

              {/* Metadata dates */}
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-2">
                <Calendar className="h-3 w-3" />
                <span>Registered: {selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleString() : 'N/A'}</span>
              </div>

            </div>

            {/* Action Footer */}
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 mt-5">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedCustomer(null);
                }}
                className="w-full rounded-xl bg-slate-100 hover:bg-slate-200/80 py-2.5 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
