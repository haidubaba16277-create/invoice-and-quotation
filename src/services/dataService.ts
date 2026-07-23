import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Customer, Product, Quotation, Invoice, QuoteItem, CompanySettings, QuotationActivity, OwnerNotification } from '../types/business';

// Keys for localStorage
const CUSTOMERS_KEY = 'quoteflow_customers';
const PRODUCTS_KEY = 'quoteflow_products';
const QUOTATIONS_KEY = 'quoteflow_quotations';
const INVOICES_KEY = 'quoteflow_invoices';
const COMPANY_SETTINGS_KEY = 'quoteflow_company_settings';
const SUPABASE_MIGRATION_GUIDE_DISMISSED = 'quoteflow_migration_dismissed';

export const isUuid = (val?: string): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};


// Seed Data for vibrant out-of-the-box experience
const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    customerName: 'Muhammad Ali',
    companyName: 'Karachi Tech Labs (Pvt) Ltd',
    email: 'ali@karachitech.pk',
    phone: '+92 321 4567890',
    address: 'Plot 24-C, Khayaban-e-Ittehad, Phase 6, DHA, Karachi',
    city: 'Karachi',
    notes: 'Premium enterprise client. Prefers weekend communications.',
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'cust-2',
    customerName: 'Aisha Khan',
    companyName: 'Lahore Retail Group',
    email: 'aisha@lhoretail.com',
    phone: '+92 300 1234567',
    address: 'M.M. Alam Road, Gulberg III, Lahore',
    city: 'Lahore',
    notes: 'Retail software setup customer. Prefers custom billing schedules.',
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'cust-3',
    customerName: 'Zainab Ahmed',
    companyName: 'Islamabad Software House',
    email: 'zainab@isbsoft.net',
    phone: '+92 333 9876543',
    address: 'Sectors G-11/3, Islamabad',
    city: 'Islamabad',
    notes: 'Offshore agile setup audit client.',
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  }
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'QF-SaaS-01',
    productName: 'SaaS Cloud Hosting Setup',
    description: 'High-availability server deployment on Cloud Run with automated backups and failovers.',
    unit: 'Setup',
    price: 58500,
    taxPercentage: 18,
    category: 'Cloud Services',
    createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'prod-2',
    sku: 'QF-DEV-02',
    productName: 'Custom React Web App Development',
    description: 'Full-stack responsive design, state managers, and interactive dashboards mapped to custom APIs.',
    unit: 'Hour',
    price: 210000,
    taxPercentage: 18,
    category: 'Software Development',
    createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'prod-3',
    sku: 'QF-CONS-03',
    productName: 'Corporate Agile Consultation (Weekly)',
    description: 'Weekly team feedback, process pipeline audit, and sprint masterclass.',
    unit: 'Week',
    price: 100000,
    taxPercentage: 18,
    category: 'Consulting',
    createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'prod-4',
    sku: 'QF-SUPP-04',
    productName: 'Enterprise Support SLA (Monthly)',
    description: '24/7 priority response, dedicated slack support channel, and emergency hotfixes.',
    unit: 'Month',
    price: 36000,
    taxPercentage: 18,
    category: 'Support',
    createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
  }
];

const DEFAULT_QUOTATIONS: Quotation[] = [
  {
    id: 'quote-1',
    quoteNumber: 'QT-2026-001',
    customerId: 'cust-1',
    customerName: 'Muhammad Ali',
    companyName: 'Karachi Tech Labs (Pvt) Ltd',
    issueDate: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString().split('T')[0],
    expiryDate: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
    items: [
      {
        productId: 'prod-1',
        productName: 'SaaS Cloud Hosting Setup',
        quantity: 1,
        unitPrice: 58500,
        taxPercentage: 18,
        lineTotal: 69030
      },
      {
        productId: 'prod-4',
        productName: 'Enterprise Support SLA (Monthly)',
        quantity: 3,
        unitPrice: 36000,
        taxPercentage: 18,
        lineTotal: 127440
      }
    ],
    subtotal: 166500,
    discountType: 'fixed',
    discountValue: 6500,
    taxPercentage: 18, // 18% PK GST
    taxAmount: 28800, // (166500 - 6500) * 0.18
    grandTotal: 188800,
    status: 'Accepted',
    notes: 'Please complete payment within 15 days of invoice generation.',
    terms: 'Standard terms apply.',
    createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'quote-2',
    quoteNumber: 'QT-2026-002',
    customerId: 'cust-2',
    customerName: 'Aisha Khan',
    companyName: 'Lahore Retail Group',
    issueDate: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().split('T')[0],
    items: [
      {
        productId: 'prod-2',
        productName: 'Custom React Web App Development',
        quantity: 1,
        unitPrice: 210000,
        taxPercentage: 18,
        lineTotal: 247800
      }
    ],
    subtotal: 210000,
    discountType: 'fixed',
    discountValue: 10000,
    taxPercentage: 18,
    taxAmount: 36000,
    grandTotal: 236000,
    status: 'Sent',
    notes: 'Development will begin immediately upon 50% advance invoice approval.',
    terms: '50% advance, 50% on completion.',
    createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
  }
];

const DEFAULT_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-001',
    quoteId: 'quote-1',
    quoteNumber: 'QT-2026-001',
    customerId: 'cust-1',
    customerName: 'Muhammad Ali',
    companyName: 'Karachi Tech Labs (Pvt) Ltd',
    date: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
    subtotal: 160000,
    taxAmount: 28800,
    grandTotal: 188800,
    amountPaid: 188800,
    status: 'paid',
    createdAt: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString()
  }
];

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
  
  // Defaults for backward compatibility
  currencySymbol: 'Rs.',
  taxRate: 18,
  quotePrefix: 'QT-',
  invoicePrefix: 'INV-',
  nextQuoteNumber: 1001,
  nextInvoiceNumber: 2001,
  termsConditions: '1. Quotations are valid for 15 days from the date of issue.\n2. 50% advance payment is required to mobilize development resources.\n3. Balance payment is due within 10 days of final project deployment / UAT acceptance.',
  footerNotes: 'Thank you for choosing QuoteFlow. We value your business!',
};

// In-Memory status indicating whether we have encountered a DB schema error
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

  // Initialize and seed local storage if empty
  initializeLocalStorage() {
    if (!localStorage.getItem(CUSTOMERS_KEY)) {
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(PRODUCTS_KEY)) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(QUOTATIONS_KEY)) {
      localStorage.setItem(QUOTATIONS_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(INVOICES_KEY)) {
      localStorage.setItem(INVOICES_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(COMPANY_SETTINGS_KEY)) {
      const localSessionStr = localStorage.getItem('quoteflow_local_session');
      let customSettings = { ...DEFAULT_COMPANY_SETTINGS };
      if (localSessionStr) {
        try {
          const session = JSON.parse(localSessionStr);
          if (session?.user) {
            customSettings.companyName = session.user.companyName || 'My Company';
            customSettings.ownerName = session.user.fullName || 'Manager';
            customSettings.email = session.user.email || '';
          }
        } catch (e) {
          console.error(e);
        }
      }
      localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(customSettings));
    }
  },

  // --- Customers Methods ---
  async getCustomers(): Promise<Customer[]> {
    this.initializeLocalStorage();

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === '42P01') { // Relation does not exist
            isSupabaseSchemaActive = false;
            console.warn('Supabase customers table does not exist yet. Falling back to Local Storage.');
          } else {
            throw error;
          }
        } else if (data) {
          return data.map(c => ({
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
        }
      } catch (err) {
        console.error('Failed to load from Supabase:', err);
      }
    }

    return JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || '[]');
  },

  async saveCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Customer> {
    const isNew = !customer.id;
    const finalId = customer.id || 'cust-' + Math.random().toString(36).substr(2, 9);
    const nowStr = new Date().toISOString();

    const fullCustomer: Customer = {
      ...customer,
      id: finalId,
      createdAt: isNew ? nowStr : (customer as any).createdAt || nowStr,
      updatedAt: nowStr,
    };

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const sessionUser = (await supabase.auth.getUser()).data.user;
        const mappedData = {
          id: isNew ? undefined : customer.id,
          user_id: sessionUser?.id,
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
          result = await supabase.from('customers').update(mappedData).eq('id', customer.id).select().single();
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
          
          // Sync with local storage
          const customers = await this.getCustomers();
          let updated;
          if (isNew) {
            updated = [saved, ...customers];
          } else {
            updated = customers.map(c => c.id === saved.id ? saved : c);
          }
          localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(updated));
          return saved;
        }
      } catch (err: any) {
        console.error('Failed to save customer to Supabase, falling back to Local Storage:', err);
        if (err?.code === '42P01') {
          isSupabaseSchemaActive = false;
        }
        if (err?.code === '23505') {
          throw new Error('A customer with this phone number already exists in your contacts list.');
        }
      }
    }

    // Fallback/Local storage mode validation
    const customers = await this.getCustomers();
    const isDuplicatePhone = customers.some(
      c => c.phone.trim() === customer.phone.trim() && c.id !== customer.id
    );
    if (isDuplicatePhone) {
      throw new Error('A customer with this phone number already exists in your contacts list.');
    }

    let updated;
    if (isNew) {
      updated = [fullCustomer, ...customers];
    } else {
      updated = customers.map(c => c.id === customer.id ? { ...c, ...customer, updatedAt: nowStr } : c);
    }

    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(updated));
    return isNew ? fullCustomer : (updated.find(c => c.id === customer.id) as Customer);
  },

  async deleteCustomer(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete from Supabase:', err);
        throw err;
      }
    }

    const customers = await this.getCustomers();
    const filtered = customers.filter(c => c.id !== id);
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(filtered));
  },

  // --- Products Methods ---
  async getProducts(): Promise<Product[]> {
    this.initializeLocalStorage();

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === '42P01') {
            isSupabaseSchemaActive = false;
            console.warn('Supabase products table does not exist yet. Falling back to Local Storage.');
          } else {
            throw error;
          }
        } else if (data) {
          return data.map(p => ({
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
        }
      } catch (err) {
        console.error('Failed to load products from Supabase:', err);
      }
    }

    return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
  },

  async saveProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Product> {
    const isNew = !product.id;
    const finalId = product.id || 'prod-' + Math.random().toString(36).substr(2, 9);
    const nowStr = new Date().toISOString();

    const fullProduct: Product = {
      ...product,
      id: finalId,
      createdAt: isNew ? nowStr : (product as any).createdAt || nowStr,
      updatedAt: nowStr,
    };

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const sessionUser = (await supabase.auth.getUser()).data.user;
        const mappedData = {
          id: isNew ? undefined : product.id,
          user_id: sessionUser?.id,
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
          result = await supabase.from('products').update(mappedData).eq('id', product.id).select().single();
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

          // Sync with local storage
          const products = await this.getProducts();
          let updated;
          if (isNew) {
            updated = [saved, ...products];
          } else {
            updated = products.map(p => p.id === saved.id ? saved : p);
          }
          localStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated));
          return saved;
        }
      } catch (err: any) {
        console.error('Failed to save product to Supabase, falling back to Local Storage:', err);
        if (err?.code === '42P01') {
          isSupabaseSchemaActive = false;
        }
        if (err?.code === '23505') {
          throw new Error('A product with this SKU already exists in your inventory.');
        }
      }
    }

    // Fallback/Local storage mode validation
    const products = await this.getProducts();
    if (product.sku && product.sku.trim()) {
      const isDuplicateSku = products.some(
        p => p.sku && p.sku.trim().toLowerCase() === product.sku!.trim().toLowerCase() && p.id !== product.id
      );
      if (isDuplicateSku) {
        throw new Error('A product with this SKU already exists in your inventory.');
      }
    }

    let updated;
    if (isNew) {
      updated = [fullProduct, ...products];
    } else {
      updated = products.map(p => p.id === product.id ? { ...p, ...product, updatedAt: nowStr } : p);
    }

    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated));
    return isNew ? fullProduct : (updated.find(p => p.id === product.id) as Product);
  },

  async deleteProduct(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete from Supabase:', err);
        throw err;
      }
    }

    const products = await this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(filtered));
  },

  // --- Quotations Methods ---
  async getQuotations(): Promise<Quotation[]> {
    this.initializeLocalStorage();

    let fetchedQuotations: Quotation[] = [];

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const { data, error } = await supabase
          .from('quotations')
          .select(`
            *,
            customers (customer_name, company_name),
            quotation_items (*)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === '42P01') {
            isSupabaseSchemaActive = false;
            console.warn('Supabase quotations table does not exist yet. Falling back to Local Storage.');
          } else {
            throw error;
          }
        } else if (data) {
          fetchedQuotations = data.map(q => ({
            id: q.id,
            userId: q.user_id,
            quoteNumber: q.quote_number,
            customerId: q.customer_id,
            customerName: q.customers?.customer_name || q.customer_name || 'Deleted Customer',
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
        }
      } catch (err) {
        console.error('Failed to load quotations from Supabase:', err);
      }
    }

    if (fetchedQuotations.length === 0 && (!isSupabaseConfigured || !isSupabaseSchemaActive)) {
      fetchedQuotations = JSON.parse(localStorage.getItem(QUOTATIONS_KEY) || '[]');
    }

    // Load local storage quotation overrides and client approvals
    let approvedMap: Record<string, any> = {};
    try {
      const APPROVED_KEY = 'quoteflow_approved_quotes';
      approvedMap = JSON.parse(localStorage.getItem(APPROVED_KEY) || '{}');
    } catch (e) {}

    let localQuotes: Quotation[] = [];
    try {
      localQuotes = JSON.parse(localStorage.getItem(QUOTATIONS_KEY) || '[]');
    } catch (e) {}

    const localQuoteMap = new Map<string, Quotation>();
    localQuotes.forEach(q => {
      if (q.id) localQuoteMap.set(q.id, q);
      if (q.quoteNumber) localQuoteMap.set(q.quoteNumber, q);
    });

    // Merge any offline/local quotes missing in fetchedQuotations
    const existingIds = new Set(fetchedQuotations.map(q => q.id));
    const existingNums = new Set(fetchedQuotations.map(q => q.quoteNumber));
    localQuotes.forEach(lq => {
      if (!existingIds.has(lq.id) && (!lq.quoteNumber || !existingNums.has(lq.quoteNumber))) {
        fetchedQuotations.push(lq);
      }
    });

    // Helper to evaluate quotation status hierarchy priority
    const getStatusWeight = (status?: string): number => {
      if (!status) return 0;
      switch (status) {
        case 'Converted': return 5;
        case 'Accepted': return 4;
        case 'Rejected': return 4;
        case 'Viewed': return 3;
        case 'Sent': return 2;
        case 'Draft': return 1;
        default: return 0;
      }
    };

    // Sync status overrides (e.g. client approved online via public portal link)
    fetchedQuotations = fetchedQuotations.map(q => {
      const appOverride = approvedMap[q.id] || (q.quoteNumber ? approvedMap[q.quoteNumber] : null);
      const locOverride = localQuoteMap.get(q.id) || (q.quoteNumber ? localQuoteMap.get(q.quoteNumber) : null);

      let targetStatus = q.status || 'Draft';
      let targetNotes = q.notes || '';
      let targetSigName = q.signatureName || locOverride?.signatureName || appOverride?.signatureName;
      let targetSigDate = q.signatureDate || locOverride?.signatureDate || appOverride?.signatureDate;
      let targetRejReason = q.rejectionReason || locOverride?.rejectionReason || appOverride?.rejectionReason;

      // 1. Digital sign-off auto-detection check from all sources FIRST
      const notesSources = [q.notes, appOverride?.notes, locOverride?.notes].filter(Boolean) as string[];
      const hasApprovalInNotes = notesSources.some(n => n.includes('[Digitally Approved') || n.includes('Digitally Approved & Signed'));
      const hasRejectionInNotes = notesSources.some(n => n.includes('[Rejected Reason'));

      if (hasApprovalInNotes) {
        targetStatus = 'Accepted';
        const approvedNote = notesSources.find(n => n.includes('[Digitally Approved') || n.includes('Digitally Approved & Signed'));
        if (approvedNote) targetNotes = approvedNote;
      } else if (hasRejectionInNotes) {
        targetStatus = 'Rejected';
        const rejectedNote = notesSources.find(n => n.includes('[Rejected Reason'));
        if (rejectedNote) targetNotes = rejectedNote;
      } else {
        // 2. Status weight comparison: NEVER let a lower-priority status (e.g. Sent) override a higher-priority status (e.g. Accepted)
        if (appOverride && getStatusWeight(appOverride.status) > getStatusWeight(targetStatus)) {
          targetStatus = appOverride.status;
          if (appOverride.notes) targetNotes = appOverride.notes;
        }
        if (locOverride && getStatusWeight(locOverride.status) > getStatusWeight(targetStatus)) {
          targetStatus = locOverride.status;
          if (locOverride.notes) targetNotes = locOverride.notes;
        }
      }

      // 3. Extract signature name and date if missing from parsed notes
      if (!targetSigName && targetNotes.includes('Digitally Approved & Signed by')) {
        const match = targetNotes.match(/\[Digitally Approved & Signed by (.*?) on (.*?)\]/);
        if (match) {
          targetSigName = match[1];
          targetSigDate = match[2];
        }
      }
      if (!targetRejReason && targetNotes.includes('Rejected Reason:')) {
        const match = targetNotes.match(/\[Rejected Reason: (.*?) on (.*?)\]/);
        if (match) {
          targetRejReason = match[1];
        }
      }

      const isChanged = targetStatus !== q.status || targetNotes !== q.notes || targetSigName !== q.signatureName;

      const updated = {
        ...q,
        status: targetStatus,
        notes: targetNotes,
        signatureName: targetSigName,
        signatureDate: targetSigDate,
        rejectionReason: targetRejReason
      };

      if (isChanged) {
        // Sync back to Supabase DB if owner is active
        if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
          const syncData = {
            status: targetStatus,
            notes: targetNotes,
            updated_at: new Date().toISOString()
          };
          if (q.quoteNumber) {
            supabase.from('quotations').update(syncData).eq('quote_number', q.quoteNumber).then(() => {}).catch(() => {});
          }
          if (isUuid(q.id)) {
            supabase.from('quotations').update(syncData).eq('id', q.id).then(() => {}).catch(() => {});
          }
        }
      }

      return updated;
    });

    // Update local storage cache
    try {
      localStorage.setItem(QUOTATIONS_KEY, JSON.stringify(fetchedQuotations));
    } catch (e) {}

    return fetchedQuotations;
  },

  async saveQuotation(quotation: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Quotation> {
    const isNew = !quotation.id;
    const finalId = quotation.id || 'quote-' + Math.random().toString(36).substr(2, 9);
    const nowStr = new Date().toISOString();

    const fullQuotation: Quotation = {
      ...quotation,
      id: finalId,
      createdAt: isNew ? nowStr : (quotation as any).createdAt || nowStr,
      updatedAt: nowStr,
    };

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const sessionUser = (await supabase.auth.getUser()).data.user;
        const mappedData = {
          id: isNew ? undefined : (isUuid(quotation.id) ? quotation.id : undefined),
          user_id: sessionUser?.id,
          quote_number: quotation.quoteNumber,
          customer_id: quotation.customerId.startsWith('demo') || quotation.customerId.startsWith('cust-') ? null : quotation.customerId,
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
            result = await supabase.from('quotations').update(mappedData).eq('id', quotation.id).select().single();
          } else {
            result = await supabase.from('quotations').update(mappedData).eq('quote_number', quotation.quoteNumber).select().single();
          }
        }

        if (result.error) {
          if (result.error.code === '23505') {
            throw new Error(`Quotation number ${quotation.quoteNumber} already exists in your records.`);
          }
          throw result.error;
        }

        if (result.data) {
          const quoteId = result.data.id;

          // Delete existing quotation items if updating
          if (!isNew) {
            await supabase.from('quotation_items').delete().eq('quotation_id', quoteId);
          }

          if (quotation.items && quotation.items.length > 0) {
            const mappedItems = quotation.items.map(item => ({
              quotation_id: quoteId,
              product_id: item.productId && (item.productId.startsWith('prod-') || item.productId.startsWith('demo')) ? null : item.productId,
              product_name: item.productName,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              tax_percentage: item.taxPercentage || 0,
              line_total: item.lineTotal,
            }));

            const { error: itemsError } = await supabase.from('quotation_items').insert(mappedItems);
            if (itemsError) throw itemsError;
          }

          const savedQuotation: Quotation = {
            id: result.data.id,
            userId: result.data.user_id,
            quoteNumber: result.data.quote_number,
            customerId: result.data.customer_id || quotation.customerId,
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

          // Update local cache
          const quotations = await this.getQuotations();
          let updated;
          if (isNew) {
            updated = [savedQuotation, ...quotations];
            await this.logQuotationActivity(savedQuotation.id, 'Quotation Created', `Quotation draft created.`);
          } else {
            updated = quotations.map(q => q.id === savedQuotation.id ? savedQuotation : q);
          }
          localStorage.setItem(QUOTATIONS_KEY, JSON.stringify(updated));

          return savedQuotation;
        }
      } catch (err: any) {
        console.error('Failed to save quotation to Supabase, falling back to Local Storage:', err);
        if (err?.code === '42P01') {
          isSupabaseSchemaActive = false;
        }
        if (err?.code === '23505') {
          throw new Error(`Quotation number ${quotation.quoteNumber} already exists in your records.`);
        }
      }
    }

    // Local Storage fallback validation
    const quotations = await this.getQuotations();
    const isDuplicateNum = quotations.some(
      q => q.quoteNumber.trim().toLowerCase() === quotation.quoteNumber.trim().toLowerCase() && q.id !== quotation.id
    );
    if (isDuplicateNum) {
      throw new Error(`Quotation number ${quotation.quoteNumber} already exists in your records.`);
    }

    let updated;
    if (isNew) {
      updated = [fullQuotation, ...quotations];
    } else {
      updated = quotations.map(q => q.id === quotation.id ? { ...q, ...quotation, updatedAt: nowStr } : q);
    }

    localStorage.setItem(QUOTATIONS_KEY, JSON.stringify(updated));
    if (isNew) {
      await this.logQuotationActivity(fullQuotation.id, 'Quotation Created', `Quotation draft created.`);
    }
    return isNew ? fullQuotation : (updated.find(q => q.id === quotation.id) as Quotation);
  },

  async deleteQuotation(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        // Delete related quotation items first to prevent foreign key constraint violation
        await supabase.from('quotation_items').delete().eq('quotation_id', id);
        
        const { error } = await supabase.from('quotations').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete from Supabase:', err);
        // Do not rethrow; let the local storage deletion proceed so user experience isn't broken
      }
    }

    const quotations = await this.getQuotations();
    const filtered = quotations.filter(q => q.id !== id);
    localStorage.setItem(QUOTATIONS_KEY, JSON.stringify(filtered));
  },

  // --- Invoices Methods ---
  async getInvoices(): Promise<Invoice[]> {
    this.initializeLocalStorage();

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        // Try fetching with invoice_items
        const { data, error } = await supabase
          .from('invoices')
          .select('*, invoice_items(*)')
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === '42P01') {
            console.warn('invoice_items table or invoices table not present, falling back to simple select');
            // Try simple select
            const simpleResult = await supabase
              .from('invoices')
              .select('*')
              .order('created_at', { ascending: false });
            
            if (simpleResult.error) {
              if (simpleResult.error.code === '42P01') {
                isSupabaseSchemaActive = false;
              } else {
                throw simpleResult.error;
              }
            } else if (simpleResult.data) {
              return simpleResult.data.map(i => ({
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
                items: [],
              }));
            }
          } else {
            throw error;
          }
        } else if (data) {
          return data.map(i => ({
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
        }
      } catch (err) {
        console.error('Failed to load from Supabase:', err);
      }
    }

    return JSON.parse(localStorage.getItem(INVOICES_KEY) || '[]');
  },

  async saveInvoice(invoice: Omit<Invoice, 'id' | 'createdAt'> & { id?: string }): Promise<Invoice> {
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
        const sessionUser = (await supabase.auth.getUser()).data.user;
        const mappedData = {
          id: isNew ? undefined : invoice.id,
          user_id: sessionUser?.id,
          invoice_number: invoice.invoiceNumber,
          quotation_id: invoice.quoteId && !invoice.quoteId.startsWith('quote') && !invoice.quoteId.startsWith('demo') ? invoice.quoteId : null,
          quote_number: invoice.quoteNumber || null,
          customer_id: invoice.customerId && !invoice.customerId.startsWith('demo') && !invoice.customerId.startsWith('cust-') ? invoice.customerId : null,
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
          result = await supabase.from('invoices').update(mappedData).eq('id', invoice.id).select().single();
        }

        if (result.error) throw result.error;

        if (result.data) {
          // Delete existing items if updating
          if (!isNew) {
            await supabase.from('invoice_items').delete().eq('invoice_id', finalId);
          }

          if (invoice.items && invoice.items.length > 0) {
            const mappedItems = invoice.items.map(item => ({
              invoice_id: finalId,
              product_id: item.productId && !item.productId.startsWith('prod-') && !item.productId.startsWith('demo') ? item.productId : null,
              product_name: item.productName,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              tax_percentage: item.taxPercentage || 0,
              line_total: item.lineTotal,
            }));

            const { error: itemsError } = await supabase.from('invoice_items').insert(mappedItems);
            if (itemsError) console.error('Failed to save invoice items to Supabase:', itemsError);
          }

          const savedInvoice: Invoice = {
            id: result.data.id,
            invoiceNumber: result.data.invoice_number,
            quoteId: result.data.quotation_id || invoice.quoteId,
            quoteNumber: result.data.quote_number || invoice.quoteNumber || '',
            customerId: result.data.customer_id || invoice.customerId,
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

          // Update local storage cache
          const localInvoices = await this.getInvoices();
          let updated;
          if (isNew) {
            updated = [savedInvoice, ...localInvoices];
          } else {
            updated = localInvoices.map(i => i.id === savedInvoice.id ? savedInvoice : i);
          }
          localStorage.setItem(INVOICES_KEY, JSON.stringify(updated));

          return savedInvoice;
        }
      } catch (err: any) {
        console.error('Failed to save to Supabase, writing locally:', err);
      }
    }

    // LocalStorage Fallback
    const localInvoices = await this.getInvoices();
    let updated;
    if (isNew) {
      updated = [fullInvoice, ...localInvoices];
    } else {
      updated = localInvoices.map(i => i.id === invoice.id ? { ...i, ...invoice } : i);
    }

    localStorage.setItem(INVOICES_KEY, JSON.stringify(updated));
    return isNew ? fullInvoice : (updated.find(i => i.id === invoice.id) as Invoice);
  },

  async deleteInvoice(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        await supabase.from('invoice_items').delete().eq('invoice_id', id);
        const { error } = await supabase.from('invoices').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete from Supabase:', err);
      }
    }

    const invoices = await this.getInvoices();
    const filtered = invoices.filter(i => i.id !== id);
    localStorage.setItem(INVOICES_KEY, JSON.stringify(filtered));
  },

  async convertQuotationToInvoice(quotationId: string): Promise<Invoice> {
    // 1. Get all quotations and find the matching one
    const quotations = await this.getQuotations();
    const quotation = quotations.find(q => q.id === quotationId || q.quoteNumber === quotationId);
    if (!quotation) {
      throw new Error('Quotation not found.');
    }

    // 2. Check if already converted to prevent duplicate invoice creation
    const invoices = await this.getInvoices();
    const alreadyConverted = invoices.find(i => i.quoteId === quotationId || i.quoteId === quotation.id || i.quoteId === quotation.quoteNumber);
    if (alreadyConverted) {
      throw alreadyConverted; // Return existing invoice or throw
    }

    // 3. Generate unique invoice number
    const count = invoices.length;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(2001 + count).padStart(4, '0')}`;

    // 4. Create new Invoice object
    const todayStr = new Date().toISOString().split('T')[0];
    const dueDateStr = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 15 days due

    const newInvoice: Omit<Invoice, 'id' | 'createdAt'> = {
      invoiceNumber,
      quoteId: quotation.id,
      quoteNumber: quotation.quoteNumber,
      customerId: quotation.customerId,
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

    // 5. Save the newly created invoice
    const savedInvoice = await this.saveInvoice(newInvoice);

    // 6. Update Quotation status to 'Converted'
    quotation.status = 'Converted';
    await this.saveQuotation(quotation);
    
    // Log Activity
    await this.logQuotationActivity(quotation.id, 'Quotation Converted', `Converted to invoice ${savedInvoice.invoiceNumber}.`);

    return savedInvoice;
  },

  // --- Company Settings Methods ---
  async getCompanySettings(): Promise<CompanySettings> {
    this.initializeLocalStorage();

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const { data, error } = await supabase
          .from('company_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (error) {
          if (error.code === '42P01') {
            console.warn('company_settings table does not exist in Supabase yet. Using local storage.');
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
            
            // compatibility fallbacks for existing code
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

    // LocalStorage fallback
    const local = localStorage.getItem(COMPANY_SETTINGS_KEY);
    if (!local) {
      const localSessionStr = localStorage.getItem('quoteflow_local_session');
      let customSettings = { ...DEFAULT_COMPANY_SETTINGS };
      if (localSessionStr) {
        try {
          const session = JSON.parse(localSessionStr);
          if (session?.user) {
            customSettings.companyName = session.user.companyName || 'My Company';
            customSettings.ownerName = session.user.fullName || 'Manager';
            customSettings.email = session.user.email || '';
          }
        } catch (e) {
          console.error(e);
        }
      }
      localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(customSettings));
      return customSettings;
    }
    try {
      return JSON.parse(local);
    } catch {
      return DEFAULT_COMPANY_SETTINGS;
    }
  },

  async saveCompanySettings(settings: CompanySettings): Promise<CompanySettings> {
    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const sessionUser = (await supabase.auth.getUser()).data.user;
        const mappedData = {
          user_id: sessionUser?.id,
          company_name: settings.companyName,
          owner_name: settings.ownerName,
          phone: settings.phone,
          email: settings.email,
          website: settings.website,
          address: settings.address,
          tax_number: settings.taxNumber,
          bank_name: settings.bankName,
          account_title: settings.accountTitle,
          account_number: settings.accountNumber,
          logo_url: settings.logoUrl,
          updated_at: new Date().toISOString()
        };

        // Check if settings already exist in DB for this user
        const { data: existing } = await supabase
          .from('company_settings')
          .select('id')
          .limit(1)
          .maybeSingle();

        let result;
        if (existing?.id) {
          result = await supabase
            .from('company_settings')
            .update(mappedData)
            .eq('id', existing.id)
            .select()
            .single();
        } else {
          result = await supabase
            .from('company_settings')
            .insert(mappedData)
            .select()
            .single();
        }

        if (result.error) {
          if (result.error.code === '42P01') {
            console.warn('company_settings table missing in Supabase. Writing locally.');
          } else {
            throw result.error;
          }
        } else if (result.data) {
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
            
            // compatibility compatibility
            currencySymbol: 'Rs.',
            taxRate: 18,
            quotePrefix: 'QT-',
            invoicePrefix: 'INV-',
            nextQuoteNumber: 1001,
            nextInvoiceNumber: 2001,
          };
          localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(saved));
          return saved;
        }
      } catch (err) {
        console.error('Failed to save company settings to Supabase, writing locally:', err);
      }
    }

    localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(settings));
    return settings;
  },

  async uploadCompanyLogo(file: File): Promise<string> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Running in Demo Mode.');
    }

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('User not authenticated.');
      }

      // 1. Validation (File size max 2MB, image type only)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Maximum logo size limit is 2MB.');
      }
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed.');
      }

      // Generate unique name under user's directory: user_id/logo_timestamp.ext
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${user.id}/logo_${Date.now()}.${fileExt}`;

      // Upload file to the 'company-logos' storage bucket
      const { error } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Get public URL
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

    if (!quote && typeof quoteIdOrObj === 'string') {
      try {
        const local = JSON.parse(localStorage.getItem(QUOTATIONS_KEY) || '[]');
        quote = local.find((q: any) => q.id === quoteIdOrObj || q.quoteNumber === quoteIdOrObj);
      } catch (e) {}
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

    // 1. First, attempt to decode self-contained token payload directly!
    const decodedResult = decodeQuoteToken(tokenOrNumber);
    let decodedQuote: Quotation | null = decodedResult ? decodedResult.quotation : null;

    // 2. Resolve secure token or quote ID from local mapping if any
    const TOKENS_MAP_KEY = 'quoteflow_secure_tokens';
    const tokenMap = JSON.parse(localStorage.getItem(TOKENS_MAP_KEY) || '{}');
    let matchedQuoteId = '';
    for (const [id, t] of Object.entries(tokenMap)) {
      if (t === tokenOrNumber) {
        matchedQuoteId = id;
        break;
      }
    }

    // 3. Search live database/local storage quotations for a matching quote
    let liveQuote: Quotation | undefined;

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const queryTerm = matchedQuoteId || tokenOrNumber;
        let queryData: any = null;
        let queryError: any = null;

        if (isUuid(queryTerm)) {
          const res = await supabase
            .from('quotations')
            .select('*, customers(*), quotation_items(*)')
            .eq('id', queryTerm)
            .maybeSingle();
          queryData = res.data;
          queryError = res.error;
        }

        if (!queryData) {
          const res = await supabase
            .from('quotations')
            .select('*, customers(*), quotation_items(*)')
            .eq('quote_number', queryTerm)
            .maybeSingle();
          queryData = res.data;
          queryError = res.error;
        }

        const data = queryData;
        const error = queryError;

        if (data && !error) {
          liveQuote = {
            id: data.id,
            userId: data.user_id,
            quoteNumber: data.quote_number,
            customerId: data.customer_id,
            customerName: data.customers?.customer_name || data.customer_name || 'Customer',
            companyName: data.customers?.company_name || data.company_name || 'N/A',
            issueDate: data.issue_date,
            expiryDate: data.expiry_date,
            status: data.status,
            subtotal: Number(data.subtotal),
            discountType: data.discount_type || 'fixed',
            discountValue: Number(data.discount_value || 0),
            taxPercentage: Number(data.tax_percentage || 0),
            taxAmount: Number(data.tax_amount || 0),
            grandTotal: Number(data.grand_total),
            notes: data.notes,
            terms: data.terms,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            items: (data.quotation_items || []).map((qi: any) => ({
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

    if (!liveQuote) {
      const quotations = await this.getQuotations();
      if (matchedQuoteId) {
        liveQuote = quotations.find(q => q.id === matchedQuoteId);
      }
      if (!liveQuote) {
        liveQuote = quotations.find(q => q.quoteNumber === tokenOrNumber || q.id === tokenOrNumber || (q as any).secureToken === tokenOrNumber);
      }
    }

    let finalQuote: Quotation | null = liveQuote || decodedQuote;

    if (finalQuote) {
      if (decodedResult?.companySettings && !(finalQuote as any).companySettings) {
        (finalQuote as any).companySettings = decodedResult.companySettings;
      }

      // Apply local approval override or digital sign-off detection if exists
      try {
        const APPROVED_KEY = 'quoteflow_approved_quotes';
        const approvedMap = JSON.parse(localStorage.getItem(APPROVED_KEY) || '{}');
        const appOverride = approvedMap[finalQuote.id] || (finalQuote.quoteNumber ? approvedMap[finalQuote.quoteNumber] : null);
        if (appOverride) {
          finalQuote.status = appOverride.status;
          if (appOverride.notes) finalQuote.notes = appOverride.notes;
          if (appOverride.signatureName) finalQuote.signatureName = appOverride.signatureName;
          if (appOverride.signatureDate) finalQuote.signatureDate = appOverride.signatureDate;
          if (appOverride.rejectionReason) finalQuote.rejectionReason = appOverride.rejectionReason;
        }

        if (finalQuote.notes) {
          if (finalQuote.notes.includes('[Digitally Approved') || finalQuote.notes.includes('Digitally Approved & Signed')) {
            finalQuote.status = 'Accepted';
          } else if (finalQuote.notes.includes('[Rejected Reason')) {
            finalQuote.status = 'Rejected';
          }
        }
      } catch (e) {}

      const isExpired = finalQuote.expiryDate ? new Date(finalQuote.expiryDate) < new Date() : false;
      if (!isExpired && (finalQuote.status === 'Draft' || finalQuote.status === 'Sent')) {
        finalQuote.status = 'Viewed';
        await this.saveQuotation(finalQuote);
      }

      await this.logQuotationActivity(finalQuote.id, 'Quotation Viewed', 'Quotation was accessed and viewed online via secure portal link.');
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
    
    // 1. Try Supabase update if active
    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
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

        const qNo = fullQuote?.quoteNumber || (quoteId.startsWith('QT-') || quoteId.startsWith('BB-') ? quoteId : '');
        let updatedInDb = false;

        if (qNo) {
          const { data: numData } = await supabase
            .from('quotations')
            .update(payload)
            .eq('quote_number', qNo)
            .select();
          if (numData && numData.length > 0) updatedInDb = true;

          if (!updatedInDb) {
            const { data: ilikeData } = await supabase
              .from('quotations')
              .update(payload)
              .ilike('quote_number', qNo)
              .select();
            if (ilikeData && ilikeData.length > 0) updatedInDb = true;
          }
        }

        if (isUuid(quoteId)) {
          const { data: uuidData } = await supabase
            .from('quotations')
            .update(payload)
            .eq('id', quoteId)
            .select();
          if (uuidData && uuidData.length > 0) updatedInDb = true;
        }

        if (!updatedInDb && fullQuote?.id && isUuid(fullQuote.id)) {
          const { data: fUuidData } = await supabase
            .from('quotations')
            .update(payload)
            .eq('id', fullQuote.id)
            .select();
          if (fUuidData && fUuidData.length > 0) updatedInDb = true;
        }

        // Fallback Insert: If quotation row was created offline or missing in Supabase, insert it now with Accepted status
        if (!updatedInDb && fullQuote) {
          try {
            const mappedData: any = {
              id: isUuid(fullQuote.id) ? fullQuote.id : undefined,
              quote_number: fullQuote.quoteNumber || qNo || ('QT-' + Date.now()),
              customer_id: fullQuote.customerId && !fullQuote.customerId.startsWith('demo') && !fullQuote.customerId.startsWith('cust-') ? fullQuote.customerId : null,
              issue_date: fullQuote.issueDate || new Date().toISOString().split('T')[0],
              expiry_date: fullQuote.expiryDate || '',
              status: status,
              subtotal: fullQuote.subtotal || 0,
              discount_type: fullQuote.discountType || 'fixed',
              discount_value: fullQuote.discountValue || 0,
              tax_percentage: fullQuote.taxPercentage || 0,
              tax_amount: fullQuote.taxAmount || 0,
              grand_total: fullQuote.grandTotal || 0,
              notes: notesPayload,
              terms: fullQuote.terms || '',
              created_at: fullQuote.createdAt || timestamp,
              updated_at: timestamp
            };
            await supabase.from('quotations').insert(mappedData);
          } catch (e) {
            console.warn('Fallback insert of public quotation into Supabase notice:', e);
          }
        }
      } catch (err) {
        console.warn('Failed to update public quotation status in Supabase:', err);
      }
    }

    // 2. Always persist update in LocalStorage & Approved Map
    try {
      const local = localStorage.getItem(QUOTATIONS_KEY) || '[]';
      let quotes: Quotation[] = JSON.parse(local);
      const idx = quotes.findIndex(q => q.id === quoteId || (fullQuote?.quoteNumber && q.quoteNumber === fullQuote.quoteNumber));

      const originalNotes = (idx !== -1 ? quotes[idx].notes : fullQuote?.notes) || '';
      const cleanOriginal = originalNotes.replace(/\[Digitally Approved.*\]/g, '').replace(/\[Rejected Reason.*\]/g, '').trim();

      let appendedNotes = cleanOriginal;
      if (status === 'Accepted' && extraData.signatureName) {
        appendedNotes = `[Digitally Approved & Signed by ${extraData.signatureName} on ${new Date().toLocaleString()}] ${cleanOriginal}`;
      } else if (status === 'Rejected' && extraData.rejectionReason) {
        appendedNotes = `[Rejected Reason: ${extraData.rejectionReason} on ${new Date().toLocaleString()}] ${cleanOriginal}`;
      }

      const updatedRecord: Quotation = {
        ...(idx !== -1 ? quotes[idx] : (fullQuote || {
          id: quoteId,
          quoteNumber: fullQuote?.quoteNumber || quoteId,
          customerName: fullQuote?.customerName || 'Customer',
          issueDate: new Date().toISOString(),
          expiryDate: '',
          status: 'Draft',
          subtotal: 0,
          discountType: 'fixed',
          discountValue: 0,
          taxPercentage: 0,
          taxAmount: 0,
          grandTotal: 0,
          items: []
        })),
        status,
        updatedAt: timestamp,
        notes: appendedNotes,
        signatureName: extraData.signatureName,
        signatureDate: extraData.signatureDate || timestamp,
        rejectionReason: extraData.rejectionReason,
        rejectedDate: extraData.rejectedDate || timestamp
      };

      if (idx !== -1) {
        quotes[idx] = updatedRecord;
      } else {
        quotes.unshift(updatedRecord);
      }
      localStorage.setItem(QUOTATIONS_KEY, JSON.stringify(quotes));

      // Save to approved tokens map
      const APPROVED_KEY = 'quoteflow_approved_quotes';
      const approvedMap = JSON.parse(localStorage.getItem(APPROVED_KEY) || '{}');
      const appRecord = { status, notes: appendedNotes, signatureName: extraData.signatureName, signatureDate: extraData.signatureDate || timestamp, rejectionReason: extraData.rejectionReason };
      approvedMap[quoteId] = appRecord;
      if (fullQuote?.id) approvedMap[fullQuote.id] = appRecord;
      if (fullQuote?.quoteNumber) approvedMap[fullQuote.quoteNumber] = appRecord;
      localStorage.setItem(APPROVED_KEY, JSON.stringify(approvedMap));

      // Trigger window event for cross-component live sync
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('quotationStatusUpdated', { detail: { quoteId, status } }));
        window.dispatchEvent(new Event('storage'));
      }

      // Log activity (guarded)
      try {
        if (status === 'Accepted') {
          await this.logQuotationActivity(quoteId, 'Quotation Accepted', `Digitally signed by ${extraData.signatureName}.`);
        } else if (status === 'Rejected') {
          await this.logQuotationActivity(quoteId, 'Quotation Rejected', `Reason: ${extraData.rejectionReason}`);
        }
      } catch (e) {
        console.warn('Non-fatal activity log warning:', e);
      }

      return true;
    } catch (err) {
      console.error('LocalStorage quotation status update failed:', err);
      return true; // Return true as state was captured
    }
  },

  async getQuotationActivities(quotationId?: string): Promise<QuotationActivity[]> {
    const local = localStorage.getItem('quoteflow_quotation_activities') || '[]';
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
    const quotes = await this.getQuotations();
    const quote = quotes.find(q => q.id === quotationId);
    if (!quote) return;

    // Avoid duplicate viewed or downloaded events logged within short time to keep logs readable
    if (event === 'Quotation Viewed' || event === 'Quotation Downloaded') {
      const recentActivities = await this.getQuotationActivities(quotationId);
      const isDuplicate = recentActivities.some(a => 
        a.event === event && 
        (Date.now() - new Date(a.timestamp).getTime()) < 15000 // 15 seconds de-bounce
      );
      if (isDuplicate) return;
    }

    const activities = JSON.parse(localStorage.getItem('quoteflow_quotation_activities') || '[]');
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
    localStorage.setItem('quoteflow_quotation_activities', JSON.stringify(activities));

    // Push an Owner Notification if event is Viewed, Accepted, Rejected, or Downloaded
    if (['Quotation Viewed', 'Quotation Accepted', 'Quotation Rejected', 'Quotation Downloaded'].includes(event)) {
      const notifications = JSON.parse(localStorage.getItem('quoteflow_owner_notifications') || '[]');
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
      localStorage.setItem('quoteflow_owner_notifications', JSON.stringify(notifications));
    }
  },

  async getOwnerNotifications(): Promise<OwnerNotification[]> {
    const local = localStorage.getItem('quoteflow_owner_notifications') || '[]';
    try {
      return JSON.parse(local);
    } catch {
      return [];
    }
  },

  async markNotificationsAsRead(): Promise<void> {
    const local = localStorage.getItem('quoteflow_owner_notifications') || '[]';
    try {
      const notifications = JSON.parse(local);
      const updated = notifications.map((n: any) => ({ ...n, read: true }));
      localStorage.setItem('quoteflow_owner_notifications', JSON.stringify(updated));
    } catch {}
  }
};
