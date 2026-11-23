import React, {useState} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FolderLock,
  Layers,
  Lock,
  Mail,
  ShieldAlert,
  Sparkles,
  User,
  Wallet,
} from 'lucide-react';
import {useApp} from '../../context/AppContext';
import {getSupabaseStatus} from '../../lib/supabase';

export function AuthFlow() {
  const {
    user,
    authScreen,
    setAuthScreen,
    signUp,
    login,
    resetLocalPassword,
    enterSamplePreview,
    completeProfileSetup,
    logout,
  } = useApp();

  const supabaseStatus = getSupabaseStatus();

  // Form states
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleTitle, setRoleTitle] = useState(user?.roleTitle ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [currency, setCurrency] = useState(user?.currency ?? 'USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const resetMessages = () => {
    setError(null);
    setInfo(null);
  };

  const switchScreen = (screen: typeof authScreen) => {
    resetMessages();
    setAuthScreen(screen);
  };

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not sign in.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const res = await signUp(email, password, fullName);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not create account.');
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!validateEmail(email)) {
      setError('Please enter your registered email address.');
      return;
    }
    if (password.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const res = await resetLocalPassword(email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? 'Reset failed.');
    } else {
      setInfo('Password updated for your local account. You may now log in.');
      setPassword('');
    }
  };

  const handleProfileSetup = (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (fullName.trim().length < 2) {
      setError('Display name is required.');
      return;
    }
    completeProfileSetup({
      fullName: fullName.trim(),
      roleTitle: roleTitle.trim(),
      bio: bio.trim(),
      currency,
    });
  };

  // Profile Setup Screen (shown right after signup if incomplete)
  if (user && !user.profileCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#D6E6EE] via-[#BED6E2] to-[#84ACC0] dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4 pt-safe pb-safe">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-os-border-strong dark:border-slate-800 shadow-2xl overflow-hidden">
          <div className="bg-os-primary text-white px-6 py-5">
            <p className="text-xs font-medium text-[#A9C4D1]">OneSpace 2.0 · Step 2 of 2</p>
            <h1 className="text-xl font-display font-bold mt-1">Complete Your Profile</h1>
            <p className="text-xs text-[#C8DCE5] mt-1">
              Personalize your workspace preferences. Your data remains private to your account.
            </p>
          </div>
          <form onSubmit={handleProfileSetup} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ananya Sharma"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-os-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Role or Focus (optional)
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Student, Product Designer, Software Engineer"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-os-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Preferred Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-os-primary/30"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Personal Bio (optional)
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What are you focusing on right now?"
                className="w-full p-3 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-os-primary/30"
              />
            </div>
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={logout}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-os-border-strong dark:border-slate-700 text-xs font-semibold text-os-muted dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Switch Account
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                Enter OneSpace
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D6E6EE] via-[#BBD3DF] to-[#7CA3B7] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-3 sm:p-6 pt-safe pb-safe">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl border border-[#B7CED9] dark:border-slate-800 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        {/* Left Slate-Teal Brand Panel */}
        <div className="bg-os-primary text-white p-6 sm:p-9 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-display font-bold tracking-tight">OneSpace 2.0</h1>
                <p className="text-xs text-[#A7C2CF]">Your Life, One Space</p>
              </div>
            </div>

            <h2 className="mt-7 text-2xl sm:text-3xl font-display font-bold leading-tight text-balance">
              Organize your daily life and digital vault in one calm space.
            </h2>
            <p className="mt-3 text-sm text-[#C4DAE4] leading-relaxed max-w-md">
              Manage tasks, calendar events, daily habits, personal finances, milestone goals, and
              your nested My Space library from Android mobile or desktop.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-[#9EE2C4] mb-1.5" />
                <p className="font-semibold">Tasks & Habits</p>
                <p className="text-[#B8D0DC] mt-0.5">Priorities, streaks & charts</p>
              </div>
              <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                <CalendarDays className="w-4 h-4 text-[#B9CED9] mb-1.5" />
                <p className="font-semibold">Calendar & Goals</p>
                <p className="text-[#B8D0DC] mt-0.5">Deadlines & milestones</p>
              </div>
              <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                <Wallet className="w-4 h-4 text-[#F3D2B3] mb-1.5" />
                <p className="font-semibold">Personal Finance</p>
                <p className="text-[#B8D0DC] mt-0.5">Budgets & cashflow ledger</p>
              </div>
              <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                <FolderLock className="w-4 h-4 text-[#9EE2C4] mb-1.5" />
                <p className="font-semibold">My Space Library</p>
                <p className="text-[#B8D0DC] mt-0.5">Nested folders, files & notes</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/15 flex items-start gap-2.5 text-xs text-[#C4DAE4]">
            <ShieldAlert className="w-4 h-4 text-[#F3D2B3] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">{supabaseStatus.modeLabel}</p>
              <p className="mt-0.5 leading-relaxed">
                Supabase Auth & Cloud Storage are architected and ready, but not yet connected in
                this environment. Accounts created here are stored privately per user on this device.
              </p>
            </div>
          </div>
        </div>

        {/* Right Auth Interaction Panel */}
        <div className="p-6 sm:p-9 bg-os-surface-soft dark:bg-slate-900 flex flex-col justify-center">
          {authScreen === 'welcome' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-display font-bold text-os-ink dark:text-slate-100">
                  Welcome to OneSpace 2.0
                </h3>
                <p className="mt-1.5 text-sm text-[#537180] dark:text-slate-400">
                  Create your private personal account, log in to an existing local account, or
                  explore the sample workspace first.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => switchScreen('signup')}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-sm font-semibold flex items-center justify-between transition-colors"
                >
                  <span>Create New Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => switchScreen('login')}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-[#C3D7E2] dark:border-slate-700 hover:bg-os-surface-soft dark:hover:bg-slate-700 text-os-ink dark:text-slate-100 text-sm font-semibold flex items-center justify-between transition-colors"
                >
                  <span>Log In to Existing Account</span>
                  <Lock className="w-4 h-4 text-[#537180]" />
                </button>
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#D6E5ED] dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-os-surface-soft dark:bg-slate-900 text-os-muted">
                    Or preview layout first
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={enterSamplePreview}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#E7F3EE] dark:bg-emerald-950/40 border border-[#BDDFD0] dark:border-emerald-800 text-[#1F5441] dark:text-emerald-300 hover:bg-[#DAF0E6] text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Explore Sample Preview Workspace</span>
              </button>
              <p className="text-[11px] text-[#63808E] dark:text-slate-400 text-center leading-relaxed">
                Sample Preview uses isolated preview data so you can test every feature before
                starting your own empty personal account.
              </p>
            </div>
          )}

          {authScreen === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <button
                type="button"
                onClick={() => switchScreen('welcome')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-os-ink-secondary dark:text-sky-300 hover:underline min-h-[36px]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Welcome
              </button>
              <div>
                <h3 className="text-xl font-display font-bold text-os-ink dark:text-slate-100">
                  Sign in to OneSpace
                </h3>
                <p className="text-xs text-os-muted dark:text-slate-400 mt-1">
                  Access your private tasks, finances, goals, and My Space files.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-os-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full min-h-[44px] pl-10 pr-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-os-primary/30"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-os-primary dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchScreen('forgot')}
                    className="text-xs font-medium text-os-primary dark:text-sky-300 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-os-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full min-h-[44px] pl-10 pr-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-os-primary/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[46px] rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Log In'}
              </button>

              <p className="text-xs text-center text-os-muted dark:text-slate-400">
                New to OneSpace?{' '}
                <button
                  type="button"
                  onClick={() => switchScreen('signup')}
                  className="font-semibold text-os-primary dark:text-sky-300 hover:underline"
                >
                  Create an account
                </button>
              </p>
            </form>
          )}

          {authScreen === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <button
                type="button"
                onClick={() => switchScreen('welcome')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-os-ink-secondary dark:text-sky-300 hover:underline min-h-[36px]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Welcome
              </button>
              <div>
                <h3 className="text-xl font-display font-bold text-os-ink dark:text-slate-100">
                  Create your OneSpace account
                </h3>
                <p className="text-xs text-os-muted dark:text-slate-400 mt-1">
                  Starts with a clean, private workspace containing only your real data.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-os-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="w-full min-h-[44px] pl-10 pr-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-os-primary/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-os-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full min-h-[44px] pl-10 pr-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-os-primary/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-os-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-os-primary/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[46px] rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <p className="text-xs text-center text-os-muted dark:text-slate-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchScreen('login')}
                  className="font-semibold text-os-primary dark:text-sky-300 hover:underline"
                >
                  Log in
                </button>
              </p>
            </form>
          )}

          {authScreen === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <button
                type="button"
                onClick={() => switchScreen('login')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-os-ink-secondary dark:text-sky-300 hover:underline min-h-[36px]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Log In
              </button>
              <div>
                <h3 className="text-xl font-display font-bold text-os-ink dark:text-slate-100">
                  Reset Password
                </h3>
                <p className="text-xs text-os-muted dark:text-slate-400 mt-1 leading-relaxed">
                  {supabaseStatus.configured
                    ? 'Enter your email to request a Supabase password reset.'
                    : 'Supabase email delivery is not connected yet. You can update the password for an existing local account on this device below.'}
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}
              {info && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
                  {info}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                  Account Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-os-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-os-primary/30"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[46px] rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {loading ? 'Updating...' : 'Update Local Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
