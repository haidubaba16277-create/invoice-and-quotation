-- ==========================================
-- QuoteFlow PK - Database Schema & Migration
-- Feature: Invoices, PDF, Print & Public Sharing (Module 5)
-- ==========================================

-- 1. Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    company_name TEXT,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Partial', 'Paid')),
    subtotal NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount NUMERIC NOT NULL DEFAULT 0 CHECK (discount >= 0),
    tax NUMERIC NOT NULL DEFAULT 0 CHECK (tax >= 0),
    grand_total NUMERIC NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
    amount_paid NUMERIC NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure invoice numbers are unique per user
CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_id_invoice_number_idx 
ON public.invoices (user_id, invoice_number);

-- 2. Create invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    tax_percentage NUMERIC NOT NULL DEFAULT 0 CHECK (tax_percentage >= 0),
    line_total NUMERIC NOT NULL CHECK (line_total >= 0)
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing RLS Policies if they exist (for clean runs)
DROP POLICY IF EXISTS "Users can only view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can only insert their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can only update their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can only delete their own invoices" ON public.invoices;

DROP POLICY IF EXISTS "Users can only view their own invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can only insert their own invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can only update their own invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can only delete their own invoice items" ON public.invoice_items;

-- 5. Create RLS Policies for invoices
CREATE POLICY "Users can only view their own invoices" 
ON public.invoices FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own invoices" 
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own invoices" 
ON public.invoices FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own invoices" 
ON public.invoices FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 6. Create RLS Policies for invoice_items
CREATE POLICY "Users can only view their own invoice items" 
ON public.invoice_items FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.invoices
        WHERE public.invoices.id = public.invoice_items.invoice_id
          AND public.invoices.user_id = auth.uid()
    )
);

CREATE POLICY "Users can only insert their own invoice items" 
ON public.invoice_items FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.invoices
        WHERE public.invoices.id = public.invoice_items.invoice_id
          AND public.invoices.user_id = auth.uid()
    )
);

CREATE POLICY "Users can only update their own invoice items" 
ON public.invoice_items FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.invoices
        WHERE public.invoices.id = public.invoice_items.invoice_id
          AND public.invoices.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.invoices
        WHERE public.invoices.id = public.invoice_items.invoice_id
          AND public.invoices.user_id = auth.uid()
    )
);

CREATE POLICY "Users can only delete their own invoice items" 
ON public.invoice_items FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.invoices
        WHERE public.invoices.id = public.invoice_items.invoice_id
          AND public.invoices.user_id = auth.uid()
    )
);
