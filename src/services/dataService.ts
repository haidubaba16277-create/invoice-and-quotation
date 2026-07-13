import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Customer, Product, Quotation, Invoice, QuoteItem, CompanySettings } from '../types/business';

// Keys for localStorage
const CUSTOMERS_KEY = 'quoteflow_customers';
const PRODUCTS_KEY = 'quoteflow_products';
const QUOTATIONS_KEY = 'quoteflow_quotations';
const INVOICES_KEY = 'quoteflow_invoices';
const COMPANY_SETTINGS_KEY = 'quoteflow_company_settings';
const SUPABASE_MIGRATION_GUIDE_DISMISSED = 'quoteflow_migration_dismissed';


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
  companyName: 'QuoteFlow Pakistan (Pvt) Ltd',
  ownerName: 'Haris Rehman',
  email: 'billing@quoteflow.pk',
  phone: '+92 21 35123456',
  website: 'https://quoteflow.pk',
  address: 'Suite 402, Dolmen Mall Clifton, Karachi, Pakistan',
  taxNumber: 'NTN-7294810-5',
  bankName: 'Habib Bank Limited (HBL)',
  accountTitle: 'QuoteFlow Pakistan (Pvt) Ltd',
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
  footerNotes: 'Thank you for choosing QuoteFlow PK. We value your business!',
};

// In-Memory status indicating whether we have encountered a DB schema error
let isSupabaseSchemaActive = true;

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
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(DEFAULT_CUSTOMERS));
    }
    if (!localStorage.getItem(PRODUCTS_KEY)) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    }
    if (!localStorage.getItem(QUOTATIONS_KEY)) {
      localStorage.setItem(QUOTATIONS_KEY, JSON.stringify(DEFAULT_QUOTATIONS));
    }
    if (!localStorage.getItem(INVOICES_KEY)) {
      localStorage.setItem(INVOICES_KEY, JSON.stringify(DEFAULT_INVOICES));
    }
    if (!localStorage.getItem(COMPANY_SETTINGS_KEY)) {
      localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(DEFAULT_COMPANY_SETTINGS));
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
          return data.map(q => ({
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

    return JSON.parse(localStorage.getItem(QUOTATIONS_KEY) || '[]');
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
          id: isNew ? undefined : quotation.id,
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
          result = await supabase.from('quotations').update(mappedData).eq('id', quotation.id).select().single();
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
    return isNew ? fullQuotation : (updated.find(q => q.id === quotation.id) as Quotation);
  },

  async deleteQuotation(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const { error } = await supabase.from('quotations').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete from Supabase:', err);
        throw err;
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
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) {
      throw new Error('Quotation not found.');
    }

    // 2. Check if already converted to prevent duplicate invoice creation
    const invoices = await this.getInvoices();
    const alreadyConverted = invoices.find(i => i.quoteId === quotationId);
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
      localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(DEFAULT_COMPANY_SETTINGS));
      return DEFAULT_COMPANY_SETTINGS;
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

  async getPublicQuotation(quoteNumber: string): Promise<Quotation | null> {
    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const { data, error } = await supabase
          .from('quotations')
          .select('*, quotation_items(*)')
          .eq('quote_number', quoteNumber)
          .maybeSingle();

        if (error) {
          console.warn('Failed to select public quotation, falling back to local list:', error);
        } else if (data) {
          const items: QuoteItem[] = (data.quotation_items || []).map((item: any) => ({
            productId: item.product_id,
            productName: item.product_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            taxPercentage: item.tax_percentage,
            lineTotal: item.line_total,
          }));

          return {
            id: data.id,
            userId: data.user_id,
            quoteNumber: data.quote_number,
            customerId: data.customer_id,
            customerName: data.customer_name || 'Direct Client',
            companyName: data.company_name || 'N/A',
            issueDate: data.issue_date,
            expiryDate: data.expiry_date,
            status: data.status,
            subtotal: parseFloat(data.subtotal || '0'),
            discountType: data.discount_type || 'fixed',
            discountValue: parseFloat(data.discount_value || '0'),
            taxPercentage: parseFloat(data.tax_percentage || '0'),
            taxAmount: parseFloat(data.tax_amount || '0'),
            grandTotal: parseFloat(data.grand_total || '0'),
            notes: data.notes || '',
            terms: data.terms || '',
            items,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch (err) {
        console.error('Failed to get public quotation from Supabase:', err);
      }
    }

    // LocalStorage fallback
    const local = localStorage.getItem(QUOTATIONS_KEY);
    if (local) {
      try {
        const quotes: Quotation[] = JSON.parse(local);
        const found = quotes.find(q => q.quoteNumber === quoteNumber);
        return found || null;
      } catch {
        return null;
      }
    }
    return null;
  },

  async updatePublicQuotationStatus(
    quoteId: string, 
    status: 'Accepted' | 'Rejected', 
    extraData: { signatureName?: string; signatureDate?: string; rejectionReason?: string; rejectedDate?: string }
  ): Promise<boolean> {
    const timestamp = new Date().toISOString();
    
    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const payload: any = {
          status,
          updated_at: timestamp
        };
        
        // Save digital signature details or rejection notes
        if (status === 'Accepted' && extraData.signatureName) {
          payload.notes = `[Digitally Approved & Signed by ${extraData.signatureName} on ${new Date().toLocaleString()}]` + (extraData.rejectionReason ? ` - Rejection cleared.` : '');
        } else if (status === 'Rejected' && extraData.rejectionReason) {
          payload.notes = `[Rejected Reason: ${extraData.rejectionReason} on ${new Date().toLocaleString()}]`;
        }

        const { error } = await supabase
          .from('quotations')
          .update(payload)
          .eq('id', quoteId);

        if (!error) {
          return true;
        } else {
          console.error('Supabase quote status update error:', error);
        }
      } catch (err) {
        console.error('Failed to update public quotation status in Supabase:', err);
      }
    }

    // LocalStorage fallback update
    const local = localStorage.getItem(QUOTATIONS_KEY);
    if (local) {
      try {
        const quotes: Quotation[] = JSON.parse(local);
        const idx = quotes.findIndex(q => q.id === quoteId);
        if (idx !== -1) {
          const originalNotes = quotes[idx].notes || '';
          const cleanOriginal = originalNotes.replace(/\[Digitally Approved.*\]/g, '').replace(/\[Rejected Reason.*\]/g, '').trim();
          
          let appendedNotes = cleanOriginal;
          if (status === 'Accepted' && extraData.signatureName) {
            appendedNotes = `[Digitally Approved & Signed by ${extraData.signatureName} on ${new Date().toLocaleString()}] ${cleanOriginal}`;
          } else if (status === 'Rejected' && extraData.rejectionReason) {
            appendedNotes = `[Rejected Reason: ${extraData.rejectionReason} on ${new Date().toLocaleString()}] ${cleanOriginal}`;
          }

          quotes[idx] = {
            ...quotes[idx],
            status,
            updatedAt: timestamp,
            notes: appendedNotes,
            signatureName: extraData.signatureName,
            signatureDate: extraData.signatureDate || timestamp,
            rejectionReason: extraData.rejectionReason,
            rejectedDate: extraData.rejectedDate || timestamp
          };
          
          localStorage.setItem(QUOTATIONS_KEY, JSON.stringify(quotes));
          return true;
        }
      } catch (err) {
        console.error('LocalStorage quotation status update failed:', err);
      }
    }
    return false;
  },
};
