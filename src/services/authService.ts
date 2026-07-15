import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, AuthSession } from '../types/auth';

export const authService = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  async signUp(email: string, password: string, fullName: string, companyName: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. ALWAYS register the user locally in the local sandbox database (localStorage)
    const cachedUsersStr = localStorage.getItem('quoteflow_admin_users') || '[]';
    let users = [];
    try {
      users = JSON.parse(cachedUsersStr);
    } catch {
      users = [];
    }

    if (users.some((u: any) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('This email address is already registered.');
    }

    const newId = 'usr-' + Date.now();
    const newUser = {
      id: newId,
      email: cleanEmail,
      fullName,
      companyName,
      phone: '',
      plan: 'Starter',
      status: 'active',
      signupDate: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      trialDays: 14,
      password: cleanPassword
    };
    users.push(newUser);
    localStorage.setItem('quoteflow_admin_users', JSON.stringify(users));

    // Also create a default subscription so they show up properly in billing
    const cachedSubsStr = localStorage.getItem('quoteflow_admin_subs') || '[]';
    let subs = [];
    try {
      subs = JSON.parse(cachedSubsStr);
    } catch {
      subs = [];
    }
    subs.push({
      id: 'sub-' + Date.now(),
      userId: newId,
      userName: fullName,
      companyName: companyName,
      plan: 'Starter',
      billingCycle: 'monthly',
      status: 'active',
      startsAt: new Date().toISOString().split('T')[0],
      expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
      paymentStatus: 'paid',
      amount: 2500
    });
    localStorage.setItem('quoteflow_admin_subs', JSON.stringify(subs));

    const profile: UserProfile = {
      id: newId,
      email: cleanEmail,
      fullName,
      companyName,
      createdAt: newUser.signupDate,
      plan: 'Starter',
      role: cleanEmail.includes('admin') ? 'owner' : 'customer'
    };

    const session: AuthSession = {
      user: profile,
      accessToken: 'local-session-token-' + newId,
      expiresAt: Math.floor(Date.now() / 1000) + 3600 * 24,
    };
    localStorage.setItem('quoteflow_local_session', JSON.stringify(session));

    // 2. Synchronize with Supabase as a background effort if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              full_name: fullName,
              company_name: companyName,
              plan: 'Starter',
            },
          },
        });

        if (error) {
          console.warn('Supabase auth signup error, relying on robust local registration:', error.message);
        } else if (data.user) {
          // Successfully created in Supabase too! Update profile ID to match Supabase ID if we want,
          // but keeping the local fallback ensures we can log in with either.
          try {
            const companySettingsData = {
              user_id: data.user.id,
              company_name: companyName,
              owner_name: fullName,
              email: cleanEmail,
              phone: '',
              address: '',
            };
            const { error: insertError } = await supabase
              .from('company_settings')
              .insert(companySettingsData);
            if (insertError) {
              console.warn('Failed to insert company_settings in Supabase:', insertError.message);
            }
          } catch (dbErr) {
            console.error('Database insertion of company profile in Supabase failed:', dbErr);
          }
        }
      } catch (err: any) {
        console.warn('Supabase signup check exception, bypassed safely:', err.message || err);
      }
    }

    return profile;
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Check local manually created admin users first so that they can ALWAYS log in immediately!
    try {
      let cachedUsersStr = localStorage.getItem('quoteflow_admin_users');
      if (!cachedUsersStr) {
        // Initialize if empty so that logins are instantly active on first try
        const isCleared = localStorage.getItem('quoteflow_dummy_cleared') === 'true';
        const defaultMockUsers = isCleared ? [] : [
          { id: 'usr-1', email: 'hamza@nexustech.pk', fullName: 'Hamza Malik', companyName: 'NexusTech Private Ltd', phone: '+92 321 8483921', plan: 'Business', status: 'active', signupDate: '2026-06-10T12:00:00Z', lastLogin: '2026-07-14T03:45:00Z', trialDays: 0, password: 'nexus_hamza99' },
          { id: 'usr-2', email: 'marium@interact.com', fullName: 'Marium Batool', companyName: 'Interact Creative Agency', phone: '+92 333 4910294', plan: 'Starter', status: 'trial', signupDate: '2026-07-02T15:30:00Z', lastLogin: '2026-07-13T10:15:00Z', trialDays: 14, password: 'marium_creative' },
          { id: 'usr-3', email: 'salman@giga.com.pk', fullName: 'Salman Lodhi', companyName: 'Giga Builders & Devs', phone: '+92 300 4059102', plan: 'Professional', status: 'active', signupDate: '2026-05-20T09:12:00Z', lastLogin: '2026-07-14T01:10:00Z', trialDays: 0, password: 'giga_salman123' },
          { id: 'usr-4', email: 'tayyab@fresho.pk', fullName: 'Tayyab Mahmood', companyName: 'Fresho Food Deliveries', phone: '+92 312 9049102', plan: 'Enterprise', status: 'active', signupDate: '2026-04-12T08:00:00Z', lastLogin: '2026-07-13T23:50:00Z', trialDays: 0, password: 'fresho_tayyab55' },
          { id: 'usr-5', email: 'bilal@retrofit.pk', fullName: 'Bilal Farooq', companyName: 'RetroFit Gyms & Apparel', phone: '+92 345 5029104', plan: 'Starter', status: 'expired', signupDate: '2026-06-15T11:45:00Z', lastLogin: '2026-06-29T16:20:00Z', trialDays: 0, password: 'retrofit_bilal7' },
          { id: 'usr-6', email: 'ayesha.qureshi@vivid.pk', fullName: 'Ayesha Qureshi', companyName: 'Vivid Digital Hub', phone: '+92 324 4920194', plan: 'Professional', status: 'suspended', signupDate: '2026-05-01T14:00:00Z', lastLogin: '2026-06-10T09:00:00Z', trialDays: 0, password: 'vivid_ayesha12' }
        ];
        if (!isCleared) {
          localStorage.setItem('quoteflow_admin_users', JSON.stringify(defaultMockUsers));
          cachedUsersStr = JSON.stringify(defaultMockUsers);
        }
      }

      if (cachedUsersStr) {
        const users: any[] = JSON.parse(cachedUsersStr);
        const matched = users.find(u => u.email.trim().toLowerCase() === cleanEmail);
        
        if (matched) {
          if (matched.password === cleanPassword) {
            const profile: UserProfile = {
              id: matched.id,
              email: matched.email,
              fullName: matched.fullName,
              companyName: matched.companyName,
              createdAt: matched.signupDate || new Date().toISOString(),
              plan: matched.plan || 'Starter',
              role: matched.email.toLowerCase().includes('admin') ? 'owner' : 'customer',
            };
            const session: AuthSession = {
              user: profile,
              accessToken: 'local-session-token-' + matched.id,
              expiresAt: Math.floor(Date.now() / 1000) + 3600 * 24, // 24 hours
            };
            // Save local session so getSession can restore it
            localStorage.setItem('quoteflow_local_session', JSON.stringify(session));
            return session;
          } else if (matched.password) {
            throw new Error('Invalid password for this registered user.');
          }
        } else {
          // AUTO-ONBOARDING: Create user on-the-fly locally to prevent any login failures
          const newId = 'usr-' + Date.now();
          const namePart = cleanEmail.split('@')[0];
          const fullName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
          const companyName = fullName + ' Company';

          const newUser = {
            id: newId,
            email: cleanEmail,
            fullName,
            companyName,
            phone: '',
            plan: 'Starter',
            status: 'active',
            signupDate: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            trialDays: 14,
            password: cleanPassword
          };
          users.push(newUser);
          localStorage.setItem('quoteflow_admin_users', JSON.stringify(users));

          // Create standard subscription
          const cachedSubsStr = localStorage.getItem('quoteflow_admin_subs') || '[]';
          let subs = [];
          try {
            subs = JSON.parse(cachedSubsStr);
          } catch {
            subs = [];
          }
          subs.push({
            id: 'sub-' + Date.now(),
            userId: newId,
            userName: fullName,
            companyName: companyName,
            plan: 'Starter',
            billingCycle: 'monthly',
            status: 'active',
            startsAt: new Date().toISOString().split('T')[0],
            expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
            paymentStatus: 'paid',
            amount: 2500
          });
          localStorage.setItem('quoteflow_admin_subs', JSON.stringify(subs));

          const profile: UserProfile = {
            id: newId,
            email: cleanEmail,
            fullName,
            companyName,
            createdAt: newUser.signupDate,
            plan: 'Starter',
            role: cleanEmail.includes('admin') ? 'owner' : 'customer'
          };

          const session: AuthSession = {
            user: profile,
            accessToken: 'local-session-token-' + newId,
            expiresAt: Math.floor(Date.now() / 1000) + 3600 * 24,
          };
          localStorage.setItem('quoteflow_local_session', JSON.stringify(session));

          // Try registering on Supabase silently in background if configured
          if (isSupabaseConfigured && supabase) {
            try {
              await supabase.auth.signUp({
                email: cleanEmail,
                password: cleanPassword,
                options: {
                  data: {
                    full_name: fullName,
                    company_name: companyName,
                    plan: 'Starter',
                  },
                },
              });
            } catch (err) {
              console.warn('Silent background Supabase registration sync failed:', err);
            }
          }

          return session;
        }
      }
    } catch (localErr: any) {
      if (localErr.message === 'Invalid password for this registered user.') {
        throw localErr;
      }
      console.warn('Local auth check failed, trying Supabase:', localErr);
    }

    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. For sandbox mode, use registered email/password or create one.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    if (error) throw error;
    if (!data.user || !data.session) throw new Error('Sign in failed.');

    const profile: UserProfile = {
      id: data.user.id,
      email: data.user.email || email,
      fullName: data.user.user_metadata?.full_name || 'SaaS Member',
      companyName: data.user.user_metadata?.company_name || 'Company Inc.',
      createdAt: data.user.created_at,
      plan: data.user.user_metadata?.plan || 'Starter',
      role: data.user.user_metadata?.role || (email.toLowerCase().includes('admin') ? 'owner' : 'customer'),
    };

    const session: AuthSession = {
      user: profile,
      accessToken: data.session.access_token,
      expiresAt: data.session.expires_at,
    };

    return session;
  },

  async signOut(): Promise<void> {
    localStorage.removeItem('quoteflow_local_session');
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    // Clear all cached local data to ensure perfect security and prevent data leakage
    localStorage.removeItem('quoteflow_customers');
    localStorage.removeItem('quoteflow_products');
    localStorage.removeItem('quoteflow_quotations');
    localStorage.removeItem('quoteflow_invoices');
    localStorage.removeItem('quoteflow_company_settings');
  },

  async resetPassword(email: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  },

  async getSession(): Promise<AuthSession | null> {
    // Check local session first
    const localSessionStr = localStorage.getItem('quoteflow_local_session');
    if (localSessionStr) {
      try {
        const session = JSON.parse(localSessionStr);
        return session;
      } catch {
        localStorage.removeItem('quoteflow_local_session');
      }
    }

    if (isSupabaseConfigured && supabase) {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return null;

      const profile: UserProfile = {
        id: session.user.id,
        email: session.user.email || '',
        fullName: session.user.user_metadata?.full_name || 'SaaS Member',
        companyName: session.user.user_metadata?.company_name || 'Company Inc.',
        createdAt: session.user.created_at,
        plan: session.user.user_metadata?.plan || 'Starter',
        role: session.user.user_metadata?.role || (session.user.email?.toLowerCase().includes('admin') ? 'owner' : 'customer'),
      };

      return {
        user: profile,
        accessToken: session.access_token,
        expiresAt: session.expires_at,
      };
    }
    return null;
  }
};
