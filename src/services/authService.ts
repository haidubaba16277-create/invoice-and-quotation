import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, AuthSession } from '../types/auth';

// Helper for demo mode storage
const DEMO_USER_KEY = 'quoteflow_demo_user';
const DEMO_SESSION_KEY = 'quoteflow_demo_session';

const MOCK_DELAY = 800; // Simulated network delay in ms for Demo mode

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const authService = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  async signUp(email: string, password: string, fullName: string, companyName: string): Promise<UserProfile> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('User signup failed. Please try again.');

      return {
        id: data.user.id,
        email: data.user.email || email,
        fullName: data.user.user_metadata?.full_name || fullName,
        companyName: data.user.user_metadata?.company_name || companyName,
        createdAt: data.user.created_at,
      };
    } else {
      await delay(MOCK_DELAY);
      // Demo Mode logic
      const demoUsers = JSON.parse(localStorage.getItem('quoteflow_demo_users_db') || '[]');
      if (demoUsers.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('Email already registered in Demo database.');
      }

      const newUser: UserProfile = {
        id: 'demo-user-' + Math.random().toString(36).substr(2, 9),
        email,
        fullName,
        companyName,
        createdAt: new Date().toISOString(),
      };

      demoUsers.push({ ...newUser, password });
      localStorage.setItem('quoteflow_demo_users_db', JSON.stringify(demoUsers));
      
      // Save current session
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(newUser));
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({
        user: newUser,
        accessToken: 'demo-token-' + Math.random().toString(36).substr(2, 15),
        expiresAt: Date.now() + 3600 * 1000,
      }));

      return newUser;
    }
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user || !data.session) throw new Error('Sign in failed.');

      const profile: UserProfile = {
        id: data.user.id,
        email: data.user.email || email,
        fullName: data.user.user_metadata?.full_name || 'SaaS Member',
        companyName: data.user.user_metadata?.company_name || 'Company Inc.',
        createdAt: data.user.created_at,
      };

      const session: AuthSession = {
        user: profile,
        accessToken: data.session.access_token,
        expiresAt: data.session.expires_at,
      };

      return session;
    } else {
      await delay(MOCK_DELAY);
      
      // Check demo db or create a default demo user
      const demoUsers = JSON.parse(localStorage.getItem('quoteflow_demo_users_db') || '[]');
      let userRecord = demoUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

      if (!userRecord && email.toLowerCase() === 'demo@quoteflow.pk') {
        userRecord = {
          id: 'demo-default',
          email: 'demo@quoteflow.pk',
          fullName: 'Demo Manager',
          companyName: 'QuoteFlow Pakistan (Pvt) Ltd',
          createdAt: new Date().toISOString(),
          password: 'password123',
        };
        demoUsers.push(userRecord);
        localStorage.setItem('quoteflow_demo_users_db', JSON.stringify(demoUsers));
      }

      if (!userRecord) {
        throw new Error('User not found. Use "demo@quoteflow.pk" / "password123" for quick demo.');
      }

      if (userRecord.password !== password) {
        throw new Error('Incorrect password. Please try again.');
      }

      const profile: UserProfile = {
        id: userRecord.id,
        email: userRecord.email,
        fullName: userRecord.fullName,
        companyName: userRecord.companyName,
        createdAt: userRecord.createdAt,
      };

      const session: AuthSession = {
        user: profile,
        accessToken: 'demo-token-' + Math.random().toString(36).substr(2, 15),
        expiresAt: Date.now() + 3600 * 1000,
      };

      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(profile));
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));

      return session;
    }
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } else {
      await delay(MOCK_DELAY / 2);
      localStorage.removeItem(DEMO_USER_KEY);
      localStorage.removeItem(DEMO_SESSION_KEY);
    }
  },

  async resetPassword(email: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
    } else {
      await delay(MOCK_DELAY);
      // Demo Mode check
      const demoUsers = JSON.parse(localStorage.getItem('quoteflow_demo_users_db') || '[]');
      const userExists = demoUsers.some((u: any) => u.email.toLowerCase() === email.toLowerCase()) || email.toLowerCase() === 'demo@quoteflow.pk';
      
      if (!userExists) {
        throw new Error('Email address not registered in our records.');
      }
    }
  },

  async getSession(): Promise<AuthSession | null> {
    if (isSupabaseConfigured && supabase) {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return null;

      const profile: UserProfile = {
        id: session.user.id,
        email: session.user.email || '',
        fullName: session.user.user_metadata?.full_name || 'SaaS Member',
        companyName: session.user.user_metadata?.company_name || 'Company Inc.',
        createdAt: session.user.created_at,
      };

      return {
        user: profile,
        accessToken: session.access_token,
        expiresAt: session.expires_at,
      };
    } else {
      const sessionStr = localStorage.getItem(DEMO_SESSION_KEY);
      if (!sessionStr) return null;
      try {
        const session = JSON.parse(sessionStr) as AuthSession;
        // Verify expiry if exists
        if (session.expiresAt && session.expiresAt < Date.now()) {
          localStorage.removeItem(DEMO_USER_KEY);
          localStorage.removeItem(DEMO_SESSION_KEY);
          return null;
        }
        return session;
      } catch {
        return null;
      }
    }
  }
};
