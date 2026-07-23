export type PaymentMethod = 'Bank Transfer' | 'JazzCash' | 'Easypaisa' | 'Manual';
export type PaymentStatus = 'Pending' | 'Verified' | 'Rejected';

export interface PaymentSubmission {
  id?: string;
  transactionId: string;
  userId: string;
  userName: string;
  companyName: string;
  plan: string;
  amount: number;
  paymentDate: string;
  screenshot: string; // Base64 or URL
  notes?: string;
  status: PaymentStatus;
  createdAt?: string;
  updatedAt?: string;
  adminNotes?: string;
  history?: any[];
}

export interface CustomerNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: string;
  read: boolean;
}
