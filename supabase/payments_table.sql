-- ======================================================================
-- SUPABASE PRODUCTION-READY DATABASE MIGRATION SCRIPT
-- Target Tables: profiles, subscriptions, payments, customer_notifications, activity_logs
-- Design Pattern: Idempotent Schema Design with RLS Policies & Auth Trigger Sync
-- Version: 2.0.0 (Unified Setup)
-- ======================================================================

-- ----------------------------------------------------------------------
-- 1. CLEANUP & INITIAL SETUP (Idempotent Drops)
-- ----------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ----------------------------------------------------------------------
-- 2. CREATE DATABASE TABLES
-- ----------------------------------------------------------------------

-- A. Profiles Table (Linked 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    company_name TEXT,
    current_plan TEXT NOT NULL DEFAULT 'Starter',
    subscription_status TEXT NOT NULL DEFAULT 'Trial' CHECK (subscription_status IN ('Trial', 'Active', 'Expired', 'Suspended', 'Cancelled')),
    trial_status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- B. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Trial' CHECK (status IN ('Trial', 'Active', 'Expired', 'Suspended', 'Cancelled')),
    subscription_status TEXT NOT NULL DEFAULT 'Trial', -- Match application schema
    plan TEXT NOT NULL DEFAULT 'Trial',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL DEFAULT (CURRENT_DATE + 14), -- Default 14-day trial
    trial BOOLEAN NOT NULL DEFAULT TRUE,
    trial_status TEXT DEFAULT 'Active',
    trial_started_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    is_trial BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- C. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    plan TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    screenshot TEXT NOT NULL, -- Holds Base64 string or storage URL
    notes TEXT,
    admin_notes TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Verified', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- D. Customer Notifications Table
CREATE TABLE IF NOT EXISTS public.customer_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('success', 'error', 'info')),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- E. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------------------
-- 3. CREATE OPTIMIZATION INDEXES
-- ----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_sub_status ON public.profiles(subscription_status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.customer_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.customer_notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON public.customer_notifications(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);

-- ----------------------------------------------------------------------
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY POLICIES (Idempotent Re-creation)
-- ----------------------------------------------------------------------

-- A. Profiles Table Policies
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;

CREATE POLICY "Users can read their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage profiles" ON public.profiles
    FOR ALL USING (
        auth.jwt() ->> 'email' LIKE '%admin%' 
        OR auth.jwt() ->> 'email' = 'haidubaba16277@gmail.com'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    );

-- B. Subscriptions Table Policies
DROP POLICY IF EXISTS "Users can read their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;

CREATE POLICY "Users can read their own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON public.subscriptions
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions
    FOR ALL USING (
        auth.jwt() ->> 'email' LIKE '%admin%' 
        OR auth.jwt() ->> 'email' = 'haidubaba16277@gmail.com'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    );

-- C. Payments Table Policies
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can read their own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update all payments" ON public.payments;

CREATE POLICY "Users can insert their own payments" ON public.payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" ON public.payments
    FOR SELECT USING (
        auth.jwt() ->> 'email' LIKE '%admin%' 
        OR auth.jwt() ->> 'email' = 'haidubaba16277@gmail.com'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    );

CREATE POLICY "Admins can update all payments" ON public.payments
    FOR UPDATE USING (
        auth.jwt() ->> 'email' LIKE '%admin%' 
        OR auth.jwt() ->> 'email' = 'haidubaba16277@gmail.com'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    );

-- D. Customer Notifications Table Policies
DROP POLICY IF EXISTS "Users can read their own notifications" ON public.customer_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.customer_notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.customer_notifications;

CREATE POLICY "Users can read their own notifications" ON public.customer_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.customer_notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications" ON public.customer_notifications
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'email' LIKE '%admin%' 
        OR auth.jwt() ->> 'email' = 'haidubaba16277@gmail.com'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    );

-- E. Activity Logs Table Policies
DROP POLICY IF EXISTS "Admins can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can insert activity logs" ON public.activity_logs;

CREATE POLICY "Admins can view activity logs" ON public.activity_logs
    FOR SELECT USING (
        auth.jwt() ->> 'email' LIKE '%admin%' 
        OR auth.jwt() ->> 'email' = 'haidubaba16277@gmail.com'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    );

CREATE POLICY "Admins can insert activity logs" ON public.activity_logs
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'email' LIKE '%admin%' 
        OR auth.jwt() ->> 'email' = 'haidubaba16277@gmail.com'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    );

-- ----------------------------------------------------------------------
-- 6. TRIGGER FOR AUTOMATIC PROFILE & SUBSCRIPTION CREATION (NEW SIGNUPS)
-- ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Insert Profile
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        company_name, 
        current_plan, 
        subscription_status, 
        trial_status
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', 'New Client'),
        COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.raw_user_meta_data->>'companyName', 'My Company'),
        'Starter',
        'Trial',
        'Active'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        company_name = COALESCE(profiles.company_name, EXCLUDED.company_name);
    
    -- 2. Insert Subscription
    INSERT INTO public.subscriptions (
        user_id,
        status,
        subscription_status,
        plan,
        trial,
        trial_status,
        start_date,
        expiry_date,
        is_trial,
        trial_ends_at
    )
    VALUES (
        NEW.id,
        'Trial',
        'Trial',
        'Trial',
        TRUE,
        'Active',
        CURRENT_DATE,
        (CURRENT_DATE + 14),
        TRUE,
        (timezone('utc'::text, now()) + INTERVAL '14 days')
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------
-- 7. MIGRATE EXISTING auth.users INTO public.profiles & public.subscriptions
-- ----------------------------------------------------------------------
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT * FROM auth.users LOOP
        -- Ensure profile exists
        INSERT INTO public.profiles (
            id, 
            email, 
            full_name, 
            company_name, 
            current_plan, 
            subscription_status, 
            trial_status,
            created_at,
            updated_at
        )
        VALUES (
            user_record.id,
            user_record.email,
            COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.raw_user_meta_data->>'fullName', 'New Client'),
            COALESCE(user_record.raw_user_meta_data->>'company_name', user_record.raw_user_meta_data->>'companyName', 'My Company'),
            'Starter',
            'Trial',
            'Active',
            user_record.created_at,
            COALESCE(user_record.updated_at, user_record.created_at)
        )
        ON CONFLICT (id) DO UPDATE 
        SET 
            email = EXCLUDED.email,
            full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
            company_name = COALESCE(profiles.company_name, EXCLUDED.company_name);

        -- Ensure default subscription exists
        INSERT INTO public.subscriptions (
            user_id,
            status,
            subscription_status,
            plan,
            trial,
            trial_status,
            start_date,
            expiry_date,
            is_trial,
            trial_ends_at,
            created_at,
            updated_at
        )
        VALUES (
            user_record.id,
            'Trial',
            'Trial',
            'Trial',
            TRUE,
            'Active',
            user_record.created_at::DATE,
            (user_record.created_at::DATE + 14),
            TRUE,
            (user_record.created_at + INTERVAL '14 days'),
            user_record.created_at,
            COALESCE(user_record.updated_at, user_record.created_at)
        )
        ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
END;
$$;
