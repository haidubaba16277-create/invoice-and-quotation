import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  CreditCard, 
  DollarSign, 
  ShieldAlert, 
  UserPlus, 
  Search, 
  Filter, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  Trash2, 
  UserCheck, 
  Lock, 
  Settings, 
  LifeBuoy, 
  History, 
  Database, 
  HelpCircle, 
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Activity,
  User,
  MapPin,
  Clock,
  Briefcase,
  X,
  Plus,
  Send,
  Eye,
  Check,
  Smartphone,
  Globe,
  Key,
  Flame,
  FileText,
  Download,
  ExternalLink,
  ZoomIn
} from 'lucide-react';
import { UserProfile } from '../types/auth';
import { paymentService } from '../services/paymentService';
import { PaymentSubmission } from '../types/payment';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AdminPanelProps {
  user: UserProfile;
  onExitAdmin: () => void;
  onImpersonate: (userToImpersonate: any) => void;
  isSupabaseConnected: boolean;
}

// Default structural models
interface SaasUser {
  id: string;
  email: string;
  fullName: string;
  companyName: string;
  phone: string;
  plan: 'Starter' | 'Professional' | 'Business' | 'Enterprise';
  status: 'active' | 'suspended' | 'trial' | 'expired';
  signupDate: string;
  lastLogin: string;
  trialDays: number;
  password?: string;
}

interface Subscription {
  id: string;
  userId: string;
  userName: string;
  companyName: string;
  plan: 'Starter' | 'Professional' | 'Business' | 'Enterprise';
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'suspended' | 'cancelled' | 'expired';
  startsAt: string;
  expiresAt: string;
  paymentStatus: 'paid' | 'pending' | 'failed';
  amount: number;
}

interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  companyName: string;
  subject: string;
  message: string;
  status: 'open' | 'in-progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  replies: Array<{ sender: 'owner' | 'customer'; text: string; time: string }>;
}

interface PaymentRecord {
  id: string;
  userId: string;
  userName: string;
  companyName: string;
  plan: string;
  amount: number;
  paymentDate: string;
  method: 'Bank Transfer' | 'JazzCash' | 'Easypaisa' | 'Stripe' | 'Manual';
  status: 'Paid' | 'Pending' | 'Failed';
}

interface AuditLog {
  id: string;
  action: string;
  ownerEmail: string;
  targetUser?: string;
  date: string;
  ipAddress: string;
}

export function AdminPanel({ user, onExitAdmin, onImpersonate, isSupabaseConnected }: AdminPanelProps) {
  // Check if owner
  const isOwner = user.role === 'owner' || user.email.toLowerCase().includes('admin') || user.email.toLowerCase() === 'haidubaba16277@gmail.com';

  // Sub-navigation tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'subscriptions' | 'payments' | 'limits' | 'support' | 'settings' | 'audit'>('dashboard');

  // Load SaaS records from localStorage with mock defaults for standard out of the box operational experience
  const [saasUsers, setSaasUsers] = useState<SaasUser[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<PaymentSubmission[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemSettings, setSystemSettings] = useState({
    saasName: 'QuoteFlow Pro',
    logoUrl: '',
    address: 'Office 402, Commercial Tower, City Center',
    currency: 'PKR',
    timezone: 'UTC',
    taxDefault: '18',
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: 'notifications@quoteflow.com',
    whatsappEnabled: true,
    whatsappNumber: '+15551234567',
    geminiKey: '••••••••••••••••••••••••',
    openaiKey: '',
    maintenanceMode: false,
    adminCustomEmail: 'admin@quoteflow.com',
    adminCustomPassword: 'admin123'
  });

  // Modal / forms state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showDbGuide, setShowDbGuide] = useState(false);
  const [userToChangePassword, setUserToChangePassword] = useState<SaasUser | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [newUser, setNewUser] = useState({
    companyName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    plan: 'Starter' as SaasUser['plan'],
    trialDays: 3
  });

  // Payments verification states
  const [previewPayment, setPreviewPayment] = useState<PaymentSubmission | null>(null);
  const [isScreenshotZoomed, setIsScreenshotZoomed] = useState(false);
  const [actionPayment, setActionPayment] = useState<{ id: string; type: 'verify' | 'reject'; amount: number; customerName: string } | null>(null);
  const [actionNotes, setActionNotes] = useState<string>('');

  // Delete Payment/User state
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentSubmission | null>(null);
  const [deleteUserOption, setDeleteUserOption] = useState<boolean>(false);
  const [isDeletingPayment, setIsDeletingPayment] = useState<boolean>(false);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);

  // Notifications
  const [notif, setNotif] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [isDummyCleared, setIsDummyCleared] = useState(localStorage.getItem('quoteflow_dummy_cleared') === 'true');

  const handleWipeDummyData = () => {
    if (confirm('Bhai, kya aap waqai saara dummy/demo data saaf krna chahte hain? Is se system settings ke ilawa customers, invoices, products aur demo accounts saare delete ho jayenge aur bilkul khali (blank) screens milengi.')) {
      localStorage.setItem('quoteflow_dummy_cleared', 'true');
      setIsDummyCleared(true);

      // Wipe admin records from storage
      localStorage.removeItem('quoteflow_admin_users');
      localStorage.removeItem('quoteflow_admin_subs');
      localStorage.removeItem('quoteflow_admin_payments');
      localStorage.removeItem('quoteflow_admin_tickets');
      localStorage.removeItem('quoteflow_admin_audit');

      // Wipe business data records from storage
      localStorage.removeItem('quoteflow_customers');
      localStorage.removeItem('quoteflow_products');
      localStorage.removeItem('quoteflow_quotations');
      localStorage.removeItem('quoteflow_invoices');

      // Reset state immediately
      setSaasUsers([]);
      setSubscriptions([]);
      setPayments([]);
      setTickets([]);
      setAuditLogs([]);

      showToast('Saara dummy data saaf ho gaya hai! Ab aapka workspace bilkool clean aur real data ke liye tayyar hai.', 'success');
    }
  };

  const handleRestoreDummyData = () => {
    localStorage.removeItem('quoteflow_dummy_cleared');
    setIsDummyCleared(false);

    // Clear keys so they will be re-seeded
    localStorage.removeItem('quoteflow_admin_users');
    localStorage.removeItem('quoteflow_admin_subs');
    localStorage.removeItem('quoteflow_admin_payments');
    localStorage.removeItem('quoteflow_admin_tickets');
    localStorage.removeItem('quoteflow_admin_audit');

    localStorage.removeItem('quoteflow_customers');
    localStorage.removeItem('quoteflow_products');
    localStorage.removeItem('quoteflow_quotations');
    localStorage.removeItem('quoteflow_invoices');

    showToast('Demo data bahal kiya ja raha hai! Reloading...', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleConfirmPaymentAction = async () => {
    if (!actionPayment) return;
    try {
      if (actionPayment.type === 'verify') {
        // Pass user.id as currentOwnerId to track verification logs
        const result = await paymentService.verifyPayment(actionPayment.id, user.id, actionNotes);
        if (result) {
          showToast('Payment successfully verified and subscription activated!');
          logAudit(`Verified payment of ${actionPayment.amount} PKR for ${actionPayment.customerName}.`, '');
          window.dispatchEvent(new CustomEvent('subscription-updated', { detail: { userId: result.userId } }));
          window.dispatchEvent(new CustomEvent('payments-updated'));
        } else {
          showToast('Failed to verify payment.', 'error');
        }
      } else {
        const result = await paymentService.rejectPayment(actionPayment.id, user.id, actionNotes);
        if (result) {
          showToast('Payment rejected successfully.');
          logAudit(`Rejected payment of ${actionPayment.amount} PKR for ${actionPayment.customerName}. Reason: ${actionNotes}`, '');
          window.dispatchEvent(new CustomEvent('subscription-updated', { detail: { userId: result.userId } }));
          window.dispatchEvent(new CustomEvent('payments-updated'));
        } else {
          showToast('Failed to reject payment.', 'error');
        }
      }
      
      // Reload payments list in Admin Panel state
      const updatedPayments = await paymentService.getAllPayments();
      setPayments(updatedPayments);

      // Refresh customers list immediately in local memory so UI stats/sub status sync in real time
      const cachedUsers = localStorage.getItem('quoteflow_admin_users');
      if (cachedUsers) {
        setSaasUsers(JSON.parse(cachedUsers));
      }

      // Refresh subscriptions list immediately so active counters sync
      const cachedSubs = localStorage.getItem('quoteflow_admin_subs');
      if (cachedSubs) {
        setSubscriptions(JSON.parse(cachedSubs));
      }

      // Refresh audit logs list immediately
      const cachedAudit = localStorage.getItem('quoteflow_admin_audit');
      if (cachedAudit) {
        setAuditLogs(JSON.parse(cachedAudit));
      }

    } catch (err: any) {
      console.error('Error executing payment action:', err);
      showToast(err.message || 'An error occurred during verification/rejection', 'error');
    } finally {
      setActionPayment(null);
      setActionNotes('');
    }
  };

  // Search & Filter state
  const [userSearch, setUserSearch] = useState('');
  const [userFilterPlan, setUserFilterPlan] = useState('all');
  const [userFilterStatus, setUserFilterStatus] = useState('all');
  const [userPage, setUserPage] = useState(1);

  // Support center selection
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');

  // Selected User for details
  const [selectedUser, setSelectedUser] = useState<SaasUser | null>(null);
  const [editingUser, setEditingUser] = useState<SaasUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<SaasUser | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotif({ text, type });
    setTimeout(() => setNotif(null), 4000);
  };

  // Log an admin action to local audit logs
  const logAudit = (action: string, target?: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action,
      ownerEmail: user.email,
      targetUser: target,
      date: new Date().toISOString(),
      ipAddress: '192.168.10.11'
    };
    const updated = [newLog, ...auditLogs];
    setAuditLogs(updated);
    localStorage.setItem('quoteflow_admin_audit', JSON.stringify(updated));
  };

  // Load & Seed mock datasets if not present in storage
  useEffect(() => {
    const cachedUsers = localStorage.getItem('quoteflow_admin_users');
    const cachedSubs = localStorage.getItem('quoteflow_admin_subs');
    const cachedPayments = localStorage.getItem('quoteflow_admin_payments');
    const cachedTickets = localStorage.getItem('quoteflow_admin_tickets');
    const cachedAudit = localStorage.getItem('quoteflow_admin_audit');
    const cachedSettings = localStorage.getItem('quoteflow_admin_settings');

    const isCleared = localStorage.getItem('quoteflow_dummy_cleared') === 'true';

    if (cachedUsers) {
      setSaasUsers(JSON.parse(cachedUsers));
    } else {
      const mockUsers: SaasUser[] = isCleared ? [] : [
        { id: 'usr-1', email: 'hamza@nexustech.pk', fullName: 'Hamza Malik', companyName: 'NexusTech Private Ltd', phone: '+92 321 8483921', plan: 'Business', status: 'active', signupDate: '2026-06-10T12:00:00Z', lastLogin: '2026-07-14T03:45:00Z', trialDays: 0, password: 'nexus_hamza99' },
        { id: 'usr-2', email: 'marium@interact.com', fullName: 'Marium Batool', companyName: 'Interact Creative Agency', phone: '+92 333 4910294', plan: 'Starter', status: 'trial', signupDate: '2026-07-02T15:30:00Z', lastLogin: '2026-07-13T10:15:00Z', trialDays: 3, password: 'marium_creative' },
        { id: 'usr-3', email: 'salman@giga.com.pk', fullName: 'Salman Lodhi', companyName: 'Giga Builders & Devs', phone: '+92 300 4059102', plan: 'Professional', status: 'active', signupDate: '2026-05-20T09:12:00Z', lastLogin: '2026-07-14T01:10:00Z', trialDays: 0, password: 'giga_salman123' },
        { id: 'usr-4', email: 'tayyab@fresho.pk', fullName: 'Tayyab Mahmood', companyName: 'Fresho Food Deliveries', phone: '+92 312 9049102', plan: 'Enterprise', status: 'active', signupDate: '2026-04-12T08:00:00Z', lastLogin: '2026-07-13T23:50:00Z', trialDays: 0, password: 'fresho_tayyab55' },
        { id: 'usr-5', email: 'bilal@retrofit.pk', fullName: 'Bilal Farooq', companyName: 'RetroFit Gyms & Apparel', phone: '+92 345 5029104', plan: 'Starter', status: 'expired', signupDate: '2026-06-15T11:45:00Z', lastLogin: '2026-06-29T16:20:00Z', trialDays: 0, password: 'retrofit_bilal7' },
        { id: 'usr-6', email: 'ayesha.qureshi@vivid.pk', fullName: 'Ayesha Qureshi', companyName: 'Vivid Digital Hub', phone: '+92 324 4920194', plan: 'Professional', status: 'suspended', signupDate: '2026-05-01T14:00:00Z', lastLogin: '2026-06-10T09:00:00Z', trialDays: 0, password: 'vivid_ayesha12' }
      ];
      setSaasUsers(mockUsers);
      localStorage.setItem('quoteflow_admin_users', JSON.stringify(mockUsers));
    }

    if (cachedSubs) {
      setSubscriptions(JSON.parse(cachedSubs));
    } else {
      const mockSubs: Subscription[] = isCleared ? [] : [
        { id: 'sub-1', userId: 'usr-1', userName: 'Hamza Malik', companyName: 'NexusTech Private Ltd', plan: 'Business', billingCycle: 'monthly', status: 'active', startsAt: '2026-06-10', expiresAt: '2026-08-10', paymentStatus: 'paid', amount: 8500 },
        { id: 'sub-2', userId: 'usr-2', userName: 'Marium Batool', companyName: 'Interact Creative Agency', plan: 'Starter', billingCycle: 'monthly', status: 'active', startsAt: '2026-07-02', expiresAt: '2026-07-16', paymentStatus: 'pending', amount: 0 },
        { id: 'sub-3', userId: 'usr-3', userName: 'Salman Lodhi', companyName: 'Giga Builders & Devs', plan: 'Professional', billingCycle: 'yearly', status: 'active', startsAt: '2026-05-20', expiresAt: '2027-05-20', paymentStatus: 'paid', amount: 48000 },
        { id: 'sub-4', userId: 'usr-4', userName: 'Tayyab Mahmood', companyName: 'Fresho Food Deliveries', plan: 'Enterprise', billingCycle: 'monthly', status: 'active', startsAt: '2026-04-12', expiresAt: '2026-08-12', paymentStatus: 'paid', amount: 18000 },
        { id: 'sub-5', userId: 'usr-5', userName: 'Bilal Farooq', companyName: 'RetroFit Gyms & Apparel', plan: 'Starter', billingCycle: 'monthly', status: 'expired', startsAt: '2026-06-15', expiresAt: '2026-06-29', paymentStatus: 'failed', amount: 2500 }
      ];
      setSubscriptions(mockSubs);
      localStorage.setItem('quoteflow_admin_subs', JSON.stringify(mockSubs));
    }

    paymentService.getAllPayments()
      .then(setPayments)
      .catch(err => console.error('Error loading payments:', err));

    if (cachedTickets) {
      setTickets(JSON.parse(cachedTickets));
    } else {
      const mockTickets: SupportTicket[] = isCleared ? [] : [
        { id: 'tkt-1', userId: 'usr-1', userName: 'Hamza Malik', companyName: 'NexusTech Private Ltd', subject: 'PDF Export Tax calculation discrepancy', message: 'Hello, the reports show tax as 18% but the PDF lists the breakdown column rounded. Please check our customer quotation Q-2026-081.', status: 'open', priority: 'high', createdAt: '2026-07-13T14:10:00Z', replies: [{ sender: 'customer', text: 'Please help check this immediately as the client is waiting.', time: '2026-07-13T14:15:00Z' }] },
        { id: 'tkt-2', userId: 'usr-2', userName: 'Marium Batool', companyName: 'Interact Creative Agency', subject: 'WhatsApp settings verification', message: 'Can we send proposal updates directly using our custom WhatsApp business number?', status: 'in-progress', priority: 'medium', createdAt: '2026-07-11T08:00:00Z', replies: [{ sender: 'customer', text: 'I completed basic business setup but verification is pending.', time: '2026-07-11T08:00:00Z' }, { sender: 'owner', text: 'Hi Marium! Please provide your Facebook Business Manager verified ID so we can toggle your direct integration route.', time: '2026-07-12T10:30:00Z' }] },
        { id: 'tkt-3', userId: 'usr-3', userName: 'Salman Lodhi', companyName: 'Giga Builders & Devs', subject: 'Need custom terms of payment on Invoices', message: 'We want to override standard terms with custom milestones like 50% advance and 50% post delivery.', status: 'closed', priority: 'low', createdAt: '2026-06-15T09:00:00Z', replies: [{ sender: 'customer', text: 'Requested change.', time: '2026-06-15T09:00:00Z' }, { sender: 'owner', text: 'Hi Salman, you can add custom text blocks to default notes within System Settings.', time: '2026-06-16T11:00:00Z' }] }
      ];
      setTickets(mockTickets);
      localStorage.setItem('quoteflow_admin_tickets', JSON.stringify(mockTickets));
    }

    if (cachedAudit) {
      setAuditLogs(JSON.parse(cachedAudit));
    } else {
      const mockAudit: AuditLog[] = [
        { id: 'log-1', action: 'Owner logged in successfully.', ownerEmail: user.email, date: '2026-07-14T04:30:00Z', ipAddress: '192.168.10.11' },
        { id: 'log-2', action: 'Updated Global System Settings (SaaS Name and Currency defaults).', ownerEmail: user.email, date: '2026-07-13T11:15:00Z', ipAddress: '192.168.10.11' },
        { id: 'log-3', action: 'Activated manual subscription for user Hamza Malik.', ownerEmail: user.email, targetUser: 'usr-1', date: '2026-07-10T16:40:00Z', ipAddress: '192.168.10.11' }
      ];
      setAuditLogs(mockAudit);
      localStorage.setItem('quoteflow_admin_audit', JSON.stringify(mockAudit));
    }

    if (cachedSettings) {
      setSystemSettings(JSON.parse(cachedSettings));
    }
  }, [user.email]);

  // Handle manual user creation
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.companyName || !newUser.ownerName || !newUser.email || !newUser.password) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    if (newUser.password !== newUser.confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    const createdUserId = `usr-${Date.now()}`;
    const freshUser: SaasUser = {
      id: createdUserId,
      email: newUser.email,
      fullName: newUser.ownerName,
      companyName: newUser.companyName,
      phone: newUser.phone,
      plan: newUser.plan,
      status: newUser.trialDays > 0 ? 'trial' : 'active',
      signupDate: new Date().toISOString(),
      lastLogin: 'Never',
      trialDays: newUser.trialDays,
      password: newUser.password
    };

    const freshSub: Subscription = {
      id: `sub-${Date.now()}`,
      userId: createdUserId,
      userName: newUser.ownerName,
      companyName: newUser.companyName,
      plan: newUser.plan,
      billingCycle: 'monthly',
      status: 'active',
      startsAt: new Date().toISOString().split('T')[0],
      expiresAt: new Date(Date.now() + (newUser.trialDays || 30) * 24 * 3600 * 1000).toISOString().split('T')[0],
      paymentStatus: 'paid',
      amount: newUser.plan === 'Professional' ? 1500 : newUser.plan === 'Business' ? 3000 : newUser.plan === 'Enterprise' ? 5000 : 1500
    };

    const updatedUsers = [...saasUsers, freshUser];
    const updatedSubs = [...subscriptions, freshSub];

    setSaasUsers(updatedUsers);
    setSubscriptions(updatedSubs);

    localStorage.setItem('quoteflow_admin_users', JSON.stringify(updatedUsers));
    localStorage.setItem('quoteflow_admin_subs', JSON.stringify(updatedSubs));

    logAudit(`Manually created customer account: ${newUser.ownerName} (${newUser.companyName})`, createdUserId);
    showToast('Customer account & subscription created successfully!');
    setShowCreateUserModal(false);
    
    // Reset form
    setNewUser({
      companyName: '',
      ownerName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      plan: 'Starter',
      trialDays: 3
    });
  };

  // Update client password
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToChangePassword || !newPasswordValue.trim()) return;

    if (newPasswordValue.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    const updatedUsers = saasUsers.map(u => {
      if (u.id === userToChangePassword.id) {
        return { ...u, password: newPasswordValue };
      }
      return u;
    });

    setSaasUsers(updatedUsers);
    localStorage.setItem('quoteflow_admin_users', JSON.stringify(updatedUsers));
    
    logAudit(`Updated login credentials/password for client: ${userToChangePassword.fullName}`, userToChangePassword.id);
    showToast(`Password successfully updated for ${userToChangePassword.fullName}!`);
    setUserToChangePassword(null);
    setNewPasswordValue('');
  };

  // Impersonate customer
  const handleImpersonateUser = (target: SaasUser) => {
    const latestUser = saasUsers.find(u => u.id === target.id) || target;
    const matchedSub = subscriptions.find(s => s.userId === target.id);
    
    const subStatus = matchedSub 
      ? (matchedSub.status === 'active' ? 'Active' : matchedSub.status.charAt(0).toUpperCase() + matchedSub.status.slice(1))
      : (latestUser.status === 'trial' ? 'Trial' : latestUser.status.charAt(0).toUpperCase() + latestUser.status.slice(1));

    const trialEndsAt = matchedSub 
      ? matchedSub.expiresAt 
      : new Date(new Date(latestUser.signupDate).getTime() + (latestUser.trialDays || 3) * 24 * 3600 * 1000).toISOString();

    logAudit(`Initiated profile impersonation (Login-As) for customer: ${latestUser.fullName}`, latestUser.id);
    showToast(`Logging in as ${latestUser.fullName}... Redirecting.`, 'info');
    onImpersonate({
      id: latestUser.id,
      email: latestUser.email,
      fullName: latestUser.fullName,
      companyName: latestUser.companyName,
      createdAt: latestUser.signupDate,
      plan: latestUser.plan,
      role: 'customer',
      selected_plan: latestUser.plan,
      subscription_status: subStatus,
      trial_started_at: subStatus === 'Active' ? null : latestUser.signupDate,
      trial_ends_at: subStatus === 'Active' ? null : trialEndsAt,
      is_trial: subStatus !== 'Active',
      trial_status: subStatus === 'Active' ? 'false' : 'Active'
    });
  };

  // Suspend Customer
  const toggleUserStatus = (targetId: string, currentStatus: SaasUser['status']) => {
    const updatedStatus: SaasUser['status'] = currentStatus === 'suspended' ? 'active' : 'suspended';
    const updated = saasUsers.map(u => u.id === targetId ? { ...u, status: updatedStatus } : u);
    setSaasUsers(updated);
    localStorage.setItem('quoteflow_admin_users', JSON.stringify(updated));
    logAudit(`Modified user status of ${targetId} to ${updatedStatus}`, targetId);
    showToast(`User status updated to ${updatedStatus}!`);
  };

  // Delete Customer Execution
  const executeDeleteUser = async (targetId: string, name: string) => {
    setIsDeletingUser(true);
    try {
      // 1. Remove from local state and storage
      const updatedUsers = saasUsers.filter(u => u.id !== targetId);
      const updatedSubs = subscriptions.filter(s => s.userId !== targetId);
      setSaasUsers(updatedUsers);
      setSubscriptions(updatedSubs);
      localStorage.setItem('quoteflow_admin_users', JSON.stringify(updatedUsers));
      localStorage.setItem('quoteflow_admin_subs', JSON.stringify(updatedSubs));

      // Clean local payment records for this user
      const localPayments = JSON.parse(localStorage.getItem('quoteflow_payments') || '[]');
      const filteredLocalPayments = localPayments.filter((p: any) => p.userId !== targetId);
      localStorage.setItem('quoteflow_payments', JSON.stringify(filteredLocalPayments));

      const adminPayments = JSON.parse(localStorage.getItem('quoteflow_admin_payments') || '[]');
      const filteredAdminPayments = adminPayments.filter((p: any) => p.userId !== targetId);
      localStorage.setItem('quoteflow_admin_payments', JSON.stringify(filteredAdminPayments));

      // 2. Wipe from Supabase database tables
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('profiles').delete().eq('id', targetId);
          await supabase.from('subscriptions').delete().eq('user_id', targetId);
          await supabase.from('payments').delete().eq('user_id', targetId);
          await supabase.from('customer_notifications').delete().eq('user_id', targetId);
          await supabase.from('customers').delete().eq('user_id', targetId);
          await supabase.from('products').delete().eq('user_id', targetId);
          await supabase.from('quotations').delete().eq('user_id', targetId);
          await supabase.from('invoices').delete().eq('user_id', targetId);
          await supabase.from('activity_logs').delete().eq('user_id', targetId);
        } catch (err) {
          console.error('Failed to delete user records from Supabase:', err);
        }
      }

      logAudit(`Deleted customer account, subscriptions, and database records for: ${name}`, targetId);
      showToast('Customer wiped from database successfully!');
    } catch (err) {
      console.error('Error executing delete user:', err);
      showToast('Error deleting user from database', 'error');
    } finally {
      setIsDeletingUser(false);
      setUserToDelete(null);
    }
  };

  const handleConfirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    setIsDeletingPayment(true);
    try {
      await paymentService.deletePayment(paymentToDelete.id, paymentToDelete.userId, deleteUserOption);

      const updatedPayments = await paymentService.getAllPayments();
      setPayments(updatedPayments);

      if (deleteUserOption && paymentToDelete.userId) {
        const updatedUsers = saasUsers.filter(u => u.id !== paymentToDelete.userId);
        const updatedSubs = subscriptions.filter(s => s.userId !== paymentToDelete.userId);
        setSaasUsers(updatedUsers);
        setSubscriptions(updatedSubs);
        localStorage.setItem('quoteflow_admin_users', JSON.stringify(updatedUsers));
        localStorage.setItem('quoteflow_admin_subs', JSON.stringify(updatedSubs));
        showToast(`Payment submission and user (${paymentToDelete.userName}) deleted from database!`);
      } else {
        showToast('Payment record deleted from database!');
      }

      logAudit(`Deleted payment record ${paymentToDelete.transactionId || paymentToDelete.id} for ${paymentToDelete.userName}${deleteUserOption ? ' (User account also wiped)' : ''}`, paymentToDelete.userId || '');
    } catch (err) {
      console.error('Failed to delete payment:', err);
      showToast('Failed to delete payment record.', 'error');
    } finally {
      setIsDeletingPayment(false);
      setPaymentToDelete(null);
      setDeleteUserOption(false);
    }
  };



  // Reply to ticket
  const handleSendTicketReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    const newReply = {
      sender: 'owner' as const,
      text: replyText,
      time: new Date().toISOString()
    };

    const updatedTickets = tickets.map(t => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          status: 'in-progress' as const,
          replies: [...t.replies, newReply]
        };
      }
      return t;
    });

    setTickets(updatedTickets);
    localStorage.setItem('quoteflow_admin_tickets', JSON.stringify(updatedTickets));
    
    // Update active visual model
    setSelectedTicket({
      ...selectedTicket,
      status: 'in-progress',
      replies: [...selectedTicket.replies, newReply]
    });

    setReplyText('');
    logAudit(`Sent support reply regarding ticket subject: "${selectedTicket.subject}"`, selectedTicket.userId);
    showToast('Reply dispatched successfully!');
  };

  // Close ticket
  const handleCloseTicket = (tktId: string) => {
    const updated = tickets.map(t => t.id === tktId ? { ...t, status: 'closed' as const } : t);
    setTickets(updated);
    localStorage.setItem('quoteflow_admin_tickets', JSON.stringify(updated));
    if (selectedTicket && selectedTicket.id === tktId) {
      setSelectedTicket({ ...selectedTicket, status: 'closed' });
    }
    logAudit(`Closed customer support ticket ${tktId}`);
    showToast('Support ticket marked as Closed.');
  };

  // Modify user plan
  const handleUpdateUserPlan = (userId: string, newPlan: SaasUser['plan']) => {
    const updatedUsers = saasUsers.map(u => u.id === userId ? { ...u, plan: newPlan } : u);
    setSaasUsers(updatedUsers);
    localStorage.setItem('quoteflow_admin_users', JSON.stringify(updatedUsers));

    const updatedSubs = subscriptions.map(s => {
      if (s.userId === userId) {
        return { ...s, plan: newPlan };
      }
      return s;
    });
    setSubscriptions(updatedSubs);
    localStorage.setItem('quoteflow_admin_subs', JSON.stringify(updatedSubs));

    logAudit(`Changed subscription tier for user ${userId} to ${newPlan}`, userId);
    showToast(`Plan successfully updated to ${newPlan}`);
    setSelectedUser(null);
  };

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('quoteflow_admin_settings', JSON.stringify(systemSettings));
    logAudit('Updated core system settings, SMTP servers, and payment configurations.');
    showToast('Global SaaS settings applied!');
  };

  // Exit checking
  if (!isOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xl dark:border-rose-950/40 dark:bg-slate-900">
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-500 animate-bounce" />
          <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Owner Access Restricted</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            You do not possess the required developer or owner authority credentials to view the QuoteFlow PK Owner Admin dashboard.
          </p>
          <button 
            onClick={onExitAdmin}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Application
          </button>
        </div>
      </div>
    );
  }

  // Derived metrics for Dashboard Tab
  const totalUsers = saasUsers.length;
  const activeUsers = saasUsers.filter(u => u.status === 'active').length;
  const trialUsers = saasUsers.filter(u => u.status === 'trial').length;
  const suspendedUsers = saasUsers.filter(u => u.status === 'suspended').length;
  const expiredUsers = saasUsers.filter(u => u.status === 'expired').length;
  
  // Financial calculation
  const pendingPaymentsCount = payments.filter(p => p.status === 'Pending').length;
  const verifiedPaymentsCount = payments.filter(p => p.status === 'Verified').length;
  const rejectedPaymentsCount = payments.filter(p => p.status === 'Rejected').length;

  const totalRevenue = payments.filter(p => p.status === 'Verified').reduce((acc, curr) => acc + curr.amount, 0);
  const monthlyRevenue = payments
    .filter(p => p.status === 'Verified' && p.paymentDate.startsWith('2026-07'))
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Today's fresh signups count:
  // If dummy is NOT cleared, we show 2 + any new signups created today.
  // If dummy IS cleared, we show only the users created in the last 24 hours.
  const todaySignupsCount = (isDummyCleared ? 0 : 2) + saasUsers.filter(u => {
    try {
      const isMockUser = ['usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5', 'usr-6'].includes(u.id);
      const diff = Date.now() - new Date(u.signupDate).getTime();
      const isWithin24h = diff < 24 * 60 * 60 * 1000;
      return !isMockUser && isWithin24h;
    } catch {
      return false;
    }
  }).length;

  const storageSpace = isDummyCleared ? `${(saasUsers.length * 0.15).toFixed(2)} MB / 100 GB` : '185 MB / 100 GB';
  const storageChange = isDummyCleared ? `${((saasUsers.length * 0.15) / 1000).toFixed(4)}% capacity used` : '0.18% capacity used';

  // Filtered users for User List
  const filteredUsers = saasUsers.filter(u => {
    const matchesSearch = u.fullName.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.companyName.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesPlan = userFilterPlan === 'all' || u.plan === userFilterPlan;
    const matchesStatus = userFilterStatus === 'all' || u.status === userFilterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      
      {/* Toast Alert */}
      {notif && (
        <div className={`fixed right-6 top-6 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3.5 shadow-xl text-xs font-medium border animate-slide-in-right ${
          notif.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-900/40 dark:text-emerald-300'
            : notif.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/90 dark:border-rose-900/40 dark:text-rose-300'
              : 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/90 dark:border-indigo-900/40 dark:text-indigo-300'
        }`}>
          {notif.type === 'success' ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" /> : <AlertCircle className="h-4.5 w-4.5" />}
          <span>{notif.text}</span>
        </div>
      )}

      {/* Top Banner indicating Admin Status */}
      <div className="flex h-11 items-center justify-between bg-gradient-to-r from-red-600 to-indigo-700 px-6 text-xs font-bold text-white shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 animate-pulse" />
          <span>SaaS System Control Engine Enabled (Owner: {user.fullName})</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-mono">
            ADMIN WORKSPACE
          </span>
          <button 
            onClick={onExitAdmin}
            className="flex items-center gap-1 hover:underline text-[11px]"
          >
            <ArrowLeft className="h-3 w-3" />
            Return to App
          </button>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-44px)] flex-col md:flex-row">
        
        {/* Admin Navigation Sidebar */}
        <aside className="w-full border-r border-slate-200 bg-white p-5 dark:border-slate-800/80 dark:bg-slate-900/40 md:w-64 shrink-0">
          <div className="mb-6 px-2">
            <h3 className="font-sans text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Navigation Menu
            </h3>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Owner Overview', icon: Activity },
              { id: 'users', label: 'User Accounts', icon: Users },
              { id: 'subscriptions', label: 'Subscriptions', icon: Layers },
              { id: 'payments', label: 'Payments Control', icon: CreditCard },
              { id: 'limits', label: 'Feature Limits', icon: Flame },
              { id: 'support', label: 'Support Tickets', icon: LifeBuoy },
              { id: 'settings', label: 'System Settings', icon: Settings },
              { id: 'audit', label: 'System Audit Logs', icon: History }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setSelectedTicket(null);
                    setSelectedUser(null);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <hr className="my-6 border-slate-100 dark:border-slate-800" />

          {/* Quick Stats Summary */}
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60 text-[11px] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">SaaS Status:</span>
              <span className="font-mono text-emerald-500 font-bold uppercase">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Database:</span>
              <div className="flex flex-col items-end gap-1">
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isSupabaseConnected 
                    ? 'bg-emerald-500/15 text-emerald-500 dark:bg-emerald-500/10' 
                    : 'bg-amber-500/15 text-amber-500 dark:bg-amber-500/10 animate-pulse'
                }`}>
                  {isSupabaseConnected ? 'Live Real' : 'Demo Sandbox'}
                </span>
                {!isSupabaseConnected && (
                  <button
                    onClick={() => setShowDbGuide(true)}
                    className="text-[9px] text-indigo-500 hover:underline font-bold tracking-tight"
                  >
                    Go Live? (Guide)
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Revenue (Monthly):</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {monthlyRevenue.toLocaleString()} PKR
              </span>
            </div>
          </div>
        </aside>

        {/* Core Workspace Panel content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl">
          
          {/* ======================================================== */}
          {/* TAB 1: OWNER OVERVIEW / DASHBOARD */}
          {/* ======================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h1 className="text-2xl font-black tracking-tight font-sans text-slate-900 dark:text-white">
                    QuoteFlow PK Systems Command
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Performance metrics, customer acquisitions, and real-time operational feedback.
                  </p>
                </div>
                <button 
                  onClick={() => setShowCreateUserModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  Create Customer Account
                </button>
              </div>

              {/* Stats Bento Grid */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                
                {/* Metric Cards */}
                {[
                  { title: 'Total Registered Users', value: totalUsers, change: '+18% growth', icon: Users, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' },
                  { title: 'Active Accounts', value: activeUsers, change: '85% active ratio', icon: UserCheck, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
                  { title: 'Pending Payments', value: pendingPaymentsCount, change: 'Requires admin audit', icon: Clock, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' },
                  { title: 'Verified Payments', value: verifiedPaymentsCount, change: 'Approved system entries', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
                  { title: 'Rejected Payments', value: rejectedPaymentsCount, change: 'Failed / incorrect tokens', icon: ShieldAlert, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20' },
                  { title: 'Revenue (PKR)', value: `${totalRevenue.toLocaleString()}`, change: 'Total accumulated deposits', icon: DollarSign, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/20' },
                  { title: 'Monthly Revenue (PKR)', value: `${monthlyRevenue.toLocaleString()}`, change: 'Current Month July', icon: CreditCard, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20' },
                  { title: 'SaaS Storage Space', value: storageSpace, change: storageChange, icon: Database, color: 'text-slate-500 bg-slate-50 dark:bg-slate-900/60' },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-transform hover:scale-[1.01] dark:border-slate-800/80 dark:bg-slate-900/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {stat.title}
                        </span>
                        <div className={`rounded-xl p-2 ${stat.color}`}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="font-sans text-xl font-black tracking-tight text-slate-900 dark:text-white">
                          {stat.value}
                        </span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          {stat.change}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic SVGs charts representing SaaS Performance limits */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                
                {/* Chart 1 */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-slate-800/80 dark:bg-slate-900/60">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4">
                    Monthly Revenue Accruals (PKR)
                  </h3>
                  <div className="flex h-56 items-end gap-3 px-2 pt-4">
                    {[
                      { month: 'Feb', val: 30000, h: 'h-[30%]' },
                      { month: 'Mar', val: 45000, h: 'h-[45%]' },
                      { month: 'Apr', val: 65000, h: 'h-[65%]' },
                      { month: 'May', val: 98000, h: 'h-[90%]' },
                      { month: 'Jun', val: 78000, h: 'h-[75%]' },
                      { month: 'Jul', val: 81000, h: 'h-[80%]' }
                    ].map((bar, i) => (
                      <div key={i} className="group relative flex flex-1 flex-col items-center">
                        <div className="absolute -top-6 hidden rounded-lg bg-slate-950 px-2 py-1 text-[9px] text-white group-hover:block whitespace-nowrap">
                          {bar.val.toLocaleString()} PKR
                        </div>
                        <div className={`w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-sky-400 transition-all group-hover:from-indigo-600 ${bar.h}`} />
                        <span className="mt-2.5 font-mono text-[10px] text-slate-400">{bar.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart 2 */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-slate-800/80 dark:bg-slate-900/60">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4">
                    Acquisition Growth & System Active Users
                  </h3>
                  <div className="flex h-56 items-end gap-4 px-2 pt-4">
                    {[
                      { label: 'Starter', count: 3, pct: 'h-[45%]', color: 'from-amber-400 to-orange-500' },
                      { label: 'Professional', count: 4, pct: 'h-[60%]', color: 'from-sky-400 to-indigo-500' },
                      { label: 'Business', count: 2, pct: 'h-[30%]', color: 'from-purple-400 to-pink-500' },
                      { label: 'Enterprise', count: 1, pct: 'h-[15%]', color: 'from-teal-400 to-emerald-500' }
                    ].map((chart, i) => (
                      <div key={i} className="group relative flex flex-1 flex-col items-center">
                        <div className="absolute -top-6 hidden rounded-lg bg-slate-950 px-2 py-1 text-[9px] text-white group-hover:block whitespace-nowrap">
                          {chart.count} Users
                        </div>
                        <div className={`w-8 rounded-t-lg bg-gradient-to-t transition-all ${chart.color} ${chart.pct}`} />
                        <span className="mt-2.5 font-sans text-[10px] text-slate-400 font-bold">{chart.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Real-Time activity streams */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-slate-800/80 dark:bg-slate-900/60">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Real-Time Activity Telemetry
                  </h3>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 space-y-3.5">
                  {[
                    { type: 'signup', text: 'Hamza Malik (NexusTech) signed up and initialized a business profile.', time: '10 mins ago', icon: UserPlus, color: 'text-indigo-500' },
                    { type: 'payment', text: 'Stripe deposit of 18,000 PKR completed for Tayyab Mahmood.', time: '2 hours ago', icon: CreditCard, color: 'text-emerald-500' },
                    { type: 'quotation', text: 'Salman Lodhi dispatched professional quotation (QT-2026-041) to Karachi Retail.', time: '4 hours ago', icon: FileText, color: 'text-sky-500' },
                    { type: 'support', text: 'Support ticket #tkt-1 regarding rounded tax calculations raised by Hamza Malik.', time: '1 day ago', icon: LifeBuoy, color: 'text-amber-500' },
                  ].map((act, i) => {
                    const Icon = act.icon;
                    return (
                      <div key={i} className="flex items-center justify-between pt-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-2 bg-slate-50 dark:bg-slate-950 ${act.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{act.text}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{act.time}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: USER MANAGEMENT */}
          {/* ======================================================== */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Customer Workspace Profiles
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Audit credentials, modify billing states, log as customer, reset passwords, or suspend access.
                  </p>
                </div>
                <button 
                  onClick={() => setShowCreateUserModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  Manual Account Creation
                </button>
              </div>

              {/* Filtering Controls */}
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-900/60 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by company, customer owner, or email address..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs font-medium focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950 text-xs">
                    <Filter className="h-3 w-3 text-slate-400" />
                    <span className="font-semibold text-slate-500">Plan:</span>
                    <select 
                      value={userFilterPlan} 
                      onChange={(e) => setUserFilterPlan(e.target.value)}
                      className="bg-transparent font-bold text-slate-800 focus:outline-hidden dark:text-slate-200"
                    >
                      <option value="all">All Plans</option>
                      <option value="Starter">Starter</option>
                      <option value="Professional">Professional</option>
                      <option value="Business">Business</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950 text-xs">
                    <Activity className="h-3 w-3 text-slate-400" />
                    <span className="font-semibold text-slate-500">Status:</span>
                    <select 
                      value={userFilterStatus} 
                      onChange={(e) => setUserFilterStatus(e.target.value)}
                      className="bg-transparent font-bold text-slate-800 focus:outline-hidden dark:text-slate-200"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="trial">Trialing</option>
                      <option value="suspended">Suspended</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Customers table */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800/80 dark:bg-slate-900/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 uppercase text-slate-400 dark:bg-slate-950/40 text-[10px] font-bold tracking-wider">
                      <tr>
                        <th className="px-6 py-4">SaaS Client Details</th>
                        <th className="px-6 py-4">Primary Email / Password</th>
                        <th className="px-6 py-4 text-center">Plan Tier</th>
                        <th className="px-6 py-4 text-center">Account Status</th>
                        <th className="px-6 py-4">Signup Date</th>
                        <th className="px-6 py-4 text-right">Control Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                            No matching user accounts found. Try relaxing the search parameters.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-900/20">
                            <td className="px-6 py-4.5">
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{u.fullName}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{u.companyName}</p>
                                {u.phone && <p className="text-[10px] text-indigo-500 mt-0.5">{u.phone}</p>}
                              </div>
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="font-mono text-[11px] font-semibold text-slate-850 dark:text-slate-200">{u.email}</div>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Password:</span>
                                <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-sky-400 bg-indigo-50/50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded-md">
                                  {u.password || '••••••••'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
                                u.plan === 'Enterprise' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' :
                                u.plan === 'Business' ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' :
                                u.plan === 'Professional' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                                'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300'
                              }`}>
                                {u.plan}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                u.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                                u.status === 'trial' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                                u.status === 'suspended' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400' :
                                'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  u.status === 'active' ? 'bg-emerald-500' :
                                  u.status === 'trial' ? 'bg-amber-500' :
                                  u.status === 'suspended' ? 'bg-rose-500' :
                                  'bg-slate-400'
                                }`} />
                                {u.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                              {new Date(u.signupDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                
                                {/* Impersonate / Login As */}
                                <button
                                  onClick={() => handleImpersonateUser(u)}
                                  title="Login as user (Impersonate)"
                                  className="rounded-lg p-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-500"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>

                                {/* Change Password Button */}
                                <button
                                  onClick={() => {
                                    setUserToChangePassword(u);
                                    setNewPasswordValue(u.password || '');
                                  }}
                                  title="Change User Password"
                                  className="rounded-lg p-2 hover:bg-amber-50 text-amber-500 dark:hover:bg-amber-950/40"
                                >
                                  <Key className="h-4 w-4 text-amber-500" />
                                </button>

                                {/* Edit Plan/Details */}
                                <button
                                  onClick={() => setSelectedUser(u)}
                                  title="Change Plan Tier"
                                  className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                                >
                                  <Settings className="h-4 w-4" />
                                </button>

                                {/* Suspend / Activate Toggle */}
                                <button
                                  onClick={() => toggleUserStatus(u.id, u.status)}
                                  title={u.status === 'suspended' ? 'Activate User' : 'Suspend User'}
                                  className={`rounded-lg p-2 ${
                                    u.status === 'suspended' 
                                      ? 'hover:bg-emerald-50 text-emerald-500 dark:hover:bg-emerald-950/30' 
                                      : 'hover:bg-rose-50 text-rose-500 dark:hover:bg-rose-950/30'
                                  }`}
                                >
                                  {u.status === 'suspended' ? <UserCheck className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                </button>

                                {/* Delete User */}
                                <button
                                  onClick={() => setUserToDelete(u)}
                                  title="Permanently wipe user"
                                  className="rounded-lg p-2 hover:bg-rose-100 text-rose-500 dark:hover:bg-rose-950/40"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Simple User Modal Detail for Plan Upgrades */}
              {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                  <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h4 className="font-extrabold text-slate-900 dark:text-white">Adjust Plan Tier: {selectedUser.fullName}</h4>
                      <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-500">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="mt-4 space-y-4">
                      <p className="text-xs text-slate-400">
                        Upgrading or downgrading plans modifies limitations for quotes, invoices, products, and available storage instantaneously.
                      </p>
                      
                      <div className="space-y-2">
                        {['Starter', 'Professional', 'Business', 'Enterprise'].map(planName => (
                          <button
                            key={planName}
                            onClick={() => handleUpdateUserPlan(selectedUser.id, planName as any)}
                            className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-xs font-bold transition-all ${
                              selectedUser.plan === planName 
                                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600'
                                : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span>{planName} Plan</span>
                            {selectedUser.plan === planName && <Check className="h-4 w-4" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Change Password Modal */}
              {userToChangePassword && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                  <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h4 className="font-sans font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Key className="h-5 w-5 text-amber-500 animate-pulse" />
                        Modify Client Password
                      </h4>
                      <button 
                        onClick={() => setUserToChangePassword(null)} 
                        className="text-slate-400 hover:text-slate-500"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <form onSubmit={handleUpdatePassword} className="mt-4 space-y-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          SaaS Client Profile
                        </span>
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {userToChangePassword.fullName}
                          </p>
                          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {userToChangePassword.email}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                          New Secure Password *
                        </label>
                        <input
                          type="text"
                          required
                          value={newPasswordValue}
                          onChange={(e) => setNewPasswordValue(e.target.value)}
                          placeholder="Type new secure password"
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                        />
                        <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                          Naye password ko save karne ke baad, client ko ye password inform kar dein taake wo apne naye credentials se login kar sakein.
                        </p>
                      </div>

                      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                        <button
                          type="button"
                          onClick={() => setUserToChangePassword(null)}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-slate-950 transition-colors"
                        >
                          Save New Password
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Delete Confirmation Modal */}
              {userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                  <div className="w-full max-w-md rounded-2xl border border-rose-100 bg-white p-6 shadow-2xl dark:border-rose-950 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <Trash2 className="h-5 w-5 text-rose-500" />
                      <h4 className="font-sans font-black text-slate-900 dark:text-white">Wipe Customer Account</h4>
                    </div>
                    <div className="mt-4 space-y-4">
                      <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed">
                        Bhai, kya aap waqai <strong className="text-rose-600 dark:text-rose-400 font-extrabold">{userToDelete.fullName}</strong> ({userToDelete.companyName}) ka account permanently delete karna chahte hain?
                      </p>
                      <p className="text-[11px] bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 p-3 rounded-xl border border-rose-100 dark:border-rose-950/40 font-medium">
                        ⚠️ <strong>Note:</strong> Is action se unki saari company settings, clients, quotations aur bills permanently delete ho jayenge. Yeh action reverse nahi kiya ja sakta!
                      </p>
                    </div>
                    <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <button
                        type="button"
                        onClick={() => setUserToDelete(null)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      >
                        Abhi Nahi (Cancel)
                      </button>
                      <button
                        type="button"
                        disabled={isDeletingUser}
                        onClick={() => executeDeleteUser(userToDelete.id, userToDelete.fullName)}
                        className="rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {isDeletingUser ? 'Deleting...' : 'Haan, Delete Krdo'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: SUBSCRIPTIONS */}
          {/* ======================================================== */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Subscription Logs & Licenses
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track recurring pipelines, active business plans, manual extensions, and trial periods.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800/80 dark:bg-slate-900/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 uppercase text-slate-400 dark:bg-slate-950/40 text-[10px] font-bold tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Client</th>
                        <th className="px-6 py-4 text-center">Assigned Plan</th>
                        <th className="px-6 py-4">Starts At</th>
                        <th className="px-6 py-4">Expires At</th>
                        <th className="px-6 py-4 text-center">Billing Mode</th>
                        <th className="px-6 py-4 text-right">Cost (PKR)</th>
                        <th className="px-6 py-4 text-right">License Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                      {subscriptions.map(sub => (
                        <tr key={sub.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-900/20">
                          <td className="px-6 py-4.5">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{sub.userName}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">{sub.companyName}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                              {sub.plan}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-[10px] text-slate-400 dark:text-slate-500">{sub.startsAt}</td>
                          <td className="px-6 py-4 font-mono text-[10px] text-slate-500 font-bold">{sub.expiresAt}</td>
                          <td className="px-6 py-4 text-center capitalize text-slate-400">{sub.billingCycle}</td>
                          <td className="px-6 py-4 text-right font-mono text-slate-950 dark:text-white font-bold">{sub.amount.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  const updatedExpires = new Date(new Date(sub.expiresAt).getTime() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
                                  const updated = subscriptions.map(s => s.id === sub.id ? { ...s, expiresAt: updatedExpires } : s);
                                  setSubscriptions(updated);
                                  localStorage.setItem('quoteflow_admin_subs', JSON.stringify(updated));
                                  logAudit(`Extended subscription licensing expiry date for ${sub.userName} by 30 days.`, sub.userId);
                                  showToast('Expiry successfully extended by 30 Days!');
                                }}
                                className="rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-sky-400"
                              >
                                Extend 30 Days
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: PAYMENTS CONTROL */}
          {/* ======================================================== */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Payment Ledger
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Audit incoming transfers from bank channels, JazzCash, Easypaisa, or manual deposit routes.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800/80 dark:bg-slate-900/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 uppercase text-slate-400 dark:bg-slate-950/40 text-[10px] font-bold tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Customer & Company</th>
                        <th className="px-6 py-4">Plan</th>
                        <th className="px-6 py-4">Deposit Channel</th>
                        <th className="px-6 py-4 text-right">Amount (PKR)</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4">Ledger Notes</th>
                        <th className="px-6 py-4 text-right font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                      {payments.map(pay => (
                        <tr key={pay.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-900/20">
                          <td className="px-6 py-4.5">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{pay.userName}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">{pay.companyName}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                              {pay.plan || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 w-max">
                                {pay.notes?.split(' Transfer')[0] || 'Direct Wire'}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">{pay.paymentDate}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-black text-slate-900 dark:text-white">
                            {pay.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              pay.status === 'Verified' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
                              pay.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
                              'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}>
                              {pay.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 max-w-xs text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                            {pay.notes && (
                              <p><strong className="text-slate-600 dark:text-slate-350">User:</strong> {pay.notes}</p>
                            )}
                            {pay.adminNotes && (
                              <p className="text-emerald-600 dark:text-emerald-400 mt-1"><strong className="text-emerald-700 dark:text-emerald-500">Admin:</strong> {pay.adminNotes}</p>
                            )}
                            {!pay.notes && !pay.adminNotes && <span className="text-slate-300">-</span>}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {pay.screenshot ? (
                                <button
                                  onClick={() => setPreviewPayment(pay)}
                                  className="rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="h-3 w-3" />
                                  Proof
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">No proof</span>
                              )}

                              {pay.status === 'Pending' ? (
                                <>
                                  <button
                                    onClick={() => setActionPayment({ id: pay.id, type: 'verify', amount: pay.amount, customerName: pay.userName })}
                                    className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 cursor-pointer"
                                  >
                                    Verify
                                  </button>
                                  <button
                                    onClick={() => setActionPayment({ id: pay.id, type: 'reject', amount: pay.amount, customerName: pay.userName })}
                                    className="rounded-lg bg-rose-50 border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono capitalize">Processed</span>
                              )}

                              <button
                                onClick={() => { setPaymentToDelete(pay); setDeleteUserOption(false); }}
                                className="rounded-lg bg-rose-50 border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400 cursor-pointer flex items-center gap-1"
                                title="Delete payment submission / user from database"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: FEATURE LIMITS */}
          {/* ======================================================== */}
          {activeTab === 'limits' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  SaaS Billing Plans & Limits Configuration
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Global parameters that throttle resources based on active subscriptions.
                </p>
              </div>

              {/* Plans limits grid */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {[
                  { name: 'Professional Plan', price: '1,500 PKR', limits: ['Unlimited Customers', 'Unlimited Products', 'Unlimited Quotations', 'Unlimited Invoices', '10 GB Cloud Storage'] },
                  { name: 'Business Plan', price: '3,000 PKR', limits: ['Unlimited Customers & Products', 'Multiple Team Members', 'Advanced PDF Styling', 'AI Quotations Generator', '100 GB Cloud Storage'], recommended: true },
                  { name: 'Enterprise Plan', price: '5,000 PKR', limits: ['Unlimited Everything', 'Dedicated SMTP Servers', 'Priority SLA support', 'White Label Brand setup', 'Uncapped DB nodes'] },
                ].map((plan, idx) => (
                  <div key={idx} className="relative rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60">
                    {plan.recommended && (
                      <span className="absolute -top-3 right-4 rounded-full bg-gradient-to-r from-indigo-600 to-sky-500 px-3 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-xs">
                        Recommended
                      </span>
                    )}
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{plan.name}</h3>
                    <p className="mt-2 text-xl font-black text-indigo-500">{plan.price}</p>
                    <p className="text-[10px] text-slate-400 uppercase mt-0.5 font-semibold">Throttles:</p>
                    <ul className="mt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-4">
                      {plan.limits.map((l, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-500" />
                          <span>{l}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Logic Notice */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 dark:border-indigo-950/20 dark:bg-indigo-950/10">
                <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Operational Notice:</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  SaaS limitations are strictly mapped into the database schema layer and checked before creation within `dataService.ts`. System will prompt users with an upgrade dialog when limits are met.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: SUPPORT TICKETS */}
          {/* ======================================================== */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Support Center Panel
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Review customer complaints, assist with database configurations, and resolve invoice discrepancies.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                
                {/* Tickets list */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60 space-y-3">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest px-1">Open Tickets</h3>
                  <div className="space-y-2">
                    {tickets.map(tkt => (
                      <button
                        key={tkt.id}
                        onClick={() => setSelectedTicket(tkt)}
                        className={`w-full text-left rounded-xl p-3.5 border transition-all ${
                          selectedTicket?.id === tkt.id 
                            ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20' 
                            : 'border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">{tkt.id}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase ${
                            tkt.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                            tkt.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {tkt.priority}
                          </span>
                        </div>
                        <h4 className="mt-1 font-bold text-slate-900 dark:text-white text-xs truncate">{tkt.subject}</h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{tkt.companyName}</p>
                        <div className="mt-2.5 flex items-center justify-between text-[9px] font-medium">
                          <span className={`rounded-full px-2 py-0.5 uppercase ${
                            tkt.status === 'open' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' :
                            tkt.status === 'in-progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' :
                            'bg-slate-100 text-slate-500 dark:bg-slate-800/80'
                          }`}>
                            {tkt.status}
                          </span>
                          <span className="text-slate-400">{new Date(tkt.createdAt).toLocaleDateString()}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conversation view */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60 flex flex-col min-h-[450px]">
                  {selectedTicket ? (
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">SUPPORT DISPATCH / {selectedTicket.id}</span>
                          <h3 className="font-sans font-black text-slate-900 dark:text-white">{selectedTicket.subject}</h3>
                          <p className="text-[10px] text-slate-400 font-medium">Raised by {selectedTicket.userName} ({selectedTicket.companyName})</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedTicket.status !== 'closed' && (
                            <button
                              onClick={() => handleCloseTicket(selectedTicket.id)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                            >
                              Close Ticket
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Messages array */}
                      <div className="flex-1 overflow-y-auto space-y-4 py-4 max-h-[300px]">
                        {selectedTicket.replies.map((reply, index) => (
                          <div 
                            key={index} 
                            className={`flex flex-col max-w-[80%] rounded-2xl p-3.5 text-xs ${
                              reply.sender === 'owner' 
                                ? 'ml-auto bg-slate-900 text-white dark:bg-white dark:text-slate-950' 
                                : 'mr-auto bg-slate-100 text-slate-800 dark:bg-slate-850 dark:text-slate-200'
                            }`}
                          >
                            <span className="text-[9px] font-bold opacity-60 uppercase tracking-wide">
                              {reply.sender === 'owner' ? 'SaaS System Admin' : 'Customer Account Owner'}
                            </span>
                            <p className="mt-1 font-medium">{reply.text}</p>
                            <span className="text-[8px] opacity-40 text-right mt-1.5 block">
                              {new Date(reply.time).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Compose Reply */}
                      {selectedTicket.status !== 'closed' ? (
                        <form onSubmit={handleSendTicketReply} className="border-t border-slate-100 dark:border-slate-800 pt-3 flex gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type diagnostic advice or response to help SaaS client..."
                            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950"
                          />
                          <button
                            type="submit"
                            className="h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-5 text-xs font-bold flex items-center gap-1.5"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Reply
                          </button>
                        </form>
                      ) : (
                        <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-4 text-center text-xs text-slate-400 dark:text-slate-500 font-bold">
                          This support conversation is locked and closed. No further replies can be sent.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <LifeBuoy className="h-12 w-12 text-slate-300 dark:text-slate-700 animate-pulse" />
                      <h4 className="mt-3 font-bold text-slate-800 dark:text-white">No Ticket Selected</h4>
                      <p className="text-xs text-slate-400 max-w-xs mt-1">
                        Select a support case ticket on the left menu rail to examine telemetry messages and dispatch expert advice.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 7: SYSTEM SETTINGS */}
          {/* ======================================================== */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  SaaS Settings & Keys
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Global branding parameters, SMTP mailing channels, and API gateway keys.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                
                {/* Visual Config */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60 space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                    SaaS Configuration
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SaaS Platform Name</label>
                      <input
                        type="text"
                        value={systemSettings.saasName}
                        onChange={(e) => setSystemSettings({ ...systemSettings, saasName: e.target.value })}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Base Currency Code</label>
                      <input
                        type="text"
                        value={systemSettings.currency}
                        onChange={(e) => setSystemSettings({ ...systemSettings, currency: e.target.value })}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Corporate Headquarters Address</label>
                    <input
                      type="text"
                      value={systemSettings.address}
                      onChange={(e) => setSystemSettings({ ...systemSettings, address: e.target.value })}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tax default Percentage (%)</label>
                      <input
                        type="text"
                        value={systemSettings.taxDefault}
                        onChange={(e) => setSystemSettings({ ...systemSettings, taxDefault: e.target.value })}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Timezone</label>
                      <input
                        type="text"
                        value={systemSettings.timezone}
                        onChange={(e) => setSystemSettings({ ...systemSettings, timezone: e.target.value })}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5"
                      />
                    </div>
                  </div>

                  {/* Maintenance switch */}
                  <div className="rounded-xl bg-rose-50/40 p-4 border border-rose-100/40 dark:bg-rose-950/10 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">Lock Down / Maintenance Mode</h4>
                      <p className="text-[10px] text-slate-400 max-w-xs mt-0.5">Wipe routes and deny access to normal users for live DB upgrades.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSystemSettings({ ...systemSettings, maintenanceMode: !systemSettings.maintenanceMode })}
                      className={`h-6 w-11 rounded-full p-1 transition-colors ${
                        systemSettings.maintenanceMode ? 'bg-rose-600' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`h-4 w-4 rounded-full bg-white transition-transform ${
                        systemSettings.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* API and SMTP config */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 mb-4">
                      SMTP Mail Server & AI Gateway Keys
                    </h3>

                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SMTP Host Server</label>
                          <input
                            type="text"
                            value={systemSettings.smtpHost}
                            onChange={(e) => setSystemSettings({ ...systemSettings, smtpHost: e.target.value })}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SMTP Port</label>
                          <input
                            type="text"
                            value={systemSettings.smtpPort}
                            onChange={(e) => setSystemSettings({ ...systemSettings, smtpPort: e.target.value })}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SMTP Sender User</label>
                        <input
                          type="email"
                          value={systemSettings.smtpUser}
                          onChange={(e) => setSystemSettings({ ...systemSettings, smtpUser: e.target.value })}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Globe className="h-3 w-3 text-slate-400" />
                          Gemini AI Model Credentials
                        </label>
                        <input
                          type="password"
                          value={systemSettings.geminiKey}
                          onChange={(e) => setSystemSettings({ ...systemSettings, geminiKey: e.target.value })}
                          placeholder="AI Studio Developer Key (GEMINI_API_KEY)"
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5"
                        />
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2 space-y-3 bg-indigo-50/20 dark:bg-indigo-950/10 p-3.5 rounded-xl border border-indigo-100/40 dark:border-indigo-950/20">
                        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5" />
                          Custom Admin Credentials (Apni Marzi Ka Admin)
                        </h4>
                        
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Admin Email Address</label>
                            <input
                              type="email"
                              value={systemSettings.adminCustomEmail || ''}
                              onChange={(e) => setSystemSettings({ ...systemSettings, adminCustomEmail: e.target.value })}
                              placeholder="e.g. admin@yourdomain.com"
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Admin Password</label>
                            <input
                              type="text"
                              value={systemSettings.adminCustomPassword || ''}
                              onChange={(e) => setSystemSettings({ ...systemSettings, adminCustomPassword: e.target.value })}
                              placeholder="e.g. MySecurePass123"
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1"
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-indigo-600 dark:text-sky-400 font-medium">
                          Bhai, yahan apni pasand ka admin email aur password set karein aur neeche "Save" button dabaen. Phir aap in credentials se login kar sakte hain!
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors mt-6"
                  >
                    Save SaaS Systems Configurations
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 8: AUDIT LOGS */}
          {/* ======================================================== */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  System Audit logs
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Read-only ledger tracking all administrator operations, status updates, and user modifications.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800/80 dark:bg-slate-900/60 overflow-hidden">
                <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Security Trace Log</span>
                  <button
                    onClick={() => {
                      if (window.confirm('Wipe historical audit logs?')) {
                        setAuditLogs([]);
                        localStorage.removeItem('quoteflow_admin_audit');
                        showToast('Audit log wiped.');
                      }
                    }}
                    className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Wipe Logs
                  </button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[500px] overflow-y-auto">
                  {auditLogs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                      Audit ledger is empty. Operations will write records here.
                    </div>
                  ) : (
                    auditLogs.map(log => (
                      <div key={log.id} className="p-4 flex items-start justify-between text-xs hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                        <div className="flex items-start gap-3">
                          <Activity className="h-4.5 w-4.5 text-indigo-500 mt-0.5" />
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{log.action}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Actor: {log.ownerEmail} • IP: {log.ipAddress}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {new Date(log.date).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ======================================================== */}
      {/* MANUAL USER CREATION MODAL */}
      {/* ======================================================== */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-sans font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-500" />
                Initialize Customer Account
              </h3>
              <button 
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-400 hover:text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.companyName}
                    onChange={(e) => setNewUser({ ...newUser, companyName: e.target.value })}
                    placeholder="e.g. Faisalabad Textile Hub"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.ownerName}
                    onChange={(e) => setNewUser({ ...newUser, ownerName: e.target.value })}
                    placeholder="e.g. Khurram Shahzad"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="khurram@faisalabadtex.pk"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone Contact</label>
                  <input
                    type="text"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="+92 300 9876543"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password *</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assign Subscription Plan</label>
                  <select
                    value={newUser.plan}
                    onChange={(e) => setNewUser({ ...newUser, plan: e.target.value as any })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Professional">Professional Plan (1500 PKR / mo)</option>
                    <option value="Business">Business Plan (3000 PKR / mo) [Recommended]</option>
                    <option value="Enterprise">Enterprise Plan (5000 PKR / mo)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trial Period Limit</label>
                  <select
                    value={newUser.trialDays}
                    onChange={(e) => setNewUser({ ...newUser, trialDays: parseInt(e.target.value) })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 mt-1.5 text-slate-800 dark:text-slate-200"
                  >
                    <option value="0">No trial - Activate Billing immediately</option>
                    <option value="3">3 Days Trial Period</option>
                    <option value="7">7 Days Trial Period</option>
                    <option value="14">14 Days Trial Period</option>
                    <option value="30">30 Days Trial Period</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
                >
                  Create & Activate Client Account
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* LIVE DATABASE SETUP GUIDE MODAL */}
      {/* ======================================================== */}
      {showDbGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-sans font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-500 animate-pulse" />
                Live Database Configuration Guide
              </h3>
              <button 
                onClick={() => setShowDbGuide(false)}
                className="text-slate-400 hover:text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-amber-900 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-300">
                <p className="font-bold">⚠️ Roman Urdu Guide / Instructions:</p>
                <p className="mt-1.5 leading-relaxed text-[11px]">
                  Bhai, aap is waqt <strong>Demo Mode (Local Sandbox)</strong> mein hain. Isey live database aur real login se connect karne ke liye, aap ko bas 2 properties fill karni hain apne AI Studio portal settings mein. Koi code change karne ki zaroorat nahi hai!
                </p>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-black text-indigo-600 dark:bg-indigo-950">1</span>
                  Supabase Project Banayein (Bilkool Free)
                </h4>
                <p className="pl-6 leading-relaxed">
                  Sab se pehle <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-bold dark:text-sky-400">supabase.com</a> par jayen, free register karke ek naya project banayein.
                </p>

                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-black text-indigo-600 dark:bg-indigo-950">2</span>
                  API Settings se Details Copy Karein
                </h4>
                <p className="pl-6 leading-relaxed">
                  Supabase Project dashboard mein <strong>Project Settings &gt; API</strong> tab par jayen aur ye do parameters copy karein:
                  <ul className="list-disc pl-4 mt-1.5 space-y-1 font-mono text-[10px]">
                    <li>Project URL (VITE_SUPABASE_URL)</li>
                    <li>anon public API Key (VITE_SUPABASE_ANON_KEY)</li>
                  </ul>
                </p>

                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-black text-indigo-600 dark:bg-indigo-950">3</span>
                  AI Studio Platform Settings mein Variables Dalein
                </h4>
                <p className="pl-6 leading-relaxed text-slate-600 dark:text-slate-300">
                  Apne AI Studio screen ke top right/left mein <strong>Settings</strong> panel par click karein. Wahan variables input section hoga, jahan aap ko ye variables key-value ki tarah fill karne hain:
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mt-2 font-mono text-[10px] text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
                    <strong>VITE_SUPABASE_URL</strong> = <code>https://your-project.supabase.co</code>
                    <br />
                    <strong>VITE_SUPABASE_ANON_KEY</strong> = <code>your-anon-public-key...</code>
                  </div>
                </p>

                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-black text-indigo-600 dark:bg-indigo-950">4</span>
                  SQL Script Run Karein (Tables Setup)
                </h4>
                <p className="pl-6 leading-relaxed">
                  Tables design set karne ke liye, project root folder mein majood database files (jaise <code>supabase_schema.sql</code>, etc.) ke contents copy karke Supabase Dashboard ke <strong>SQL Editor</strong> mein paste karke "Run" kar dein!
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowDbGuide(false)}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white hover:opacity-90 dark:bg-white dark:text-slate-900"
              >
                Samajh Gaya, Shukriya!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PAYMENT PROOF MODAL (Admin) */}
      {/* ======================================================== */}
      {previewPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-sans font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="h-5 w-5 text-indigo-500 animate-pulse" />
                Payment Submission Proof Detail
              </h3>
              <button 
                onClick={() => { setPreviewPayment(null); setIsScreenshotZoomed(false); }} 
                className="text-slate-400 hover:text-slate-500 rounded-lg p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Split layout: Screenshot left, Details right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Interactive Screenshot */}
              <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800/60 relative overflow-hidden group min-h-[300px]">
                {previewPayment.screenshot ? (
                  <>
                    <div 
                      className={`relative cursor-zoom-in transition-all duration-300 ${isScreenshotZoomed ? 'scale-150 z-20' : 'hover:scale-105'}`}
                      onClick={() => setIsScreenshotZoomed(!isScreenshotZoomed)}
                    >
                      <img 
                        src={previewPayment.screenshot} 
                        alt="Payment Proof Screenshot" 
                        className="max-h-[320px] object-contain rounded-lg shadow-md border border-slate-200 dark:border-slate-800"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-2 right-2 bg-slate-900/85 text-white p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="h-3 w-3" />
                        {isScreenshotZoomed ? 'Click to zoom out' : 'Click to zoom'}
                      </div>
                    </div>
                    {/* Controls Row */}
                    <div className="flex items-center gap-3 mt-4 w-full justify-center">
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = previewPayment.screenshot!;
                          link.download = `proof_${previewPayment.transactionId}.jpg`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Proof
                      </button>
                      <button
                        onClick={() => {
                          window.open(previewPayment.screenshot, '_blank');
                        }}
                        className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open in New Tab
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No payment proof uploaded.</p>
                  </div>
                )}
              </div>

              {/* Right Column: Metadata details & Lifecycle History */}
              <div className="space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Customer Name</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white block">{previewPayment.userName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Company Name</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white block">{previewPayment.companyName || '-'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Selected Plan</span>
                      <span className="inline-flex items-center gap-1 mt-0.5 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                        {previewPayment.plan}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Payment Date</span>
                      <span className="text-sm font-semibold text-slate-950 dark:text-white block">{previewPayment.paymentDate}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Transaction ID</span>
                      <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 block">{previewPayment.transactionId}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Amount</span>
                      <span className="text-sm font-black text-indigo-600 dark:text-sky-400 block">PKR {previewPayment.amount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Customer Notes</span>
                    <p className="text-xs text-slate-600 dark:text-slate-350 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 mt-1 leading-relaxed italic whitespace-pre-wrap">
                      {previewPayment.notes || 'No notes submitted.'}
                    </p>
                  </div>
                </div>

                {/* Lifecycle History Timeline */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 block mb-3 flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5" />
                    Transaction Lifecycle Timeline
                  </span>
                  <div className="space-y-3 pl-2.5 border-l-2 border-indigo-100 dark:border-indigo-950/80">
                    {(previewPayment.history || []).map((h: any, idx: number) => (
                      <div key={idx} className="relative pl-4">
                        <div className={`absolute -left-[15px] top-1 h-2.5 w-2.5 rounded-full border-2 bg-white dark:bg-slate-900 ${
                          h.status === 'Verified' ? 'border-emerald-500 bg-emerald-500' :
                          h.status === 'Rejected' ? 'border-rose-500 bg-rose-500' :
                          'border-indigo-500 bg-indigo-500'
                        }`} />
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[11px] font-extrabold ${
                            h.status === 'Verified' ? 'text-emerald-600 dark:text-emerald-400' :
                            h.status === 'Rejected' ? 'text-rose-600 dark:text-rose-400' :
                            'text-indigo-600 dark:text-indigo-400'
                          }`}>
                            {h.status === 'Verified' ? 'Approved & Activated' : h.status === 'Rejected' ? 'Rejected/Declined' : h.status}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {new Date(h.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Action by: <strong>{h.adminName}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="mt-6 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => { setPreviewPayment(null); setIsScreenshotZoomed(false); }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close Portal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VERIFY PAYMENT CONFIRMATION MODAL (Admin) */}
      {/* ======================================================== */}
      {actionPayment && actionPayment.type === 'verify' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-6 shadow-2xl dark:border-emerald-950 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5 animate-bounce" />
              </div>
              <h3 className="font-sans font-black text-slate-900 dark:text-white">Confirm Verification</h3>
            </div>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Are you sure you want to verify this payment of <strong className="text-emerald-600 dark:text-emerald-400">PKR {actionPayment.amount.toLocaleString()}</strong> submitted by <strong>{actionPayment.customerName}</strong>? 
            </p>
            <p className="text-[11px] text-slate-400 mt-2 leading-normal">
              This action will automatically activate their premium subscription, configure their workspace plan limitations, and dispatch a real-time system notification to the client.
            </p>

            <div className="mt-4">
              <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Admin Audit Notes (Optional)
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="e.g., JazzCash transaction ID confirmed. Verified by owner."
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => { setActionPayment(null); setActionNotes(''); }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPaymentAction}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                Approve & Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* REJECT PAYMENT CONFIRMATION MODAL (Admin) */}
      {/* ======================================================== */}
      {actionPayment && actionPayment.type === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-950 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <AlertCircle className="h-5 w-5 text-rose-500" />
              </div>
              <h3 className="font-sans font-black text-slate-900 dark:text-white">Reject Submission</h3>
            </div>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Are you sure you want to decline the payment of <strong className="text-rose-600 dark:text-rose-400">PKR {actionPayment.amount.toLocaleString()}</strong> submitted by <strong>{actionPayment.customerName}</strong>?
            </p>

            <div className="mt-4">
              <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Rejection Reason (Required) <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Provide details about why the payment was rejected (e.g., Invalid transaction screenshot, incorrect amount, double submission)."
                rows={3}
                required
                className="w-full rounded-xl border border-rose-300 p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 dark:border-rose-800 dark:bg-slate-950 dark:text-white dark:focus:border-rose-500 outline-none"
              />
              {actionNotes.trim() === '' && (
                <span className="text-[9px] text-rose-500 block mt-1">Please enter a reason to explain the rejection to the client.</span>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => { setActionPayment(null); setActionNotes(''); }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionNotes.trim() === ''}
                onClick={handleConfirmPaymentAction}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                <X className="h-4 w-4" />
                Reject Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE PAYMENT & USER CONFIRMATION MODAL (Admin) */}
      {/* ======================================================== */}
      {paymentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-950 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <Trash2 className="h-5 w-5 text-rose-500" />
              </div>
              <h3 className="font-sans font-black text-slate-900 dark:text-white">Delete Payment / User</h3>
            </div>

            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Are you sure you want to delete payment record <strong className="text-slate-900 dark:text-white">{paymentToDelete.transactionId || paymentToDelete.id}</strong> of <strong className="text-rose-600 dark:text-rose-400">PKR {paymentToDelete.amount.toLocaleString()}</strong> submitted by <strong>{paymentToDelete.userName}</strong> ({paymentToDelete.companyName || 'N/A'})?
              </p>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={deleteUserOption}
                    onChange={(e) => setDeleteUserOption(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span>
                    Also delete customer account (<strong className="text-rose-600 dark:text-rose-400">{paymentToDelete.userName}</strong>) and wipe all user data from database.
                  </span>
                </label>
              </div>

              <p className="text-[11px] text-slate-400 leading-normal">
                This record will be permanently deleted from local cache and Supabase database.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => { setPaymentToDelete(null); setDeleteUserOption(false); }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingPayment}
                onClick={handleConfirmDeletePayment}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeletingPayment ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
