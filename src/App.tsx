import React, { useEffect, useState } from 'react';
import { ThemeProvider } from './components/ThemeContext';
import { AuthPages } from './components/AuthPages';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardView } from './components/DashboardView';
import { CustomersView } from './components/CustomersView';
import { SettingsView } from './components/SettingsView';
import { authService } from './services/authService';
import { UserProfile } from './types/auth';
import { Sparkles, Loader2 } from 'lucide-react';

function AppContent() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  useEffect(() => {
    // Check Supabase connection
    setIsSupabaseConnected(authService.isConfigured());

    // Restore session on startup
    const checkSession = async () => {
      try {
        const session = await authService.getSession();
        if (session) {
          setUser(session.user);
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleAuthSuccess = (profile: UserProfile) => {
    setUser(profile);
    setCurrentView('dashboard');
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="relative flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-xl shadow-indigo-500/20">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <Loader2 className="mt-6 h-6 w-6 animate-spin text-indigo-600 dark:text-sky-400" />
          <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono tracking-wider uppercase">
            Loading QuoteFlow PK...
          </p>
        </div>
      </div>
    );
  }

  // Auth Guard
  if (!user) {
    return (
      <AuthPages
        onAuthSuccess={handleAuthSuccess}
        isSupabaseConfigured={isSupabaseConnected}
      />
    );
  }

  // Dashboard Area
  return (
    <DashboardLayout
      currentView={currentView}
      onNavigate={setCurrentView}
      user={user}
      onSignOut={handleSignOut}
      isSupabaseConnected={isSupabaseConnected}
    >
      {currentView === 'dashboard' && (
        <DashboardView
          user={user}
          isSupabaseConnected={isSupabaseConnected}
          onNavigate={setCurrentView}
        />
      )}
      {currentView === 'customers' && (
        <CustomersView
          isSupabaseConnected={isSupabaseConnected}
        />
      )}
      {currentView === 'settings' && (
        <SettingsView
          isSupabaseConnected={isSupabaseConnected}
        />
      )}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
