import React, { useEffect, useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  ArrowUpDown, 
  Pencil, 
  Trash2, 
  Eye, 
  X, 
  Tag, 
  DollarSign, 
  Percent, 
  Layers, 
  Hash, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Info,
  Calendar,
  Layers3
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { dataService } from '../services/dataService';
import { Product } from '../types/business';
import { UserProfile } from '../types/auth';
import { isSubscriptionExpired, checkPlanLimits } from '../lib/subscription';

interface ProductsViewProps {
  isSupabaseConnected: boolean;
  user: UserProfile | null;
}

type SortField = 'name' | 'price' | 'date';
type SortOrder = 'asc' | 'desc';

const POPULAR_CATEGORIES = [
  'Cloud Services',
  'Software Development',
  'Consulting',
  'Support',
  'Hardware',
  'Subcription',
  'Marketing',
  'Other'
];

const POPULAR_UNITS = [
  'Hour',
  'Week',
  'Month',
  'Setup',
  'Project',
  'Piece',
  'Box',
  'Service'
];

export function ProductsView({ isSupabaseConnected, user }: ProductsViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formFields, setFormFields] = useState({
    productName: '',
    sku: '',
    category: '',
    description: '',
    unit: 'Piece',
    price: '',
    taxPercentage: '0',
  });

  const [formErrors, setFormErrors] = useState<{
    productName?: string;
    price?: string;
    sku?: string;
    unit?: string;
  }>({});

  // Product to view / delete
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Dynamic Categories loaded from products array + static ones
  const categoriesList = useMemo(() => {
    const list = new Set(POPULAR_CATEGORIES);
    products.forEach(p => {
      if (p.category && p.category.trim()) {
        list.add(p.category.trim());
      }
    });
    return ['All', ...Array.from(list)];
  }, [products]);

  // Load Products
  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await dataService.getProducts();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
      showToast('Failed to load products list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Filter and Sort Products
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    // Category filter
    if (selectedCategory !== 'All') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.productName.toLowerCase().includes(searchLower) ||
        (p.sku && p.sku.toLowerCase().includes(searchLower)) ||
        (p.description && p.description.toLowerCase().includes(searchLower)) ||
        (p.category && p.category.toLowerCase().includes(searchLower))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortField === 'name') {
        const nameA = a.productName.toLowerCase();
        const nameB = b.productName.toLowerCase();
        return sortOrder === 'asc' 
          ? nameA.localeCompare(nameB) 
          : nameB.localeCompare(nameA);
      } else if (sortField === 'price') {
        return sortOrder === 'asc' 
          ? a.price - b.price 
          : b.price - a.price;
      } else {
        // Date sort
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });

    return result;
  }, [products, searchTerm, selectedCategory, sortField, sortOrder]);

  // Pagination (10 per page)
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage) || 1;
  
  const paginatedProducts = useMemo(() => {
    const offset = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedProducts.slice(offset, offset + itemsPerPage);
  }, [filteredAndSortedProducts, currentPage]);

  // Reset page on filter/search or sort
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, sortField, sortOrder]);

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

    if (!formFields.productName.trim()) {
      errors.productName = 'Product name is required.';
      isValid = false;
    }

    const priceNum = parseFloat(formFields.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      errors.price = 'Price is required and must be greater than zero.';
      isValid = false;
    }

    if (!formFields.unit.trim()) {
      errors.unit = 'Unit measurement type is required.';
      isValid = false;
    }

    // SKU optional but validation can be done in dataService
    setFormErrors(errors);
    return isValid;
  };

  // Open Form modal for creation/edition
  const openFormModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormFields({
        productName: product.productName,
        sku: product.sku || '',
        category: product.category || 'Other',
        description: product.description || '',
        unit: product.unit,
        price: product.price.toString(),
        taxPercentage: (product.taxPercentage || 0).toString(),
      });
    } else {
      setEditingProduct(null);
      setFormFields({
        productName: '',
        sku: '',
        category: 'Other',
        description: '',
        unit: 'Piece',
        price: '',
        taxPercentage: '0',
      });
    }
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Save Product (Create/Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) {
      if (isSubscriptionExpired(user)) {
        alert('Your free trial has ended. Please upgrade your subscription to add new products.');
        return;
      }
      const limitCheck = await checkPlanLimits(user, 'products');
      if (limitCheck.reached) {
        alert(limitCheck.message);
        return;
      }
    }
    if (!validateForm()) return;

    setFormLoading(true);
    try {
      const productPayload = {
        productName: formFields.productName.trim(),
        sku: formFields.sku.trim() || undefined,
        category: formFields.category.trim() || 'Other',
        description: formFields.description.trim() || undefined,
        unit: formFields.unit.trim(),
        price: parseFloat(formFields.price),
        taxPercentage: parseFloat(formFields.taxPercentage) || 0,
        id: editingProduct?.id,
      };

      await dataService.saveProduct(productPayload);
      showToast(
        editingProduct 
          ? 'Product details updated successfully!' 
          : 'New product profile added to inventory!', 
        'success'
      );
      setIsFormModalOpen(false);
      loadProducts();
    } catch (err: any) {
      console.error('Failed to save product:', err);
      showToast(err.message || 'An error occurred while saving the product.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Trigger Delete confirmation
  const triggerDelete = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProduct) return;
    setDeleteLoading(true);
    try {
      await dataService.deleteProduct(selectedProduct.id);
      showToast('Product successfully deleted from inventory.', 'success');
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
      loadProducts();
    } catch (err: any) {
      console.error('Failed to delete product:', err);
      showToast(err.message || 'Failed to delete product record.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const viewDetails = (product: Product) => {
    setSelectedProduct(product);
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
            <Package className="h-5 w-5 text-indigo-500 dark:text-sky-400" />
            Inventory & Products
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure catalog goods, SaaS modules, hourly services, and applicable value-added taxes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isSubscriptionExpired(user)) {
              alert('Your free trial has ended. Please upgrade your subscription to add new products.');
              return;
            }
            openFormModal();
          }}
          disabled={isSubscriptionExpired(user)}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-md focus:outline-hidden transition-all shrink-0 active:scale-98 ${
            isSubscriptionExpired(user)
              ? 'bg-slate-400 dark:bg-slate-850 cursor-not-allowed opacity-50'
              : 'bg-gradient-to-r from-sky-500 to-indigo-600 shadow-indigo-500/10 hover:opacity-95 cursor-pointer'
          }`}
        >
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Categories Horizontal Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {categoriesList.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/15'
                : 'bg-white/80 border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Filters and Search Action bar */}
      <GlassCard className="p-4" intensity="low">
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, SKU, category, or description..."
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

          {/* Quick Sorting Toggles */}
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
              Name
              <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'name' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
            </button>

            <button
              onClick={() => handleSort('price')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                sortField === 'price'
                  ? 'bg-indigo-50/50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-sky-400'
                  : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              Price
              <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'price' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
            </button>

            <button
              onClick={() => handleSort('date')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                sortField === 'date'
                  ? 'bg-indigo-50/50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-sky-400'
                  : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              Created Date
              <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'date' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
            </button>
          </div>

        </div>
      </GlassCard>

      {/* Main Table View */}
      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-sky-400" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">Loading Inventory Database...</p>
          </div>
        </div>
      ) : products.length === 0 ? (
        /* Empty State */
        <GlassCard className="p-12 text-center" intensity="medium">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-sky-400 mb-4">
            <Package className="h-7 w-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Empty Product Catalog</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
            There are no products or hourly services in your inventory. Tap below to configure your very first item.
          </p>
          <button
            type="button"
            onClick={() => openFormModal()}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/10 focus:outline-hidden transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add First Product</span>
          </button>
        </GlassCard>
      ) : filteredAndSortedProducts.length === 0 ? (
        /* No Search Results */
        <GlassCard className="p-12 text-center" intensity="medium">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">No matching inventory items found for "{searchTerm}"</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('All');
            }}
            className="mt-3 text-xs text-indigo-600 dark:text-sky-400 hover:underline font-bold"
          >
            Reset Catalog Filters
          </button>
        </GlassCard>
      ) : (
        /* Products Table */
        <div className="space-y-4">
          <GlassCard className="overflow-hidden border border-slate-200/60 dark:border-slate-800/60" intensity="medium">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-950/40">
                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Item Detail</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">SKU / Code</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Category</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Unit Type</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Price (PKR)</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">VAT / Tax</th>
                    <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {paginatedProducts.map((product) => (
                    <tr 
                      key={product.id}
                      className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                    >
                      {/* Name & Desc */}
                      <td className="px-5 py-4 max-w-[280px]">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50/80 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-sky-300 mt-0.5">
                            <Package className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-sky-400 transition-colors truncate">
                              {product.productName}
                            </span>
                            {product.description ? (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate" title={product.description}>
                                {product.description}
                              </span>
                            ) : (
                              <span className="text-[10px] italic text-slate-400 dark:text-slate-600 block">No description</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-5 py-4 text-xs font-mono font-medium text-slate-700 dark:text-slate-400">
                        {product.sku ? (
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            {product.sku}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 italic">—</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
                        {product.category ? (
                          <span className="px-2.5 py-0.5 rounded-full border border-indigo-100 bg-indigo-50/50 text-[10px] font-bold text-indigo-600 dark:border-indigo-950/20 dark:bg-indigo-950/30 dark:text-sky-400 uppercase tracking-wide">
                            {product.category}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Unit Type */}
                      <td className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-300 font-mono">
                        {product.unit}
                      </td>

                      {/* Price */}
                      <td className="px-5 py-4 text-xs font-bold text-slate-800 dark:text-white font-mono">
                        Rs. {product.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* VAT / Tax */}
                      <td className="px-5 py-4 text-xs font-medium text-slate-500 dark:text-slate-400 font-mono">
                        {product.taxPercentage && product.taxPercentage > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            {product.taxPercentage}% GST
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">Tax Exempt (0%)</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="View Product Details"
                            onClick={() => viewDetails(product)}
                            className="p-1.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-100/50 text-slate-500 hover:text-slate-800 dark:hover:border-slate-800 dark:hover:bg-slate-800/50 dark:text-slate-400 dark:hover:text-white transition-all"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          
                          <button
                            title="Edit Product"
                            onClick={() => openFormModal(product)}
                            className="p-1.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-100/50 text-indigo-500 hover:text-indigo-700 dark:hover:border-slate-800 dark:hover:bg-slate-800/50 dark:text-sky-400 dark:hover:text-sky-300 transition-all"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          <button
                            title="Delete Product"
                            onClick={() => triggerDelete(product)}
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

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Showing <span className="font-bold text-slate-700 dark:text-white">{Math.min(filteredAndSortedProducts.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredAndSortedProducts.length, currentPage * itemsPerPage)}</span> of <span className="font-bold text-slate-700 dark:text-white">{filteredAndSortedProducts.length}</span> items
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

      {/* MODAL 1: ADD / EDIT PRODUCT */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            
            {/* Close */}
            <button
              onClick={() => setIsFormModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Title */}
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-indigo-500" />
              {editingProduct ? 'Modify Inventory Product' : 'Configure New Catalog Item'}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-5">
              Input specifications. SKUs are verified uniquely per workspace upon catalog record submission.
            </p>

            {/* Form */}
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                
                {/* Product Name */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Product Name / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dedicated PostgreSQL DB Migration"
                    value={formFields.productName}
                    onChange={(e) => setFormFields({ ...formFields, productName: e.target.value })}
                    className={`w-full rounded-xl border bg-white/50 px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 dark:bg-slate-900/50 dark:text-slate-200 transition-all ${
                      formErrors.productName 
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-800'
                    }`}
                  />
                  {formErrors.productName && (
                    <p className="mt-1 text-[9px] text-rose-500 font-semibold">{formErrors.productName}</p>
                  )}
                </div>

                {/* SKU / Code */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    SKU Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. QF-DB-POSTGRES"
                    value={formFields.sku}
                    onChange={(e) => setFormFields({ ...formFields, sku: e.target.value })}
                    className={`w-full rounded-xl border bg-white/50 px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 dark:bg-slate-900/50 dark:text-slate-200 transition-all ${
                      formErrors.sku
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-800'
                    }`}
                  />
                  {formErrors.sku && (
                    <p className="mt-1 text-[9px] text-rose-500 font-semibold">{formErrors.sku}</p>
                  )}
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Category Group
                  </label>
                  <select
                    value={formFields.category}
                    onChange={(e) => setFormFields({ ...formFields, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all"
                  >
                    {POPULAR_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Unit Price (PKR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2 py-0.5 text-xs text-slate-400 font-bold font-sans">Rs.</span>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={formFields.price}
                      onChange={(e) => setFormFields({ ...formFields, price: e.target.value })}
                      className={`w-full rounded-xl border bg-white/50 pl-10.5 pr-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 dark:bg-slate-900/50 dark:text-slate-200 transition-all font-mono ${
                        formErrors.price 
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-800'
                      }`}
                    />
                  </div>
                  {formErrors.price && (
                    <p className="mt-1 text-[9px] text-rose-500 font-semibold">{formErrors.price}</p>
                  )}
                </div>

                {/* Unit of Measure */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Unit of Measurement *
                  </label>
                  <input
                    type="text"
                    required
                    list="units"
                    placeholder="e.g. Hour, Month, Piece"
                    value={formFields.unit}
                    onChange={(e) => setFormFields({ ...formFields, unit: e.target.value })}
                    className={`w-full rounded-xl border bg-white/50 px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 dark:bg-slate-900/50 dark:text-slate-200 transition-all ${
                      formErrors.unit
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-800'
                    }`}
                  />
                  <datalist id="units">
                    {POPULAR_UNITS.map(u => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                  {formErrors.unit && (
                    <p className="mt-1 text-[9px] text-rose-500 font-semibold">{formErrors.unit}</p>
                  )}
                </div>

                {/* Value-Added Tax / GST */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    GST / Sales Tax Percentage (%)
                  </label>
                  <select
                    value={formFields.taxPercentage}
                    onChange={(e) => setFormFields({ ...formFields, taxPercentage: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all font-mono"
                  >
                    <option value="0">0% (Tax Exempt / Zero-Rated)</option>
                    <option value="5">5% (Reduced Rate)</option>
                    <option value="13">13% (Standard Services GST)</option>
                    <option value="16">16% (Standard Regional GST)</option>
                    <option value="18">18% (Standard Sales Tax)</option>
                  </select>
                </div>

                {/* Item Description */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Detailed Scope / Item Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter structural components, scope, exclusions, or SLA specifics..."
                    value={formFields.description}
                    onChange={(e) => setFormFields({ ...formFields, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all resize-none font-sans"
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/10 hover:opacity-95 focus:outline-hidden disabled:opacity-50 transition-all animate-pulse-once"
                >
                  {formLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>{formLoading ? 'Configuring...' : 'Save Product'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM DELETE */}
      {isDeleteModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-rose-200 bg-white p-5 shadow-2xl dark:border-rose-950/30 dark:bg-slate-950">
            
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 mb-3">
              <Trash2 className="h-5 w-5" />
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-center">Delete Product</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center leading-relaxed">
              Are you sure you want to delete <strong>{selectedProduct.productName}</strong> from inventory?
              All future quotations cannot link this exact model.
            </p>

            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedProduct(null);
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

      {/* MODAL 3: VIEW PRODUCT DETAILS */}
      {isDetailModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            
            {/* Close */}
            <button
              onClick={() => {
                setIsDetailModalOpen(false);
                setSelectedProduct(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Title Card */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-base font-bold text-white shadow-md shadow-indigo-500/10">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{selectedProduct.productName}</h3>
                <span className="text-[10px] text-indigo-600 dark:text-sky-400 font-bold flex items-center gap-1 mt-0.5">
                  <Layers3 className="h-3 w-3" />
                  {selectedProduct.category || 'Other Category'}
                </span>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="space-y-4">
              
              {/* SKU Info */}
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Inventory SKU / Code</span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    {selectedProduct.sku || <span className="italic font-normal text-slate-400">Not Configured</span>}
                  </span>
                </div>
              </div>

              {/* Price Info */}
              <div className="flex items-start gap-3">
                <DollarSign className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Base Cost Rate</span>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Rs. {selectedProduct.price.toLocaleString('en-US', { minimumFractionDigits: 2 })} / <span className="font-normal text-slate-500 dark:text-slate-400">{selectedProduct.unit}</span>
                  </span>
                </div>
              </div>

              {/* Tax Info */}
              <div className="flex items-start gap-3">
                <Percent className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Standard Sales Tax / GST</span>
                  <span className="text-xs text-slate-800 dark:text-slate-200 font-mono">
                    {selectedProduct.taxPercentage ? `${selectedProduct.taxPercentage}%` : '0% (Tax Exempt)'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="flex items-start gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <Info className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Catalog Scope Details</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 mt-1 leading-relaxed max-h-[140px] overflow-y-auto font-sans">
                    {selectedProduct.description || 'No detailed scope configured for this catalog item.'}
                  </p>
                </div>
              </div>

              {/* Metadata dates */}
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-2">
                <Calendar className="h-3 w-3" />
                <span>Added: {selectedProduct.createdAt ? new Date(selectedProduct.createdAt).toLocaleString() : 'N/A'}</span>
              </div>

            </div>

            {/* Action Footer */}
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 mt-5">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedProduct(null);
                }}
                className="w-full rounded-xl bg-slate-100 hover:bg-slate-200/80 py-2.5 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                Close Catalog Card
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
