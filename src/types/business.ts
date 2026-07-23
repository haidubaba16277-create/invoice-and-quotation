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
  userId?: string;
  productName: string;
  sku?: string;
  category?: string;
  description?: string;
  unit: string;
  price: number;
  taxPercentage?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuoteItem {
  id?: string;
  quotationId?: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxPercentage: number;
  lineTotal: number;
}

export interface Quotation {
  id: string;
  userId?: string;
  quoteNumber: string;
  customerId: string;
  issueDate: string;
  expiryDate: string;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Accepted' | 'Rejected' | 'Expired' | 'Converted';
  subtotal: number;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  taxPercentage: number;
  taxAmount: number;
  grandTotal: number;
  notes?: string;
  terms?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Client-side UI fields for display or fallback
  customerName?: string;
  companyName?: string;
  items?: QuoteItem[];
  signatureName?: string;
  signatureDate?: string;
  rejectionReason?: string;
  rejectedDate?: string;
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
  discount?: number;
  notes?: string;
  paymentStatus?: 'Pending' | 'Partial' | 'Paid';
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'Pending' | 'Partial' | 'Paid';
  createdAt: string;
  items?: QuoteItem[];
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

export interface QuotationActivity {
  id: string;
  quotationId: string;
  quoteNumber: string;
  customerName: string;
  event: 'Quotation Created' | 'Quotation Sent' | 'Quotation Viewed' | 'Quotation Downloaded' | 'Quotation Accepted' | 'Quotation Rejected' | 'Quotation Converted';
  timestamp: string;
  details?: string;
}

export interface OwnerNotification {
  id: string;
  quotationId: string;
  quoteNumber: string;
  customerName: string;
  event: 'Viewed' | 'Accepted' | 'Rejected' | 'Downloaded';
  timestamp: string;
  read: boolean;
}


