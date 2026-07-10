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
    code: 'QF-SaaS-01',
    name: 'SaaS Cloud Hosting Setup',
    description: 'High-availability server deployment on Cloud Run with automated backups and failovers.',
    cost: 45000,
    margin: 30,
    price: 58500,
    category: 'Cloud Services',
    status: 'active',
    createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'prod-2',
    code: 'QF-DEV-02',
    name: 'Custom React Web App Development',
    description: 'Full-stack responsive design, state managers, and interactive dashboards mapped to custom APIs.',
    cost: 150000,
    margin: 40,
    price: 210000,
    category: 'Software Development',
    status: 'active',
    createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'prod-3',
    code: 'QF-CONS-03',
    name: 'Corporate Agile Consultation (Weekly)',
    description: 'Weekly team feedback, process pipeline audit, and sprint masterclass.',
    cost: 80000,
    margin: 25,
    price: 100000,
    category: 'Consulting',
    status: 'active',
    createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'prod-4',
    code: 'QF-SUPP-04',
    name: 'Enterprise Support SLA (Monthly)',
    description: '24/7 priority response, dedicated slack support channel, and emergency hotfixes.',
    cost: 30000,
    margin: 20,
    price: 36000,
    category: 'Support',
    status: 'active',
    createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
  }
];

const DEFAULT_QUOTATIONS: Quotation[] = [
  {
    id: 'quote-1',
    quoteNumber: 'QT-2026-001',
    customerId: 'cust-1',
    customerName: 'Muhammad Ali',
    companyName: 'Karachi Tech Labs (Pvt) Ltd',
    date: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString().split('T')[0],
    validUntil: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
    items: [
      {
        productId: 'prod-1',
        code: 'QF-SaaS-01',
        name: 'SaaS Cloud Hosting Setup',
        quantity: 1,
        unitPrice: 58500,
        totalPrice: 58500
      },
      {
        productId: 'prod-4',
        code: 'QF-SUPP-04',
        name: 'Enterprise Support SLA (Monthly)',
        quantity: 3,
        unitPrice: 36000,
        totalPrice: 108000
      }
    ],
    subtotal: 166500,
    discount: 6500,
    taxRate: 18, // 18% PK GST
    taxAmount: 28800, // (166500 - 6500) * 0.18
    grandTotal: 188800,
    status: 'approved',
    notes: 'Please complete payment within 15 days of invoice generation.',
    createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'quote-2',
    quoteNumber: 'QT-2026-002',
    customerId: 'cust-2',
    customerName: 'Aisha Khan',
    companyName: 'Lahore Retail Group',
    date: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().split('T')[0],
    items: [
      {
        productId: 'prod-2',
        code: 'QF-DEV-02',
        name: 'Custom React Web App Development',
        quantity: 1,
        unitPrice: 210000,
        totalPrice: 210000
      }
    ],
    subtotal: 210000,
    discount: 10000,
    taxRate: 18,
    taxAmount: 36000,
    grandTotal: 236000,
    status: 'sent',
    notes: 'Development will begin immediately upon 50% advance invoice approval.',
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
        console.error('Failed to save to Supabase:', err);
        throw err;
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
          } else {
            throw error;
          }
        } else if (data) {
          return data.map(p => ({
            id: p.id,
            code: p.code,
            name: p.name,
            description: p.description,
            cost: Number(p.cost),
            margin: Number(p.margin),
            price: Number(p.price),
            category: p.category,
            status: p.status,
            createdAt: p.created_at,
          }));
        }
      } catch (err) {
        console.error('Failed to load from Supabase:', err);
      }
    }

    return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
  },

  async saveProduct(product: Omit<Product, 'id' | 'createdAt'> & { id?: string }): Promise<Product> {
    const isNew = !product.id;
    const finalId = product.id || 'prod-' + Math.random().toString(36).substr(2, 9);
    const finalCreatedAt = new Date().toISOString();

    const fullProduct: Product = {
      ...product,
      id: finalId,
      createdAt: finalCreatedAt,
    };

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const sessionUser = (await supabase.auth.getUser()).data.user;
        const mappedData = {
          id: isNew ? undefined : product.id,
          user_id: sessionUser?.id,
          code: product.code,
          name: product.name,
          description: product.description,
          cost: product.cost,
          margin: product.margin,
          price: product.price,
          category: product.category,
          status: product.status,
        };

        let result;
        if (isNew) {
          result = await supabase.from('products').insert(mappedData).select().single();
        } else {
          result = await supabase.from('products').update(mappedData).eq('id', product.id).select().single();
        }

        if (result.error) throw result.error;

        if (result.data) {
          return {
            id: result.data.id,
            code: result.data.code,
            name: result.data.name,
            description: result.data.description,
            cost: Number(result.data.cost),
            margin: Number(result.data.margin),
            price: Number(result.data.price),
            category: result.data.category,
            status: result.data.status,
            createdAt: result.data.created_at,
          };
        }
      } catch (err) {
        console.error('Failed to save to Supabase:', err);
      }
    }

    const products = await this.getProducts();
    let updated;
    if (isNew) {
      updated = [fullProduct, ...products];
    } else {
      updated = products.map(p => p.id === product.id ? { ...p, ...product } : p);
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
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === '42P01') {
            isSupabaseSchemaActive = false;
          } else {
            throw error;
          }
        } else if (data) {
          return data.map(q => ({
            id: q.id,
            quoteNumber: q.quote_number,
            customerId: q.customer_id,
            customerName: q.customer_name,
            companyName: q.company_name,
            date: q.date,
            validUntil: q.valid_until,
            items: typeof q.items === 'string' ? JSON.parse(q.items) : q.items,
            subtotal: Number(q.subtotal),
            discount: Number(q.discount),
            taxRate: Number(q.tax_rate),
            taxAmount: Number(q.tax_amount),
            grandTotal: Number(q.grand_total),
            status: q.status,
            notes: q.notes,
            createdAt: q.created_at,
          }));
        }
      } catch (err) {
        console.error('Failed to load from Supabase:', err);
      }
    }

    return JSON.parse(localStorage.getItem(QUOTATIONS_KEY) || '[]');
  },

  async saveQuotation(quotation: Omit<Quotation, 'id' | 'createdAt'> & { id?: string }): Promise<Quotation> {
    const isNew = !quotation.id;
    const finalId = quotation.id || 'quote-' + Math.random().toString(36).substr(2, 9);
    const finalCreatedAt = new Date().toISOString();

    const fullQuotation: Quotation = {
      ...quotation,
      id: finalId,
      createdAt: finalCreatedAt,
    };

    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
        const sessionUser = (await supabase.auth.getUser()).data.user;
        const mappedData = {
          id: isNew ? undefined : quotation.id,
          user_id: sessionUser?.id,
          quote_number: quotation.quoteNumber,
          customer_id: quotation.customerId.startsWith('demo') || quotation.customerId.startsWith('cust-') ? null : quotation.customerId,
          customer_name: quotation.customerName,
          company_name: quotation.companyName,
          date: quotation.date,
          valid_until: quotation.validUntil,
          items: quotation.items,
          subtotal: quotation.subtotal,
          discount: quotation.discount,
          tax_rate: quotation.taxRate,
          tax_amount: quotation.taxAmount,
          grand_total: quotation.grandTotal,
          status: quotation.status,
          notes: quotation.notes,
        };

        let result;
        if (isNew) {
          result = await supabase.from('quotations').insert(mappedData).select().single();
        } else {
          result = await supabase.from('quotations').update(mappedData).eq('id', quotation.id).select().single();
        }

        if (result.error) throw result.error;

        if (result.data) {
          return {
            id: result.data.id,
            quoteNumber: result.data.quote_number,
            customerId: result.data.customer_id || quotation.customerId,
            customerName: result.data.customer_name,
            companyName: result.data.company_name,
            date: result.data.date,
            validUntil: result.data.valid_until,
            items: typeof result.data.items === 'string' ? JSON.parse(result.data.items) : result.data.items,
            subtotal: Number(result.data.subtotal),
            discount: Number(result.data.discount),
            taxRate: Number(result.data.tax_rate),
            taxAmount: Number(result.data.tax_amount),
            grandTotal: Number(result.data.grand_total),
            status: result.data.status,
            notes: result.data.notes,
            createdAt: result.data.created_at,
          };
        }
      } catch (err) {
        console.error('Failed to save to Supabase:', err);
      }
    }

    const quotations = await this.getQuotations();
    let updated;
    if (isNew) {
      updated = [fullQuotation, ...quotations];
    } else {
      updated = quotations.map(q => q.id === quotation.id ? { ...q, ...quotation } : q);
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
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === '42P01') {
            isSupabaseSchemaActive = false;
          } else {
            throw error;
          }
        } else if (data) {
          return data.map(i => ({
            id: i.id,
            invoiceNumber: i.invoice_number,
            quoteId: i.quote_id,
            quoteNumber: i.quote_number,
            customerId: i.customer_id,
            customerName: i.customer_name,
            companyName: i.company_name,
            date: i.date,
            dueDate: i.due_date,
            subtotal: Number(i.subtotal),
            taxAmount: Number(i.tax_amount),
            grandTotal: Number(i.grand_total),
            amountPaid: Number(i.amount_paid),
            status: i.status,
            createdAt: i.created_at,
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
          quote_id: invoice.quoteId.startsWith('quote') ? null : invoice.quoteId,
          quote_number: invoice.quoteNumber,
          customer_id: invoice.customerId.startsWith('demo') || invoice.customerId.startsWith('cust-') ? null : invoice.customerId,
          customer_name: invoice.customerName,
          company_name: invoice.companyName,
          date: invoice.date,
          due_date: invoice.dueDate,
          subtotal: invoice.subtotal,
          tax_amount: invoice.taxAmount,
          grand_total: invoice.grandTotal,
          amount_paid: invoice.amountPaid,
          status: invoice.status,
        };

        let result;
        if (isNew) {
          result = await supabase.from('invoices').insert(mappedData).select().single();
        } else {
          result = await supabase.from('invoices').update(mappedData).eq('id', invoice.id).select().single();
        }

        if (result.error) throw result.error;

        if (result.data) {
          return {
            id: result.data.id,
            invoiceNumber: result.data.invoice_number,
            quoteId: result.data.quote_id || invoice.quoteId,
            quoteNumber: result.data.quote_number,
            customerId: result.data.customer_id || invoice.customerId,
            customerName: result.data.customer_name,
            companyName: result.data.company_name,
            date: result.data.date,
            dueDate: result.data.due_date,
            subtotal: Number(result.data.subtotal),
            taxAmount: Number(result.data.tax_amount),
            grandTotal: Number(result.data.grand_total),
            amountPaid: Number(result.data.amount_paid),
            status: result.data.status,
            createdAt: result.data.created_at,
          };
        }
      } catch (err) {
        console.error('Failed to save to Supabase:', err);
      }
    }

    const invoices = await this.getInvoices();
    let updated;
    if (isNew) {
      updated = [fullInvoice, ...invoices];
    } else {
      updated = invoices.map(i => i.id === invoice.id ? { ...i, ...invoice } : i);
    }

    localStorage.setItem(INVOICES_KEY, JSON.stringify(updated));
    return isNew ? fullInvoice : (updated.find(i => i.id === invoice.id) as Invoice);
  },

  async deleteInvoice(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase && isSupabaseSchemaActive) {
      try {
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
};
