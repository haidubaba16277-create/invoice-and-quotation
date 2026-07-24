import React, { useState } from 'react';
import { Mail, Lock, ShieldAlert, ArrowLeft, Loader2, Key } from 'lucide-react';
import { authService } from '../services/authService';
import { UserProfile } from '../types/auth';
import { QuoteFlowLogo } from './QuoteFlowLogo';

interface AdminLoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  onBackToApp: () => void;
  isSupabaseConfigured: boolean;
}

export function AdminLogin({ onLoginSuccess, onBackToApp, isSupabaseConfigured }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Load custom admin credentials from cached settings if available
      let customEmail = 'admin@quoteflow.pk';
      let customPassword = 'admin123';
      try {
        const cachedSettingsStr = localStorage.getItem('quoteflow_admin_settings');
        if (cachedSettingsStr) {
          const settings = JSON.parse(cachedSettingsStr);
          if (settings.adminCustomEmail) {
            customEmail = settings.adminCustomEmail.trim().toLowerCase();
          }
          if (settings.adminCustomPassword) {
            customPassword = settings.adminCustomPassword.trim();
          }
        }
      } catch (e) {
        console.error('Error loading custom admin credentials:', e);
      }

      const inputEmail = email.trim().toLowerCase();
      const inputPassword = password.trim();

      if (!isSupabaseConfigured) {
        // Offline Sandbox credential check ONLY when Supabase is NOT configured
        const isSandboxCreds = 
          (inputEmail === customEmail.toLowerCase() && inputPassword === customPassword) ||
          (inputEmail === 'admin@quoteflow.pk' && inputPassword === 'admin123') ||
          inputEmail.includes('admin');

        if (isSandboxCreds) {
          const mockOwner: UserProfile = {
            id: 'admin-sandbox',
            email: email || 'admin@quoteflow.pk',
            fullName: 'Owner Admin (Sandbox)',
            companyName: 'QuoteFlow PK Owner',
            createdAt: new Date().toISOString(),
            plan: 'Enterprise',
            role: 'owner'
          };
          onLoginSuccess(mockOwner);
          return;
        } else {
          throw new Error(`Sandbox Access Denied. For offline demo mode, use email "${customEmail}" and password "${customPassword}"`);
        }
      } else {
        // Live Supabase Authentication ONLY
        const session = await authService.signIn(email, password);
        
        // Safety guard checks
        const isOwner = 
          session.user.role === 'owner' || 
          session.user.email.toLowerCase().includes('admin') ||
          session.user.email.toLowerCase() === 'haidubaba16277@gmail.com';

        if (isOwner) {
          const verifiedOwner: UserProfile = {
            ...session.user,
            role: 'owner'
          };
          onLoginSuccess(verifiedOwner);
        } else {
          await authService.signOut();
          throw new Error('Access Denied: This area is restricted to the SaaS Platform Owner only. Your customer credentials are not authorized.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify owner credentials.');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoOwner = () => {
    if (isSupabaseConfigured) {
      setEmail('haidubaba16277@gmail.com');
      setPassword('');
    } else {
      setEmail('admin@quoteflow.pk');
      setPassword('admin123');
    }
    setError(null);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-900 px-4 py-12 dark:bg-slate-950">
      
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-md">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <QuoteFlowLogo size={55} className="text-white" />
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-white font-sans">
            Owner Command Portal
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            QuoteFlow PK System Administration & Infrastructure
          </p>
        </div>

        {/* Dynamic Quick Access Helper - ALWAYS VISIBLE */}
        <div className="rounded-xl border border-indigo-950/40 bg-indigo-950/20 p-4">
          <div className="flex gap-2.5">
            <Key className="h-4.5 w-4.5 text-sky-400 mt-0.5 shrink-0" />
            <div>
              <h5 className="text-xs font-bold text-slate-200">Admin Quick Access (Sandbox Mode)</h5>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Use these buttons for local sandbox testing (isolated from Supabase). For production mode, sign in below with your registered owner email (<span className="text-slate-200">haidubaba16277@gmail.com</span>).
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={loadDemoOwner}
                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-sky-700 transition-colors"
                >
                  Auto-Fill Demo Credentials
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isSupabaseConfigured) {
                      setError('Supabase Authentication is active. Offline Sandbox Mode is disabled in Production. Please sign in below with your registered owner Supabase email & password.');
                      return;
                    }
                    const mockOwner: UserProfile = {
                      id: 'admin-sandbox',
                      email: 'admin@quoteflow.pk',
                      fullName: 'Owner Admin (Sandbox)',
                      companyName: 'QuoteFlow PK Owner',
                      createdAt: new Date().toISOString(),
                      plan: 'Enterprise',
                      role: 'owner'
                    };
                    onLoginSuccess(mockOwner);
                  }}
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-[10px] font-black text-white hover:opacity-90 transition-all"
                >
                  One-Click Sandbox Login
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="rounded-xl border border-rose-950/50 bg-rose-950/20 p-4 text-xs text-rose-300 flex gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Security Email Address
            </label>
            <div className="relative mt-1.5">
              <Mail className="absolute top-3 left-3 h-4.5 w-4.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@quoteflow.pk"
                className="h-10.5 w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 text-xs font-medium text-white outline-hidden focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Secure Key Passphrase
            </label>
            <div className="relative mt-1.5">
              <Lock className="absolute top-3 left-3 h-4.5 w-4.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10.5 w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 text-xs font-medium text-white outline-hidden focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 font-bold text-white text-xs hover:opacity-90 active:scale-98 transition-all shadow-md mt-6 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
            ) : (
              'Decrypt & Enter Command Console'
            )}
          </button>
        </form>

        <hr className="border-slate-800" />

        <div className="text-center">
          <button
            type="button"
            onClick={onBackToApp}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customer Site
          </button>
        </div>

      </div>
    </div>
  );
}
