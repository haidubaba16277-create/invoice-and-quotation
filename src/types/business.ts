export interface Customer {
  id: string;
  userId?: string;
  customerName: string;
  companyName?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  cost: number;
  margin: number; // percentage
  price: number; // cost * (1 + margin/100)
  category: string;
  status: 'active' | 'out_of_stock';
  createdAt: string;
}

export interface QuoteItem {
  productId: string;
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  companyName: string;
  date: string;
  validUntil: string;
  items: QuoteItem[];
  subtotal: number;
  discount: number; // Flat discount Rs.
  taxRate: number; // GST % (default 18% in Pakistan)
  taxAmount: number;
  grandTotal: number;
  status: 'draft' | 'sent' | 'approved' | 'declined' | 'expired';
  notes?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  quoteId: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  companyName: string;
  date: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  createdAt: string;
}

export interface CompanySettings {
  id?: string;
  userId?: string;
  companyName: string;
  ownerName: string;
  phone: string;
  email: string;
  website?: string;
  address: string;
  taxNumber?: string;
  
  // Banking Info
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  logoUrl?: string;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;

  // System Defaults (kept for compatibility with remaining mock views)
  currencySymbol?: string;
  taxRate?: number;
  quotePrefix?: string;
  invoicePrefix?: string;
  nextQuoteNumber?: number;
  nextInvoiceNumber?: number;
  termsConditions?: string;
  footerNotes?: string;
}

