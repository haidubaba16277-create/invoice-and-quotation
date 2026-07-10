-- ==========================================
-- QuoteFlow PK - Database Schema & Migration
-- Feature: Company Settings (Module 1)
-- ==========================================

-- 1. Create company_settings table
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT,
    email TEXT NOT NULL,
    website TEXT,
    address TEXT,
    tax_number TEXT,
    bank_name TEXT,
    account_title TEXT,
    account_number TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure a user can only have ONE company settings record
CREATE UNIQUE INDEX IF NOT EXISTS company_settings_user_id_unique_idx ON public.company_settings (user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing RLS Policies for company_settings (for clean re-runs)
DROP POLICY IF EXISTS "Users can only view their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can only insert their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can only update their own company settings" ON public.company_settings;

-- 3. Create RLS Policies for company_settings
CREATE POLICY "Users can only view their own company settings" 
ON public.company_settings
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own company settings" 
ON public.company_settings
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own company settings" 
ON public.company_settings
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ==========================================
-- 4. Supabase Storage Setup (company-logos)
-- ==========================================

-- Ensure storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Public Access to Company Logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own company logos" ON storage.objects;

-- Create Storage policies
-- Allow public select access to the files in company-logos
CREATE POLICY "Public Access to Company Logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Allow authenticated users to upload logos under a folder named after their user_id
CREATE POLICY "Users can upload their own company logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own logos
CREATE POLICY "Users can update their own company logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos' AND 
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'company-logos' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own logos
CREATE POLICY "Users can delete their own company logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);
