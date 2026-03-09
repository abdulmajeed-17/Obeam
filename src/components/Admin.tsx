import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Shield } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type AdminTransfer = {
  id: string;
  businessName?: string;
  counterparty?: { name: string; country: string };
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  feeAmount: string;
  status: string;
  createdAt: string;
};

export function Admin() {
  const [secret, setSecret] = useState(() => import.meta.env.VITE_ADMIN_SECRET || '');
  const [secretInput, setSecretInput] = useState(secret);
  const [transfers, setTransfers] = useState<AdminTransfer[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchTransfers = useCallback(() => {
    if (!secret.trim()) {
      setTransfers([]);
      return;
    }
    setLoading(true);
    setError(null);
    const url = statusFilter
      ? `${API_BASE}/admin/transfers?status=${encodeURIComponent(statusFilter)}`
      : `${API_BASE}/admin/transfers`;
    fetch(url, {
      headers: { 'X-Admin-Secret': secret.trim() },
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error('Invalid admin secret.');
          throw new Error(res.statusText || 'Failed to load transfers.');
        }
        return res.json();
      })
      .then((data) => setTransfers(data.transfers || []))
      .catch((err) => {
        setError(err.message || 'Error loading transfers.');
        setTransfers([]);
      })
      .finally(() => setLoading(false));
  }, [secret, statusFilter]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const runAction = (transferId: string, action: 'mark-processing' | 'mark-settled' | 'mark-failed') => {
    if (!secret.trim()) return;
    setActionId(transferId);
    setError(null);
    fetch(`${API_BASE}/admin/transfers/${transferId}/${action}`, {
      method: 'POST',
      headers: { 'X-Admin-Secret': secret.trim() },
    })
      .then((res) => {
        if (!res.ok) return res.json().then((body) => { throw new Error(body.message || res.statusText); });
        return res.json();
      })
      .then(() => fetchTransfers())
      .catch((err) => setError(err.message || 'Action failed.'))
      .finally(() => setActionId(null));
  };

  const handleSetSecret = () => {
    setSecret(secretInput.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen font-sans text-gray-900 selection:bg-gold-500/30"
      style={{ backgroundColor: '#F5F1E9' }}
    >
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="inline-flex items-center gap-2 text-forest-900/80 hover:text-forest-900 text-sm font-medium mb-6"
        >
          <ArrowLeft size={18} />
          Back to home
        </a>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-forest-900/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-forest-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-forest-900">Admin</h1>
            <p className="text-sm text-forest-900/60">List and manage transfers</p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-5 mb-6">
          <label className="block text-sm font-medium text-forest-900 mb-2">Admin secret</label>
          <div className="flex gap-2 flex-wrap">
            <input
              type="password"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              placeholder="X-Admin-Secret"
              className="flex-1 min-w-[200px] min-h-[44px] rounded-xl border border-forest-900/20 px-4 py-2 text-forest-900 placeholder:text-forest-900/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <button
              type="button"
              onClick={handleSetSecret}
              className="min-h-[44px] px-4 rounded-xl bg-forest-900 text-white font-medium hover:bg-forest-800 transition-colors"
            >
              Use secret
            </button>
          </div>
        </div>

        {secret.trim() && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-h-[44px] rounded-xl border border-forest-900/20 bg-white pl-4 py-2 text-forest-900 font-medium focus:outline-none focus:ring-2 focus:ring-gold-500 select-chevron"
              >
                <option value="">All statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="PENDING_FUNDS">PENDING_FUNDS</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="SETTLED">SETTLED</option>
                <option value="FAILED">FAILED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
              <button
                type="button"
                onClick={() => fetchTransfers()}
                disabled={loading}
                className="min-h-[44px] px-4 rounded-xl border border-forest-900/20 text-forest-900 font-medium hover:bg-forest-900/5 flex items-center gap-2 disabled:opacity-60"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}

            <div className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-5 overflow-x-auto">
              <h2 className="text-lg font-semibold text-forest-900 mb-4">Transfers</h2>
              {loading ? (
                <p className="text-sm text-forest-900/60 py-4">Loading…</p>
              ) : transfers.length === 0 ? (
                <p className="text-sm text-forest-900/60 py-4">No transfers.</p>
              ) : (
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="text-left text-forest-900/60 border-b border-forest-900/10">
                      <th className="pb-2 pt-0.5 font-medium">Date</th>
                      <th className="pb-2 pt-0.5 font-medium">Business</th>
                      <th className="pb-2 pt-0.5 font-medium">To</th>
                      <th className="pb-2 pt-0.5 font-medium text-right">Amount</th>
                      <th className="pb-2 pt-0.5 font-medium">Status</th>
                      <th className="pb-2 pt-0.5 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((t) => (
                      <tr key={t.id} className="border-b border-forest-900/5 last:border-0">
                        <td className="py-2 text-forest-900/80">
                          {new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 text-forest-900/80">{t.businessName ?? '—'}</td>
                        <td className="py-2 text-forest-900/80">{t.counterparty?.name ?? '—'}</td>
                        <td className="py-2 text-right font-medium text-forest-900">
                          {t.fromCurrency} {(Number(t.fromAmount) / 100).toLocaleString()} → {t.toCurrency} {(Number(t.toAmount) / 100).toLocaleString()}
                        </td>
                        <td className="py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-forest-600/15 text-forest-800 text-xs font-medium">
                            {t.status}
                          </span>
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-1">
                            {t.status === 'PENDING_FUNDS' && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); runAction(t.id, 'mark-processing'); }}
                                disabled={actionId === t.id}
                                className="text-xs font-medium px-2 py-1 rounded bg-forest-900/10 text-forest-800 hover:bg-forest-900/20 disabled:opacity-60"
                              >
                                {actionId === t.id ? '…' : 'Processing'}
                              </button>
                            )}
                            {(t.status === 'PENDING_FUNDS' || t.status === 'PROCESSING') && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); runAction(t.id, 'mark-settled'); }}
                                disabled={actionId === t.id}
                                className="text-xs font-medium px-2 py-1 rounded bg-gold-500/20 text-gold-800 hover:bg-gold-500/30 disabled:opacity-60"
                              >
                                {actionId === t.id ? '…' : 'Settle'}
                              </button>
                            )}
                            {t.status !== 'SETTLED' && t.status !== 'CANCELLED' && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); runAction(t.id, 'mark-failed'); }}
                                disabled={actionId === t.id}
                                className="text-xs font-medium px-2 py-1 rounded bg-red-500/15 text-red-700 hover:bg-red-500/25 disabled:opacity-60"
                              >
                                {actionId === t.id ? '…' : 'Fail'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
