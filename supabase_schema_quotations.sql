-- ==========================================
-- QuoteFlow PK - Database Schema & Migration
-- Feature: Professional Quotation Builder (Module 4)
-- ==========================================

-- 1. Create quotations table
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quote_number TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Rejected')),
    subtotal NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount_type TEXT DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage')),
    discount_value NUMERIC NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
    tax_percentage NUMERIC NOT NULL DEFAULT 0 CHECK (tax_percentage >= 0),
    tax_amount NUMERIC NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    grand_total NUMERIC NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
    notes TEXT,
    terms TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure quote numbers are unique per user
CREATE UNIQUE INDEX IF NOT EXISTS quotations_user_id_quote_number_unique_idx 
ON public.quotations (user_id, quote_number);

-- 2. Create quotation_items table
CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    tax_percentage NUMERIC NOT NULL DEFAULT 0 CHECK (tax_percentage >= 0),
    line_total NUMERIC NOT NULL CHECK (line_total >= 0)
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing RLS Policies (for clean re-runs)
DROP POLICY IF EXISTS "Users can only view their own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can only insert their own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can only update their own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can only delete their own quotations" ON public.quotations;

DROP POLICY IF EXISTS "Users can only view their own quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Users can only insert their own quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Users can only update their own quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Users can only delete their own quotation items" ON public.quotation_items;

-- 5. Create RLS Policies for quotations
CREATE POLICY "Users can only view their own quotations" 
ON public.quotations FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Public view policy for non-draft shared quotations"
ON public.quotations FOR SELECT TO anon, authenticated
USING (status IN ('Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired', 'Converted'));

CREATE POLICY "Users can only insert their own quotations" 
ON public.quotations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own quotations" 
ON public.quotations FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public update policy for shared quotations"
ON public.quotations FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (status IN ('Viewed', 'Accepted', 'Rejected'));

CREATE POLICY "Users can only delete their own quotations" 
ON public.quotations FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 6. Create RLS Policies for quotation_items
CREATE POLICY "Users can only view their own quotation items" 
ON public.quotation_items FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.quotations
        WHERE public.quotations.id = public.quotation_items.quotation_id
          AND public.quotations.user_id = auth.uid()
    )
);

CREATE POLICY "Users can only insert their own quotation items" 
ON public.quotation_items FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.quotations
        WHERE public.quotations.id = public.quotation_items.quotation_id
          AND public.quotations.user_id = auth.uid()
    )
);

CREATE POLICY "Users can only update their own quotation items" 
ON public.quotation_items FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.quotations
        WHERE public.quotations.id = public.quotation_items.quotation_id
          AND public.quotations.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.quotations
        WHERE public.quotations.id = public.quotation_items.quotation_id
          AND public.quotations.user_id = auth.uid()
    )
);

CREATE POLICY "Users can only delete their own quotation items" 
ON public.quotation_items FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.quotations
        WHERE public.quotations.id = public.quotation_items.quotation_id
          AND public.quotations.user_id = auth.uid()
    )
);
