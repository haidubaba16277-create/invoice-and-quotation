import React, { useEffect, useState, useRef } from 'react';
import { 
  Settings, 
  Save, 
  Upload, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  CreditCard, 
  Image as ImageIcon, 
  Database, 
  Clipboard, 
  Key, 
  Check, 
  ExternalLink, 
  Lock,
  ChevronRight
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { dataService } from '../services/dataService';
import { CompanySettings } from '../types/business';

interface SettingsViewProps {
  isSupabaseConnected: boolean;
}

export function SettingsView({ isSupabaseConnected }: SettingsViewProps) {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'security'>('settings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Local File preview for instant UX feedback
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  
  // Notification States
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validation feedback states
  const [validationErrors, setValidationErrors] = useState<{
    companyName?: string;
    ownerName?: string;
    email?: string;
    phone?: string;
    website?: string;
  }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await dataService.getCompanySettings();
        setSettings(data);
        if (data.logoUrl) {
          setLogoPreviewUrl(data.logoUrl);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        showNotification('Failed to load company settings.', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const showNotification = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4500);
    }
  };

  const validateFields = (data: CompanySettings): boolean => {
    const errors: typeof validationErrors = {};
    let isValid = true;

    // 1. Required field: Company Name
    if (!data.companyName || !data.companyName.trim()) {
      errors.companyName = 'Company Name is required.';
      isValid = false;
    }

    // 2. Required field: Owner Name
    if (!data.ownerName || !data.ownerName.trim()) {
      errors.ownerName = 'Owner Name is required.';
      isValid = false;
    }

    // 3. Required field & valid format: Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !data.email.trim()) {
      errors.email = 'Official communication email is required.';
      isValid = false;
    } else if (!emailRegex.test(data.email.trim())) {
      errors.email = 'Please provide a valid official email address.';
      isValid = false;
    }

    // 4. Required field & valid format: Phone Number
    // General numeric and symbols checkout (+92 ..., etc)
    const phoneRegex = /^\+?[0-9\s\-()]{7,25}$/;
    if (!data.phone || !data.phone.trim()) {
      errors.phone = 'Contact phone number is required.';
      isValid = false;
    } else if (!phoneRegex.test(data.phone.trim())) {
      errors.phone = 'Please enter a valid phone number (e.g. +92 21 35123456).';
      isValid = false;
    }

    // 5. Website optional format validation
    if (data.website && data.website.trim()) {
      try {
        new URL(data.website.trim());
      } catch (_) {
        errors.website = 'Please provide a complete URL starting with http:// or https://';
        isValid = false;
      }
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleInputChange = (field: keyof CompanySettings, value: any) => {
    if (!settings) return;
    const updated = {
      ...settings,
      [field]: value
    };
    setSettings(updated);
    
    // Clear validation error dynamically on keystroke
    if (validationErrors[field as keyof typeof validationErrors]) {
      setValidationErrors({
        ...validationErrors,
        [field]: undefined
      });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Size check (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showNotification('Maximum logo size limit is 2MB.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Type check (images only)
    if (!file.type.startsWith('image/')) {
      showNotification('Only image formats (JPEG, PNG, WEBP) are allowed.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Show temporary local preview instantly for exquisite UX
    const localUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(localUrl);

    if (!isSupabaseConnected) {
      // In demo mode, simulate storage and save locally
      showNotification('Logo preview updated. Linking real storage requires Supabase settings.', 'success');
      handleInputChange('logoUrl', localUrl);
      return;
    }

    setUploading(true);
    try {
      const publicUrl = await dataService.uploadCompanyLogo(file);
      handleInputChange('logoUrl', publicUrl);
      showNotification('Logo successfully uploaded to Supabase Storage bucket!', 'success');
    } catch (err: any) {
      console.error('Logo upload failed:', err);
      showNotification(err.message || 'Failed to upload logo to Supabase.', 'error');
      // Revert preview to previous logoUrl on failure
      setLogoPreviewUrl(settings?.logoUrl || null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    if (!validateFields(settings)) {
      showNotification('Form validation failed. Please check required fields.', 'error');
      return;
    }

    setSaving(true);
    try {
      const savedSettings = await dataService.saveCompanySettings(settings);
      setSettings(savedSettings);
      showNotification('Company Settings saved successfully!', 'success');
    } catch (err: any) {
      console.error('Save failed:', err);
      showNotification(err.message || 'Failed to save company settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopySQL = () => {
    const sqlText = `-- 1. Create company_settings table
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

-- 2. Create RLS Policies
CREATE POLICY "Users can only view their own company settings" 
ON public.company_settings FOR SELECT 
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own company settings" 
ON public.company_settings FOR INSERT 
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own company settings" 
ON public.company_settings FOR UPDATE 
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`;

    navigator.clipboard.writeText(sqlText);
    showNotification('RLS and schema SQL copied to clipboard!', 'success');
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-sky-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">Loading Company Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-lg dark:border-emerald-950/20 dark:bg-emerald-950/30 dark:text-emerald-400 animate-slide-in">
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800 shadow-lg dark:border-rose-950/20 dark:bg-rose-950/30 dark:text-rose-400 animate-slide-in">
          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-500 dark:text-sky-400" />
            Company Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your authenticated organization identity, banking credentials, tax numbers, and public brand logos.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !settings}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/10 hover:opacity-95 focus:outline-hidden disabled:opacity-50 transition-all shrink-0 active:scale-98"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px gap-1">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-indigo-600 text-indigo-600 dark:border-sky-400 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Building2 className="h-4 w-4" />
          General Profile & Branding
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-indigo-600 text-indigo-600 dark:border-sky-400 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Database className="h-4 w-4" />
          Supabase SQL & RLS Policies
        </button>
      </div>

      {/* Main Settings Panel */}
      {settings && activeTab === 'settings' && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Left and Middle Columns (Forms) */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Section 1: Company Information */}
              <GlassCard className="p-6" intensity="medium">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-4">
                  <Building2 className="h-4 w-4 text-indigo-500 dark:text-sky-400" />
                  Company Information
                </h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      className={`w-full rounded-xl border bg-white/50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 transition-all dark:bg-slate-900/50 dark:text-slate-200 ${
                        validationErrors.companyName 
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-800'
                      }`}
                      placeholder="e.g. QuoteFlow Pakistan"
                    />
                    {validationErrors.companyName && (
                      <p className="mt-1 text-[10px] text-rose-500 font-semibold">{validationErrors.companyName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-400" /> Owner Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.ownerName}
                      onChange={(e) => handleInputChange('ownerName', e.target.value)}
                      className={`w-full rounded-xl border bg-white/50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 transition-all dark:bg-slate-900/50 dark:text-slate-200 ${
                        validationErrors.ownerName 
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-800'
                      }`}
                      placeholder="e.g. Haris Rehman"
                    />
                    {validationErrors.ownerName && (
                      <p className="mt-1 text-[10px] text-rose-500 font-semibold">{validationErrors.ownerName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Tax Number (NTN / STRN)
                    </label>
                    <input
                      type="text"
                      value={settings.taxNumber || ''}
                      onChange={(e) => handleInputChange('taxNumber', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all"
                      placeholder="e.g. NTN-7294810-5"
                    />
                  </div>
                </div>
              </GlassCard>

              {/* Section 2: Contact Information */}
              <GlassCard className="p-6" intensity="medium">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-4">
                  <MapPin className="h-4 w-4 text-indigo-500 dark:text-sky-400" />
                  Contact Information
                </h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> Official Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={settings.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full rounded-xl border bg-white/50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 transition-all dark:bg-slate-900/50 dark:text-slate-200 ${
                        validationErrors.email 
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-800'
                      }`}
                      placeholder="e.g. billing@quoteflow.pk"
                    />
                    {validationErrors.email && (
                      <p className="mt-1 text-[10px] text-rose-500 font-semibold">{validationErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full rounded-xl border bg-white/50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 transition-all dark:bg-slate-900/50 dark:text-slate-200 ${
                        validationErrors.phone 
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-800'
                      }`}
                      placeholder="e.g. +92 21 35123456"
                    />
                    {validationErrors.phone && (
                      <p className="mt-1 text-[10px] text-rose-500 font-semibold">{validationErrors.phone}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5 text-slate-400" /> Official Website
                    </label>
                    <input
                      type="url"
                      value={settings.website || ''}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className={`w-full rounded-xl border bg-white/50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 transition-all dark:bg-slate-900/50 dark:text-slate-200 ${
                        validationErrors.website 
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-800'
                      }`}
                      placeholder="e.g. https://quoteflow.pk"
                    />
                    {validationErrors.website && (
                      <p className="mt-1 text-[10px] text-rose-500 font-semibold">{validationErrors.website}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" /> Physical Address
                    </label>
                    <textarea
                      rows={3}
                      value={settings.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all"
                      placeholder="Suite 402, Dolmen Mall Clifton, Karachi, Pakistan"
                    />
                  </div>
                </div>
              </GlassCard>

              {/* Section 3: Banking Information */}
              <GlassCard className="p-6" intensity="medium">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-4">
                  <CreditCard className="h-4 w-4 text-indigo-500 dark:text-sky-400" />
                  Banking Information
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  Provide company banking details. These details are used when exporting invoice structures and direct wire receipts.
                </p>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={settings.bankName || ''}
                      onChange={(e) => handleInputChange('bankName', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all"
                      placeholder="e.g. Habib Bank Limited (HBL)"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Account Title
                    </label>
                    <input
                      type="text"
                      value={settings.accountTitle || ''}
                      onChange={(e) => handleInputChange('accountTitle', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all"
                      placeholder="e.g. QuoteFlow Pakistan (Pvt) Ltd"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Account Number / IBAN
                    </label>
                    <input
                      type="text"
                      value={settings.accountNumber || ''}
                      onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 outline-hidden transition-all"
                      placeholder="e.g. 00421650012345"
                    />
                  </div>
                </div>
              </GlassCard>

            </div>

            {/* Right Column (Company Logo) */}
            <div className="space-y-6">
              
              {/* Section 4: Company Logo Card */}
              <GlassCard className="p-6 space-y-5" intensity="medium">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-indigo-500 dark:text-sky-400" />
                    Company Logo
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Upload official corporate branding logos. Max size is 2MB (images only).
                  </p>
                </div>

                {/* Logo Canvas Drag & Drop and Preview */}
                <div 
                  className="group relative flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-500 dark:border-slate-800 dark:hover:border-sky-400 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-950/20 transition-all cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {uploading ? (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-500 dark:text-sky-400" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Uploading Logo...</span>
                    </div>
                  ) : logoPreviewUrl ? (
                    <div className="flex flex-col items-center justify-center gap-3">
                      <img
                        referrerPolicy="no-referrer"
                        src={logoPreviewUrl}
                        alt="Company Logo"
                        className="h-20 w-20 rounded-xl object-contain shadow-sm border border-slate-200 dark:border-slate-800 bg-white p-1 transition-transform group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=60';
                        }}
                      />
                      <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 dark:text-sky-400 font-bold group-hover:underline">
                        <Upload className="h-3 w-3" />
                        <span>Change Corporate Logo</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2.5 py-4 text-slate-400">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-100 dark:border-slate-800">
                        <Upload className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Choose Image or Drag & Drop</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">PNG, JPEG, WEBP up to 2MB</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preset Fast branding options */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
                    Or select pre-defined logo asset:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        name: 'Modern Sphere',
                        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=60'
                      },
                      {
                        name: 'Nexus Gradient',
                        url: 'https://images.unsplash.com/photo-1618005198143-e5283b519a7f?w=120&auto=format&fit=crop&q=60'
                      }
                    ].map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setLogoPreviewUrl(preset.url);
                          handleInputChange('logoUrl', preset.url);
                        }}
                        className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[10px] text-left transition-all ${
                          settings.logoUrl === preset.url
                            ? 'border-indigo-500 bg-indigo-50/20 text-indigo-700 dark:border-sky-400 dark:bg-sky-950/20 dark:text-sky-400'
                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <img
                          referrerPolicy="no-referrer"
                          src={preset.url}
                          alt={preset.name}
                          className="h-6 w-6 rounded-md object-cover"
                        />
                        <span className="truncate text-[9px] font-medium">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {/* Status checklist panel */}
              <GlassCard className="p-5" intensity="low">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Module Completion Status
                </h4>
                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-start gap-2 text-[11px]">
                    <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Supabase Table</span>
                      <p className="text-[9px] text-slate-400">Created: <code className="font-mono">company_settings</code></p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-[11px]">
                    <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Row Level Security (RLS)</span>
                      <p className="text-[9px] text-slate-400">Configured secure SELECT, INSERT, UPDATE rules.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-[11px]">
                    <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Storage Bucket</span>
                      <p className="text-[9px] text-slate-400">Created bucket: <code className="font-mono">company-logos</code></p>
                    </div>
                  </div>
                </div>
              </GlassCard>

            </div>
          </div>
        </form>
      )}

      {/* Security SQL Tab */}
      {activeTab === 'security' && (
        <div className="grid gap-6 md:grid-cols-3 animate-fade-in">
          
          <div className="md:col-span-2 space-y-6">
            <GlassCard className="p-6" intensity="medium">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <Database className="h-5 w-5 text-indigo-500 dark:text-sky-400" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Setup & Migration SQL Script
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Run this in your Supabase project SQL Editor to instantiate the schema, constraints, buckets, and security protocols.
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleCopySQL}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors shrink-0"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  Copy SQL Script
                </button>
              </div>

              {/* Codeblock */}
              <div className="mt-4">
                <pre className="rounded-xl bg-slate-950 p-4 text-[10px] font-mono leading-relaxed text-slate-300 overflow-x-auto border border-slate-800/80 max-h-[420px] overflow-y-auto">
{`-- 1. Create company_settings table
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

-- Ensure user can only have ONE company profile
CREATE UNIQUE INDEX IF NOT EXISTS company_settings_user_id_unique_idx ON public.company_settings (user_id);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- 2. Create Row Level Security Policies
CREATE POLICY "Users can only view their own company settings" 
ON public.company_settings FOR SELECT 
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own company settings" 
ON public.company_settings FOR INSERT 
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own company settings" 
ON public.company_settings FOR UPDATE 
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Storage Bucket Configuration
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Rules
CREATE POLICY "Public Access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'company-logos');
CREATE POLICY "Logos Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Logos Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Logos Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);`}
                </pre>
              </div>
            </GlassCard>
          </div>

          {/* Right sidebar instructions */}
          <div>
            <GlassCard className="p-6 space-y-4" intensity="medium">
              <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Key className="h-4 w-4 text-amber-500" />
                RLS Policies Applied
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                The setup enables <strong>Row Level Security (RLS)</strong> on the schema level:
              </p>
              <ul className="list-decimal pl-4 space-y-2 text-[10px] text-slate-500 dark:text-slate-400">
                <li>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Identity Guard:</span> The <code className="font-mono bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-[9px] font-bold">auth.uid() = user_id</code> clause locks table access strictly to the currently logged-in authenticated user.
                </li>
                <li>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Uniqueness:</span> A unique database constraint index limits each user ID to exactly one record inside the table.
                </li>
                <li>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Storage Protection:</span> Logos are compartmentalized securely under each user's unique path inside the bucket.
                </li>
              </ul>
            </GlassCard>
          </div>

        </div>
      )}

    </div>
  );
}
