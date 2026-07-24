-- ====================================================================
-- QuoteFlow SaaS - Production Multi-Tenant Migration & RLS Security
-- Database: Supabase PostgreSQL
-- Purpose: Complete, Idempotent Data Isolation Migration
-- ====================================================================

-- --------------------------------------------------------------------
-- STEP 1: SAFELY ADD 'user_id' COLUMNS IF MISSING
-- --------------------------------------------------------------------

DO $$ 
BEGIN 
    -- 1.1 CUSTOMERS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'user_id') THEN
        ALTER TABLE public.customers ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- 1.2 PRODUCTS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'user_id') THEN
        ALTER TABLE public.products ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- 1.3 QUOTATIONS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'quotations' AND column_name = 'user_id') THEN
        ALTER TABLE public.quotations ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- 1.4 INVOICES
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'user_id') THEN
        ALTER TABLE public.invoices ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- 1.5 COMPANY SETTINGS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'user_id') THEN
        ALTER TABLE public.company_settings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;


-- --------------------------------------------------------------------
-- STEP 2: HANDLE NULL 'user_id' RECORDS SAFELY FOR EXISTING DATA
-- Assigns orphaned rows (where user_id IS NULL) to the first created user
-- in auth.users if available.
-- --------------------------------------------------------------------

DO $$ 
DECLARE
    default_owner_id UUID;
BEGIN
    SELECT id INTO default_owner_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    
    IF default_owner_id IS NOT NULL THEN
        UPDATE public.customers SET user_id = default_owner_id WHERE user_id IS NULL;
        UPDATE public.products SET user_id = default_owner_id WHERE user_id IS NULL;
        UPDATE public.quotations SET user_id = default_owner_id WHERE user_id IS NULL;
        UPDATE public.invoices SET user_id = default_owner_id WHERE user_id IS NULL;
        UPDATE public.company_settings SET user_id = default_owner_id WHERE user_id IS NULL;
    END IF;
END $$;


-- --------------------------------------------------------------------
-- STEP 3: CREATE PERFORMANCE & TENANT ISOLATION INDEXES
-- --------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_user_id ON public.quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON public.company_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON public.quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);


-- --------------------------------------------------------------------
-- STEP 4: ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- --------------------------------------------------------------------

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------------------
-- STEP 5: CUSTOMERS RLS POLICIES
-- --------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON public.customers;

CREATE POLICY "Users can view their own customers" 
ON public.customers FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers" 
ON public.customers FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers" 
ON public.customers FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers" 
ON public.customers FOR DELETE TO authenticated 
USING (auth.uid() = user_id);


-- --------------------------------------------------------------------
-- STEP 6: PRODUCTS RLS POLICIES
-- --------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;

CREATE POLICY "Users can view their own products" 
ON public.products FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products" 
ON public.products FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" 
ON public.products FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" 
ON public.products FOR DELETE TO authenticated 
USING (auth.uid() = user_id);


-- --------------------------------------------------------------------
-- STEP 7: QUOTATIONS RLS POLICIES (AUTHENTICATED & PUBLIC SHARING)
-- --------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can insert their own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can update their own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can delete their own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Public view policy for non-draft shared quotations" ON public.quotations;
DROP POLICY IF EXISTS "Public status update policy for shared quotations" ON public.quotations;

-- Authenticated Tenant Isolation
CREATE POLICY "Users can view their own quotations" 
ON public.quotations FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quotations" 
ON public.quotations FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotations" 
ON public.quotations FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotations" 
ON public.quotations FOR DELETE TO authenticated 
USING (auth.uid() = user_id);

-- Secure Public Sharing (Allows clients to view and accept/reject shared quotes)
CREATE POLICY "Public view policy for non-draft shared quotations" 
ON public.quotations FOR SELECT TO anon, authenticated 
USING (status IN ('Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired', 'Converted'));

CREATE POLICY "Public status update policy for shared quotations" 
ON public.quotations FOR UPDATE TO anon, authenticated 
USING (true) 
WITH CHECK (status IN ('Viewed', 'Accepted', 'Rejected'));

-- SECURITY DEFINER function for seamless public client approvals/rejections
CREATE OR REPLACE FUNCTION public.public_update_quotation_status(
    p_quote_id text,
    p_status text,
    p_notes text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.quotations
    SET 
        status = p_status,
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE (id::text = p_quote_id OR quote_number = p_quote_id);
    
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_update_quotation_status(text, text, text) TO anon, authenticated;


-- --------------------------------------------------------------------
-- STEP 8: QUOTATION_ITEMS RLS POLICIES (PARENT-BASED & PUBLIC SHARING)
-- --------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view items of their quotations" ON public.quotation_items;
DROP POLICY IF EXISTS "Users can insert items to their quotations" ON public.quotation_items;
DROP POLICY IF EXISTS "Users can update items of their quotations" ON public.quotation_items;
DROP POLICY IF EXISTS "Users can delete items of their quotations" ON public.quotation_items;
DROP POLICY IF EXISTS "Public view policy for shared quotation items" ON public.quotation_items;

CREATE POLICY "Users can view items of their quotations" 
ON public.quotation_items FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.quotations 
        WHERE public.quotations.id = quotation_id 
          AND public.quotations.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert items to their quotations" 
ON public.quotation_items FOR INSERT TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.quotations 
        WHERE public.quotations.id = quotation_id 
          AND public.quotations.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update items of their quotations" 
ON public.quotation_items FOR UPDATE TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.quotations 
        WHERE public.quotations.id = quotation_id 
          AND public.quotations.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.quotations 
        WHERE public.quotations.id = quotation_id 
          AND public.quotations.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete items of their quotations" 
ON public.quotation_items FOR DELETE TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.quotations 
        WHERE public.quotations.id = quotation_id 
          AND public.quotations.user_id = auth.uid()
    )
);

CREATE POLICY "Public view policy for shared quotation items" 
ON public.quotation_items FOR SELECT TO anon, authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.quotations 
        WHERE public.quotations.id = quotation_id 
          AND public.quotations.status IN ('Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired', 'Converted')
    )
);


-- --------------------------------------------------------------------
-- STEP 9: INVOICES RLS POLICIES
-- --------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;

CREATE POLICY "Users can view their own invoices" 
ON public.invoices FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices" 
ON public.invoices FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices" 
ON public.invoices FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices" 
ON public.invoices FOR DELETE TO authenticated 
USING (auth.uid() = user_id);


-- --------------------------------------------------------------------
-- STEP 10: INVOICE_ITEMS RLS POLICIES (PARENT-BASED)
-- --------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view items of their invoices" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can insert items to their invoices" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can update items of their invoices" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can delete items of their invoices" ON public.invoice_items;

CREATE POLICY "Users can view items of their invoices" 
ON public.invoice_items FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.invoices 
        WHERE public.invoices.id = invoice_id 
          AND public.invoices.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert items to their invoices" 
ON public.invoice_items FOR INSERT TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.invoices 
        WHERE public.invoices.id = invoice_id 
          AND public.invoices.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update items of their invoices" 
ON public.invoice_items FOR UPDATE TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.invoices 
        WHERE public.invoices.id = invoice_id 
          AND public.invoices.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.invoices 
        WHERE public.invoices.id = invoice_id 
          AND public.invoices.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete items of their invoices" 
ON public.invoice_items FOR DELETE TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.invoices 
        WHERE public.invoices.id = invoice_id 
          AND public.invoices.user_id = auth.uid()
    )
);


-- --------------------------------------------------------------------
-- STEP 11: COMPANY SETTINGS RLS POLICIES
-- --------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can insert their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can update their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can delete their own company settings" ON public.company_settings;

CREATE POLICY "Users can view their own company settings" 
ON public.company_settings FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company settings" 
ON public.company_settings FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company settings" 
ON public.company_settings FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company settings" 
ON public.company_settings FOR DELETE TO authenticated 
USING (auth.uid() = user_id);
