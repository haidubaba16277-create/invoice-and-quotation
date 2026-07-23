import { UserProfile } from '../types/auth';
import { dataService } from '../services/dataService';

export interface PlanLimits {
  name: string;
  customers: number;
  products: number;
  quotations: number; // per month
  invoices: number; // per month
  storageGb: number;
  pricePkr: number;
  features: string[];
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  'Trial': {
    name: 'Trial',
    customers: 10,
    products: 20,
    quotations: 15,
    invoices: 10,
    storageGb: 2,
    pricePkr: 0,
    features: ['basic-pdf', 'whatsapp-sharing', 'performance-reports']
  },
  'Starter': {
    name: 'Starter',
    customers: 100,
    products: 200,
    quotations: 50,
    invoices: 50,
    storageGb: 2,
    pricePkr: 2500,
    features: ['basic-pdf', 'local-sales-tax', 'whatsapp-sharing', 'performance-reports']
  },
  'Professional': {
    name: 'Professional',
    customers: 500,
    products: 1000,
    quotations: 500,
    invoices: 500,
    storageGb: 10,
    pricePkr: 1500,
    features: ['basic-pdf', 'local-sales-tax', 'whatsapp-sharing', 'performance-reports', 'custom-bank-account', 'advanced-pdf', 'analytics', 'csv-export']
  },
  'Business': {
    name: 'Business',
    customers: 5000,
    products: 10000,
    quotations: Infinity,
    invoices: Infinity,
    storageGb: 50,
    pricePkr: 3000,
    features: ['basic-pdf', 'local-sales-tax', 'whatsapp-sharing', 'performance-reports', 'custom-bank-account', 'advanced-pdf', 'analytics', 'csv-export', 'team-collaboration', 'custom-branding', 'priority-support', 'ai-generator']
  },
  'Enterprise': {
    name: 'Enterprise',
    customers: Infinity,
    products: Infinity,
    quotations: Infinity,
    invoices: Infinity,
    storageGb: Infinity,
    pricePkr: 5000,
    features: ['basic-pdf', 'local-sales-tax', 'whatsapp-sharing', 'performance-reports', 'custom-bank-account', 'advanced-pdf', 'analytics', 'csv-export', 'team-collaboration', 'custom-branding', 'priority-support', 'ai-generator', 'api-access', 'dedicated-manager', 'sla-guarantee']
  }
};

export function isSubscriptionExpired(user: UserProfile | null): boolean {
  if (!user) return false;
  
  // Platform owners/administrators never expire and are always active
  if (user.role === 'owner' || user.email.toLowerCase().includes('admin')) {
    return false;
  }
  
  // Explicitly marked expired or suspended statuses
  if (user.subscription_status === 'Expired' || user.subscription_status === 'Suspended' || user.status === 'expired' || user.status === 'suspended') {
    return true;
  }
  
  // Checking trial or subscription date boundary
  if (user.trial_ends_at) {
    const endsAt = new Date(user.trial_ends_at).getTime();
    if (Date.now() > endsAt) {
      return true;
    }
  }
  
  return false;
}

export function hasFeatureAccess(user: UserProfile | null, featureKey: string): boolean {
  if (!user) return false;
  if (user.role === 'owner' || user.email.toLowerCase().includes('admin')) return true;
  if (isSubscriptionExpired(user)) return false;

  const planName = user.plan || user.selected_plan || 'Trial';
  const limits = PLAN_LIMITS[planName] || PLAN_LIMITS['Trial'];
  return limits.features.includes(featureKey);
}

export interface LimitCheckResult {
  reached: boolean;
  count: number;
  limit: number;
  message: string;
}

export async function checkPlanLimits(
  user: UserProfile | null,
  type: 'customers' | 'products' | 'quotations' | 'invoices'
): Promise<LimitCheckResult> {
  if (!user || user.role === 'owner' || user.email.toLowerCase().includes('admin')) {
    return { reached: false, count: 0, limit: Infinity, message: '' };
  }

  const planName = user.plan || user.selected_plan || 'Trial';
  const limits = PLAN_LIMITS[planName] || PLAN_LIMITS['Trial'];
  const limitValue = limits[type];

  let count = 0;
  if (type === 'customers') {
    const list = await dataService.getCustomers();
    count = list.length;
  } else if (type === 'products') {
    const list = await dataService.getProducts();
    count = list.length;
  } else if (type === 'quotations') {
    const list = await dataService.getQuotations();
    // Count items created in current calendar month
    const currentMonth = new Date().toISOString().substring(0, 7);
    count = list.filter(q => (q.createdAt || q.issueDate || '').startsWith(currentMonth)).length;
  } else if (type === 'invoices') {
    const list = await dataService.getInvoices();
    // Count items created in current calendar month
    const currentMonth = new Date().toISOString().substring(0, 7);
    count = list.filter(i => (i.createdAt || i.date || '').startsWith(currentMonth)).length;
  }

  const reached = count >= limitValue;
  const message = reached
    ? `Limit of ${limitValue} ${type} is reached under your ${planName} Plan. Please upgrade your workspace subscription to add more.`
    : `You are using ${count} of ${limitValue === Infinity ? 'unlimited' : limitValue} ${type} under the ${planName} Plan.`;

  return { reached, count, limit: limitValue, message };
}

