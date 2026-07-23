export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  companyName?: string;
  avatarUrl?: string;
  createdAt: string;
  plan?: string;
  role?: 'owner' | 'customer';
  phone?: string;
  status?: 'active' | 'suspended' | 'trial' | 'expired';
  selected_plan?: 'Starter' | 'Professional' | 'Business' | 'Trial' | string;
  trial_started_at?: string;
  trial_ends_at?: string;
  trial_status?: boolean;
  is_trial?: boolean;
  subscription_status?: 'Trial' | 'Active' | 'Expired' | 'Suspended' | 'Cancelled';
}

export interface AuthSession {
  user: UserProfile;
  accessToken: string;
  expiresAt?: number;
}

export interface AuthState {
  user: UserProfile | null;
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  isDemoMode: boolean;
}
