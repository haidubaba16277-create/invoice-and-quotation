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
