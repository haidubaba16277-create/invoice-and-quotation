import React, { useState } from 'react';
import { 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  ArrowRight, 
  CheckCircle2, 
  ShieldAlert, 
  HelpCircle,
  Eye,
  EyeOff,
  Database
} from 'lucide-react';
import { authService } from '../services/authService';
import { UserProfile } from '../types/auth';
import { QuoteFlowLogo } from './QuoteFlowLogo';

interface AuthPagesProps {
  onAuthSuccess: (user: UserProfile) => void;
  isSupabaseConfigured: boolean;
}

type AuthMode = 'login' | 'register' | 'forgot';

export function AuthPages({ onAuthSuccess, isSupabaseConfigured }: AuthPagesProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setCompanyName('');
    setError(null);
    setSuccessMessage(null);
  };

  const handleModeChange = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!email || !password || !fullName || !companyName) {
          throw new Error('Please fill in all fields to register.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        const user = await authService.signUp(email, password, fullName, companyName);
        setSuccessMessage('Account registered successfully! Welcome aboard.');
        setTimeout(() => {
          onAuthSuccess(user);
        }, 1200);

      } else if (mode === 'login') {
        if (!email || !password) {
          throw new Error('Please enter both your email and password.');
        }

        const session = await authService.signIn(email, password);
        setSuccessMessage('Logged in successfully!');
        setTimeout(() => {
          onAuthSuccess(session.user);
        }, 800);

      } else if (mode === 'forgot') {
        if (!email) {
          throw new Error('Please enter your email address.');
        }

        await authService.resetPassword(email);
        setSuccessMessage(
          isSupabaseConfigured 
            ? 'Password recovery email sent! Check your inbox for details.' 
            : 'Password recovery simulated! In a live Supabase environment, an email will be delivered to this address.'
        );
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoUser = () => {
    setEmail('demo@quoteflow.pk');
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 lg:flex-row">
      
      {/* Left Column: SaaS Promotion & Core Branding */}
      <div className="relative flex flex-col justify-between bg-slate-900 px-6 py-10 text-white lg:w-[45%] lg:px-12 lg:py-16 xl:w-[40%] overflow-hidden">
        {/* Decorative Grid & Blurred Orbs */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40" />
        <div className="absolute -top-40 -left-40 h-[350px] w-[350px] rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-[300px] w-[300px] rounded-full bg-emerald-600/20 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <QuoteFlowLogo size={46} className="bg-slate-950/20 p-1 rounded-2xl border border-slate-800/40" />
            <div>
              <span className="font-sans text-[22px] font-black tracking-tight text-white leading-none">QuoteFlow <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">PK</span></span>
              <p className="font-sans text-[9px] font-bold text-indigo-400 mt-1 leading-none tracking-tight uppercase">Quotes That Flow, Business That Grows</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 my-auto py-12 lg:py-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3.5 py-1 text-xs font-semibold text-sky-300 ring-1 ring-sky-500/20">
            Now Live in Pakistan 🇵🇰
          </span>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-3xl xl:text-4xl leading-tight">
            Generate polished, professional quotes in minutes.
          </h2>
          <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-md">
            Streamline your B2B sales workflow, handle local sales tax rates, catalog corporate items, and deliver PDF proposals that win clients effortlessly.
          </p>

          <div className="mt-10 space-y-5">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Elegant Glassmorphism Shell</h4>
                <p className="text-xs text-slate-400 mt-0.5">Crafted with high-fidelity, dual-mode theme support and adaptive layouts.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Secure Database Access</h4>
                <p className="text-xs text-slate-400 mt-0.5">All customer databases, item profiles, and setting control modules are securely encrypted.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-slate-800 pt-6 text-xs text-slate-400">
          <span>© 2026 QuoteFlow PK Inc.</span>
          <div className="flex gap-4">
            <span className="hover:text-white transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-white transition-colors cursor-pointer">Terms</span>
          </div>
        </div>
      </div>

      {/* Right Column: Dynamic Authentication Card */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Form Header */}
          <div className="text-center">
            <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {mode === 'login' && 'Sign in to your account'}
              {mode === 'register' && 'Create your QuoteFlow workspace'}
              {mode === 'forgot' && 'Reset your password'}
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {mode === 'login' && (
                <>
                  Or{' '}
                  <button 
                    onClick={() => handleModeChange('register')}
                    className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-sky-400 dark:hover:text-sky-300"
                  >
                    start your 14-day free trial
                  </button>
                </>
              )}
              {mode === 'register' && (
                <>
                  Already registered?{' '}
                  <button 
                    onClick={() => handleModeChange('login')}
                    className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-sky-400 dark:hover:text-sky-300"
                  >
                    Sign in to your workspace
                  </button>
                </>
              )}
              {mode === 'forgot' && (
                <>
                  Remembered your password?{' '}
                  <button 
                    onClick={() => handleModeChange('login')}
                    className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-sky-400 dark:hover:text-sky-300"
                  >
                    Return to login
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Database Configuration Warning/Info */}
          {!isSupabaseConfigured && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950/20 dark:bg-indigo-950/10">
              <div className="flex gap-3">
                <Sparkles className="h-5 w-5 text-indigo-500 dark:text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">QuoteFlow PK Demo Portal</h5>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400/95">
                    Experience the complete SaaS platform in Sandbox mode! Sign in with your email or use the one-click credential loader below to view.
                  </p>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={loadDemoUser}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-[10px] font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                    >
                      <Database className="h-3 w-3" />
                      One-Click Demo Login
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Core Auth Glass Card */}
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-8 shadow-xl backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/60">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Status Notifications */}
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 dark:border-rose-950/30 dark:bg-rose-950/20 dark:text-rose-400">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700 dark:border-emerald-950/30 dark:bg-emerald-950/20 dark:text-emerald-400">
                  {successMessage}
                </div>
              )}

              {/* Full Name & Company Name (SignUp Mode Only) */}
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Full Name
                    </label>
                    <div className="relative mt-1.5">
                      <User className="absolute top-3 left-3 h-4.5 w-4.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Hammad Qureshi"
                        className="h-10.5 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs font-medium outline-hidden ring-indigo-500/20 transition-all focus:border-indigo-500 focus:ring-4 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Company Name
                    </label>
                    <div className="relative mt-1.5">
                      <Building2 className="absolute top-3 left-3 h-4.5 w-4.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Qureshi Traders Ltd"
                        className="h-10.5 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs font-medium outline-hidden ring-indigo-500/20 transition-all focus:border-indigo-500 focus:ring-4 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email Address (All Modes) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Email Address
                </label>
                <div className="relative mt-1.5">
                  <Mail className="absolute top-3 left-3 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. you@example.com"
                    className="h-10.5 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs font-medium outline-hidden ring-indigo-500/20 transition-all focus:border-indigo-500 focus:ring-4 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Password (Login & SignUp Only) */}
              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => handleModeChange('forgot')}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-sky-400 dark:hover:text-sky-300"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative mt-1.5">
                    <Lock className="absolute top-3 left-3 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10.5 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-xs font-medium outline-hidden ring-indigo-500/20 transition-all focus:border-indigo-500 focus:ring-4 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 font-sans text-xs font-bold tracking-wider uppercase text-white shadow-lg shadow-indigo-500/20 outline-hidden transition-all hover:brightness-105 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>
                      {mode === 'login' && 'Sign In to Workspace'}
                      {mode === 'register' && 'Deploy QuoteFlow Workspace'}
                      {mode === 'forgot' && 'Send Recovery Instructions'}
                    </span>
                    <ArrowRight className="h-4.5 w-4.5" />
                  </>
                )}
              </button>
            </form>

            {/* Form Bottom Footer */}
            <div className="mt-6 text-center text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center justify-center gap-1.5 uppercase tracking-wider">
              <span>SYSTEM ONLINE</span>
              <span>•</span>
              <span>VERSION 1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
