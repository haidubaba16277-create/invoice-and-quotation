-- ==========================================
-- QuoteFlow PK - Database Schema & Migration
-- Feature: Product Management (Module 3)
-- ==========================================

-- 1. Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    sku TEXT,
    category TEXT,
    description TEXT,
    unit TEXT NOT NULL,
    price NUMERIC NOT NULL CHECK (price > 0),
    tax_percentage NUMERIC NOT NULL DEFAULT 0 CHECK (tax_percentage >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Prevent duplicate SKUs for the same user (allowing multiple NULL or empty SKUs)
CREATE UNIQUE INDEX IF NOT EXISTS products_user_id_sku_unique_idx 
ON public.products (user_id, sku) 
WHERE (sku IS NOT NULL AND sku <> '');

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing RLS Policies for products (for clean re-runs)
DROP POLICY IF EXISTS "Users can only view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can only insert their own products" ON public.products;
DROP POLICY IF EXISTS "Users can only update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can only delete their own products" ON public.products;

-- 5. Create RLS Policies for products
CREATE POLICY "Users can only view their own products" 
ON public.products
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own products" 
ON public.products
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own products" 
ON public.products
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own products" 
ON public.products
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);
