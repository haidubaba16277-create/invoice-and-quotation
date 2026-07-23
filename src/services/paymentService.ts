import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PaymentSubmission, CustomerNotification, PaymentStatus } from '../types/payment';
import { authService } from './authService';

let isPaymentSchemaActive = true;

// Helper to convert base64 image data to a Blob for storage upload
function base64ToBlob(base64: string): { blob: Blob; contentType: string; ext: string } {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  const ext = contentType.split('/')[1] || 'png';
  return {
    blob: new Blob([uInt8Array], { type: contentType }),
    contentType,
    ext
  };
}

// Prepopulate dummy payment list if local storage is empty
const INITIAL_LOCAL_PAYMENTS: PaymentSubmission[] = [
  {
    id: 'pay-mock-1',
    transactionId: 'TXN-98421042',
    userId: 'usr-1',
    userName: 'Hamza Malik',
    companyName: 'NexusTech Private Ltd',
    plan: 'Professional',
    amount: 4500,
    paymentDate: '2026-07-15',
    screenshot: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=60',
    notes: 'JazzCash transaction reference attached.',
    status: 'Verified',
    createdAt: new Date('2026-07-15T12:00:00Z').toISOString(),
    updatedAt: new Date('2026-07-15T12:15:00Z').toISOString(),
    adminNotes: 'JazzCash reference matched.'
  },
  {
    id: 'pay-mock-2',
    transactionId: 'TXN-49204910',
    userId: 'usr-2',
    userName: 'Marium Batool',
    companyName: 'Interact Creative Agency',
    plan: 'Business',
    amount: 8500,
    paymentDate: '2026-07-18',
    screenshot: 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=400&auto=format&fit=crop&q=60',
    notes: 'IBAN Direct Wire Transfer slip.',
    status: 'Pending',
    createdAt: new Date('2026-07-18T09:30:00Z').toISOString(),
    updatedAt: new Date('2026-07-18T09:30:00Z').toISOString()
  }
];

export const paymentService = {
  isSchemaActive(): boolean {
    return isPaymentSchemaActive;
  },

  setSchemaInactive() {
    isPaymentSchemaActive = false;
  },

  initializeLocalData() {
    const isCleared = localStorage.getItem('quoteflow_dummy_cleared') === 'true';
    if (!localStorage.getItem('quoteflow_payments')) {
      localStorage.setItem('quoteflow_payments', JSON.stringify(isCleared ? [] : INITIAL_LOCAL_PAYMENTS));
    }
    if (!localStorage.getItem('quoteflow_customer_notifications')) {
      localStorage.setItem('quoteflow_customer_notifications', JSON.stringify([]));
    }
  },

  getHistoryForPayment(paymentId: string, status: PaymentStatus, createdAt?: string, updatedAt?: string): any[] {
    const historyKey = `payment_history_${paymentId}`;
    const stored = localStorage.getItem(historyKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse storage history:', e);
      }
    }

    // fallback generator for backward compatibility or uninitialized records
    const history: any[] = [];
    history.push({
      status: 'Submitted',
      timestamp: createdAt || new Date().toISOString(),
      adminName: 'System'
    });

    if (status === 'Verified') {
      history.push({
        status: 'Verified',
        timestamp: updatedAt || createdAt || new Date().toISOString(),
        adminName: 'Owner Admin'
      });
    } else if (status === 'Rejected') {
      history.push({
        status: 'Rejected',
        timestamp: updatedAt || createdAt || new Date().toISOString(),
        adminName: 'Owner Admin'
      });
    }

    return history;
  },

  // --- Submissions Methods ---
  async submitPayment(payment: Omit<PaymentSubmission, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<PaymentSubmission> {
    this.initializeLocalData();
    const nowStr = new Date().toISOString();
    const finalId = 'pay-' + Date.now() + Math.random().toString(36).substring(2, 6);

    let finalScreenshot = payment.screenshot;

    // Upload to Supabase Storage if configured and is a base64 string
    if (isSupabaseConfigured && supabase && isPaymentSchemaActive && payment.screenshot.startsWith('data:image/')) {
      try {
        // Ensure bucket exists
        try {
          await supabase.storage.createBucket('payment-proofs', { public: true });
        } catch (bErr) {
          // ignore if already exists or can't be created directly
        }

        const { blob, contentType, ext } = base64ToBlob(payment.screenshot);
        const fileName = `${payment.userId}/proof_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, blob, {
            contentType,
            cacheControl: '3600',
            upsert: true
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(fileName);
          finalScreenshot = publicUrl;
        } else {
          console.warn('Supabase Storage upload failed, keeping base64:', uploadError.message);
        }
      } catch (uploadException) {
        console.error('Supabase Storage upload error:', uploadException);
      }
    }

    const submission: PaymentSubmission = {
      ...payment,
      screenshot: finalScreenshot,
      id: finalId,
      status: 'Pending',
      createdAt: nowStr,
      updatedAt: nowStr
    };

    // Initialize history
    const initialHistory = [
      {
        status: 'Submitted',
        timestamp: nowStr,
        adminName: 'System'
      }
    ];
    localStorage.setItem(`payment_history_${finalId}`, JSON.stringify(initialHistory));

    // 1. Try Supabase
    if (isSupabaseConfigured && supabase && isPaymentSchemaActive) {
      try {
        const { data, error } = await supabase
          .from('payments')
          .insert({
            transaction_id: payment.transactionId,
            user_id: payment.userId,
            user_name: payment.userName,
            company_name: payment.companyName,
            plan: payment.plan,
            amount: payment.amount,
            payment_date: payment.paymentDate,
            screenshot: finalScreenshot,
            notes: payment.notes,
            status: 'Pending'
          })
          .select()
          .single();

        if (error) {
          if (error.code === '42P01') {
            isPaymentSchemaActive = false;
            console.warn('payments table does not exist in Supabase yet. Relying on local storage.');
          } else {
            throw error;
          }
        } else if (data) {
          // Save history with database record id as well
          localStorage.setItem(`payment_history_${data.id}`, JSON.stringify(initialHistory));

          const result: PaymentSubmission = {
            id: data.id,
            transactionId: data.transaction_id,
            userId: data.user_id,
            userName: data.user_name,
            companyName: data.company_name,
            plan: data.plan,
            amount: Number(data.amount),
            paymentDate: data.payment_date,
            screenshot: data.screenshot,
            notes: data.notes,
            status: data.status as any,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            history: initialHistory
          };

          // Update local copy too
          const local = JSON.parse(localStorage.getItem('quoteflow_payments') || '[]');
          local.unshift(result);
          localStorage.setItem('quoteflow_payments', JSON.stringify(local));

          return result;
        }
      } catch (err) {
        console.error('Supabase payment submission error, using local fallback:', err);
      }
    }

    // 2. Local Fallback
    const local = JSON.parse(localStorage.getItem('quoteflow_payments') || '[]');
    // Ensure no duplicate transaction IDs locally
    if (local.some((p: PaymentSubmission) => p.transactionId === payment.transactionId)) {
      throw new Error(`Transaction ID "${payment.transactionId}" has already been submitted for verification.`);
    }

    submission.history = initialHistory;
    local.unshift(submission);
    localStorage.setItem('quoteflow_payments', JSON.stringify(local));

    // Also update public dashboard metrics by adding a pending record to default billing logs if any
    const cachedBillingLogs = JSON.parse(localStorage.getItem('quoteflow_admin_payments') || '[]');
    cachedBillingLogs.unshift({
      id: submission.transactionId,
      userId: submission.userId,
      userName: submission.userName,
      companyName: submission.companyName,
      plan: submission.plan,
      amount: submission.amount,
      paymentDate: submission.paymentDate,
      method: payment.transactionId.startsWith('BK-') ? 'Bank Transfer' : payment.transactionId.startsWith('JC-') ? 'JazzCash' : payment.transactionId.startsWith('EP-') ? 'Easypaisa' : 'Manual',
      status: 'Pending'
    });
    localStorage.setItem('quoteflow_admin_payments', JSON.stringify(cachedBillingLogs));

    return submission;
  },

  async syncLocalPaymentsToSupabase(userId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase || !isPaymentSchemaActive) return;
    try {
      const local = JSON.parse(localStorage.getItem('quoteflow_payments') || '[]');
      if (local.length === 0) return;

      const uuidCheck = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      if (!uuidCheck) return;

      // Auto-patch any non-UUID userIds for local payments to the active logged-in user UUID
      let modifiedLocal = false;
      for (let i = 0; i < local.length; i++) {
        const p = local[i];
        const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.userId) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.userId);
        if (!isUserUuid) {
          console.log(`Patching local payment user ID from ${p.userId} to active UUID ${userId}`);
          local[i].userId = userId;
          modifiedLocal = true;
        }
      }
      if (modifiedLocal) {
        localStorage.setItem('quoteflow_payments', JSON.stringify(local));
      }

      for (let i = 0; i < local.length; i++) {
        const p = local[i];
        const isPaymentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id);
        if (!isPaymentUuid && p.userId === userId) {
          const { data: existing } = await supabase
            .from('payments')
            .select('id')
            .eq('transaction_id', p.transactionId)
            .maybeSingle();

          if (!existing) {
            console.log(`Syncing local payment ${p.transactionId} to Supabase...`);
            const { data: inserted, error: insertErr } = await supabase
              .from('payments')
              .insert({
                transaction_id: p.transactionId,
                user_id: userId,
                user_name: p.userName,
                company_name: p.companyName,
                plan: p.plan,
                amount: p.amount,
                payment_date: p.paymentDate,
                screenshot: p.screenshot,
                notes: p.notes,
                status: p.status
              })
              .select()
              .single();

            if (inserted) {
              local[i].id = inserted.id;
              localStorage.setItem('quoteflow_payments', JSON.stringify(local));
            } else if (insertErr) {
              console.error(`Failed to sync local payment ${p.transactionId}:`, insertErr);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed syncing local payments:', err);
    }
  },

  async getPaymentsForUser(userId: string): Promise<PaymentSubmission[]> {
    this.initializeLocalData();

    // First, resolve current user details from local or remote to find matching company or user names
    let userEmail = '';
    let userCompany = '';
    let userName = '';
    let userSubStatus = '';
    
    try {
      const cachedUsersStr = localStorage.getItem('quoteflow_admin_users') || '[]';
      const users = JSON.parse(cachedUsersStr);
      const matched = users.find((u: any) => u.id === userId || (u.email && userEmail && u.email.toLowerCase() === userEmail.toLowerCase()));
      if (matched) {
        userEmail = matched.email || '';
        userCompany = matched.companyName || '';
        userName = matched.fullName || '';
        userSubStatus = matched.subscription_status || matched.status || '';
      }
    } catch {}

    // Check local session as well
    try {
      const localSessionStr = localStorage.getItem('quoteflow_local_session');
      if (localSessionStr) {
        const sess = JSON.parse(localSessionStr);
        if (sess?.user) {
          if (sess.user.id === userId || (sess.user.email && userEmail && sess.user.email.toLowerCase() === userEmail.toLowerCase())) {
            userSubStatus = sess.user.subscription_status || userSubStatus;
          }
        }
      }
    } catch {}

    // Auto-patch any local payments with non-matching userId if names or companies match
    const local: PaymentSubmission[] = JSON.parse(localStorage.getItem('quoteflow_payments') || '[]');
    let localModified = false;
    for (let i = 0; i < local.length; i++) {
      const p = local[i];
      if (p.userId !== userId) {
        const nameMatches = userName && p.userName && (p.userName.toLowerCase().trim() === userName.toLowerCase().trim());
        const companyMatches = userCompany && p.companyName && (p.companyName.toLowerCase().trim() === userCompany.toLowerCase().trim());
        if (nameMatches || companyMatches) {
          console.log(`[getPaymentsForUser] Auto-patching payment ${p.transactionId} user ID from ${p.userId} to active UUID ${userId}`);
          local[i].userId = userId;
          localModified = true;
        }
      }
    }

    if (localModified) {
      localStorage.setItem('quoteflow_payments', JSON.stringify(local));
      try {
        await this.syncLocalPaymentsToSupabase(userId);
      } catch (syncErr) {
        console.error('[getPaymentsForUser] Failed to sync auto-patched payments:', syncErr);
      }
    }

    // Read local cache stores to merge verified status seamlessly
    const currentLocal: PaymentSubmission[] = JSON.parse(localStorage.getItem('quoteflow_payments') || '[]');
    const adminPayments: any[] = JSON.parse(localStorage.getItem('quoteflow_admin_payments') || '[]');
    const userLocalPayments = currentLocal.filter(p => p.userId === userId || (userName && p.userName && p.userName.toLowerCase().trim() === userName.toLowerCase().trim()) || (userCompany && p.companyName && p.companyName.toLowerCase().trim() === userCompany.toLowerCase().trim()));

    let remotePayments: PaymentSubmission[] = [];

    if (isSupabaseConfigured && supabase && isPaymentSchemaActive) {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === '42P01') {
            isPaymentSchemaActive = false;
          } else {
            throw error;
          }
        } else if (data) {
          remotePayments = data.map(d => ({
            id: d.id,
            transactionId: d.transaction_id || d.id,
            userId: d.user_id,
            userName: d.user_name,
            companyName: d.company_name,
            plan: d.plan,
            amount: Number(d.amount),
            paymentDate: d.payment_date,
            screenshot: d.screenshot,
            notes: d.notes,
            status: (d.status === 'Paid' ? 'Verified' : d.status) as any,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
            adminNotes: d.admin_notes
          }));
        }
      } catch (err) {
        console.error('Supabase read error:', err);
      }
    }

    // Deduplicate and merge remote + local payments
    const mergedMap = new Map<string, PaymentSubmission>();

    // Add remote payments first
    for (const r of remotePayments) {
      const key = r.transactionId || r.id;
      mergedMap.set(key, { ...r });
    }

    // Overlay or add local user payments
    for (const lp of userLocalPayments) {
      const key = lp.transactionId || lp.id;
      const existingKey = Array.from(mergedMap.keys()).find(k => 
        k === key || k === lp.id || k === lp.transactionId
      );
      
      const existing = existingKey ? mergedMap.get(existingKey) : null;

      if (!existing) {
        mergedMap.set(key, { ...lp, status: lp.status === ('Paid' as any) ? 'Verified' : lp.status });
      } else {
        // If either remote or local payment status is Verified, mark as Verified
        if (existing.status === 'Verified' || existing.status === ('Paid' as any) || lp.status === 'Verified' || lp.status === ('Paid' as any)) {
          existing.status = 'Verified';
        } else if (existing.status === 'Rejected' || existing.status === ('Failed' as any) || lp.status === 'Rejected' || lp.status === ('Failed' as any)) {
          existing.status = 'Rejected';
        }
        if (lp.adminNotes) existing.adminNotes = lp.adminNotes;
      }
    }

    // Reconcile against adminPayments logs & overall active user status
    const isUserActive = userSubStatus === 'Active' || userSubStatus === 'active';

    for (const [key, item] of mergedMap.entries()) {
      const adminMatch = adminPayments.find(ap => 
        ap.id === item.id || 
        ap.id === item.transactionId || 
        ap.transactionId === item.transactionId ||
        (ap.userName && item.userName && ap.userName.toLowerCase().trim() === item.userName.toLowerCase().trim() && ap.amount === item.amount)
      );

      if (adminMatch) {
        if (adminMatch.status === 'Paid' || adminMatch.status === 'Verified') {
          item.status = 'Verified';
        } else if (adminMatch.status === 'Rejected' || adminMatch.status === 'Failed') {
          item.status = 'Rejected';
        }
      }

      // If user is globally Active and this payment is for their non-trial plan, mark as Verified
      if (isUserActive && item.plan && item.plan !== 'Trial') {
        item.status = 'Verified';
      }

      if (item.status === ('Paid' as any)) item.status = 'Verified';
      if (item.status === ('Failed' as any)) item.status = 'Rejected';

      item.history = this.getHistoryForPayment(item.id || item.transactionId, item.status, item.createdAt, item.updatedAt);
    }

    return Array.from(mergedMap.values());
  },

  async getAllPayments(): Promise<PaymentSubmission[]> {
    this.initializeLocalData();

    const currentLocal: PaymentSubmission[] = JSON.parse(localStorage.getItem('quoteflow_payments') || '[]');
    const adminPayments: any[] = JSON.parse(localStorage.getItem('quoteflow_admin_payments') || '[]');
    let remotePayments: PaymentSubmission[] = [];

    if (isSupabaseConfigured && supabase && isPaymentSchemaActive) {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === '42P01') {
            isPaymentSchemaActive = false;
          } else {
            throw error;
          }
        } else if (data) {
          remotePayments = data.map(d => ({
            id: d.id,
            transactionId: d.transaction_id || d.id,
            userId: d.user_id,
            userName: d.user_name,
            companyName: d.company_name,
            plan: d.plan,
            amount: Number(d.amount),
            paymentDate: d.payment_date,
            screenshot: d.screenshot,
            notes: d.notes,
            status: (d.status === 'Paid' ? 'Verified' : d.status) as any,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
            adminNotes: d.admin_notes
          }));
        }
      } catch (err) {
        console.error('Supabase read error:', err);
      }
    }

    const mergedMap = new Map<string, PaymentSubmission>();

    for (const r of remotePayments) {
      mergedMap.set(r.id || r.transactionId, { ...r });
    }

    for (const lp of currentLocal) {
      const key = lp.id || lp.transactionId;
      const existing = mergedMap.get(key) || Array.from(mergedMap.values()).find(v => v.transactionId === lp.transactionId || v.id === lp.id);

      if (!existing) {
        mergedMap.set(key, { ...lp, status: lp.status === ('Paid' as any) ? 'Verified' : lp.status });
      } else {
        if (lp.status === 'Verified' || lp.status === ('Paid' as any)) {
          existing.status = 'Verified';
        } else if (lp.status === 'Rejected' || lp.status === ('Failed' as any)) {
          existing.status = 'Rejected';
        }
      }
    }

    for (const [key, item] of mergedMap.entries()) {
      const adminMatch = adminPayments.find(ap => ap.id === item.id || ap.id === item.transactionId || ap.transactionId === item.transactionId);
      if (adminMatch) {
        if (adminMatch.status === 'Paid' || adminMatch.status === 'Verified') {
          item.status = 'Verified';
        } else if (adminMatch.status === 'Rejected' || adminMatch.status === 'Failed') {
          item.status = 'Rejected';
        }
      }
      if (item.status === ('Paid' as any)) item.status = 'Verified';
      if (item.status === ('Failed' as any)) item.status = 'Rejected';

      item.history = this.getHistoryForPayment(item.id || item.transactionId, item.status, item.createdAt, item.updatedAt);
    }

    return Array.from(mergedMap.values());
  },

  // --- Verification Actions (Owner) ---
  async verifyPayment(paymentId: string, ownerId: string, adminNotes?: string): Promise<PaymentSubmission> {
    this.initializeLocalData();
    const nowStr = new Date().toISOString();

    console.log('=== START PAYMENT VERIFICATION WORKFLOW ===');
    console.log('DEBUG [paymentId]:', paymentId);
    console.log('DEBUG [ownerId]:', ownerId);

    let matchedPayment: PaymentSubmission | null = null;
    let userId = '';

    // Pre-fetch payment information locally and in Supabase to log user ID and manage fallbacks
    const localPayments: PaymentSubmission[] = JSON.parse(localStorage.getItem('quoteflow_payments') || '[]');
    let localIdx = localPayments.findIndex(p => p.id === paymentId || p.transactionId === paymentId);
    
    if (localIdx === -1 && paymentId) {
      localIdx = localPayments.findIndex(p => 
        (p.id && (p.id.includes(paymentId) || paymentId.includes(p.id))) ||
        (p.transactionId && (p.transactionId.includes(paymentId) || paymentId.includes(p.transactionId)))
      );
    }

    let originalPaymentStatus = 'Pending';
    let originalVerifiedAt = null;
    let originalVerifiedBy = null;
    let originalAdminNotes = '';
    let originalUpdatedAt = '';

    if (localIdx !== -1) {
      userId = localPayments[localIdx].userId || userId;
      originalPaymentStatus = localPayments[localIdx].status;
      originalAdminNotes = localPayments[localIdx].adminNotes || '';
      originalUpdatedAt = localPayments[localIdx].updatedAt || '';
      matchedPayment = { ...localPayments[localIdx], status: 'Verified' };
    }

    if (isSupabaseConfigured && supabase && isPaymentSchemaActive) {
      try {
        let fetchQuery = supabase.from('payments').select('*');
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId)) {
          fetchQuery = fetchQuery.eq('id', paymentId);
        } else {
          fetchQuery = fetchQuery.eq('transaction_id', paymentId);
        }

        const { data: pay, error: fetchError } = await fetchQuery.maybeSingle();

        if (fetchError) {
          console.error('DEBUG [Supabase error pre-fetch payment]:', fetchError);
        } else if (pay) {
          userId = pay.user_id || userId;
          originalPaymentStatus = pay.status;
          originalVerifiedAt = pay.verified_at;
          originalVerifiedBy = pay.verified_by;
          originalAdminNotes = pay.admin_notes || '';
          originalUpdatedAt = pay.updated_at || '';
          console.log('DEBUG [pay.user_id retrieved]:', pay.user_id);

          matchedPayment = {
            id: pay.id,
            transactionId: pay.transaction_id || paymentId,
            userId: pay.user_id || userId,
            userName: pay.user_name || matchedPayment?.userName || 'User',
            companyName: pay.company_name || matchedPayment?.companyName || 'Company',
            plan: pay.plan || matchedPayment?.plan || 'Business Plan',
            amount: Number(pay.amount) || matchedPayment?.amount || 0,
            paymentDate: pay.payment_date || matchedPayment?.paymentDate || nowStr,
            screenshot: pay.screenshot || matchedPayment?.screenshot || '',
            notes: pay.notes || matchedPayment?.notes || '',
            status: 'Verified',
            createdAt: pay.created_at || nowStr,
            updatedAt: pay.updated_at || nowStr,
            adminNotes: pay.admin_notes || adminNotes || 'Verified by admin'
          };
        }
      } catch (err) {
        console.error('DEBUG [Exception pre-fetch payment]:', err);
      }
    }

    console.log('DEBUG [userId]:', userId);

    // Robust User ID Resolution: Ensure we are targeting the actual user's current ID (matching old local IDs to their current migrated IDs)
    try {
      const cachedUsersList = JSON.parse(localStorage.getItem('quoteflow_admin_users') || '[]');
      let resolvedUser = null;
      
      // 1. Try to find user by their ID
      if (userId) {
        resolvedUser = cachedUsersList.find((u: any) => u.id === userId);
      }
      
      // 2. If not found, try to find user matching by name or company name of the payment record
      if (!resolvedUser && localIdx !== -1) {
        const p = localPayments[localIdx];
        resolvedUser = cachedUsersList.find((u: any) => 
          (p.userName && u.fullName && p.userName.toLowerCase().trim() === u.fullName.toLowerCase().trim()) ||
          (p.companyName && u.companyName && p.companyName.toLowerCase().trim() === u.companyName.toLowerCase().trim())
        );
      }
      
      // 3. If found, use their current ID, which might be a UUID!
      if (resolvedUser) {
        console.log(`[verifyPayment] Resolved payment userId from ${userId} to active user ID: ${resolvedUser.id}`);
        userId = resolvedUser.id;
      }
    } catch (e) {
      console.error('[verifyPayment] Failed resolving user:', e);
    }

    // List of rollback functions to run in reverse order if any step in the workflow fails
    const rollbackActions: (() => Promise<void>)[] = [];

    try {
      // -------------------------------------------------------------
      // STEP 1: Update payments table
      // -------------------------------------------------------------
      let paymentUpdateResult: any = null;
      let step1Success = false;

      const isPaymentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId);
      const isOwnerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerId);
      console.log('DEBUG [isPaymentUuid Check]:', isPaymentUuid);
      console.log('DEBUG [isOwnerUuid Check]:', isOwnerUuid);
      // Always update ALL matching payments locally in quoteflow_payments to maintain consistency
      let updatedAnyLocal = false;
      for (let i = 0; i < localPayments.length; i++) {
        const p = localPayments[i];
        const isMatch = p.id === paymentId || 
                        p.transactionId === paymentId ||
                        (paymentId && p.id && (p.id.includes(paymentId) || paymentId.includes(p.id))) ||
                        (paymentId && p.transactionId && (p.transactionId.includes(paymentId) || paymentId.includes(p.transactionId))) ||
                        (matchedPayment && (p.id === matchedPayment.id || p.transactionId === matchedPayment.transactionId)) ||
                        (p.userId && userId && p.userId === userId && p.amount === matchedPayment?.amount);
        if (isMatch) {
          localPayments[i].status = 'Verified';
          localPayments[i].userId = userId || localPayments[i].userId;
          localPayments[i].adminNotes = adminNotes || localPayments[i].adminNotes || 'Verified by admin';
          localPayments[i].updatedAt = nowStr;
          updatedAnyLocal = true;
        }
      }

      if (!updatedAnyLocal && matchedPayment) {
        localPayments.unshift(matchedPayment);
      }
      localStorage.setItem('quoteflow_payments', JSON.stringify(localPayments));

      // Reconcile and update quoteflow_admin_payments logs as well
      try {
        const adminLogs = JSON.parse(localStorage.getItem('quoteflow_admin_payments') || '[]');
        for (let i = 0; i < adminLogs.length; i++) {
          const a = adminLogs[i];
          const isAMatch = a.id === paymentId || 
                           a.transactionId === paymentId || 
                           (matchedPayment && (a.id === matchedPayment.id || a.id === matchedPayment.transactionId || a.transactionId === matchedPayment.transactionId)) ||
                           (a.userId && userId && a.userId === userId);
          if (isAMatch) {
            adminLogs[i].status = 'Paid';
          }
        }
        localStorage.setItem('quoteflow_admin_payments', JSON.stringify(adminLogs));
      } catch (e) {
        console.warn('Failed to update quoteflow_admin_payments in verifyPayment:', e);
      }

      if (isSupabaseConfigured && supabase && isPaymentSchemaActive) {
        try {
          const updatePayload: any = {
            status: 'Verified',
            admin_notes: adminNotes || 'Verified by admin',
            updated_at: nowStr,
            verified_at: nowStr,
            user_id: userId // Ensure correct mapped UUID is synchronized
          };
          if (ownerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerId)) {
            updatePayload.verified_by = ownerId;
          }

          let query = supabase.from('payments').update(updatePayload);
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId)) {
            query = query.eq('id', paymentId);
          } else {
            query = query.eq('transaction_id', paymentId);
          }

          let { data, error } = await query.select().maybeSingle();

          if (error) {
            console.warn('DEBUG [Payment Update Result: Full update query failed, trying minimal update payload]:', error);
            try {
              let minQuery = supabase.from('payments').update({ status: 'Verified', updated_at: nowStr });
              if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId)) {
                minQuery = minQuery.eq('id', paymentId);
              } else {
                minQuery = minQuery.eq('transaction_id', paymentId);
              }
              const minRes = await minQuery.select().maybeSingle();
              if (minRes.data) {
                data = minRes.data;
                error = null;
              }
            } catch (minErr) {
              console.warn('Minimal update query exception:', minErr);
            }
          }

          if (data) {
            paymentUpdateResult = data;
            console.log('DEBUG [Payment Update Result SUCCESS]:', paymentUpdateResult);
            step1Success = true;

            matchedPayment = {
              id: data.id,
              transactionId: data.transaction_id || paymentId,
              userId: data.user_id || userId,
              userName: data.user_name || matchedPayment?.userName || 'User',
              companyName: data.company_name || matchedPayment?.companyName || 'Company',
              plan: data.plan || matchedPayment?.plan || 'Business Plan',
              amount: Number(data.amount) || matchedPayment?.amount || 0,
              paymentDate: data.payment_date || matchedPayment?.paymentDate || nowStr,
              screenshot: data.screenshot || matchedPayment?.screenshot || '',
              notes: data.notes || matchedPayment?.notes || '',
              status: 'Verified',
              createdAt: data.created_at || nowStr,
              updatedAt: data.updated_at || nowStr,
              adminNotes: data.admin_notes || adminNotes || 'Verified by admin'
            };
          }
        } catch (err: any) {
          console.error('DEBUG [Payment Update Result: EXCEPTION occurred]:', err);
        }
      }

      // If Supabase update didn't execute or failed due to missing schema, but we updated locally
      if (!step1Success && matchedPayment) {
        paymentUpdateResult = matchedPayment;
        step1Success = true;
        console.log('DEBUG [Payment Update Result (Local Fallback) SUCCESS]:', paymentUpdateResult);
      }

      if (!matchedPayment) {
        console.error('DEBUG [Payment Update Result: FAILED. Record not found locally or on db]:');
        throw new Error('Payment record not found.');
      }

      console.log('DEBUG [matchedPayment.userId]:', matchedPayment.userId);
      console.log('DEBUG [matchedPayment.plan]:', matchedPayment.plan);

      // -------------------------------------------------------------
      // -------------------------------------------------------------
      // STEP 2: Update subscriptions table
      // -------------------------------------------------------------
      let subscriptionUpdateResult: any = null;
      let step2Success = false;
      const durationDays = 30;
      const startDate = new Date().toISOString().split('T')[0];
      const expiryDate = new Date(Date.now() + durationDays * 24 * 3600 * 1000).toISOString().split('T')[0];

      if (isSupabaseConfigured && supabase && isPaymentSchemaActive) {
        try {
          let targetSubUserId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) ? userId : '';
          let userEmail = '';

          const cachedUsersList = JSON.parse(localStorage.getItem('quoteflow_admin_users') || '[]');
          const uMatch = cachedUsersList.find((u: any) => u.id === userId || (u.fullName && matchedPayment.userName && u.fullName.toLowerCase().trim() === matchedPayment.userName.toLowerCase().trim()));
          if (uMatch && uMatch.email) {
            userEmail = uMatch.email.trim().toLowerCase();
          }

          if (!targetSubUserId && userEmail) {
            const { data: pData } = await supabase.from('profiles').select('id').eq('email', userEmail).maybeSingle();
            if (pData) targetSubUserId = pData.id;
          }

          const subUserId = targetSubUserId || userId;

          // Check if subscription exists in Supabase
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', subUserId)
            .maybeSingle();

          // Construct fully requested update object
          const fullSubUpdate: any = {
            status: 'Active',
            subscription_status: 'Active',
            plan: matchedPayment.plan,
            trial: false,
            trial_status: false,
            trial_started_at: null,
            trial_ends_at: null,
            is_trial: false,
            start_date: startDate,
            expiry_date: expiryDate,
            updated_at: nowStr
          };

          const fallbackSubUpdate = {
            status: 'Active',
            plan: matchedPayment.plan,
            start_date: startDate,
            expiry_date: expiryDate,
            trial: false,
            updated_at: nowStr
          };

          if (!existingSub) {
            let data: any = null;
            let createSubError: any = null;

            try {
              const res = await supabase
                .from('subscriptions')
                .insert({
                  user_id: subUserId,
                  ...fullSubUpdate
                })
                .select()
                .maybeSingle();
              data = res.data;
              createSubError = res.error;

              if (createSubError && createSubError.code === '42703') {
                const resFallback = await supabase
                  .from('subscriptions')
                  .insert({
                    user_id: subUserId,
                    ...fallbackSubUpdate
                  })
                  .select()
                  .maybeSingle();
                data = resFallback.data;
                createSubError = resFallback.error;
              }
            } catch (innerInsErr) {
              const resFallback = await supabase
                .from('subscriptions')
                .insert({
                  user_id: subUserId,
                  ...fallbackSubUpdate
                })
                .select()
                .maybeSingle();
              data = resFallback.data;
              createSubError = resFallback.error;
            }

            if (data) {
              subscriptionUpdateResult = data;
              step2Success = true;
            }
          } else {
            let data: any = null;
            let updateSubError: any = null;

            try {
              const res = await supabase
                .from('subscriptions')
                .update(fullSubUpdate)
                .eq('user_id', subUserId)
                .select()
                .maybeSingle();
              data = res.data;
              updateSubError = res.error;

              if (updateSubError && updateSubError.code === '42703') {
                const resFallback = await supabase
                  .from('subscriptions')
                  .update(fallbackSubUpdate)
                  .eq('user_id', subUserId)
                  .select()
                  .maybeSingle();
                data = resFallback.data;
                updateSubError = resFallback.error;
              }
            } catch (innerUpdErr) {
              const resFallback = await supabase
                .from('subscriptions')
                .update(fallbackSubUpdate)
                .eq('user_id', subUserId)
                .select()
                .maybeSingle();
              data = resFallback.data;
              updateSubError = resFallback.error;
            }

            if (data) {
              subscriptionUpdateResult = data;
              step2Success = true;
            }
          }
        } catch (err: any) {
          console.error('DEBUG [Subscription Update Result EXCEPTION during Supabase query]:', err);
        }
      }

      // Synchronize local subscription logs to guarantee stats stay 100% accurate
      try {
        const subs = JSON.parse(localStorage.getItem('quoteflow_admin_subs') || '[]');
        const subIdx = subs.findIndex((s: any) => s.userId === userId);
        let originalLocalSub: any = null;

        if (subIdx !== -1) {
          originalLocalSub = { ...subs[subIdx] };
          subs[subIdx].plan = matchedPayment.plan;
          subs[subIdx].status = 'active';
          subs[subIdx].startsAt = startDate;
          subs[subIdx].expiresAt = expiryDate;
          subs[subIdx].paymentStatus = 'paid';
          subs[subIdx].amount = matchedPayment.amount;
          localStorage.setItem('quoteflow_admin_subs', JSON.stringify(subs));

          subscriptionUpdateResult = subs[subIdx];
          console.log('DEBUG [Subscription Update Result (Local Sync) SUCCESS]:', subscriptionUpdateResult);

          rollbackActions.push(async () => {
            console.log('ROLLBACK Step 2 (Local): Restoring subscription state');
            const rollbackLocalSubs = JSON.parse(localStorage.getItem('quoteflow_admin_subs') || '[]');
            const idx = rollbackLocalSubs.findIndex((s: any) => s.userId === userId);
            if (idx !== -1) {
              rollbackLocalSubs[idx] = originalLocalSub;
              localStorage.setItem('quoteflow_admin_subs', JSON.stringify(rollbackLocalSubs));
            }
          });
        } else {
          // Create dummy subscription log locally if not found
          const newLocalSub = {
            id: 'sub-' + Date.now(),
            userId,
            userName: matchedPayment.userName || 'SaaS Client',
            companyName: matchedPayment.companyName || 'Company Ltd',
            plan: matchedPayment.plan,
            status: 'active',
            startsAt: startDate,
            expiresAt: expiryDate,
            paymentStatus: 'paid',
            amount: matchedPayment.amount
          };
          subs.push(newLocalSub);
          localStorage.setItem('quoteflow_admin_subs', JSON.stringify(subs));
          subscriptionUpdateResult = newLocalSub;
          console.log('DEBUG [Subscription Update Result (Local Sync - Created new) SUCCESS]:', subscriptionUpdateResult);

          rollbackActions.push(async () => {
            console.log('ROLLBACK Step 2 (Local): Deleting newly created subscription');
            const rollbackLocalSubs = JSON.parse(localStorage.getItem('quoteflow_admin_subs') || '[]');
            const idx = rollbackLocalSubs.findIndex((s: any) => s.userId === userId);
            if (idx !== -1) {
              rollbackLocalSubs.splice(idx, 1);
              localStorage.setItem('quoteflow_admin_subs', JSON.stringify(rollbackLocalSubs));
            }
          });
        }
        step2Success = true;
      } catch (localSubErr) {
        console.error('DEBUG [Subscription Update Result (Local) FAILED]:', localSubErr);
        throw localSubErr;
      }

      // -------------------------------------------------------------
      // STEP 3: Update customer profile
      // -------------------------------------------------------------
      let profileUpdateResult: any = null;
      let step3Success = false;

      if (isSupabaseConfigured && supabase) {
        try {
          let profTargetId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) ? userId : '';
          let userEmail = '';

          const cachedUsersList = JSON.parse(localStorage.getItem('quoteflow_admin_users') || '[]');
          const uMatch = cachedUsersList.find((u: any) => u.id === userId || (u.fullName && matchedPayment.userName && u.fullName.toLowerCase().trim() === matchedPayment.userName.toLowerCase().trim()));
          if (uMatch && uMatch.email) {
            userEmail = uMatch.email.trim().toLowerCase();
          }

          let profQuery = supabase
            .from('profiles')
            .update({
              current_plan: matchedPayment.plan,
              subscription_status: 'Active',
              trial_status: 'false',
              updated_at: nowStr
            });

          if (profTargetId) {
            profQuery = profQuery.eq('id', profTargetId);
          } else if (userEmail) {
            profQuery = profQuery.eq('email', userEmail);
          } else {
            profQuery = profQuery.eq('id', userId);
          }

          const { data: updatedProfile } = await profQuery.select().maybeSingle();

          if (updatedProfile) {
            profileUpdateResult = updatedProfile;
            step3Success = true;
          }
        } catch (err: any) {
          console.error('DEBUG [Profile Update Result EXCEPTION occurred / Table missing]:', err);
        }
      }

      // Synchronize auth user / customer profile locally
      try {
        const updatedProfile = await authService.updateSubscription(
          userId,
          matchedPayment.plan,
          'Active',
          durationDays,
          matchedPayment.userName,
          matchedPayment.companyName
        );
        profileUpdateResult = updatedProfile;
        console.log('DEBUG [Profile Update Result (Local Sync) SUCCESS]:', profileUpdateResult);
        step3Success = true;

        rollbackActions.push(async () => {
          console.log('ROLLBACK Step 3 (Local): Restoring profile status');
          await authService.updateSubscription(
            userId,
            originalPaymentStatus === 'Verified' ? matchedPayment.plan : 'Trial',
            'Trial',
            3
          );
        });
      } catch (localProfileErr) {
        console.error('DEBUG [Profile Update Result (Local) FAILED]:', localProfileErr);
        throw localProfileErr;
      }

      // -------------------------------------------------------------
      // STEP 4: Create notification
      // -------------------------------------------------------------
      let notificationResult: any = null;
      let step4Success = false;
      let createdNotifId = '';

      try {
        const notif = await this.createCustomerNotification(
          userId,
          'Payment Approved',
          `Your payment has been verified successfully.\nYour subscription is now active.`,
          'success'
        );
        notificationResult = notif;
        createdNotifId = notif.id;
        console.log('Notification Result: SUCCESS.', notificationResult);
        step4Success = true;

        rollbackActions.push(async () => {
          console.log('ROLLBACK Step 4: Deleting notification');
          if (isSupabaseConfigured && supabase && isPaymentSchemaActive) {
            await supabase.from('customer_notifications').delete().eq('user_id', userId).eq('title', 'Payment Approved');
          }
          const rollbackLocalNotifs = JSON.parse(localStorage.getItem('quoteflow_customer_notifications') || '[]');
          const idx = rollbackLocalNotifs.findIndex((n: any) => n.id === createdNotifId);
          if (idx !== -1) {
            rollbackLocalNotifs.splice(idx, 1);
            localStorage.setItem('quoteflow_customer_notifications', JSON.stringify(rollbackLocalNotifs));
          }
        });
      } catch (notifErr: any) {
        console.error('Notification Result: FAILED.', notifErr);
        throw new Error(`Failed to create notification: ${notifErr.message || notifErr}`);
      }

      // -------------------------------------------------------------
      // STEP 5: Insert activity log
      // -------------------------------------------------------------
      let activityLogResult: any = null;
      let step5Success = false;

      if (isSupabaseConfigured && supabase && isPaymentSchemaActive && isOwnerUuid) {
        try {
          const { data, error } = await supabase
            .from('activity_logs')
            .insert({
              user_id: ownerId,
              action: 'Verify Payment',
              details: `Verified payment of PKR ${matchedPayment.amount} for customer ${matchedPayment.userName} (Plan: ${matchedPayment.plan}).`,
              timestamp: nowStr
            })
            .select()
            .single();

          if (error) {
            console.error('Activity Log Result: FAILED query.', error);
            if (error.code !== '42P01') {
              throw error;
            }
          } else {
            activityLogResult = data;
            console.log('Activity Log Result: SUCCESS.', activityLogResult);
            step5Success = true;

            rollbackActions.push(async () => {
              console.log('ROLLBACK Step 5: Deleting activity log on Supabase');
              await supabase.from('activity_logs').delete().eq('id', data.id);
            });
          }
        } catch (err: any) {
          console.error('Activity Log Result: EXCEPTION occurred.', err);
          if (err.code !== '42P01') {
            throw new Error(`Failed to write activity log: ${err.message || err}`);
          }
        }
      }

      // Keep local system audit logs / activity logs synchronized
      try {
        const localAuditLogs = JSON.parse(localStorage.getItem('quoteflow_admin_audit') || '[]');
        const newAuditLog = {
          id: `log-${Date.now()}`,
          action: `Verified payment of PKR ${matchedPayment.amount} for customer ${matchedPayment.userName} (Plan: ${matchedPayment.plan}).`,
          ownerEmail: `owner-${ownerId.slice(0, 8)}@quoteflow.pk`,
          targetUser: userId,
          date: nowStr,
          ipAddress: '192.168.10.11'
        };
        localAuditLogs.unshift(newAuditLog);
        localStorage.setItem('quoteflow_admin_audit', JSON.stringify(localAuditLogs));

        activityLogResult = newAuditLog;
        console.log('Activity Log Result (Local Sync): SUCCESS.', activityLogResult);
        step5Success = true;

        rollbackActions.push(async () => {
          console.log('ROLLBACK Step 5 (Local): Removing audit log');
          const rollbackLocalAudits = JSON.parse(localStorage.getItem('quoteflow_admin_audit') || '[]');
          const idx = rollbackLocalAudits.findIndex((log: any) => log.id === newAuditLog.id);
          if (idx !== -1) {
            rollbackLocalAudits.splice(idx, 1);
            localStorage.setItem('quoteflow_admin_audit', JSON.stringify(rollbackLocalAudits));
          }
        });
      } catch (localAuditErr) {
        console.error('Activity Log Result (Local): FAILED.', localAuditErr);
        throw localAuditErr;
      }

      // Update payment status history timeline
      const historyKey = `payment_history_${paymentId}`;
      let history = [];
      try {
        history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      } catch {}
      if (history.length === 0) {
        history.push({
          status: 'Submitted',
          timestamp: matchedPayment.createdAt || nowStr,
          adminName: 'System'
        });
      }
      history.push({
        status: 'Verified',
        timestamp: nowStr,
        adminName: 'Owner Admin'
      });
      localStorage.setItem(historyKey, JSON.stringify(history));
      matchedPayment.history = history;

      // Update old legacy payments logs to match
      const adminPayments = JSON.parse(localStorage.getItem('quoteflow_admin_payments') || '[]');
      const adminPayIdx = adminPayments.findIndex((p: any) => p.id === matchedPayment?.transactionId);
      if (adminPayIdx !== -1) {
        adminPayments[adminPayIdx].status = 'Paid';
        localStorage.setItem('quoteflow_admin_payments', JSON.stringify(adminPayments));
      }

      console.log('=== PAYMENT VERIFICATION WORKFLOW COMPLETED SUCCESSFULLY ===');
      
      // Dispatch custom event to notify React components to immediately refresh/re-fetch without manual reload
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('subscription-updated', { detail: { userId } }));
      }

      return matchedPayment;

    } catch (transactionErr: any) {
      console.error('!!! WORKFLOW TRANSACTION FAILED. EXECUTING ROLLBACK !!!', transactionErr);
      for (let i = rollbackActions.length - 1; i >= 0; i--) {
        try {
          await rollbackActions[i]();
        } catch (rollErr) {
          console.error('Error executing rollback step:', i, rollErr);
        }
      }
      throw transactionErr;
    }
  },

  async rejectPayment(paymentId: string, ownerId: string, adminNotes?: string): Promise<PaymentSubmission> {
    this.initializeLocalData();
    const nowStr = new Date().toISOString();

    console.log('=== START PAYMENT REJECTION WORKFLOW ===');
    console.log('Current Payment ID:', paymentId);
    console.log('Current Owner ID:', ownerId);

    let matchedPayment: PaymentSubmission | null = null;
    let userId = '';

    // Pre-fetch payment information locally and in Supabase to log user ID and manage fallbacks
    const localPayments: PaymentSubmission[] = JSON.parse(localStorage.getItem('quoteflow_payments') || '[]');
    const localIdx = localPayments.findIndex(p => p.id === paymentId);
    let originalPaymentStatus = 'Pending';
    let originalAdminNotes = '';
    let originalUpdatedAt = '';

    if (localIdx !== -1) {
      userId = localPayments[localIdx].userId;
      originalPaymentStatus = localPayments[localIdx].status;
      originalAdminNotes = localPayments[localIdx].adminNotes || '';
      originalUpdatedAt = localPayments[localIdx].updatedAt || '';
    }

    if (isSupabaseConfigured && supabase && isPaymentSchemaActive) {
      try {
        const { data: pay, error: fetchError } = await supabase
          .from('payments')
          .select('*')
          .eq('id', paymentId)
          .maybeSingle();

        if (fetchError) {
          console.error('Supabase query failed during payment pre-fetch:', fetchError);
        } else if (pay) {
          userId = pay.user_id;
          originalPaymentStatus = pay.status;
          originalAdminNotes = pay.admin_notes || '';
          originalUpdatedAt = pay.updated_at || '';
        }
      } catch (err) {
        console.error('Failed to pre-fetch payment from Supabase:', err);
      }
    }

    console.log('Current User ID:', userId);

    // Robust User ID Resolution: Ensure we are targeting the actual user's current ID (matching old local IDs to their current migrated IDs)
    try {
      const cachedUsersList = JSON.parse(localStorage.getItem('quoteflow_admin_users') || '[]');
      let resolvedUser = null;
      
      // 1. Try to find user by their ID
      if (userId) {
        resolvedUser = cachedUsersList.find((u: any) => u.id === userId);
      }
      
      // 2. If not found, try to find user matching by name or company name of the payment record
      if (!resolvedUser && localIdx !== -1) {
        const p = localPayments[localIdx];
        resolvedUser = cachedUsersList.find((u: any) => 
          (p.userName && u.fullName && p.userName.toLowerCase().trim() === u.fullName.toLowerCase().trim()) ||
          (p.companyName && u.companyName && p.companyName.toLowerCase().trim() === u.companyName.toLowerCase().trim())
        );
      }
      
      // 3. If found, use their current ID, which might be a UUID!
      if (resolvedUser) {
        console.log(`[rejectPayment] Resolved payment userId from ${userId} to active user ID: ${resolvedUser.id}`);
        userId = resolvedUser.id;
      }
    } catch (e) {
      console.error('[rejectPayment] Failed resolving user:', e);
    }

    const rollbackActions: (() => Promise<void>)[] = [];

    try {
      let paymentUpdateResult: any = null;
      let step1Success = false;

      // Always update locally if the payment is cached in local storage, to maintain consistency
      if (localIdx !== -1) {
        localPayments[localIdx].status = 'Rejected';
        localPayments[localIdx].userId = userId; // Keep ID aligned
        localPayments[localIdx].adminNotes = adminNotes || localPayments[localIdx].adminNotes;
        localPayments[localIdx].updatedAt = nowStr;
        localStorage.setItem('quoteflow_payments', JSON.stringify(localPayments));
        matchedPayment = localPayments[localIdx];

        rollbackActions.push(async () => {
          console.log('ROLLBACK Step 1 (Local): Restoring payment status');
          const rollbackLocal = JSON.parse(localStorage.getItem('quoteflow_payments') || '[]');
          const idx = rollbackLocal.findIndex((p: any) => p.id === paymentId);
          if (idx !== -1) {
            rollbackLocal[idx].status = originalPaymentStatus;
            rollbackLocal[idx].adminNotes = originalAdminNotes;
            rollbackLocal[idx].updatedAt = originalUpdatedAt;
            localStorage.setItem('quoteflow_payments', JSON.stringify(rollbackLocal));
          }
        });
      }

      // Update in Supabase
      if (isSupabaseConfigured && supabase && isPaymentSchemaActive) {
        try {
          let rejQuery = supabase.from('payments').update({
            status: 'Rejected',
            admin_notes: adminNotes || 'Rejected by admin',
            updated_at: nowStr,
            user_id: userId
          });

          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId)) {
            rejQuery = rejQuery.eq('id', paymentId);
          } else {
            rejQuery = rejQuery.eq('transaction_id', paymentId);
          }

          const { data, error } = await rejQuery.select().maybeSingle();

          if (error) {
            console.error('Payment Reject Result: FAILED query.', error);
            if (error.code === '42P01') {
              console.warn('Payments schema is not active in Supabase. Falling back to Local Storage.');
            } else {
              throw error;
            }
          } else if (data) {
            paymentUpdateResult = data;
            console.log('Payment Reject Result: SUCCESS.', paymentUpdateResult);
            step1Success = true;

            rollbackActions.push(async () => {
              console.log('ROLLBACK Step 1: Restoring payment status on Supabase');
              await supabase.from('payments').update({
                status: originalPaymentStatus,
                admin_notes: originalAdminNotes,
                updated_at: originalUpdatedAt
              }).eq('id', paymentId);
            });

            matchedPayment = {
              id: data.id,
              transactionId: data.transaction_id,
              userId: data.user_id,
              userName: data.user_name,
              companyName: data.company_name,
              plan: data.plan,
              amount: Number(data.amount),
              paymentDate: data.payment_date,
              screenshot: data.screenshot,
              notes: data.notes,
              status: 'Rejected',
              createdAt: data.created_at,
              updatedAt: data.updated_at,
              adminNotes: data.admin_notes
            };
          }
        } catch (err: any) {
          console.error('Payment Reject Result: EXCEPTION occurred.', err);
          if (localIdx !== -1) {
            console.warn('Supabase reject update failed, but local payment was updated successfully. Proceeding with local rejection.');
          } else {
            throw new Error(`Failed to reject payment in table: ${err.message || err}`);
          }
        }
      }

      // If Supabase update didn't execute or failed due to missing table schema, but we updated locally
      if (!step1Success) {
        if (localIdx !== -1) {
          paymentUpdateResult = matchedPayment;
          step1Success = true;
          console.log('Payment Reject Result (Local Fallback): SUCCESS.', paymentUpdateResult);
        } else {
          console.error('Payment Reject Result: FAILED. Record not found.');
          throw new Error('Payment record not found.');
        }
      }

      if (!matchedPayment) {
        throw new Error('Rejection failed: Could not compile payment record.');
      }

      // Update legacy payment log status
      const adminPayments = JSON.parse(localStorage.getItem('quoteflow_admin_payments') || '[]');
      const adminPayIdx = adminPayments.findIndex((p: any) => p.id === matchedPayment?.transactionId);
      let originalAdminPayStatus = '';
      if (adminPayIdx !== -1) {
        originalAdminPayStatus = adminPayments[adminPayIdx].status;
        adminPayments[adminPayIdx].status = 'Failed';
        localStorage.setItem('quoteflow_admin_payments', JSON.stringify(adminPayments));

        rollbackActions.push(async () => {
          const rollbackAdminPay = JSON.parse(localStorage.getItem('quoteflow_admin_payments') || '[]');
          const idx = rollbackAdminPay.findIndex((p: any) => p.id === matchedPayment?.transactionId);
          if (idx !== -1) {
            rollbackAdminPay[idx].status = originalAdminPayStatus;
            localStorage.setItem('quoteflow_admin_payments', JSON.stringify(rollbackAdminPay));
          }
        });
      }

      // Notify Customer: Payment Rejected
      const notif = await this.createCustomerNotification(
        userId,
        'Payment Rejected',
        `Your payment could not be verified.\nReason: ${adminNotes || 'Verification failed. Please check transaction reference.'}\nPlease upload a new payment proof.`,
        'error'
      );
      console.log('Notification Result (Reject): SUCCESS.', notif);

      rollbackActions.push(async () => {
        if (isSupabaseConfigured && supabase && isPaymentSchemaActive) {
          await supabase.from('customer_notifications').delete().eq('user_id', userId).eq('title', 'Payment Rejected');
        }
        const rollbackLocalNotifs = JSON.parse(localStorage.getItem('quoteflow_customer_notifications') || '[]');
        const idx = rollbackLocalNotifs.findIndex((n: any) => n.id === notif.id);
        if (idx !== -1) {
          rollbackLocalNotifs.splice(idx, 1);
          localStorage.setItem('quoteflow_customer_notifications', JSON.stringify(rollbackLocalNotifs));
        }
      });

      // Update history timeline
      const historyKey = `payment_history_${paymentId}`;
      let history = [];
      try {
        history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      } catch {}
      if (history.length === 0) {
        history.push({
          status: 'Submitted',
          timestamp: matchedPayment.createdAt || nowStr,
          adminName: 'System'
        });
      }
      history.push({
        status: 'Rejected',
        timestamp: nowStr,
        adminName: 'Owner Admin'
      });
      localStorage.setItem(historyKey, JSON.stringify(history));
      matchedPayment.history = history;

      console.log('=== PAYMENT REJECTION WORKFLOW COMPLETED SUCCESSFULLY ===');
      return matchedPayment;

    } catch (transactionErr: any) {
      console.error('!!! WORKFLOW TRANSACTION FAILED (REJECT). EXECUTING ROLLBACK !!!', transactionErr);
      for (let i = rollbackActions.length - 1; i >= 0; i--) {
        try {
          await rollbackActions[i]();
        } catch (rollErr) {
          console.error('Error executing rollback step:', i, rollErr);
        }
      }
      throw transactionErr;
    }
  },

  // --- Customer Notifications ---
  async createCustomerNotification(userId: string, title: string, message: string, type: 'success' | 'error' | 'info'): Promise<CustomerNotification> {
    this.initializeLocalData();
    const finalId = 'notif-' + Date.now() + Math.random().toString(36).substring(2, 6);
    const nowStr = new Date().toISOString();

    const notif: CustomerNotification = {
      id: finalId,
      userId,
      title,
      message,
      type,
      timestamp: nowStr,
      read: false
    };

    if (isSupabaseConfigured && supabase && isPaymentSchemaActive) {
      try {
        const { error } = await supabase
          .from('customer_notifications')
          .insert({
            user_id: userId,
            title,
            message,
            type,
            read: false
          });

        if (error && error.code !== '42P01') {
          console.error('Supabase customer notification write failed:', error);
        }
      } catch (err) {
        console.error('Supabase write error:', err);
      }
    }

    const local = JSON.parse(localStorage.getItem('quoteflow_customer_notifications') || '[]');
    local.unshift(notif);
    localStorage.setItem('quoteflow_customer_notifications', JSON.stringify(local));

    return notif;
  },

  async getCustomerNotifications(userId: string): Promise<CustomerNotification[]> {
    this.initializeLocalData();

    if (isSupabaseConfigured && supabase && isPaymentSchemaActive) {
      try {
        const { data, error } = await supabase
          .from('customer_notifications')
          .select('*')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false });

        if (error) {
          if (error.code === '42P01') {
            isPaymentSchemaActive = false;
          } else {
            throw error;
          }
        } else if (data) {
          return data.map(d => ({
            id: d.id,
            userId: d.user_id,
            title: d.title,
            message: d.message,
            type: d.type as any,
            timestamp: d.timestamp,
            read: d.read
          }));
        }
      } catch (err) {
        console.error('Supabase notification read error:', err);
      }
    }

    const local: CustomerNotification[] = JSON.parse(localStorage.getItem('quoteflow_customer_notifications') || '[]');
    return local.filter(n => n.userId === userId);
  },

  async markNotificationsAsRead(userId: string): Promise<void> {
    this.initializeLocalData();

    if (isSupabaseConfigured && supabase && isPaymentSchemaActive) {
      try {
        await supabase
          .from('customer_notifications')
          .update({ read: true })
          .eq('user_id', userId);
      } catch (err) {
        console.error('Supabase update notification as read error:', err);
      }
    }

    const local: CustomerNotification[] = JSON.parse(localStorage.getItem('quoteflow_customer_notifications') || '[]');
    const updated = local.map(n => n.userId === userId ? { ...n, read: true } : n);
    localStorage.setItem('quoteflow_customer_notifications', JSON.stringify(updated));
  },

  async deletePayment(paymentId: string, userId?: string, alsoDeleteUser: boolean = false): Promise<boolean> {
    console.log(`[deletePayment] Deleting payment ${paymentId} (userId: ${userId}, alsoDeleteUser: ${alsoDeleteUser})`);

    // 1. Delete payment from local storage
    const localPayments: PaymentSubmission[] = JSON.parse(localStorage.getItem('quoteflow_payments') || '[]');
    const filteredLocal = localPayments.filter(p => p.id !== paymentId && p.transactionId !== paymentId);
    localStorage.setItem('quoteflow_payments', JSON.stringify(filteredLocal));

    const adminPayments: any[] = JSON.parse(localStorage.getItem('quoteflow_admin_payments') || '[]');
    const filteredAdmin = adminPayments.filter(p => p.id !== paymentId && p.transactionId !== paymentId);
    localStorage.setItem('quoteflow_admin_payments', JSON.stringify(filteredAdmin));

    localStorage.removeItem(`payment_history_${paymentId}`);

    // 2. Delete payment from Supabase DB payments table
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('payments').delete().eq('id', paymentId);
        await supabase.from('payments').delete().eq('transaction_id', paymentId);
      } catch (err) {
        console.error('[deletePayment] Supabase delete payment error:', err);
      }

      if (alsoDeleteUser && userId) {
        try {
          await supabase.from('profiles').delete().eq('id', userId);
          await supabase.from('subscriptions').delete().eq('user_id', userId);
          await supabase.from('customer_notifications').delete().eq('user_id', userId);
          await supabase.from('payments').delete().eq('user_id', userId);
        } catch (err) {
          console.error('[deletePayment] Supabase delete user records error:', err);
        }
      }
    }

    // 3. If alsoDeleteUser is true, remove user and subscriptions from local storage
    if (alsoDeleteUser && userId) {
      const adminUsers = JSON.parse(localStorage.getItem('quoteflow_admin_users') || '[]');
      const updatedUsers = adminUsers.filter((u: any) => u.id !== userId);
      localStorage.setItem('quoteflow_admin_users', JSON.stringify(updatedUsers));

      const adminSubs = JSON.parse(localStorage.getItem('quoteflow_admin_subs') || '[]');
      const updatedSubs = adminSubs.filter((s: any) => s.userId !== userId);
      localStorage.setItem('quoteflow_admin_subs', JSON.stringify(updatedSubs));
    }

    return true;
  }
};
