import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, AuthSession } from '../types/auth';

export const authService = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  async ensureProfileAndSubscriptionExists(userId: string, email: string, fullName?: string, companyName?: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const nowStr = new Date().toISOString();

      // Check if profile exists
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        console.error('Error checking profile existence:', profileErr);
      } else if (!profile) {
        console.log(`Profile for user ${userId} does not exist in Supabase. Creating one...`);
        const isOwner = email.toLowerCase().includes('admin') || email.toLowerCase() === 'haidubaba16277@gmail.com';
        const { error: insertProfileErr } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            full_name: fullName || 'SaaS Member',
            company_name: companyName || 'Company Inc.',
            current_plan: isOwner ? 'Enterprise' : 'Trial',
            subscription_status: isOwner ? 'Active' : 'Trial',
            trial_status: 'Active',
            created_at: nowStr,
            updated_at: nowStr
          });
        
        if (insertProfileErr) {
          console.error('Failed to auto-insert profile:', insertProfileErr);
        }
      }

      // Check if subscription exists
      const { data: sub, error: subErr } = await supabase
        .from('subscriptions')
        .select('id, status, subscription_status')
        .eq('user_id', userId)
        .maybeSingle();

      const threeDaysLaterIso = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
      const threeDaysLaterDate = threeDaysLaterIso.split('T')[0];
      const isOwner = email.toLowerCase().includes('admin') || email.toLowerCase() === 'haidubaba16277@gmail.com';

      if (subErr) {
        console.error('Error checking subscription existence:', subErr);
      } else if (!sub) {
        console.log(`Subscription for user ${userId} does not exist in Supabase. Creating one...`);
        const { error: insertSubErr } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            status: isOwner ? 'Active' : 'Trial',
            subscription_status: isOwner ? 'Active' : 'Trial',
            plan: isOwner ? 'Enterprise' : 'Trial',
            trial: !isOwner,
            trial_status: 'Active',
            is_trial: !isOwner,
            trial_started_at: nowStr,
            trial_ends_at: isOwner ? null : threeDaysLaterIso,
            start_date: nowStr.split('T')[0],
            expiry_date: isOwner ? null : threeDaysLaterDate,
            created_at: nowStr,
            updated_at: nowStr
          });

        if (insertSubErr) {
          console.error('Failed to auto-insert subscription:', insertSubErr);
        }
      } else if (!isOwner && (sub.status === 'Trial' || sub.status === 'trial' || sub.subscription_status === 'Trial' || !sub.status)) {
        // Enforce 3 days on existing trial subscription in Supabase
        await supabase
          .from('subscriptions')
          .update({
            status: 'Trial',
            subscription_status: 'Trial',
            plan: 'Trial',
            trial: true,
            is_trial: true,
            trial_ends_at: threeDaysLaterIso,
            expiry_date: threeDaysLaterDate,
            updated_at: nowStr
          })
          .eq('user_id', userId);
      }

      // Sync local offline payments to Supabase JIT
      try {
        const { paymentService } = await import('./paymentService');
        await paymentService.syncLocalPaymentsToSupabase(userId);
      } catch (importErr) {
        console.error('Failed to import paymentService dynamically:', importErr);
      }
    } catch (err) {
      console.error('Exception in ensureProfileAndSubscriptionExists:', err);
    }
  },

  async signUp(email: string, password: string, fullName: string, companyName: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. If Supabase is configured, perform real Supabase registration
    if (isSupabaseConfigured && supabase) {
      const trialStartedAt = new Date().toISOString();
      const trialEndsAt = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
      const isOwner = cleanEmail.includes('admin') || cleanEmail === 'haidubaba16277@gmail.com';

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
            plan: isOwner ? 'Enterprise' : 'Trial',
            role: isOwner ? 'owner' : 'customer',
            trial_started_at: trialStartedAt,
            trial_ends_at: isOwner ? null : trialEndsAt,
            subscription_status: isOwner ? 'Active' : 'Trial'
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Supabase registration failed.');
      }

      if (!data.user) {
        throw new Error('Registration failed: No user created.');
      }

      const profile: UserProfile = {
        id: data.user.id,
        email: cleanEmail,
        fullName,
        companyName,
        createdAt: data.user.created_at || trialStartedAt,
        plan: isOwner ? 'Enterprise' : 'Trial',
        role: isOwner ? 'owner' : 'customer',
        status: isOwner ? 'active' : 'trial',
        selected_plan: isOwner ? 'Enterprise' : 'Trial',
        trial_started_at: trialStartedAt,
        trial_ends_at: isOwner ? null : trialEndsAt,
        subscription_status: isOwner ? 'Active' : 'Trial'
      };

      await this.ensureProfileAndSubscriptionExists(
        data.user.id,
        cleanEmail,
        fullName,
        companyName
      );

      try {
        const companySettingsData = {
          user_id: data.user.id,
          company_name: companyName,
          owner_name: fullName,
          email: cleanEmail,
          phone: '',
          address: '',
        };
        await supabase.from('company_settings').insert(companySettingsData);
      } catch (dbErr) {
        console.error('Database insertion of company profile in Supabase failed:', dbErr);
      }

      return profile;
    }

    // 2. Offline Sandbox registration ONLY when Supabase is NOT configured
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
    const trialStartedAt = new Date().toISOString();
    const trialEndsAt = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
    const newUser = {
      id: newId,
      email: cleanEmail,
      fullName,
      companyName,
      phone: '',
      plan: 'Trial',
      status: 'trial',
      selected_plan: 'Trial',
      trial_started_at: trialStartedAt,
      trial_ends_at: trialEndsAt,
      subscription_status: 'Trial',
      signupDate: trialStartedAt,
      lastLogin: trialStartedAt,
      trialDays: 3,
      password: cleanPassword
    };
    users.push(newUser);
    localStorage.setItem('quoteflow_admin_users', JSON.stringify(users));

    const isOwnerUser = cleanEmail.includes('admin') || cleanEmail === 'haidubaba16277@gmail.com';
    const profile: UserProfile = {
      id: newId,
      email: cleanEmail,
      fullName,
      companyName,
      createdAt: newUser.signupDate,
      plan: isOwnerUser ? 'Enterprise' : 'Trial',
      role: isOwnerUser ? 'owner' : 'customer',
      status: isOwnerUser ? 'active' : 'trial',
      selected_plan: isOwnerUser ? 'Enterprise' : 'Trial',
      trial_started_at: trialStartedAt,
      trial_ends_at: isOwnerUser ? null : trialEndsAt,
      subscription_status: isOwnerUser ? 'Active' : 'Trial'
    };

    const session: AuthSession = {
      user: profile,
      accessToken: 'local-session-token-' + newId,
      expiresAt: Math.floor(Date.now() / 1000) + 3600 * 24,
    };
    localStorage.setItem('quoteflow_local_session', JSON.stringify(session));

    return profile;
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. If Supabase is configured, use Supabase authentication directly
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error) {
          throw new Error(error.message || 'Invalid email or password.');
        }

        if (!data.user || !data.session) throw new Error('Sign in failed.');

        await this.ensureProfileAndSubscriptionExists(
          data.user.id,
          data.user.email || email,
          data.user.user_metadata?.full_name || 'SaaS Member',
          data.user.user_metadata?.company_name || 'Company Inc.'
        );

        const isOwner = 
          (data.user.email?.toLowerCase().includes('admin')) || 
          (data.user.email?.toLowerCase() === 'haidubaba16277@gmail.com') || 
          (data.user.user_metadata?.role === 'owner');

        if (isOwner && data.user.user_metadata?.role !== 'owner') {
          try {
            await supabase.auth.updateUser({
              data: { role: 'owner' }
            });
          } catch (updateMetaErr) {
            console.warn('Could not update user metadata role dynamically:', updateMetaErr);
          }
        }

        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          fullName: data.user.user_metadata?.full_name || 'SaaS Member',
          companyName: data.user.user_metadata?.company_name || 'Company Inc.',
          createdAt: data.user.created_at,
          plan: data.user.user_metadata?.plan || 'Starter',
          role: isOwner ? 'owner' : 'customer',
          selected_plan: data.user.user_metadata?.selected_plan || 'Trial',
          trial_started_at: data.user.user_metadata?.trial_started_at || data.user.created_at,
          trial_ends_at: data.user.user_metadata?.trial_ends_at || new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
          subscription_status: data.user.user_metadata?.subscription_status || 'Trial',
        };

        const session: AuthSession = {
          user: profile,
          accessToken: data.session.access_token,
          expiresAt: data.session.expires_at,
        };

        return session;
      } catch (err: any) {
        throw new Error(err.message || 'Authentication failed. Please check your credentials.');
      }
    }

    // 2. Sandbox (Local Mode) - Check registered users only
    let cachedUsersStr = localStorage.getItem('quoteflow_admin_users');
    if (!cachedUsersStr) {
      // Initialize if empty so that logins are instantly active on first try
      const isCleared = localStorage.getItem('quoteflow_dummy_cleared') === 'true';
      const defaultMockUsers = isCleared ? [] : [
        { id: 'usr-1', email: 'hamza@nexustech.pk', fullName: 'Hamza Malik', companyName: 'NexusTech Private Ltd', phone: '+92 321 8483921', plan: 'Business', status: 'active', signupDate: '2026-06-10T12:00:00Z', lastLogin: '2026-07-14T03:45:00Z', trialDays: 0, password: 'nexus_hamza99', selected_plan: 'Business', subscription_status: 'Active', trial_started_at: '2026-06-10T12:00:00Z', trial_ends_at: '2026-08-24T12:00:00Z' },
        { id: 'usr-2', email: 'marium@interact.com', fullName: 'Marium Batool', companyName: 'Interact Creative Agency', phone: '+92 333 4910294', plan: 'Trial', status: 'trial', signupDate: '2026-07-10T15:30:00Z', lastLogin: '2026-07-13T10:15:00Z', trialDays: 14, password: 'marium_creative', selected_plan: 'Trial', subscription_status: 'Trial', trial_started_at: '2026-07-10T15:30:00Z', trial_ends_at: '2026-07-24T15:30:00Z' },
        { id: 'usr-3', email: 'salman@giga.com.pk', fullName: 'Salman Lodhi', companyName: 'Giga Builders & Devs', phone: '+92 300 4059102', plan: 'Professional', status: 'active', signupDate: '2026-05-20T09:12:00Z', lastLogin: '2026-07-14T01:10:00Z', trialDays: 0, password: 'giga_salman123', selected_plan: 'Professional', subscription_status: 'Active', trial_started_at: '2026-05-20T09:12:00Z', trial_ends_at: '2026-08-15T09:12:00Z' },
        { id: 'usr-4', email: 'tayyab@fresho.pk', fullName: 'Tayyab Mahmood', companyName: 'Fresho Food Deliveries', phone: '+92 312 9049102', plan: 'Business', status: 'active', signupDate: '2026-04-12T08:00:00Z', lastLogin: '2026-07-13T23:50:00Z', trialDays: 0, password: 'fresho_tayyab55', selected_plan: 'Business', subscription_status: 'Active', trial_started_at: '2026-04-12T08:00:00Z', trial_ends_at: '2026-09-12T08:00:00Z' },
        { id: 'usr-5', email: 'bilal@retrofit.pk', fullName: 'Bilal Farooq', companyName: 'RetroFit Gyms & Apparel', phone: '+92 345 5029104', plan: 'Starter', status: 'expired', signupDate: '2026-06-15T11:45:00Z', lastLogin: '2026-06-29T16:20:00Z', trialDays: 0, password: 'retrofit_bilal7', selected_plan: 'Starter', subscription_status: 'Expired', trial_started_at: '2026-06-15T11:45:00Z', trial_ends_at: '2026-06-29T11:45:00Z' },
        { id: 'usr-6', email: 'ayesha.qureshi@vivid.pk', fullName: 'Ayesha Qureshi', companyName: 'Vivid Digital Hub', phone: '+92 324 4920194', plan: 'Professional', status: 'suspended', signupDate: '2026-05-01T14:00:00Z', lastLogin: '2026-06-10T09:00:00Z', trialDays: 0, password: 'vivid_ayesha12', selected_plan: 'Professional', subscription_status: 'Suspended', trial_started_at: '2026-05-01T14:00:00Z', trial_ends_at: '2026-05-15T14:00:00Z' },
        { id: 'usr-7', email: 'razzaq@ftech.com', fullName: 'Abdul Razzaq', companyName: 'Razzaq Solutions', phone: '+92 322 7392013', plan: 'Starter', status: 'expired', signupDate: '2026-04-01T10:00:00Z', lastLogin: '2026-04-20T11:00:00Z', trialDays: 0, password: 'razzaq_solutions', selected_plan: 'Starter', subscription_status: 'Cancelled', trial_started_at: '2026-04-01T10:00:00Z', trial_ends_at: '2026-04-15T10:00:00Z' }
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
            selected_plan: matched.selected_plan || matched.plan || 'Trial',
            trial_started_at: matched.trial_started_at || matched.signupDate || new Date().toISOString(),
            trial_ends_at: matched.trial_ends_at || new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
            subscription_status: matched.subscription_status || 'Trial',
          };
          const session: AuthSession = {
            user: profile,
            accessToken: 'local-session-token-' + matched.id,
            expiresAt: Math.floor(Date.now() / 1000) + 3600 * 24, // 24 hours
          };
          // Save local session so getSession can restore it
          localStorage.setItem('quoteflow_local_session', JSON.stringify(session));
          return session;
        } else {
          throw new Error('Incorrect password. Sahi password enter karein.');
        }
      }
    }

    throw new Error('Aapka user account nahi mila. Pehle Sign Up (Register) karein taake aapka new workspace account ban jaye.');
  },

  async signOut(): Promise<void> {
    localStorage.removeItem('quoteflow_local_session');
    try {
      localStorage.removeItem('quoteflow_customers');
      localStorage.removeItem('quoteflow_products');
      localStorage.removeItem('quoteflow_quotations');
      localStorage.removeItem('quoteflow_invoices');
      localStorage.removeItem('quoteflow_company_settings');
    } catch (e) {}

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Supabase signOut error:', error);
    }
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
    let session: AuthSession | null = null;

    // 1. Check Supabase first if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session: sbSession }, error } = await supabase.auth.getSession();
        if (!error && sbSession) {
          await this.ensureProfileAndSubscriptionExists(
            sbSession.user.id,
            sbSession.user.email || '',
            sbSession.user.user_metadata?.full_name || sbSession.user.user_metadata?.fullName,
            sbSession.user.user_metadata?.company_name || sbSession.user.user_metadata?.companyName
          );
          const baseProfile: UserProfile = {
            id: sbSession.user.id,
            email: sbSession.user.email || '',
            fullName: sbSession.user.user_metadata?.full_name || 'SaaS Member',
            companyName: sbSession.user.user_metadata?.company_name || 'Company Inc.',
            createdAt: sbSession.user.created_at,
            plan: sbSession.user.user_metadata?.plan || 'Starter',
            role: sbSession.user.email?.toLowerCase().includes('admin') ? 'owner' : (sbSession.user.user_metadata?.role || 'customer'),
            selected_plan: sbSession.user.user_metadata?.selected_plan || 'Trial',
            trial_started_at: sbSession.user.user_metadata?.trial_started_at || sbSession.user.created_at,
            trial_ends_at: sbSession.user.user_metadata?.trial_ends_at || new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
            subscription_status: sbSession.user.user_metadata?.subscription_status || 'Trial',
          };

          session = {
            user: baseProfile,
            accessToken: sbSession.access_token,
            expiresAt: sbSession.expires_at,
          };
        }
      } catch (err) {
        console.error('Failed to fetch Supabase auth session:', err);
      }
    }

    // 2. If Supabase is NOT configured, check local session
    if (!session && !isSupabaseConfigured) {
      const localSessionStr = localStorage.getItem('quoteflow_local_session');
      if (localSessionStr) {
        try {
          session = JSON.parse(localSessionStr);
        } catch {
          localStorage.removeItem('quoteflow_local_session');
        }
      }
    }

    // 3. If we have a session (either Supabase or local), fetch live data to override static values
    if (session && session.user) {
      const userId = session.user.id;
      let plan = session.user.plan || 'Starter';
      let selected_plan = session.user.selected_plan || 'Trial';
      let subscription_status = session.user.subscription_status || 'Trial';
      let trial_ends_at = session.user.trial_ends_at;

      // Try fetching live data from Supabase
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      let loadedFromSupabase = false;
      if (isSupabaseConfigured && supabase && isUuid) {
        try {
          const [profileRes, subRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
            supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()
          ]);

          if (profileRes.data) {
            plan = profileRes.data.current_plan || plan;
            selected_plan = profileRes.data.current_plan || selected_plan;
            subscription_status = profileRes.data.subscription_status || subscription_status;
            loadedFromSupabase = true;
          }

          if (subRes.data) {
            plan = subRes.data.plan || plan;
            selected_plan = subRes.data.plan || selected_plan;
            subscription_status = subRes.data.status || subscription_status;
            if (subRes.data.expiry_date) {
              trial_ends_at = new Date(subRes.data.expiry_date).toISOString();
            }
            loadedFromSupabase = true;
          }
        } catch (err) {
          console.error('Failed to load live database profile or subscription:', err);
        }
      }

      // Check local storage as well to guarantee active subscription status is reconciled
      const cachedUsersStr = localStorage.getItem('quoteflow_admin_users');
      if (cachedUsersStr) {
        try {
          const users: any[] = JSON.parse(cachedUsersStr);
          const matched = users.find(u => 
            u.id === userId || 
            (u.email && session!.user.email && u.email.toLowerCase().trim() === session!.user.email.toLowerCase().trim()) ||
            (u.fullName && session!.user.fullName && u.fullName.toLowerCase().trim() === session!.user.fullName.toLowerCase().trim()) ||
            (u.companyName && session!.user.companyName && u.companyName.toLowerCase().trim() === session!.user.companyName.toLowerCase().trim())
          );
          if (matched) {
            if (matched.subscription_status === 'Active' || matched.status === 'active') {
              plan = (matched.plan && matched.plan !== 'Trial') ? matched.plan : ((matched.selected_plan && matched.selected_plan !== 'Trial') ? matched.selected_plan : plan);
              selected_plan = plan;
              subscription_status = 'Active';
              trial_ends_at = null;
            } else if (!loadedFromSupabase) {
              plan = matched.plan || plan;
              selected_plan = matched.selected_plan || plan || selected_plan;
              subscription_status = matched.subscription_status || subscription_status;
              trial_ends_at = matched.trial_ends_at || trial_ends_at;
            }
          }
        } catch (e) {
          console.error('Failed to parse local cached users for live update:', e);
        }
      }

      // Check verified payments in quoteflow_payments as well
      const cachedPaymentsStr = localStorage.getItem('quoteflow_payments');
      if (cachedPaymentsStr) {
        try {
          const payments: any[] = JSON.parse(cachedPaymentsStr);
          const verifiedPay = payments.find(p => 
            (p.userId === userId || 
             (session!.user.email && p.userName && p.userName.toLowerCase().trim() === session!.user.fullName?.toLowerCase().trim()) ||
             (session!.user.fullName && p.userName && p.userName.toLowerCase().trim() === session!.user.fullName.toLowerCase().trim())) && 
            (p.status === 'Verified' || p.status === 'Paid')
          );
          if (verifiedPay) {
            subscription_status = 'Active';
            if (verifiedPay.plan && verifiedPay.plan !== 'Trial') {
              plan = verifiedPay.plan;
              selected_plan = verifiedPay.plan;
            }
            trial_ends_at = null;
          }
        } catch (e) {
          console.error('Failed to parse local cached payments for live update:', e);
        }
      }

      if (subscription_status === 'Active' && (plan === 'Trial' || selected_plan === 'Trial')) {
        plan = 'Business Plan';
        selected_plan = 'Business Plan';
      }

      // Automatically elevate owner/admin users to permanent Active Enterprise status
      const isOwnerUser = session.user.email?.toLowerCase().includes('admin') || session.user.email?.toLowerCase() === 'haidubaba16277@gmail.com' || session.user.role === 'owner';
      if (isOwnerUser) {
        plan = 'Enterprise';
        selected_plan = 'Enterprise';
        subscription_status = 'Active';
        trial_ends_at = null;
      }

      // Apply live updates to session user object
      session.user.plan = plan;
      session.user.selected_plan = selected_plan;
      session.user.subscription_status = subscription_status as any;
      session.user.trial_ends_at = subscription_status === 'Active' ? null : trial_ends_at;
      session.user.trial_started_at = subscription_status === 'Active' ? null : (session.user.trial_started_at || null);
      session.user.trial_status = subscription_status === 'Active' ? false : (subscription_status === 'Trial');
      session.user.is_trial = subscription_status === 'Active' ? false : (subscription_status === 'Trial');
      session.user.status = subscription_status.toLowerCase() === 'trial' ? 'trial' : subscription_status.toLowerCase() === 'active' ? 'active' : 'expired';

      // Keep local session storage synchronized in both modes
      localStorage.setItem('quoteflow_local_session', JSON.stringify(session));

      // Debugging log as requested in Requirements 6
      console.log('=== LIVE SUBSCRIPTION WORKFLOW LOG ===');
      console.log('Current User ID:', userId);
      console.log('Current Plan:', plan);
      console.log('Subscription Status:', subscription_status);
      console.log('Trial Ends At:', session.user.trial_ends_at);
      console.log('is_trial:', session.user.is_trial);
      console.log('=======================================');
    }

    return session;
  },

  async updateSubscription(userId: string, selectedPlan: string, status: 'Trial' | 'Active' | 'Expired' | 'Suspended' | 'Cancelled', durationDays: number = 30, fullName?: string, companyName?: string): Promise<UserProfile> {
    const cachedUsersStr = localStorage.getItem('quoteflow_admin_users') || '[]';
    let users = [];
    try {
      users = JSON.parse(cachedUsersStr);
    } catch {
      users = [];
    }
    
    let index = users.findIndex((u: any) => u.id === userId);
    
    // If not found directly by ID, search if there is any user matching by fullName or companyName
    if (index === -1) {
      index = users.findIndex((u: any) => 
        (fullName && u.fullName && u.fullName.toLowerCase().trim() === fullName.toLowerCase().trim()) ||
        (companyName && u.companyName && u.companyName.toLowerCase().trim() === companyName.toLowerCase().trim())
      );
      if (index !== -1) {
        console.log(`Matching user found under a different ID or name. Aligning local user ID from ${users[index].id} to ${userId}`);
        users[index].id = userId;
      }
    }

    // If still not found, create a placeholder / JIT user record
    if (index === -1) {
      let userEmail = 'saas_user@quoteflow.com';
      let userFullName = fullName || 'SaaS Customer';
      let userCompanyName = companyName || 'Company Inc.';
      let userSignupDate = new Date().toISOString();

      if (isSupabaseConfigured && supabase) {
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          if (prof) {
            userEmail = prof.email || userEmail;
            userFullName = prof.full_name || userFullName;
            userCompanyName = prof.company_name || userCompanyName;
            userSignupDate = prof.created_at || userSignupDate;
          }
        } catch (err) {
          console.error('Failed to pre-fetch profile from Supabase in updateSubscription:', err);
        }
      }

      const newUser = {
        id: userId,
        email: userEmail,
        fullName: userFullName,
        companyName: userCompanyName,
        signupDate: userSignupDate,
        plan: selectedPlan,
        status: status.toLowerCase() === 'trial' ? 'trial' : status.toLowerCase() === 'active' ? 'active' : 'expired',
        selected_plan: selectedPlan,
        subscription_status: status,
        trial_ends_at: status === 'Trial' ? new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString() : null,
        trial_status: status === 'Trial',
        is_trial: status === 'Trial'
      };

      users.push(newUser);
      index = users.length - 1;
      console.log(`Created new local admin user entry JIT for ID ${userId}`);
    }
    
    const user = users[index];
    user.plan = selectedPlan;
    user.status = status.toLowerCase() === 'trial' ? 'trial' : status.toLowerCase() === 'active' ? 'active' : 'expired';
    user.selected_plan = selectedPlan;
    user.subscription_status = status;
    if (fullName) user.fullName = fullName;
    if (companyName) user.companyName = companyName;
    
    if (status === 'Active') {
      user.trial_ends_at = null;
      user.trial_started_at = null;
      user.trial_status = false;
      user.is_trial = false;
    } else if (status === 'Expired') {
      user.trial_ends_at = new Date(Date.now() - 24 * 3600 * 1000).toISOString(); // Expired yesterday
      user.trial_status = false;
      user.is_trial = false;
    }
    
    users[index] = user;
    localStorage.setItem('quoteflow_admin_users', JSON.stringify(users));
    
    // Also update session
    const localSessionStr = localStorage.getItem('quoteflow_local_session');
    if (localSessionStr) {
      try {
        const session = JSON.parse(localSessionStr);
        const sessionUser = session.user;
        const isTargetUserSession = 
          sessionUser.id === userId ||
          (sessionUser.email && user.email && sessionUser.email.toLowerCase().trim() === user.email.toLowerCase().trim()) ||
          (sessionUser.fullName && user.fullName && sessionUser.fullName.toLowerCase().trim() === user.fullName.toLowerCase().trim()) ||
          (fullName && sessionUser.fullName && sessionUser.fullName.toLowerCase().trim() === fullName.toLowerCase().trim());

        if (isTargetUserSession) {
          session.user.plan = selectedPlan;
          session.user.status = user.status;
          session.user.selected_plan = selectedPlan;
          session.user.subscription_status = status;
          session.user.trial_ends_at = user.trial_ends_at;
          session.user.trial_started_at = user.trial_started_at || null;
          session.user.trial_status = user.trial_status || false;
          session.user.is_trial = user.is_trial || false;
          if (fullName) session.user.fullName = fullName;
          if (companyName) session.user.companyName = companyName;
          localStorage.setItem('quoteflow_local_session', JSON.stringify(session));
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Synchronize to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const nowStr = new Date().toISOString();
        const startDate = nowStr.split('T')[0];
        const expiryDate = new Date(Date.now() + durationDays * 24 * 3600 * 1000).toISOString().split('T')[0];
        const userEmail = user.email ? user.email.trim().toLowerCase() : '';

        let sbUserId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) ? userId : '';

        if (!sbUserId && userEmail) {
          try {
            const { data: prof } = await supabase.from('profiles').select('id').eq('email', userEmail).maybeSingle();
            if (prof) sbUserId = prof.id;
          } catch (e) {
            console.warn('Could not resolve profile by email:', e);
          }
        }

        const targetId = sbUserId || userId;

        // 1. Update profiles table
        let profQuery = supabase
          .from('profiles')
          .update({
            current_plan: selectedPlan,
            subscription_status: status,
            trial_status: status === 'Trial' ? 'Active' : 'false',
            updated_at: nowStr
          });

        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) {
          profQuery = profQuery.eq('id', targetId);
        } else if (userEmail) {
          profQuery = profQuery.eq('email', userEmail);
        } else {
          profQuery = profQuery.eq('id', targetId);
        }
        await profQuery;

        // 2. Update subscriptions table
        try {
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', targetId)
            .maybeSingle();

          const subData: any = {
            status: status,
            subscription_status: status,
            plan: selectedPlan,
            trial: status === 'Trial',
            trial_status: status === 'Trial' ? 'Active' : 'false',
            trial_started_at: status === 'Trial' ? nowStr : null,
            trial_ends_at: status === 'Trial' ? new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString() : null,
            start_date: startDate,
            expiry_date: expiryDate,
            updated_at: nowStr
          };

          if (existingSub) {
            await supabase
              .from('subscriptions')
              .update(subData)
              .eq('user_id', targetId);
          } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) {
            await supabase
              .from('subscriptions')
              .insert({
                user_id: targetId,
                ...subData
              });
          }
        } catch (subQueryErr) {
          console.warn('Subscriptions table update failed inside updateSubscription, skipped safely:', subQueryErr);
        }

        console.log('=== Supabase Sync in updateSubscription: SUCCESS ===');
      } catch (err) {
        console.error('Failed to sync updateSubscription to Supabase:', err);
      }
    }
    
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      companyName: user.companyName,
      createdAt: user.signupDate || new Date().toISOString(),
      plan: user.plan,
      role: user.email.toLowerCase().includes('admin') ? 'owner' : 'customer',
      selected_plan: user.selected_plan,
      trial_started_at: user.trial_started_at,
      trial_ends_at: user.trial_ends_at,
      subscription_status: user.subscription_status,
      status: user.status
    };
  }
};
