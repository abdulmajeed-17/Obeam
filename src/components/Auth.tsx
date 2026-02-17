import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lock, Mail, Smartphone } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type AuthMode = 'signup' | 'login';

function getInitialMode(): AuthMode {
  if (typeof window === 'undefined') return 'signup';
  return window.location.pathname === '/login' ? 'login' : 'signup';
}

export function Auth() {
  const [mode, setMode] = useState<AuthMode>(getInitialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const setModeAndPath = (m: AuthMode) => {
    setMode(m);
    setError(null);
    setSuccess(null);
    window.history.pushState({}, '', m === 'login' ? '/login' : '/signup');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email.trim() || !password || !businessName.trim()) {
      setError('Email, business name, and password are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, businessName: businessName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || 'Signup failed.');
        return;
      }
      if (data.access_token) {
        localStorage.setItem('obeam_token', data.access_token);
        window.history.pushState({}, '', '/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        setSuccess('Account created.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(`Network error: ${msg}. Is the backend running at ${API_BASE}?`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || 'Login failed.');
        return;
      }
      if (data.access_token) {
        localStorage.setItem('obeam_token', data.access_token);
        window.history.pushState({}, '', '/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        setSuccess('Logged in.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(`Network error: ${msg}. Is the backend running at ${API_BASE}?`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="h-screen bg-forest-950 flex flex-col overflow-hidden overflow-x-hidden"
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.5rem)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Subtle glow — Beam version of Revolut's ambient light */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-[80%] h-[60%] bg-forest-700/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-0 w-[50%] h-[50%] bg-gold-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-[40%] bg-forest-600/15 rounded-full blur-[80px]" />
      </div>

      {/* Header — compact */}
      <header className="relative z-10 flex shrink-0 items-center justify-between px-4 sm:px-6 lg:px-8 pt-3 pb-2 sm:pt-4 sm:pb-3">
        <a
          href="/"
          className="flex items-center gap-2 group text-cream-100 hover:text-white transition-colors"
        >
          <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/20 group-hover:shadow-gold-500/30 transition-shadow">
            <div className="w-3 h-5 bg-forest-950 rounded-full" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">beam</span>
        </a>
        {/* Back to home — hidden on mobile; swipe/back gesture handles navigation */}
        <a
          href="/"
          className="hidden sm:flex items-center gap-2 text-cream-200 hover:text-white text-sm font-semibold transition-colors"
        >
          <ArrowLeft size={18} />
          Back to home
        </a>
      </header>

      {/* Main content — single column on mobile/tablet; form + steps sidebar on desktop */}
      <main className="relative z-10 flex-1 flex min-h-0 items-center justify-center px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16">
          {/* Form card — mobile-like width on desktop too (max-w-sm ≈ 384px) */}
          <motion.div
            className="w-full max-w-sm shrink-0 relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Subtle radial pulse behind form */}
            <div className="absolute -inset-2 rounded-[1.5rem] bg-gold-500/[0.05] animate-pulse pointer-events-none" style={{ animationDuration: '4s' }} />
            <div className="relative bg-cream-50/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-5 sm:p-6 md:p-7">
              <AnimatePresence mode="wait">
                {mode === 'signup' ? (
                  <motion.form
                    key="signup"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 sm:space-y-5"
                    onSubmit={handleSignup}
                  >
                    <h1 className="text-xl sm:text-2xl font-extrabold text-forest-950 tracking-tight">
                      Create your account
                    </h1>
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                      Start paying Ghana suppliers in 24 hours. Transparent FX. Zero hidden fees.
                    </p>

                    {error && (
                      <p className="text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {error}
                      </p>
                    )}
                    {success && (
                      <p className="text-xs sm:text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        {success}
                      </p>
                    )}

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-forest-900 mb-1.5">
                        Business name
                      </label>
                      <input
                        type="text"
                        placeholder="Your company name"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full pl-3 pr-3 py-3 sm:py-3.5 rounded-lg bg-white border border-gray-200 text-forest-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-forest-900 mb-1.5">
                        Business email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-3 sm:py-3.5 rounded-lg bg-white border border-gray-200 text-forest-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-forest-900 mb-1.5">
                        Password <span className="text-gray-400 font-normal">(min 8)</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-3 sm:py-3.5 rounded-lg bg-white border border-gray-200 text-forest-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-forest-900 mb-1.5">
                        Phone <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          placeholder="+234 800 000 0000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-3 sm:py-3.5 rounded-lg bg-white border border-gray-200 text-forest-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl bg-forest-900 text-white font-bold text-sm text-center shadow-lg shadow-forest-900/25 hover:bg-forest-800 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating account...' : 'Continue'}
                    </button>

                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-xs text-gray-400">or</span>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 py-3 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium"
                        >
                          <span className="text-sm font-semibold text-gray-600">G</span>
                          Google
                        </button>
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 py-3 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium"
                        >
                          <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                          Work email
                        </button>
                      </div>
                    </div>

                    <p className="text-center text-xs text-gray-600 pt-1">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setModeAndPath('login')}
                        className="font-semibold text-gold-600 hover:text-gold-500 focus:outline-none focus:underline"
                      >
                        Log in
                      </button>
                    </p>
                  </motion.form>
                ) : (
                  <motion.form
                    key="login"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 sm:space-y-5"
                    onSubmit={handleLogin}
                  >
                    <h1 className="text-xl sm:text-2xl font-extrabold text-forest-950 tracking-tight">
                      Welcome back
                    </h1>
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                      Enter your email and password to sign in.
                    </p>

                    {error && (
                      <p className="text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {error}
                      </p>
                    )}
                    {success && (
                      <p className="text-xs sm:text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        {success}
                      </p>
                    )}

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-forest-900 mb-1.5">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-3 sm:py-3.5 rounded-lg bg-white border border-gray-200 text-forest-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-forest-900 mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-3 sm:py-3.5 rounded-lg bg-white border border-gray-200 text-forest-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl bg-forest-900 text-white font-bold text-sm text-center shadow-lg shadow-forest-900/25 hover:bg-forest-800 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Signing in...' : 'Continue'}
                    </button>

                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-xs text-gray-400">or</span>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 py-3 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium"
                        >
                          <span className="text-sm font-semibold text-gray-600">G</span>
                          Google
                        </button>
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 py-3 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium"
                        >
                          <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                          Work email
                        </button>
                      </div>
                    </div>

                    <p className="text-center text-xs text-gray-600 pt-1">
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setModeAndPath('signup')}
                        className="font-semibold text-gold-600 hover:text-gold-500 focus:outline-none focus:underline"
                      >
                        Create account
                      </button>
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Right: Three steps — desktop only */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden lg:flex flex-col items-center justify-center max-w-xs"
          >
            <h2 className="text-lg font-bold text-white mb-6 text-center">
              {mode === 'login' ? 'Secure login' : 'Three steps to your first payment'}
            </h2>
            <div className="relative flex flex-col gap-0">
              {[
                { step: 1, label: 'Create account', sub: 'Business email' },
                { step: 2, label: 'Verify business', sub: 'Quick compliance check' },
                { step: 3, label: 'Send first payment', sub: 'Ghana in 24 hours' },
              ].map(({ step, label, sub }, i) => (
                <div key={step} className="flex items-start gap-4">
                  <div className="flex flex-col items-center shrink-0">
                    <motion.div
                      className="w-10 h-10 rounded-full border-2 border-gold-500/50 bg-forest-900/80 flex items-center justify-center text-sm font-bold text-gold-400"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.15, duration: 0.35 }}
                    >
                      {step}
                    </motion.div>
                    {i < 2 && (
                      <div className="w-0.5 min-h-[48px] bg-gradient-to-b from-gold-500/40 to-gold-500/10 rounded-full mt-1" />
                    )}
                  </div>
                  <div className="pt-1.5 pb-6">
                    <p className="text-white font-semibold text-sm">{label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-xs text-center mt-4 leading-relaxed">
              {mode === 'login'
                ? 'Instant access to your dashboard and payment history.'
                : 'Regulated. No hidden fees. Built for B2B.'}
            </p>
          </motion.div>
        </div>
      </main>

      {/* Footer — compact */}
      <footer className="relative z-10 shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2 sm:py-3 border-t border-white/5">
        <button
          type="button"
          className="text-sm text-gray-500 hover:text-gray-400 focus:outline-none flex items-center gap-2"
        >
          English (Nigeria)
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <a
          href="#"
          className="text-sm text-gray-500 hover:text-gray-400 focus:outline-none"
          onClick={(e) => e.preventDefault()}
        >
          Privacy Policy
        </a>
      </footer>
    </motion.div>
  );
}
