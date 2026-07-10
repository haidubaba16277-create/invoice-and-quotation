-- ==========================================
-- QuoteFlow PK - Database Schema & Migration
-- Feature: Customer Management (Module 2)
-- ==========================================

-- 1. Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    city TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Prevent duplicate customers with the same phone number for the same user
CREATE UNIQUE INDEX IF NOT EXISTS customers_user_id_phone_unique_idx ON public.customers (user_id, phone);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing RLS Policies for customers (for clean re-runs)
DROP POLICY IF EXISTS "Users can only view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can only insert their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can only update their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can only delete their own customers" ON public.customers;

-- 5. Create RLS Policies for customers
CREATE POLICY "Users can only view their own customers" 
ON public.customers
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own customers" 
ON public.customers
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own customers" 
ON public.customers
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own customers" 
ON public.customers
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);
