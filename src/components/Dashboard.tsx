import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Wallet,
  LogOut,
  LayoutDashboard,
  CreditCard,
  Menu,
  X,
  PlusCircle,
  Send,
  ArrowRightLeft,
  Receipt,
  Shield,
  Zap,
  ChevronRight,
  Users,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type Business = { id: string; name: string; country: string; status: string };
type Wallet = { id: string; currency: string; label: string; balance: string };

type ActivityItem = {
  id: string;
  date: string;
  type: string;
  status: string;
  amount: string;
  currency: string;
  direction?: string;
  ref?: string;
};

type DashboardSection = 'overview' | 'wallets';

export function Dashboard() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<DashboardSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [topUpCurrency, setTopUpCurrency] = useState<'NGN' | 'GHS'>('NGN');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpMessage, setTopUpMessage] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const [fxRate, setFxRate] = useState<{ rate: string; asOf: string } | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('obeam_token');
    if (!token) {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [businessRes, walletsRes] = await Promise.all([
          fetch(`${API_BASE}/business/me`, { headers }),
          fetch(`${API_BASE}/wallets`, { headers }),
        ]);

        if (businessRes.status === 401 || walletsRes.status === 401) {
          localStorage.removeItem('obeam_token');
          window.history.pushState({}, '', '/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
          return;
        }

        if (!businessRes.ok) {
          setError('Could not load business.');
          return;
        }
        if (!walletsRes.ok) {
          setError('Could not load wallets.');
          return;
        }

        const businessData = await businessRes.json();
        const walletsData = await walletsRes.json();
        setBusiness(businessData);
        setWallets(walletsData.wallets || []);
      } catch {
        setError('Network error.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refetchKey]);

  // Live FX rate (1 GHS = ₦X) — poll every 30s once we have business
  useEffect(() => {
    if (!business) return;
    const token = localStorage.getItem('obeam_token');
    if (!token) return;
    const fetchFx = async () => {
      try {
        const res = await fetch(`${API_BASE}/fx/rate?base=GHS&quote=NGN`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setFxRate({ rate: String(data.rate ?? ''), asOf: data.asOf ?? new Date().toISOString() });
      } catch {
        setFxRate(null);
      }
    };
    fetchFx();
    const t = setInterval(fetchFx, 30_000);
    return () => clearInterval(t);
  }, [business?.id, refetchKey]);

  // Recent activity from ledger (NGN + GHS)
  useEffect(() => {
    if (!business) return;
    const token = localStorage.getItem('obeam_token');
    if (!token) return;
    setActivityLoading(true);
    Promise.all([
      fetch(`${API_BASE}/wallets/NGN/ledger?limit=10`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/wallets/GHS/ledger?limit=10`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([rNgn, rGhs]) => {
        const dataNgn = rNgn.ok ? await rNgn.json().catch(() => ({ items: [] })) : { items: [] };
        const dataGhs = rGhs.ok ? await rGhs.json().catch(() => ({ items: [] })) : { items: [] };
        const mapType = (t: string) => (t === 'WALLET_TOPUP' ? 'Top up' : t === 'FX_CONVERSION' ? 'FX' : t.startsWith('TRANSFER') ? 'Send' : t);
        const toItem = (p: { id: string; createdAt: string; direction: string; amount: string; entryType: string }, currency: string): ActivityItem & { _ts: number } => ({
          id: p.id,
          date: new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          type: mapType(p.entryType),
          status: 'Completed',
          amount: p.direction === 'CREDIT' ? `+${(Number(p.amount) / 100).toFixed(2)}` : `-${(Number(p.amount) / 100).toFixed(2)}`,
          currency,
          ref: p.id.slice(0, 8).toUpperCase(),
          _ts: new Date(p.createdAt).getTime(),
        });
        const combined: (ActivityItem & { _ts: number })[] = [
          ...(dataNgn.items || []).map((p: { id: string; createdAt: string; direction: string; amount: string; entryType?: string }) =>
            toItem({ ...p, entryType: p.entryType ?? 'WALLET_TOPUP' }, 'NGN'),
          ),
          ...(dataGhs.items || []).map((p: { id: string; createdAt: string; direction: string; amount: string; entryType?: string }) =>
            toItem({ ...p, entryType: p.entryType ?? 'WALLET_TOPUP' }, 'GHS'),
          ),
        ];
        const items: ActivityItem[] = combined
          .sort((a, b) => b._ts - a._ts)
          .slice(0, 15)
          .map(({ _ts, ...rest }) => rest);
        setActivity(items);
      })
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  }, [business?.id, refetchKey]);

  const refetchWallets = () => setRefetchKey((k) => k + 1);

  const fxUpdatedAgo = fxRate?.asOf
    ? (() => {
        const s = Math.floor((Date.now() - new Date(fxRate.asOf).getTime()) / 1000);
        if (s < 60) return `${s}s ago`;
        return `${Math.floor(s / 60)}m ago`;
      })()
    : null;

  const handleTopUp = async () => {
    const amountMajor = parseFloat(topUpAmount);
    if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
      setTopUpMessage('Enter a valid amount.');
      return;
    }
    const amountMinor = Math.round(amountMajor * 100);
    const token = localStorage.getItem('obeam_token');
    if (!token) return;
    setTopUpLoading(true);
    setTopUpMessage(null);
    try {
      const res = await fetch(`${API_BASE}/ledger/top-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currency: topUpCurrency, amount: String(amountMinor) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        setTopUpMessage(msg || 'Top-up failed.');
        return;
      }
      setTopUpAmount('');
      setTopUpMessage('Top-up successful.');
      refetchWallets();
    } catch {
      setTopUpMessage('Network error.');
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('obeam_token');
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const formatBalance = (balance: string, currency: string) => {
    const n = Number(balance);
    if (currency === 'NGN') return `₦ ${(n / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    if (currency === 'GHS') return `₵ ${(n / 100).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
    return balance;
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6"
        style={{ backgroundColor: '#F5F1E9' }}
      >
        {/* Animated O — same as logo (gold rounded square + cream beam) */}
        <motion.div
          className="w-16 h-16 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center shadow-xl shadow-gold-500/30"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: 1,
            scale: [1, 1.08, 1],
          }}
          transition={{
            opacity: { duration: 0.35 },
            scale: {
              duration: 1.3,
              repeat: Infinity,
              repeatType: 'reverse',
            },
          }}
        >
          <div className="w-4 h-6 rounded-full bg-cream-50" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-forest-900/70 text-sm font-semibold tracking-[0.2em] uppercase"
        >
          obeam
        </motion.p>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: '#F5F1E9' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cream-50 rounded-2xl border border-forest-900/10 shadow-lg p-6 max-w-md w-full text-center"
        >
          <p className="text-red-600 mb-4">{error || 'Not found.'}</p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 text-forest-900 font-semibold hover:text-forest-700"
          >
            <ArrowLeft size={18} />
            Back to login
          </a>
        </motion.div>
      </div>
    );
  }

  const navItems: { id: DashboardSection; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'wallets', label: 'Wallets', icon: <CreditCard size={20} /> },
  ];

  return (
    <motion.div
      className="min-h-screen flex"
      style={{ backgroundColor: '#F5F1E9' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      {/* ----- Sidebar (Paystack-style) ----- */}
      <>
        {/* Overlay on mobile when sidebar open */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-forest-900/30 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
          )}
        </AnimatePresence>

        <aside
          className={`
            fixed md:sticky top-0 left-0 z-50 h-screen w-64 flex-shrink-0
            flex flex-col
            border-r border-white/10
            transform transition-transform duration-200 ease-out md:transform-none
            isolate
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
          style={{
            backgroundColor: '#0A291B',
            boxShadow: '4px 0 24px rgba(10, 41, 27, 0.2)',
          }}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <a href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/25">
                <div className="w-2.5 h-4 bg-cream-50 rounded-full" />
              </div>
              <span className="text-lg font-extrabold text-white tracking-tight">Obeam</span>
            </a>
            <button
              type="button"
              aria-label="Close menu"
              className="md:hidden p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={22} />
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSection(item.id);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-medium transition-all duration-200 active:bg-white/10
                  ${section === item.id
                    ? 'bg-gold-500/30 text-cream-50 shadow-md shadow-black/10'
                    : 'text-white/80 hover:bg-white/5 hover:text-white/95'}
                `}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-white/10">
            <div className="px-3 py-2 text-xs text-white/60 truncate" title={business.name}>
              {business.name}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-medium text-white/70 hover:bg-white/5 hover:text-white/90 transition-colors active:bg-white/10"
            >
              <LogOut size={20} />
              Log out
            </button>
          </div>
        </aside>
      </>

      {/* ----- Main content ----- */}
      <div
        className="flex-1 flex flex-col min-w-0 relative"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(200, 149, 46, 0.06), transparent 60%), #F5F1E9',
        }}
      >
        {/* Top bar — safe-area for notched devices */}
        <header
          className="sticky top-0 z-30 flex items-center gap-4 px-4 py-3.5 border-b border-forest-900/8"
          style={{
            backgroundColor: 'rgba(255, 251, 245, 0.92)',
            backdropFilter: 'blur(12px)',
            paddingTop: 'max(0.875rem, env(safe-area-inset-top))',
          }}
        >
          <button
            type="button"
            aria-label="Open menu"
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-forest-900 hover:bg-forest-900/10 rounded-xl transition-colors active:bg-forest-900/15"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-forest-900 truncate tracking-tight">
              {section === 'overview' ? 'Overview' : 'Wallets'}
            </h1>
            <p className="text-sm text-forest-900/60 truncate mt-0.5">
              {business.name} · {business.country}
            </p>
          </div>
          {section === 'overview' && (
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-forest-600/20 text-forest-800 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-forest-600 animate-pulse" />
                Live
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-forest-900/10 text-forest-800 text-xs font-medium">
                <Shield size={12} />
                CBN compliant
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-forest-900/10 text-forest-800 text-xs font-medium">
                AML active
              </span>
            </div>
          )}
        </header>

        <main
          className="flex-1 p-4 md:p-6 lg:p-8"
          style={{
            paddingLeft: 'calc(1rem + env(safe-area-inset-left, 0px))',
            paddingRight: 'calc(1rem + env(safe-area-inset-right, 0px))',
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <AnimatePresence mode="wait">
            {section === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="max-w-5xl"
              >
                <p className="text-forest-900/70 mb-4 text-[15px]">
                  Balance → Action → Activity.
                </p>

                {/* Row 1: [ NGN ] [ GHS ] [ FX ] — 1 col mobile, 2 tablet, 3 desktop */}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-4">
                  {wallets.map((wallet) => (
                    <motion.div
                      key={wallet.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-5 hover:shadow-xl hover:shadow-forest-900/8 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-forest-900/70">{wallet.label}</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-forest-900/10 text-forest-700">
                          {wallet.currency === 'NGN' ? '₦ Naira' : '₵ Cedi'}
                        </span>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-forest-900/5 flex items-center justify-center mb-2">
                        <Wallet className="w-4 h-4 text-forest-700" />
                      </div>
                      <p className="text-2xl font-bold text-forest-900 tracking-tight">
                        {formatBalance(wallet.balance, wallet.currency)}
                      </p>
                      <p className="text-xs text-forest-900/50 mt-1 font-medium">Available balance</p>
                      <button
                        type="button"
                        onClick={() => setSection('wallets')}
                        className="mt-4 w-full min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold text-gold-600 hover:text-gold-700 transition-colors rounded-xl active:bg-forest-900/5"
                      >
                        View transactions
                        <ChevronRight size={14} />
                      </button>
                    </motion.div>
                  ))}
                  {/* Live FX widget — prominent, core product */}
                  <div className="bg-forest-900 rounded-2xl border border-forest-800 shadow-xl shadow-forest-900/20 p-4 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-gold-400/90 mb-2">
                      <Zap size={18} className="text-gold-400" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Live FX rate</span>
                    </div>
                    {fxRate?.rate ? (
                      <>
                        <p className="text-2xl font-bold text-white tracking-tight">
                          1 GHS = ₦{Number(fxRate.rate).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-white/70 mt-1.5">
                          Updated {fxUpdatedAgo}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-medium text-white/90">
                          Waiting for live FX feed…
                        </p>
                        <p className="text-xs text-white/60 mt-1">
                          Rate will appear when available
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {wallets.length === 0 && (
                  <div className="bg-white/80 rounded-2xl border border-forest-900/8 shadow-lg p-5 mb-4">
                    <p className="text-forest-900/70 text-sm">No wallets yet. Use Wallets to see balances after top-up.</p>
                  </div>
                )}

                {/* Row 2: [ Send ] [ Convert ] — 1 col mobile, 2 tablet+ */}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 mb-4">
                  <motion.div
                    className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-4 hover:shadow-xl transition-all cursor-pointer group"
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-forest-900/10 flex items-center justify-center group-hover:bg-forest-900/15 transition-colors">
                        <Send className="w-5 h-5 text-forest-700" />
                      </div>
                      <h3 className="font-semibold text-forest-900">Send NGN → GHS</h3>
                    </div>
                    <p className="text-sm text-forest-900/60 mb-3">Send cross-border to suppliers or partners.</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-forest-900/70">
                        <Users size={14} />
                        <span>Recent recipient</span>
                      </div>
                      <select className="w-full rounded-lg border border-forest-900/15 bg-white/80 pl-3 pr-9 py-2 text-sm text-forest-900/80 focus:outline-none focus:ring-2 focus:ring-gold-500 appearance-none bg-[length:12px_12px] bg-[right_0.5rem_center] bg-no-repeat [background-image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%230A291B%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')]">
                        <option>No saved beneficiaries</option>
                      </select>
                      <button type="button" className="min-h-[44px] flex items-center text-xs font-semibold text-gold-600 hover:text-gold-700 transition-colors active:text-gold-800">
                        + Saved beneficiary quick action
                      </button>
                    </div>
                  </motion.div>
                  <motion.div
                    className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-4 hover:shadow-xl transition-all cursor-pointer group"
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gold-500/15 flex items-center justify-center group-hover:bg-gold-500/25 transition-colors">
                        <ArrowRightLeft className="w-5 h-5 text-gold-600" />
                      </div>
                      <h3 className="font-semibold text-forest-900">Convert currency</h3>
                    </div>
                    <p className="text-sm text-forest-900/60">Convert between NGN and GHS at live rates.</p>
                  </motion.div>
                </div>

                {/* Row 3: [ Activity ] — last 5 only, one screen; table scrolls on small screens */}
                <div className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Receipt className="w-4 h-4 text-forest-700" />
                    <h2 className="text-base font-semibold text-forest-900">Activity</h2>
                  </div>
                  <div className="overflow-x-auto rounded-xl" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {activityLoading ? (
                      <p className="text-sm text-forest-900/60 py-3">Loading…</p>
                    ) : activity.length > 0 ? (
                      <table className="w-full text-sm min-w-[420px]">
                        <thead>
                          <tr className="text-left text-forest-900/60 border-b border-forest-900/10">
                            <th className="pb-2 pt-0.5 font-medium">Date</th>
                            <th className="pb-2 pt-0.5 font-medium">Type</th>
                            <th className="pb-2 pt-0.5 font-medium text-right">Amount</th>
                            <th className="pb-2 pt-0.5 font-medium">Status</th>
                            <th className="pb-2 pt-0.5 font-medium">Ref</th>
                            <th className="pb-2 pt-0.5 font-medium">Currency</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activity.slice(0, 5).map((item) => (
                            <tr key={item.id} className="border-b border-forest-900/5 last:border-0">
                              <td className="py-2 text-forest-900/80">{item.date}</td>
                              <td className="py-2 text-forest-900/80">{item.type}</td>
                              <td className="py-2 text-right font-medium text-forest-900">{item.amount}</td>
                              <td className="py-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-forest-600/15 text-forest-800 text-xs font-medium">
                                  {item.status}
                                </span>
                              </td>
                              <td className="py-2 font-mono text-xs text-forest-900/70">{item.ref ?? '—'}</td>
                              <td className="py-2 text-forest-900/70">{item.currency}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-forest-900/60 text-sm py-4 text-center">
                        No transactions yet. Fund your wallet to begin.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {section === 'wallets' && (
              <motion.div
                key="wallets"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="max-w-5xl"
              >
                <p className="text-forest-900/70 mb-6 text-[15px]">Balance, top-up, and activity. Money management lives here.</p>

                <div className="grid gap-4 sm:grid-cols-2 mb-6">
                  {wallets.map((wallet) => (
                    <motion.div
                      key={wallet.id}
                      className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-5 hover:shadow-xl hover:shadow-forest-900/8 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-forest-900">{wallet.label}</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-forest-900/10 text-forest-700">
                          {wallet.currency === 'NGN' ? '₦ Naira' : '₵ Cedi'}
                        </span>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-forest-900/5 flex items-center justify-center mb-2">
                        <Wallet className="w-4 h-4 text-forest-700" />
                      </div>
                      <p className="text-2xl font-bold text-forest-900 tracking-tight">
                        {formatBalance(wallet.balance, wallet.currency)}
                      </p>
                      <p className="text-xs text-forest-900/60 mt-1">Available balance</p>
                    </motion.div>
                  ))}
                </div>

                {wallets.length === 0 && (
                  <p className="text-forest-900/70 text-sm mb-6">No wallets yet.</p>
                )}

                <div className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-6 mb-8">
                  <h2 className="text-lg font-semibold text-forest-900 mb-4">Top up wallet</h2>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={topUpCurrency}
                      onChange={(e) => setTopUpCurrency(e.target.value as 'NGN' | 'GHS')}
                      className="min-h-[44px] rounded-xl border border-forest-900/20 bg-white pl-4 pr-10 py-3 text-forest-900 font-medium focus:outline-none focus:ring-2 focus:ring-gold-500 appearance-none bg-[length:14px_14px] bg-[right_0.75rem_center] bg-no-repeat [background-image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%230A291B%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')]"
                    >
                      <option value="NGN">NGN</option>
                      <option value="GHS">GHS</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Amount"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      className="min-h-[44px] rounded-xl border border-forest-900/20 bg-white px-4 py-3 text-forest-900 placeholder:text-forest-900/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                    <button
                      type="button"
                      onClick={handleTopUp}
                      disabled={topUpLoading}
                      className="min-h-[44px] bg-forest-900 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-forest-900/25 hover:shadow-xl hover:shadow-forest-900/30 hover:bg-forest-800 transition-all duration-200 disabled:opacity-60 active:bg-forest-800"
                    >
                      {topUpLoading ? 'Topping up…' : 'Top up'}
                    </button>
                  </div>
                  {topUpMessage && (
                    <p className={`mt-3 text-sm ${topUpMessage.includes('success') ? 'text-forest-700 font-medium' : 'text-red-600'}`}>
                      {topUpMessage}
                    </p>
                  )}
                </div>

                {/* Activity — same table, Wallets = money management view */}
                <div className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Receipt className="w-5 h-5 text-forest-700" />
                    <h2 className="text-lg font-semibold text-forest-900">Activity</h2>
                  </div>
                  <div
                    className="overflow-x-auto rounded-xl"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {activityLoading ? (
                      <p className="text-sm text-forest-900/60 py-4">Loading…</p>
                    ) : activity.length > 0 ? (
                      <table className="w-full text-sm min-w-[420px]">
                        <thead>
                          <tr className="text-left text-forest-900/60 border-b border-forest-900/10">
                            <th className="pb-3 font-medium">Date</th>
                            <th className="pb-3 font-medium">Type</th>
                            <th className="pb-3 font-medium text-right">Amount</th>
                            <th className="pb-3 font-medium">Status</th>
                            <th className="pb-3 font-medium">Ref</th>
                            <th className="pb-3 font-medium">Currency</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activity.map((item) => (
                            <tr key={item.id} className="border-b border-forest-900/5 last:border-0">
                              <td className="py-3 text-forest-900/80">{item.date}</td>
                              <td className="py-3 text-forest-900/80">{item.type}</td>
                              <td className="py-3 text-right font-medium text-forest-900">{item.amount}</td>
                              <td className="py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-forest-600/15 text-forest-800 text-xs font-medium">
                                  {item.status}
                                </span>
                              </td>
                              <td className="py-3 font-mono text-xs text-forest-900/70">{item.ref ?? '—'}</td>
                              <td className="py-3 text-forest-900/70">{item.currency}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-forest-900/60 text-sm py-6 text-center">
                        No wallet activity yet. Top up to see transactions here.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </motion.div>
  );
}
