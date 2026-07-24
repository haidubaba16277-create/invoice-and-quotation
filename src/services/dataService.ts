import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Customer, Product, Quotation, Invoice, QuoteItem, CompanySettings, QuotationActivity, OwnerNotification } from '../types/business';

// Base keys for localStorage (namespaced by userId for multi-tenant isolation)
const CUSTOMERS_KEY = 'quoteflow_customers';
const PRODUCTS_KEY = 'quoteflow_products';
const QUOTATIONS_KEY = 'quoteflow_quotations';
const INVOICES_KEY = 'quoteflow_invoices';
const COMPANY_SETTINGS_KEY = 'quoteflow_company_settings';
const ACTIVITIES_KEY = 'quoteflow_quotation_activities';
const NOTIFICATIONS_KEY = 'quoteflow_owner_notifications';
const APPROVED_KEY = 'quoteflow_approved_quotes';
const SUPABASE_MIGRATION_GUIDE_DISMISSED = 'quoteflow_migration_dismissed';

export const isUuid = (val?: string): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

// Default Company Settings
const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'QuoteFlow Pro (Pvt) Ltd',
  ownerName: 'Haris Rehman',
  email: 'billing@quoteflow.com',
  phone: '+1 212 555 0199',
  website: 'https://quoteflow.com',
  address: 'Suite 402, Commercial Tower, City Center',
  taxNumber: 'TAX-7294810-5',
  bankName: 'Standard Chartered Bank',
  accountTitle: 'QuoteFlow Pro (Pvt) Ltd',
  accountNumber: '00421650012345',
  logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=60',
  currencySymbol: 'Rs.',
  taxRate: 18,
  quotePrefix: 'QT-',
  invoicePrefix: 'INV-',
  nextQuoteNumber: 1001,
  nextInvoiceNumber: 2001,
  termsConditions: '1. Quotations are valid for 15 days from the date of issue.\n2. 50% advance payment is required to mobilize development resources.\n3. Balance payment is due within 10 days of final project deployment / UAT acceptance.',
  footerNotes: 'Thank you for choosing QuoteFlow. We value your business!',
};

let isSupabaseSchemaActive = true;

// Helper for portable, URL-safe Base64 encoding for public quotation tokens
function encodeQuoteToken(quote: Quotation, companySettings?: CompanySettings | null): string {
  const payload = {
    v: 1,
    id: quote.id,
    qn: quote.quoteNumber,
    cn: quote.customerName,
    cpn: quote.companyName,
    idate: quote.issueDate,
    edate: quote.expiryDate,
    st: quote.status,
    sub: quote.subtotal,
    dt: quote.discountType,
    dv: quote.discountValue,
    tp: quote.taxPercentage,
    ta: quote.taxAmount,
    gt: quote.grandTotal,
    nt: quote.notes,
    tm: quote.terms,
    items: (quote.items || []).map(i => ({
      id: i.id,
      pn: i.productName,
      qty: i.quantity,
      up: i.unitPrice,
      tp: i.taxPercentage,
      lt: i.lineTotal
    })),
    comp: companySettings ? {
      companyName: companySettings.companyName,
      ownerName: companySettings.ownerName,
      phone: companySettings.phone,
      email: companySettings.email,
      address: companySettings.address,
      taxNumber: companySettings.taxNumber,
      bankName: companySettings.bankName,
      accountTitle: companySettings.accountTitle,
      accountNumber: companySettings.accountNumber,
      logoUrl: companySettings.logoUrl,
      currencySymbol: companySettings.currencySymbol
    } : null
  };

  try {
    const jsonStr = JSON.stringify(payload);
    const encoded = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
    return 'q_' + encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error('Failed to encode quote token:', e);
    return quote.quoteNumber || quote.id;
  }
}

function decodeQuoteToken(token: string): { quotation: Quotation; companySettings?: CompanySettings } | null {
  if (!token) return null;
  let rawStr = token;
  if (token.startsWith('q_') || token.startsWith('e_')) {
    rawStr = token.substring(2);
  } else if (!token.includes('{') && token.length > 30) {
    rawStr = token;
  } else {
    return null;
  }

  try {
    let base64 = rawStr.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonStr = decodeURIComponent(Array.prototype.map.call(atob(base64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    const p = JSON.parse(jsonStr);

    if (p && (p.qn || p.quoteNumber || p.id)) {
      const quotation: Quotation = {
        id: p.id || 'quote-' + (p.qn || p.quoteNumber),
        quoteNumber: p.qn || p.quoteNumber || 'QT-001',
        customerId: p.cid || p.customerId || '',
        customerName: p.cn || p.customerName || 'Customer',
        companyName: p.cpn || p.companyName || 'N/A',
        issueDate: p.idate || p.issueDate || new Date().toISOString(),
        expiryDate: p.edate || p.expiryDate || '',
        status: p.st || p.status || 'Sent',
        subtotal: Number(p.sub || p.subtotal || 0),
        discountType: p.dt || p.discountType || 'fixed',
        discountValue: Number(p.dv || p.discountValue || 0),
        taxPercentage: Number(p.tp || p.taxPercentage || 0),
        taxAmount: Number(p.ta || p.taxAmount || 0),
        grandTotal: Number(p.gt || p.grandTotal || 0),
        notes: p.nt || p.notes || '',
        terms: p.tm || p.terms || '',
        items: (p.items || []).map((i: any, idx: number) => ({
          id: i.id || `item-${idx}`,
          productName: i.pn || i.productName || 'Item',
          quantity: Number(i.qty || i.quantity || 1),
          unitPrice: Number(i.up || i.unitPrice || 0),
          taxPercentage: Number(i.tp || i.taxPercentage || 0),
          lineTotal: Number(i.lt || i.lineTotal || 0),
        }))
      };

      const companySettings = p.comp ? (p.comp as CompanySettings) : undefined;
      return { quotation, companySettings };
    }
  } catch (err) {
    console.error('Failed to decode quote token:', err);
  }
  return null;
}

export const dataService = {
  // Check if we should render migration SQL banner
  isSchemaActive(): boolean {
    return isSupabaseSchemaActive;
  },

  setSchemaInactive() {
    isSupabaseSchemaActive = false;
  },

  isMigrationBannerDismissed(): boolean {
    return localStorage.getItem(SUPABASE_MIGRATION_GUIDE_DISMISSED) === 'true';
  },

  dismissMigrationBanner() {
    localStorage.setItem(SUPABASE_MIGRATION_GUIDE_DISMISSED, 'true');
  },

  // Get current authenticated user ID from Supabase or active session
  async getCurrentUserId(): Promise<string | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) return user.id;
      } catch (e) {}
      return null;
    }
    const sessionStr = localStorage.getItem('quoteflow_local_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session?.user?.id) return session.user.id;
      } catch (e) {}
    }
    return null;
  },

  // Generate tenant-scoped localStorage key
  getUserScopedKey(baseKey: string, userId?: string | null): string | null {
    if (userId) return `${baseKey}_${userId}`;
    return null; // Return null if unauthenticated so no customer records are exposed via global keys
  },

  // Clear un-namespaced legacy keys to avoid cross-tenant contamination
  cleanLegacyGlobalKeys() {
    try {
      localStorage.removeItem('quoteflow_customers');
      localStorage.removeItem('quoteflow_products');
      localStorage.removeItem('quoteflow_quotations');
      localStorage.removeItem('quoteflow_invoices');
      localStorage.removeItem('quoteflow_company_settings');
    } catch (e) {}
  },

  // --- Customers Methods ---
  async getCustomers(): Promise<Customer[]> {
    this.cleanLegacyGlobalKeys();
    const userId = await this.getCurrentUserId();
    if (!userId) return []; // Unauthenticated = zero tenant data leak

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', userId) // STRICT MULTI-TENANT FILTER
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === '42P01') {
            isSupabaseSchemaActive = false;
          } else {
            console.error('Failed to query customers from Supabase:', error);
            return [];
          }
        } else if (data) {
          const customers: Customer[] = data.map(c => ({
            id: c.id,
            userId: c.user_id,
            customerName: c.customer_name,
            companyName: c.company_name,
            phone: c.phone,
            email: c.email,
            address: c.address,
            city: c.city,
            notes: c.notes,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));

          const key = this.getUserScopedKey(CUSTOMERS_KEY, userId);
          if (key) localStorage.setItem(key, JSON.stringify(customers));
          return customers;
        }
      } catch (err) {
        console.error('Failed to load customers from Supabase:', err);
        return [];
      }
    }

    const key = this.getUserScopedKey(CUSTOMERS_KEY, userId);
    if (key) {
      return JSON.parse(localStorage.getItem(key) || '[]');
    }
    return [];
  },

  async saveCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Customer> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('Authentication required to save customer.');
    }

    const isNew = !customer.id;
    const finalId = customer.id || 'cust-' + Math.random().toString(36).substr(2, 9);
    const nowStr = new Date().toISOString();

    const fullCustomer: Customer = {
      ...customer,
      id: finalId,
      userId: userId,
      createdAt: isNew ? nowStr : (customer as any).createdAt || nowStr,
      updatedAt: nowStr,
    };

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const mappedData = {
          id: isNew ? undefined : customer.id,
          user_id: userId, // FORCE USER OWNERSHIP
          customer_name: customer.customerName,
          company_name: customer.companyName,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          city: customer.city,
          notes: customer.notes,
          updated_at: nowStr,
        };

        let result;
        if (isNew) {
          result = await supabase.from('customers').insert(mappedData).select().single();
        } else {
          result = await supabase.from('customers').update(mappedData).eq('id', customer.id).eq('user_id', userId).select().single();
        }

        if (result.error) {
          if (result.error.code === '23505') {
            throw new Error('A customer with this phone number already exists in your contacts list.');
          }
          throw result.error;
        }

        if (result.data) {
          const saved: Customer = {
            id: result.data.id,
            userId: result.data.user_id,
            customerName: result.data.customer_name,
            companyName: result.data.company_name,
            phone: result.data.phone,
            email: result.data.email,
            address: result.data.address,
            city: result.data.city,
            notes: result.data.notes,
            createdAt: result.data.created_at,
            updatedAt: result.data.updated_at,
          };

          const customers = await this.getCustomers();
          const updated = isNew ? [saved, ...customers] : customers.map(c => c.id === saved.id ? saved : c);
          const key = this.getUserScopedKey(CUSTOMERS_KEY, userId);
          if (key) localStorage.setItem(key, JSON.stringify(updated));
          return saved;
        }
      } catch (err: any) {
        console.error('Failed to save customer to Supabase:', err);
        if (err?.code === '42P01') isSupabaseSchemaActive = false;
        if (err?.code === '23505' || err?.message?.includes('already exists')) {
          throw new Error('A customer with this phone number already exists in your contacts list.');
        }
      }
    }

    // Local storage fallback
    const customers = await this.getCustomers();
    const isDuplicatePhone = customers.some(
      c => c.phone.trim() === customer.phone.trim() && c.id !== customer.id
    );
    if (isDuplicatePhone) {
      throw new Error('A customer with this phone number already exists in your contacts list.');
    }

    const updated = isNew 
      ? [fullCustomer, ...customers] 
      : customers.map(c => c.id === customer.id ? { ...c, ...customer, updatedAt: nowStr } : c);

    const key = this.getUserScopedKey(CUSTOMERS_KEY, userId);
    if (key) localStorage.setItem(key, JSON.stringify(updated));
    return isNew ? fullCustomer : (updated.find(c => c.id === customer.id) as Customer);
  },

  async deleteCustomer(id: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) return;

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', id).eq('user_id', userId);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete customer from Supabase:', err);
      }
    }

    const customers = await this.getCustomers();
    const filtered = customers.filter(c => c.id !== id);
    const key = this.getUserScopedKey(CUSTOMERS_KEY, userId);
    if (key) localStorage.setItem(key, JSON.stringify(filtered));
  },

  // --- Products Methods ---
  async getProducts(): Promise<Product[]> {
    this.cleanLegacyGlobalKeys();
    const userId = await this.getCurrentUserId();
    if (!userId) return []; // Unauthenticated = zero tenant data leak

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', userId) // STRICT MULTI-TENANT FILTER
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === '42P01') {
            isSupabaseSchemaActive = false;
          } else {
            console.error('Failed to query products from Supabase:', error);
            return [];
          }
        } else if (data) {
          const products: Product[] = data.map(p => ({
            id: p.id,
            userId: p.user_id,
            productName: p.product_name,
            sku: p.sku,
            category: p.category,
            description: p.description,
            unit: p.unit,
            price: Number(p.price),
            taxPercentage: Number(p.tax_percentage || 0),
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          }));

          const key = this.getUserScopedKey(PRODUCTS_KEY, userId);
          if (key) localStorage.setItem(key, JSON.stringify(products));
          return products;
        }
      } catch (err) {
        console.error('Failed to load products from Supabase:', err);
        return [];
      }
    }

    const key = this.getUserScopedKey(PRODUCTS_KEY, userId);
    if (key) {
      return JSON.parse(localStorage.getItem(key) || '[]');
    }
    return [];
  },

  async saveProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Product> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('Authentication required to save product.');
    }

    const isNew = !product.id;
    const finalId = product.id || 'prod-' + Math.random().toString(36).substr(2, 9);
    const nowStr = new Date().toISOString();

    const fullProduct: Product = {
      ...product,
      id: finalId,
      userId: userId,
      createdAt: isNew ? nowStr : (product as any).createdAt || nowStr,
      updatedAt: nowStr,
    };

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const mappedData = {
          id: isNew ? undefined : product.id,
          user_id: userId, // FORCE USER OWNERSHIP
          product_name: product.productName,
          sku: product.sku || null,
          category: product.category || null,
          description: product.description || null,
          unit: product.unit,
          price: product.price,
          tax_percentage: product.taxPercentage || 0,
          updated_at: nowStr,
        };

        let result;
        if (isNew) {
          result = await supabase.from('products').insert(mappedData).select().single();
        } else {
          result = await supabase.from('products').update(mappedData).eq('id', product.id).eq('user_id', userId).select().single();
        }

        if (result.error) {
          if (result.error.code === '23505') {
            throw new Error('A product with this SKU already exists in your inventory.');
          }
          throw result.error;
        }

        if (result.data) {
          const saved: Product = {
            id: result.data.id,
            userId: result.data.user_id,
            productName: result.data.product_name,
            sku: result.data.sku,
            category: result.data.category,
            description: result.data.description,
            unit: result.data.unit,
            price: Number(result.data.price),
            taxPercentage: Number(result.data.tax_percentage || 0),
            createdAt: result.data.created_at,
            updatedAt: result.data.updated_at,
          };

          const products = await this.getProducts();
          const updated = isNew ? [saved, ...products] : products.map(p => p.id === saved.id ? saved : p);
          const key = this.getUserScopedKey(PRODUCTS_KEY, userId);
          if (key) localStorage.setItem(key, JSON.stringify(updated));
          return saved;
        }
      } catch (err: any) {
        console.error('Failed to save product to Supabase:', err);
        if (err?.code === '42P01') isSupabaseSchemaActive = false;
        if (err?.code === '23505' || err?.message?.includes('already exists')) {
          throw new Error('A product with this SKU already exists in your inventory.');
        }
      }
    }

    // Local storage fallback
    const products = await this.getProducts();
    if (product.sku && product.sku.trim()) {
      const isDuplicateSku = products.some(
        p => p.sku && p.sku.trim().toLowerCase() === product.sku!.trim().toLowerCase() && p.id !== product.id
      );
      if (isDuplicateSku) {
        throw new Error('A product with this SKU already exists in your inventory.');
      }
    }

    const updated = isNew 
      ? [fullProduct, ...products] 
      : products.map(p => p.id === product.id ? { ...p, ...product, updatedAt: nowStr } : p);

    const key = this.getUserScopedKey(PRODUCTS_KEY, userId);
    if (key) localStorage.setItem(key, JSON.stringify(updated));
    return isNew ? fullProduct : (updated.find(p => p.id === product.id) as Product);
  },

  async deleteProduct(id: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) return;

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id).eq('user_id', userId);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete product from Supabase:', err);
      }
    }

    const products = await this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    const key = this.getUserScopedKey(PRODUCTS_KEY, userId);
    if (key) localStorage.setItem(key, JSON.stringify(filtered));
  },

  // --- Quotations Methods ---
  async getQuotations(): Promise<Quotation[]> {
    this.cleanLegacyGlobalKeys();
    const userId = await this.getCurrentUserId();
    if (!userId) return []; // Unauthenticated = zero tenant data leak

    let fetchedQuotations: Quotation[] = [];

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const { data, error } = await supabase
          .from('quotations')
          .select('*, customers(*), quotation_items(*)')
          .eq('user_id', userId) // STRICT MULTI-TENANT FILTER
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === '42P01') {
            isSupabaseSchemaActive = false;
          } else {
            console.error('Failed to query quotations from Supabase:', error);
            return [];
          }
        } else if (data) {
          fetchedQuotations = data.map((q: any) => ({
            id: q.id,
            userId: q.user_id,
            quoteNumber: q.quote_number,
            customerId: q.customer_id || '',
            customerName: q.customers?.customer_name || q.customer_name || 'Customer',
            companyName: q.customers?.company_name || q.company_name || 'N/A',
            issueDate: q.issue_date,
            expiryDate: q.expiry_date,
            status: q.status,
            subtotal: Number(q.subtotal),
            discountType: q.discount_type || 'fixed',
            discountValue: Number(q.discount_value || 0),
            taxPercentage: Number(q.tax_percentage || 0),
            taxAmount: Number(q.tax_amount || 0),
            grandTotal: Number(q.grand_total),
            notes: q.notes,
            terms: q.terms,
            createdAt: q.created_at,
            updatedAt: q.updated_at,
            items: (q.quotation_items || []).map((qi: any) => ({
              id: qi.id,
              quotationId: qi.quotation_id,
              productId: qi.product_id,
              productName: qi.product_name,
              quantity: Number(qi.quantity),
              unitPrice: Number(qi.unit_price),
              taxPercentage: Number(qi.tax_percentage || 0),
              lineTotal: Number(qi.line_total),
            })),
          }));

          // Apply local approval/rejection status overrides if present
          try {
            const approvedMap = JSON.parse(localStorage.getItem(APPROVED_KEY) || '{}');
            if (Object.keys(approvedMap).length > 0) {
              fetchedQuotations = fetchedQuotations.map(q => {
                const appOverride = approvedMap[q.id] || (q.quoteNumber ? approvedMap[q.quoteNumber] : null);
                if (appOverride) {
                  return {
                    ...q,
                    status: appOverride.status,
                    notes: appOverride.notes || q.notes,
                    signatureName: appOverride.signatureName || q.signatureName,
                    signatureDate: appOverride.signatureDate || q.signatureDate,
                    rejectionReason: appOverride.rejectionReason || q.rejectionReason,
                  };
                }
                return q;
              });
            }
          } catch (e) {}

          const key = this.getUserScopedKey(QUOTATIONS_KEY, userId);
          if (key) localStorage.setItem(key, JSON.stringify(fetchedQuotations));

          return fetchedQuotations;
        }
      } catch (err) {
        console.error('Failed to load quotations from Supabase:', err);
        return [];
      }
    }

    const key = this.getUserScopedKey(QUOTATIONS_KEY, userId);
    if (key) {
      return JSON.parse(localStorage.getItem(key) || '[]');
    }
    return [];
  },

  async saveQuotation(quotation: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Quotation> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('Authentication required to save quotation.');
    }

    const isNew = !quotation.id;
    const finalId = quotation.id || 'quote-' + Math.random().toString(36).substr(2, 9);
    const nowStr = new Date().toISOString();

    const fullQuotation: Quotation = {
      ...quotation,
      id: finalId,
      userId: userId,
      createdAt: isNew ? nowStr : (quotation as any).createdAt || nowStr,
      updatedAt: nowStr,
    };

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const mappedData = {
          id: isNew ? undefined : (isUuid(quotation.id) ? quotation.id : undefined),
          user_id: userId, // FORCE USER OWNERSHIP
          quote_number: quotation.quoteNumber,
          customer_id: quotation.customerId && !quotation.customerId.startsWith('demo') && !quotation.customerId.startsWith('cust-') ? quotation.customerId : null,
          issue_date: quotation.issueDate,
          expiry_date: quotation.expiryDate,
          status: quotation.status,
          subtotal: quotation.subtotal,
          discount_type: quotation.discountType,
          discount_value: quotation.discountValue,
          tax_percentage: quotation.taxPercentage,
          tax_amount: quotation.taxAmount,
          grand_total: quotation.grandTotal,
          notes: quotation.notes || null,
          terms: quotation.terms || null,
          updated_at: nowStr,
        };

        let result;
        if (isNew) {
          result = await supabase.from('quotations').insert(mappedData).select().single();
        } else {
          if (isUuid(quotation.id)) {
            result = await supabase.from('quotations').update(mappedData).eq('id', quotation.id).eq('user_id', userId).select().single();
          } else {
            result = await supabase.from('quotations').update(mappedData).eq('quote_number', quotation.quoteNumber).eq('user_id', userId).select().single();
          }
        }

        if (result.error) {
          if (result.error.code === '23505') {
            throw new Error(`Quotation number ${quotation.quoteNumber} already exists in your records.`);
          }
          throw result.error;
        }

        if (result.data) {
          const dbQuoteId = result.data.id;

          if (!isNew) {
            await supabase.from('quotation_items').delete().eq('quotation_id', dbQuoteId);
          }

          if (quotation.items && quotation.items.length > 0) {
            const mappedItems = quotation.items.map(item => ({
              quotation_id: dbQuoteId,
              product_id: item.productId && (item.productId.startsWith('prod-') || item.productId.startsWith('demo')) ? null : item.productId,
              product_name: item.productName,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              tax_percentage: item.taxPercentage || 0,
              line_total: item.lineTotal,
            }));

            await supabase.from('quotation_items').insert(mappedItems);
          }

          const savedQuotation: Quotation = {
            id: result.data.id,
            userId: result.data.user_id,
            quoteNumber: result.data.quote_number,
            customerId: result.data.customer_id || quotation.customerId || '',
            customerName: quotation.customerName,
            companyName: quotation.companyName,
            issueDate: result.data.issue_date,
            expiryDate: result.data.expiry_date,
            status: result.data.status,
            subtotal: Number(result.data.subtotal),
            discountType: result.data.discount_type,
            discountValue: Number(result.data.discount_value),
            taxPercentage: Number(result.data.tax_percentage),
            taxAmount: Number(result.data.tax_amount),
            grandTotal: Number(result.data.grand_total),
            notes: result.data.notes,
            terms: result.data.terms,
            createdAt: result.data.created_at,
            updatedAt: result.data.updated_at,
            items: quotation.items,
          };

          const quotations = await this.getQuotations();
          const updated = isNew ? [savedQuotation, ...quotations] : quotations.map(q => q.id === savedQuotation.id ? savedQuotation : q);
          
          const key = this.getUserScopedKey(QUOTATIONS_KEY, userId);
          if (key) localStorage.setItem(key, JSON.stringify(updated));

          if (isNew) {
            await this.logQuotationActivity(savedQuotation.id, 'Quotation Created', `Quotation draft created.`);
          }

          return savedQuotation;
        }
      } catch (err: any) {
        console.error('Failed to save quotation to Supabase:', err);
        if (err?.code === '42P01') isSupabaseSchemaActive = false;
        if (err?.code === '23505' || err?.message?.includes('already exists')) {
          throw new Error(`Quotation number ${quotation.quoteNumber} already exists in your records.`);
        }
      }
    }

    // Local storage fallback
    const quotations = await this.getQuotations();
    const isDuplicateNum = quotations.some(
      q => q.quoteNumber.trim().toLowerCase() === quotation.quoteNumber.trim().toLowerCase() && q.id !== quotation.id
    );
    if (isDuplicateNum) {
      throw new Error(`Quotation number ${quotation.quoteNumber} already exists in your records.`);
    }

    const updated = isNew 
      ? [fullQuotation, ...quotations] 
      : quotations.map(q => q.id === quotation.id ? { ...q, ...quotation, updatedAt: nowStr } : q);

    const key = this.getUserScopedKey(QUOTATIONS_KEY, userId);
    if (key) localStorage.setItem(key, JSON.stringify(updated));

    if (isNew) {
      await this.logQuotationActivity(fullQuotation.id, 'Quotation Created', `Quotation draft created.`);
    }
    return isNew ? fullQuotation : (updated.find(q => q.id === quotation.id) as Quotation);
  },

  async deleteQuotation(id: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) return;

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        await supabase.from('quotation_items').delete().eq('quotation_id', id);
        const { error } = await supabase.from('quotations').delete().eq('id', id).eq('user_id', userId);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete quotation from Supabase:', err);
      }
    }

    const quotations = await this.getQuotations();
    const filtered = quotations.filter(q => q.id !== id);
    const key = this.getUserScopedKey(QUOTATIONS_KEY, userId);
    if (key) localStorage.setItem(key, JSON.stringify(filtered));
  },

  // --- Invoices Methods ---
  async getInvoices(): Promise<Invoice[]> {
    this.cleanLegacyGlobalKeys();
    const userId = await this.getCurrentUserId();
    if (!userId) return []; // Unauthenticated = zero tenant data leak

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*, invoice_items(*)')
          .eq('user_id', userId) // STRICT MULTI-TENANT FILTER
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === '42P01') {
            isSupabaseSchemaActive = false;
          } else {
            console.error('Failed to query invoices from Supabase:', error);
            return [];
          }
        } else if (data) {
          const fetchedInvoices: Invoice[] = data.map((i: any) => ({
            id: i.id,
            invoiceNumber: i.invoice_number,
            quoteId: i.quotation_id || i.quote_id || '',
            quoteNumber: i.quote_number || '',
            customerId: i.customer_id || '',
            customerName: i.customer_name || 'N/A',
            companyName: i.company_name || 'N/A',
            date: i.invoice_date || i.date,
            dueDate: i.due_date,
            subtotal: Number(i.subtotal),
            discount: Number(i.discount || 0),
            taxAmount: Number(i.tax || i.tax_amount || 0),
            grandTotal: Number(i.grand_total),
            amountPaid: Number(i.amount_paid || 0),
            paymentStatus: i.payment_status || 'Pending',
            status: i.payment_status || i.status || 'Pending',
            notes: i.notes || '',
            createdAt: i.created_at,
            items: (i.invoice_items || []).map((ii: any) => ({
              id: ii.id,
              quotationId: ii.invoice_id,
              productId: ii.product_id,
              productName: ii.product_name,
              quantity: Number(ii.quantity),
              unitPrice: Number(ii.unit_price),
              taxPercentage: Number(ii.tax_percentage || 0),
              lineTotal: Number(ii.line_total),
            })),
          }));

          const key = this.getUserScopedKey(INVOICES_KEY, userId);
          if (key) localStorage.setItem(key, JSON.stringify(fetchedInvoices));

          return fetchedInvoices;
        }
      } catch (err) {
        console.error('Failed to load invoices from Supabase:', err);
        return [];
      }
    }

    const key = this.getUserScopedKey(INVOICES_KEY, userId);
    if (key) {
      return JSON.parse(localStorage.getItem(key) || '[]');
    }
    return [];
  },

  async saveInvoice(invoice: Omit<Invoice, 'id' | 'createdAt'> & { id?: string }): Promise<Invoice> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('Authentication required to save invoice.');
    }

    const isNew = !invoice.id;
    const finalId = invoice.id || 'inv-' + Math.random().toString(36).substr(2, 9);
    const finalCreatedAt = new Date().toISOString();

    const fullInvoice: Invoice = {
      ...invoice,
      id: finalId,
      createdAt: finalCreatedAt,
    };

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const mappedData = {
          id: isNew ? undefined : invoice.id,
          user_id: userId, // FORCE USER OWNERSHIP
          invoice_number: invoice.invoiceNumber,
          quotation_id: invoice.quoteId && isUuid(invoice.quoteId) ? invoice.quoteId : null,
          quote_number: invoice.quoteNumber || null,
          customer_id: invoice.customerId && isUuid(invoice.customerId) ? invoice.customerId : null,
          customer_name: invoice.customerName,
          company_name: invoice.companyName || null,
          invoice_date: invoice.date,
          due_date: invoice.dueDate,
          subtotal: invoice.subtotal,
          discount: invoice.discount || 0,
          tax: invoice.taxAmount,
          grand_total: invoice.grandTotal,
          amount_paid: invoice.amountPaid || 0,
          payment_status: invoice.paymentStatus || 'Pending',
          notes: invoice.notes || null,
          updated_at: new Date().toISOString(),
        };

        let result;
        if (isNew) {
          result = await supabase.from('invoices').insert(mappedData).select().single();
        } else {
          result = await supabase.from('invoices').update(mappedData).eq('id', invoice.id).eq('user_id', userId).select().single();
        }

        if (result.error) throw result.error;

        if (result.data) {
          if (!isNew) {
            await supabase.from('invoice_items').delete().eq('invoice_id', result.data.id);
          }

          if (invoice.items && invoice.items.length > 0) {
            const mappedItems = invoice.items.map(item => ({
              invoice_id: result.data.id,
              product_id: item.productId && isUuid(item.productId) ? item.productId : null,
              product_name: item.productName,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              tax_percentage: item.taxPercentage || 0,
              line_total: item.lineTotal,
            }));

            await supabase.from('invoice_items').insert(mappedItems);
          }

          const savedInvoice: Invoice = {
            id: result.data.id,
            invoiceNumber: result.data.invoice_number,
            quoteId: result.data.quotation_id || invoice.quoteId,
            quoteNumber: result.data.quote_number || invoice.quoteNumber || '',
            customerId: result.data.customer_id || invoice.customerId || '',
            customerName: result.data.customer_name,
            companyName: result.data.company_name || '',
            date: result.data.invoice_date || result.data.date || invoice.date,
            dueDate: result.data.due_date,
            subtotal: Number(result.data.subtotal),
            discount: Number(result.data.discount || 0),
            taxAmount: Number(result.data.tax || result.data.tax_amount || 0),
            grandTotal: Number(result.data.grand_total),
            amountPaid: Number(result.data.amount_paid || 0),
            paymentStatus: result.data.payment_status || 'Pending',
            status: result.data.payment_status || 'Pending',
            notes: result.data.notes || '',
            createdAt: result.data.created_at,
            items: invoice.items,
          };

          const invoices = await this.getInvoices();
          const updated = isNew ? [savedInvoice, ...invoices] : invoices.map(i => i.id === savedInvoice.id ? savedInvoice : i);
          
          const key = this.getUserScopedKey(INVOICES_KEY, userId);
          if (key) localStorage.setItem(key, JSON.stringify(updated));

          return savedInvoice;
        }
      } catch (err: any) {
        console.error('Failed to save invoice to Supabase:', err);
      }
    }

    const invoices = await this.getInvoices();
    const updated = isNew ? [fullInvoice, ...invoices] : invoices.map(i => i.id === invoice.id ? { ...i, ...invoice } : i);

    const key = this.getUserScopedKey(INVOICES_KEY, userId);
    if (key) localStorage.setItem(key, JSON.stringify(updated));

    return isNew ? fullInvoice : (updated.find(i => i.id === invoice.id) as Invoice);
  },

  async deleteInvoice(id: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) return;

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        await supabase.from('invoice_items').delete().eq('invoice_id', id);
        const { error } = await supabase.from('invoices').delete().eq('id', id).eq('user_id', userId);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete invoice from Supabase:', err);
      }
    }

    const invoices = await this.getInvoices();
    const filtered = invoices.filter(i => i.id !== id);
    const key = this.getUserScopedKey(INVOICES_KEY, userId);
    if (key) localStorage.setItem(key, JSON.stringify(filtered));
  },

  // Secure Tenant Conversion Method
  async convertQuotationToInvoice(quotationId: string): Promise<Invoice> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('Authentication required to convert quotation.');
    }

    // 1. Get user's quotations to ensure ownership
    const quotations = await this.getQuotations();
    const quotation = quotations.find(q => q.id === quotationId || q.quoteNumber === quotationId);
    if (!quotation) {
      throw new Error('Quotation not found or you do not have permission to access it.');
    }

    // 2. Check if already converted
    const invoices = await this.getInvoices();
    const alreadyConverted = invoices.find(i => i.quoteId === quotation.id || i.quoteNumber === quotation.quoteNumber);
    if (alreadyConverted) {
      return alreadyConverted;
    }

    // 3. Generate unique invoice number
    const count = invoices.length;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(2001 + count).padStart(4, '0')}`;

    const todayStr = new Date().toISOString().split('T')[0];
    const dueDateStr = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newInvoice: Omit<Invoice, 'id' | 'createdAt'> = {
      invoiceNumber,
      quoteId: quotation.id,
      quoteNumber: quotation.quoteNumber,
      customerId: quotation.customerId || '',
      customerName: quotation.customerName || 'N/A',
      companyName: quotation.companyName || 'N/A',
      date: todayStr,
      dueDate: dueDateStr,
      subtotal: quotation.subtotal,
      discount: quotation.discountValue,
      taxAmount: quotation.taxAmount,
      grandTotal: quotation.grandTotal,
      amountPaid: 0,
      paymentStatus: 'Pending',
      status: 'Pending',
      notes: quotation.notes || 'Converted from quotation ' + quotation.quoteNumber,
      items: quotation.items || [],
    };

    // 4. Save new invoice scoped to tenant
    const savedInvoice = await this.saveInvoice(newInvoice);

    // 5. Update Quotation status to 'Converted'
    quotation.status = 'Converted';
    await this.saveQuotation(quotation);
    
    await this.logQuotationActivity(quotation.id, 'Quotation Converted', `Converted to invoice ${savedInvoice.invoiceNumber}.`);

    return savedInvoice;
  },

  // --- Company Settings Methods ---
  async getCompanySettings(): Promise<CompanySettings> {
    this.cleanLegacyGlobalKeys();
    const userId = await this.getCurrentUserId();

    if (userId && isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const { data, error } = await supabase
          .from('company_settings')
          .select('*')
          .eq('user_id', userId) // STRICT MULTI-TENANT FILTER
          .maybeSingle();

        if (error) {
          if (error.code === '42P01') {
            isSupabaseSchemaActive = false;
          } else {
            throw error;
          }
        } else if (data) {
          return {
            id: data.id,
            userId: data.user_id,
            companyName: data.company_name,
            ownerName: data.owner_name,
            phone: data.phone,
            email: data.email,
            website: data.website,
            address: data.address,
            taxNumber: data.tax_number,
            bankName: data.bank_name,
            accountTitle: data.account_title,
            accountNumber: data.account_number,
            logoUrl: data.logo_url,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            currencySymbol: 'Rs.',
            taxRate: 18,
            quotePrefix: 'QT-',
            invoicePrefix: 'INV-',
            nextQuoteNumber: 1001,
            nextInvoiceNumber: 2001,
            termsConditions: '',
            footerNotes: '',
          };
        }
      } catch (err) {
        console.error('Failed to load company settings from Supabase:', err);
      }
    }

    const key = this.getUserScopedKey(COMPANY_SETTINGS_KEY, userId);
    if (key) {
      const local = localStorage.getItem(key);
      if (local) {
        try { return JSON.parse(local); } catch (e) {}
      }
    }

    return { ...DEFAULT_COMPANY_SETTINGS };
  },

  async saveCompanySettings(settings: CompanySettings): Promise<CompanySettings> {
    const userId = await this.getCurrentUserId();

    if (userId && isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const mappedData = {
          user_id: userId, // FORCE USER OWNERSHIP
          company_name: settings.companyName,
          owner_name: settings.ownerName,
          phone: settings.phone,
          email: settings.email,
          website: settings.website || null,
          address: settings.address,
          tax_number: settings.taxNumber || null,
          bank_name: settings.bankName || null,
          account_title: settings.accountTitle || null,
          account_number: settings.accountNumber || null,
          logo_url: settings.logoUrl || null,
          updated_at: new Date().toISOString(),
        };

        const existing = await this.getCompanySettings();
        let result;

        if (existing?.id && isUuid(existing.id)) {
          result = await supabase
            .from('company_settings')
            .update(mappedData)
            .eq('id', existing.id)
            .eq('user_id', userId)
            .select()
            .single();
        } else {
          result = await supabase
            .from('company_settings')
            .insert(mappedData)
            .select()
            .single();
        }

        if (result.data) {
          const saved: CompanySettings = {
            id: result.data.id,
            userId: result.data.user_id,
            companyName: result.data.company_name,
            ownerName: result.data.owner_name,
            phone: result.data.phone,
            email: result.data.email,
            website: result.data.website,
            address: result.data.address,
            taxNumber: result.data.tax_number,
            bankName: result.data.bank_name,
            accountTitle: result.data.account_title,
            accountNumber: result.data.account_number,
            logoUrl: result.data.logo_url,
            createdAt: result.data.created_at,
            updatedAt: result.data.updated_at,
            currencySymbol: 'Rs.',
            taxRate: 18,
            quotePrefix: 'QT-',
            invoicePrefix: 'INV-',
            nextQuoteNumber: 1001,
            nextInvoiceNumber: 2001,
          };
          const key = this.getUserScopedKey(COMPANY_SETTINGS_KEY, userId);
          if (key) localStorage.setItem(key, JSON.stringify(saved));
          return saved;
        }
      } catch (err) {
        console.error('Failed to save company settings to Supabase:', err);
      }
    }

    const key = this.getUserScopedKey(COMPANY_SETTINGS_KEY, userId);
    if (key) localStorage.setItem(key, JSON.stringify(settings));
    return settings;
  },

  async uploadCompanyLogo(file: File): Promise<string> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('User not authenticated.');
      }

      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Maximum logo size limit is 2MB.');
      }
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed.');
      }

      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${user.id}/logo_${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err: any) {
      console.error('Failed to upload logo to Supabase storage:', err);
      throw err;
    }
  },

  async getSecureTokenForQuote(quoteIdOrObj: string | Quotation): Promise<string> {
    let quote: Quotation | undefined;
    if (typeof quoteIdOrObj === 'object' && quoteIdOrObj !== null) {
      quote = quoteIdOrObj;
    } else {
      const quotations = await this.getQuotations();
      quote = quotations.find(q => q.id === quoteIdOrObj || q.quoteNumber === quoteIdOrObj);
    }

    if (quote) {
      let companySettings: CompanySettings | null = null;
      try {
        companySettings = await this.getCompanySettings();
      } catch (e) {}

      const token = encodeQuoteToken(quote, companySettings);

      const TOKENS_MAP_KEY = 'quoteflow_secure_tokens';
      const map = JSON.parse(localStorage.getItem(TOKENS_MAP_KEY) || '{}');
      map[quote.id] = token;
      if (quote.quoteNumber) map[quote.quoteNumber] = token;
      localStorage.setItem(TOKENS_MAP_KEY, JSON.stringify(map));

      (quote as any).secureToken = token;
      return token;
    }

    return typeof quoteIdOrObj === 'string' ? quoteIdOrObj : (quoteIdOrObj as any)?.quoteNumber || 'QT-001';
  },

  async getPublicQuotation(tokenOrNumber: string): Promise<Quotation | null> {
    if (!tokenOrNumber) return null;

    // 1. Attempt to decode self-contained token payload directly
    const decodedResult = decodeQuoteToken(tokenOrNumber);
    let decodedQuote: Quotation | null = decodedResult ? decodedResult.quotation : null;

    // 2. Check local secure token mapping
    const TOKENS_MAP_KEY = 'quoteflow_secure_tokens';
    const tokenMap = JSON.parse(localStorage.getItem(TOKENS_MAP_KEY) || '{}');
    let matchedQuoteId = '';
    for (const [id, t] of Object.entries(tokenMap)) {
      if (t === tokenOrNumber) {
        matchedQuoteId = id;
        break;
      }
    }

    // 3. Search public Supabase quotations (Unrestricted by user_id for public shared quote view)
    let liveQuote: Quotation | undefined;

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const queryTerm = matchedQuoteId || tokenOrNumber;
        let queryData: any = null;

        if (isUuid(queryTerm)) {
          const res = await supabase
            .from('quotations')
            .select('*, customers(*), quotation_items(*)')
            .eq('id', queryTerm)
            .maybeSingle();
          queryData = res.data;
        }

        if (!queryData) {
          const res = await supabase
            .from('quotations')
            .select('*, customers(*), quotation_items(*)')
            .eq('quote_number', queryTerm)
            .maybeSingle();
          queryData = res.data;
        }

        if (queryData) {
          liveQuote = {
            id: queryData.id,
            userId: queryData.user_id,
            quoteNumber: queryData.quote_number,
            customerId: queryData.customer_id || '',
            customerName: queryData.customers?.customer_name || queryData.customer_name || 'Customer',
            companyName: queryData.customers?.company_name || queryData.company_name || 'N/A',
            issueDate: queryData.issue_date,
            expiryDate: queryData.expiry_date,
            status: queryData.status,
            subtotal: Number(queryData.subtotal),
            discountType: queryData.discount_type || 'fixed',
            discountValue: Number(queryData.discount_value || 0),
            taxPercentage: Number(queryData.tax_percentage || 0),
            taxAmount: Number(queryData.tax_amount || 0),
            grandTotal: Number(queryData.grand_total),
            notes: queryData.notes,
            terms: queryData.terms,
            createdAt: queryData.created_at,
            updatedAt: queryData.updated_at,
            items: (queryData.quotation_items || []).map((qi: any) => ({
              id: qi.id,
              quotationId: qi.quotation_id,
              productId: qi.product_id,
              productName: qi.product_name,
              quantity: Number(qi.quantity),
              unitPrice: Number(qi.unit_price),
              taxPercentage: Number(qi.tax_percentage || 0),
              lineTotal: Number(qi.line_total),
            })),
          };
        }
      } catch (err) {
        console.error('Supabase public quotation fetch error:', err);
      }
    }

    let finalQuote: Quotation | null = liveQuote || decodedQuote;

    if (finalQuote) {
      if (decodedResult?.companySettings && !(finalQuote as any).companySettings) {
        (finalQuote as any).companySettings = decodedResult.companySettings;
      }

      try {
        if (!liveQuote || (liveQuote.status !== 'Accepted' && liveQuote.status !== 'Rejected' && liveQuote.status !== 'Converted')) {
          const approvedMap = JSON.parse(localStorage.getItem(APPROVED_KEY) || '{}');
          const appOverride = approvedMap[finalQuote.id] || (finalQuote.quoteNumber ? approvedMap[finalQuote.quoteNumber] : null);
          if (appOverride) {
            finalQuote.status = appOverride.status;
            if (appOverride.notes) finalQuote.notes = appOverride.notes;
            if (appOverride.signatureName) finalQuote.signatureName = appOverride.signatureName;
            if (appOverride.signatureDate) finalQuote.signatureDate = appOverride.signatureDate;
            if (appOverride.rejectionReason) finalQuote.rejectionReason = appOverride.rejectionReason;
          }
        }
      } catch (e) {}

      return finalQuote;
    }

    return null;
  },

  async updatePublicQuotationStatus(
    quoteId: string, 
    status: 'Accepted' | 'Rejected', 
    extraData: { signatureName?: string; signatureDate?: string; rejectionReason?: string; rejectedDate?: string },
    fullQuote?: Quotation
  ): Promise<boolean> {
    const timestamp = new Date().toISOString();
    
    let qNo = fullQuote?.quoteNumber || (quoteId && !isUuid(quoteId) && !quoteId.startsWith('q_') ? quoteId : '');
    let targetId = fullQuote?.id || (isUuid(quoteId) ? quoteId : '');

    if ((!qNo || !targetId) && (quoteId.startsWith('q_') || quoteId.length > 20)) {
      try {
        const decodedResult = decodeQuoteToken(quoteId);
        if (decodedResult?.quotation) {
          if (!qNo && decodedResult.quotation.quoteNumber) qNo = decodedResult.quotation.quoteNumber;
          if (!targetId && decodedResult.quotation.id) targetId = decodedResult.quotation.id;
        }
      } catch (e) {}
    }

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        // Query Supabase to find matching ID and quote_number if either is missing
        if (!targetId || !qNo) {
          const searchTerm = targetId || qNo || quoteId;
          const { data: matched } = await supabase
            .from('quotations')
            .select('id, quote_number, notes')
            .or(`id.eq.${isUuid(searchTerm) ? searchTerm : '00000000-0000-0000-0000-000000000000'},quote_number.eq.${searchTerm}`)
            .maybeSingle();
          if (matched) {
            if (matched.id) targetId = matched.id;
            if (matched.quote_number) qNo = matched.quote_number;
            if (!fullQuote?.notes && matched.notes) {
              fullQuote = { ...(fullQuote || {}), notes: matched.notes } as Quotation;
            }
          }
        }

        const cleanOriginal = ((fullQuote?.notes || '') as string)
          .replace(/\[Digitally Approved.*\]/g, '')
          .replace(/\[Rejected Reason.*\]/g, '')
          .trim();

        let notesPayload = cleanOriginal;
        if (status === 'Accepted' && extraData.signatureName) {
          notesPayload = `[Digitally Approved & Signed by ${extraData.signatureName} on ${new Date().toLocaleString()}] ${cleanOriginal}`.trim();
        } else if (status === 'Rejected' && extraData.rejectionReason) {
          notesPayload = `[Rejected Reason: ${extraData.rejectionReason} on ${new Date().toLocaleString()}] ${cleanOriginal}`.trim();
        }

        const payload: any = {
          status,
          notes: notesPayload,
          updated_at: timestamp
        };

        // 1. Try RPC function (SECURITY DEFINER)
        try {
          await supabase.rpc('public_update_quotation_status', {
            p_quote_id: targetId || qNo || quoteId,
            p_status: status,
            p_notes: notesPayload
          });
        } catch (e) {}

        // 2. Direct update by UUID without .select() (bypasses RLS SELECT restrictions)
        if (targetId && isUuid(targetId)) {
          try {
            await supabase.from('quotations').update(payload).eq('id', targetId);
          } catch (e) {}
        }

        // 3. Direct update by quote_number without .select()
        if (qNo) {
          try {
            await supabase.from('quotations').update(payload).eq('quote_number', qNo);
          } catch (e) {}
        }

        // 4. Fallback update by quoteId
        if (quoteId && quoteId !== targetId && quoteId !== qNo) {
          try {
            if (isUuid(quoteId)) {
              await supabase.from('quotations').update(payload).eq('id', quoteId);
            } else {
              await supabase.from('quotations').update(payload).eq('quote_number', quoteId);
            }
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Failed to update public quotation status in Supabase:', err);
      }
    }

    // Persist update in local approved map & update all local storage quote caches
    try {
      const approvedMap = JSON.parse(localStorage.getItem(APPROVED_KEY) || '{}');
      const appRecord = { 
        status, 
        notes: extraData.signatureName ? `[Digitally Approved & Signed by ${extraData.signatureName} on ${new Date().toLocaleString()}]` : `[Rejected Reason: ${extraData.rejectionReason}]`, 
        signatureName: extraData.signatureName, 
        signatureDate: extraData.signatureDate || timestamp, 
        rejectionReason: extraData.rejectionReason 
      };

      if (quoteId) approvedMap[quoteId] = appRecord;
      if (targetId) approvedMap[targetId] = appRecord;
      if (qNo) approvedMap[qNo] = appRecord;
      if (fullQuote?.id) approvedMap[fullQuote.id] = appRecord;
      if (fullQuote?.quoteNumber) approvedMap[fullQuote.quoteNumber] = appRecord;
      localStorage.setItem(APPROVED_KEY, JSON.stringify(approvedMap));

      // Scan and update all quotation entries across localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.includes('quotations') || k.includes('quoteflow'))) {
          try {
            const val = localStorage.getItem(k);
            if (!val) continue;
            const list = JSON.parse(val);
            if (Array.isArray(list)) {
              let modified = false;
              const updatedList = list.map((q: any) => {
                if (
                  q.id === targetId || 
                  q.id === quoteId || 
                  (qNo && q.quoteNumber === qNo) ||
                  (fullQuote?.id && q.id === fullQuote.id) ||
                  (fullQuote?.quoteNumber && q.quoteNumber === fullQuote.quoteNumber)
                ) {
                  modified = true;
                  return {
                    ...q,
                    status,
                    notes: appRecord.notes,
                    signatureName: extraData.signatureName,
                    signatureDate: extraData.signatureDate || timestamp,
                    rejectionReason: extraData.rejectionReason,
                    updatedAt: timestamp
                  };
                }
                return q;
              });
              if (modified) {
                localStorage.setItem(k, JSON.stringify(updatedList));
              }
            }
          } catch (e) {}
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('quotationStatusUpdated', { detail: { quoteId, targetId, quoteNumber: qNo, status } }));
        window.dispatchEvent(new Event('storage'));
      }

      try {
        const activityTarget = targetId || fullQuote?.id || quoteId;
        if (status === 'Accepted') {
          await this.logQuotationActivity(activityTarget, 'Quotation Accepted', `Digitally signed by ${extraData.signatureName}.`);
        } else if (status === 'Rejected') {
          await this.logQuotationActivity(activityTarget, 'Quotation Rejected', `Reason: ${extraData.rejectionReason}`);
        }
      } catch (e) {}

      return true;
    } catch (err) {
      console.error('Local quotation status update failed:', err);
      return true;
    }
  },

  async getQuotationActivities(quotationId?: string): Promise<QuotationActivity[]> {
    const userId = await this.getCurrentUserId();
    const key = this.getUserScopedKey(ACTIVITIES_KEY, userId) || ACTIVITIES_KEY;
    const local = localStorage.getItem(key) || '[]';
    try {
      const activities: QuotationActivity[] = JSON.parse(local);
      if (quotationId) {
        return activities.filter(a => a.quotationId === quotationId);
      }
      return activities;
    } catch {
      return [];
    }
  },

  async logQuotationActivity(quotationId: string, event: 'Quotation Created' | 'Quotation Sent' | 'Quotation Viewed' | 'Quotation Downloaded' | 'Quotation Accepted' | 'Quotation Rejected' | 'Quotation Converted', details?: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    const quotes = await this.getQuotations();
    const quote = quotes.find(q => q.id === quotationId);
    if (!quote) return;

    if (event === 'Quotation Viewed' || event === 'Quotation Downloaded') {
      const recentActivities = await this.getQuotationActivities(quotationId);
      const isDuplicate = recentActivities.some(a => 
        a.event === event && 
        (Date.now() - new Date(a.timestamp).getTime()) < 15000
      );
      if (isDuplicate) return;
    }

    const key = this.getUserScopedKey(ACTIVITIES_KEY, userId) || ACTIVITIES_KEY;
    const activities = JSON.parse(localStorage.getItem(key) || '[]');
    const newActivity: QuotationActivity = {
      id: 'act-' + Math.random().toString(36).substr(2, 9),
      quotationId,
      quoteNumber: quote.quoteNumber,
      customerName: quote.customerName || 'Direct Client',
      event,
      timestamp: new Date().toISOString(),
      details
    };
    activities.unshift(newActivity);
    localStorage.setItem(key, JSON.stringify(activities));

    if (['Quotation Viewed', 'Quotation Accepted', 'Quotation Rejected', 'Quotation Downloaded'].includes(event)) {
      const notifKey = this.getUserScopedKey(NOTIFICATIONS_KEY, userId) || NOTIFICATIONS_KEY;
      const notifications = JSON.parse(localStorage.getItem(notifKey) || '[]');
      const simplifiedEventMap: Record<string, 'Viewed' | 'Accepted' | 'Rejected' | 'Downloaded'> = {
        'Quotation Viewed': 'Viewed',
        'Quotation Accepted': 'Accepted',
        'Quotation Rejected': 'Rejected',
        'Quotation Downloaded': 'Downloaded'
      };
      
      const newNotif: OwnerNotification = {
        id: 'notif-' + Math.random().toString(36).substr(2, 9),
        quotationId,
        quoteNumber: quote.quoteNumber,
        customerName: quote.customerName || 'Direct Client',
        event: simplifiedEventMap[event],
        timestamp: new Date().toISOString(),
        read: false
      };
      notifications.unshift(newNotif);
      localStorage.setItem(notifKey, JSON.stringify(notifications));
    }
  },

  async getOwnerNotifications(): Promise<OwnerNotification[]> {
    const userId = await this.getCurrentUserId();
    const key = this.getUserScopedKey(NOTIFICATIONS_KEY, userId) || NOTIFICATIONS_KEY;
    const local = localStorage.getItem(key) || '[]';
    try {
      return JSON.parse(local);
    } catch {
      return [];
    }
  },

  async markNotificationsAsRead(): Promise<void> {
    const userId = await this.getCurrentUserId();
    const key = this.getUserScopedKey(NOTIFICATIONS_KEY, userId) || NOTIFICATIONS_KEY;
    const local = localStorage.getItem(key) || '[]';
    try {
      const notifications = JSON.parse(local);
      const updated = notifications.map((n: any) => ({ ...n, read: true }));
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {}
  }
};
