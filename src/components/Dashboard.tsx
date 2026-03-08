import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Wallet,
  LogOut,
  LayoutDashboard,
  CreditCard,
  Menu,
  X,
  Send,
  ArrowRightLeft,
  Receipt,
  Zap,
  ChevronRight,
  Users,
  FileText,
  Shield,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { CURRENCIES, CURRENCY_CODES, COUNTRIES, formatBalance, getCurrencySymbol } from '../shared/currencies';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type Business = { id: string; name: string; country: string; status: string };
type WalletItem = { id: string; currency: string; label: string; balance: string };

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

type Counterparty = { id: string; name: string; country: string; payoutType: string; payoutRef: string };
type DashboardSection = 'overview' | 'wallets' | 'transfers' | 'invoices' | 'kyb';
type TransferItem = {
  id: string;
  counterpartyId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  feeAmount: string;
  status: string;
  createdAt: string;
  counterparty?: { name: string; country: string };
};

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR', SN: 'XOF', CI: 'XOF',
  ML: 'XOF', BF: 'XOF', NE: 'XOF', TG: 'XOF', BJ: 'XOF', US: 'USD', GB: 'GBP',
};

function getPrimaryCurrency(businessCountry: string): string {
  return COUNTRY_TO_CURRENCY[businessCountry] ?? 'NGN';
}

export function Dashboard() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<DashboardSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [topUpCurrency, setTopUpCurrency] = useState('');
  const [addCurrencyOpen, setAddCurrencyOpen] = useState(false);
  const [addCurrencyCode, setAddCurrencyCode] = useState('');
  const [addCurrencyLoading, setAddCurrencyLoading] = useState(false);
  const [addCurrencyError, setAddCurrencyError] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpMessage, setTopUpMessage] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const [fxRate, setFxRate] = useState<{ rate: string; asOf: string; base: string; quote: string } | null>(null);
  const [fxRefreshing, setFxRefreshing] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string>('');
  const [addBeneficiaryOpen, setAddBeneficiaryOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [newBeneficiaryName, setNewBeneficiaryName] = useState('');
  const [newBeneficiaryCountry, setNewBeneficiaryCountry] = useState('GH');
  const [newBeneficiaryPayoutType, setNewBeneficiaryPayoutType] = useState('BANK');
  const [newBeneficiaryPayoutRef, setNewBeneficiaryPayoutRef] = useState('');
  const [addBeneficiaryLoading, setAddBeneficiaryLoading] = useState(false);
  const [addBeneficiaryError, setAddBeneficiaryError] = useState<string | null>(null);
  const [sendAmount, setSendAmount] = useState('');
  const [sendQuote, setSendQuote] = useState<{ toAmount: string; rateUsed: string } | null>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendFromCurrency, setSendFromCurrency] = useState('NGN');
  const [sendToCurrency, setSendToCurrency] = useState('GHS');
  const [convertFrom, setConvertFrom] = useState('NGN');
  const [convertTo, setConvertTo] = useState('GHS');
  const [convertAmount, setConvertAmount] = useState('');
  const [convertQuote, setConvertQuote] = useState<{ toAmount: string; rateUsed: string } | null>(null);
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertCardFrom, setConvertCardFrom] = useState('NGN');
  const [convertCardTo, setConvertCardTo] = useState('GHS');
  const [convertCardAmount, setConvertCardAmount] = useState('');
  const [convertCardQuote, setConvertCardQuote] = useState<{ toAmount: string; rateUsed: string } | null>(null);
  const [convertCardLoading, setConvertCardLoading] = useState(false);
  const [transfersList, setTransfersList] = useState<TransferItem[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [transferDetail, setTransferDetail] = useState<TransferItem | null>(null);
  const [executeConvertLoading, setExecuteConvertLoading] = useState(false);
  const [executeConvertError, setExecuteConvertError] = useState<string | null>(null);
  const [cancelTransferLoading, setCancelTransferLoading] = useState(false);
  const [depositCurrency, setDepositCurrency] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMessage, setDepositMessage] = useState<string | null>(null);
  const [withdrawCurrency, setWithdrawCurrency] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBankCode, setWithdrawBankCode] = useState('');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('');
  const [withdrawAccountName, setWithdrawAccountName] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState<string | null>(null);
  const [withdrawBanks, setWithdrawBanks] = useState<{ name: string; code: string }[]>([]);
  const [withdrawBanksLoading, setWithdrawBanksLoading] = useState(false);

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
        const [businessRes, walletsRes, counterpartiesRes] = await Promise.all([
          fetch(`${API_BASE}/business/me`, { headers }),
          fetch(`${API_BASE}/wallets`, { headers }),
          fetch(`${API_BASE}/counterparties`, { headers }),
        ]);

        if (businessRes.status === 401 || walletsRes.status === 401 || counterpartiesRes.status === 401) {
          localStorage.removeItem('obeam_token');
          window.history.pushState({}, '', '/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
          return;
        }

        if (!businessRes.ok) { setError('Could not load business.'); return; }
        if (!walletsRes.ok) { setError('Could not load wallets.'); return; }

        const businessData = await businessRes.json();
        const walletsData = await walletsRes.json();
        const counterpartiesData = counterpartiesRes.ok ? await counterpartiesRes.json() : { counterparties: [] };
        setBusiness(businessData);
        setWallets(walletsData.wallets || []);
        setCounterparties(counterpartiesData.counterparties || []);

        const primary = getPrimaryCurrency(businessData.country);
        setSendFromCurrency(primary);
        setConvertFrom(primary);
        setConvertCardFrom(primary);
        setTopUpCurrency(primary);
        setDepositCurrency(primary);
        setWithdrawCurrency(primary);
        const defaultTo = primary === 'GHS' ? 'NGN' : 'GHS';
        setSendToCurrency(defaultTo);
        setConvertTo(defaultTo);
        setConvertCardTo(defaultTo);
      } catch {
        setError('Network error.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refetchKey]);

  // Live FX rate — dynamic based on sendFrom/sendTo
  const fetchFxRate = async () => {
    const token = localStorage.getItem('obeam_token');
    if (!token || !business) return;
    try {
      const res = await fetch(`${API_BASE}/fx/rate?base=${sendFromCurrency}&quote=${sendToCurrency}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setFxRate({ rate: String(data.rate ?? ''), asOf: data.asOf ?? new Date().toISOString(), base: sendFromCurrency, quote: sendToCurrency });
    } catch {
      setFxRate(null);
    }
  };

  useEffect(() => {
    if (!business) return;
    fetchFxRate();
    const t = setInterval(fetchFxRate, 30_000);
    return () => clearInterval(t);
  }, [business?.id, refetchKey, sendFromCurrency, sendToCurrency]);

  useEffect(() => {
    if (!business) return;
    const token = localStorage.getItem('obeam_token');
    if (!token) return;
    setActivityLoading(true);
    const currenciesToFetch = wallets.map((w) => w.currency);
    if (currenciesToFetch.length === 0) { setActivityLoading(false); return; }
    Promise.all(
      currenciesToFetch.map((cur) =>
        fetch(`${API_BASE}/wallets/${cur}/ledger?limit=10`, { headers: { Authorization: `Bearer ${token}` } })
          .then(async (r) => ({ currency: cur, data: r.ok ? await r.json().catch(() => ({ items: [] })) : { items: [] } }))
          .catch(() => ({ currency: cur, data: { items: [] } }))
      )
    )
      .then((results) => {
        const mapType = (t: string) => (t === 'WALLET_TOPUP' ? 'Top up' : t === 'FX_CONVERSION' ? 'Convert' : t.startsWith('TRANSFER') ? 'Send' : t);
        const toItem = (p: { id: string; createdAt: string; direction: string; amount: string; entryType: string }, currency: string): ActivityItem & { _ts: number } => ({
          id: p.id,
          date: new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          type: mapType(p.entryType),
          status: 'Completed',
          amount: p.direction === 'CREDIT' ? `+${(Number(p.amount) / 100).toFixed(2)}` : `-${(Number(p.amount) / 100).toFixed(2)}`,
          currency,
          direction: p.direction,
          ref: p.id.slice(0, 8).toUpperCase(),
          _ts: new Date(p.createdAt).getTime(),
        });
        const combined: (ActivityItem & { _ts: number })[] = results.flatMap(({ currency, data }) =>
          (data.items || []).map((p: { id: string; createdAt: string; direction: string; amount: string; entryType?: string }) =>
            toItem({ ...p, entryType: p.entryType ?? 'WALLET_TOPUP' }, currency)
          )
        );
        const items: ActivityItem[] = combined
          .sort((a, b) => b._ts - a._ts)
          .slice(0, 15)
          .map(({ _ts, ...rest }) => rest);
        setActivity(items);
      })
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  }, [business?.id, refetchKey, wallets.length]);

  useEffect(() => {
    if (section !== 'transfers' || !business) return;
    const token = localStorage.getItem('obeam_token');
    if (!token) return;
    setTransfersLoading(true);
    fetch(`${API_BASE}/transfers`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : { transfers: [] }))
      .then((data) => {
        setTransfersList(data.transfers || []);
        if (!selectedTransferId) setTransferDetail(null);
      })
      .catch(() => setTransfersList([]))
      .finally(() => setTransfersLoading(false));
  }, [section, refetchKey, business?.id]);

  useEffect(() => {
    if (!selectedTransferId) { setTransferDetail(null); return; }
    const token = localStorage.getItem('obeam_token');
    if (!token) return;
    fetch(`${API_BASE}/transfers/${selectedTransferId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then(setTransferDetail)
      .catch(() => setTransferDetail(null));
  }, [selectedTransferId]);

  const handleCancelTransfer = async () => {
    if (!selectedTransferId || !transferDetail) return;
    if (transferDetail.status !== 'DRAFT' && transferDetail.status !== 'PENDING_FUNDS') return;
    const token = localStorage.getItem('obeam_token');
    if (!token) return;
    setCancelTransferLoading(true);
    try {
      const res = await fetch(`${API_BASE}/transfers/${selectedTransferId}/cancel`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { await res.json().catch(() => ({})); return; }
      setSelectedTransferId(null);
      setTransferDetail(null);
      setRefetchKey((k) => k + 1);
    } finally {
      setCancelTransferLoading(false);
    }
  };

  const refetchWallets = () => setRefetchKey((k) => k + 1);

  const handleAddBeneficiary = async () => {
    const name = newBeneficiaryName.trim();
    const payoutRef = newBeneficiaryPayoutRef.trim();
    if (!name || !payoutRef) { setAddBeneficiaryError('Name and account/reference are required.'); return; }
    setAddBeneficiaryError(null);
    setAddBeneficiaryLoading(true);
    try {
      const token = localStorage.getItem('obeam_token');
      const res = await fetch(`${API_BASE}/counterparties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, country: newBeneficiaryCountry || 'GH', payoutType: newBeneficiaryPayoutType || 'BANK', payoutRef }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAddBeneficiaryError(err.message || 'Failed to add beneficiary.');
        return;
      }
      setAddBeneficiaryOpen(false);
      setNewBeneficiaryName('');
      setNewBeneficiaryPayoutRef('');
      setRefetchKey((k) => k + 1);
    } catch {
      setAddBeneficiaryError('Network error.');
    } finally {
      setAddBeneficiaryLoading(false);
    }
  };

  const handleSendGetQuote = async () => {
    const amountMajor = parseFloat(sendAmount);
    if (!Number.isFinite(amountMajor) || amountMajor <= 0) { setSendError('Enter a valid amount.'); return; }
    setSendError(null);
    setSendQuote(null);
    setSendLoading(true);
    try {
      const token = localStorage.getItem('obeam_token');
      const fromAmountMinor = BigInt(Math.round(amountMajor * 100));
      const res = await fetch(`${API_BASE}/fx/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fromCurrency: sendFromCurrency, toCurrency: sendToCurrency, fromAmount: fromAmountMinor.toString() }),
      });
      if (!res.ok) { setSendError('Could not get quote.'); return; }
      const data = await res.json();
      setSendQuote({ toAmount: data.toAmount, rateUsed: data.rateUsed });
    } catch {
      setSendError('Network error.');
    } finally {
      setSendLoading(false);
    }
  };

  const handleSendConfirm = async () => {
    if (!selectedCounterpartyId || !sendAmount || !sendQuote) return;
    const amountMajor = parseFloat(sendAmount);
    if (!Number.isFinite(amountMajor) || amountMajor <= 0) return;
    setSendError(null);
    setSendLoading(true);
    try {
      const token = localStorage.getItem('obeam_token');
      const fromAmountMinor = BigInt(Math.round(amountMajor * 100));
      const toAmountMinor = BigInt(sendQuote.toAmount);
      const createRes = await fetch(`${API_BASE}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          counterpartyId: selectedCounterpartyId,
          fromCurrency: sendFromCurrency, toCurrency: sendToCurrency,
          fromAmount: fromAmountMinor.toString(), toAmount: toAmountMinor.toString(),
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        setSendError(err.message || 'Failed to create transfer.');
        return;
      }
      const transfer = await createRes.json();
      const confirmRes = await fetch(`${API_BASE}/transfers/${transfer.id}/confirm`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (!confirmRes.ok) { setSendError('Transfer created but confirm failed.'); return; }
      setSendModalOpen(false);
      setSendAmount('');
      setSendQuote(null);
      setRefetchKey((k) => k + 1);
    } catch {
      setSendError('Network error.');
    } finally {
      setSendLoading(false);
    }
  };

  const handleConvertCardGetQuote = async () => {
    const amountMajor = parseFloat(convertCardAmount);
    if (!Number.isFinite(amountMajor) || amountMajor <= 0) { setConvertCardQuote(null); return; }
    setConvertCardQuote(null);
    setExecuteConvertError(null);
    setConvertCardLoading(true);
    try {
      const token = localStorage.getItem('obeam_token');
      const fromAmountMinor = BigInt(Math.round(amountMajor * 100));
      const res = await fetch(`${API_BASE}/fx/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fromCurrency: convertCardFrom, toCurrency: convertCardTo, fromAmount: fromAmountMinor.toString() }),
      });
      if (res.ok) {
        const data = await res.json();
        setConvertCardQuote({ toAmount: data.toAmount, rateUsed: data.rateUsed });
      }
    } catch {
      setConvertCardQuote(null);
    } finally {
      setConvertCardLoading(false);
    }
  };

  const handleConvertGetQuote = async () => {
    const amountMajor = parseFloat(convertAmount);
    if (!Number.isFinite(amountMajor) || amountMajor <= 0) { setConvertQuote(null); return; }
    setConvertQuote(null);
    setConvertLoading(true);
    try {
      const token = localStorage.getItem('obeam_token');
      const fromAmountMinor = BigInt(Math.round(amountMajor * 100));
      const res = await fetch(`${API_BASE}/fx/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fromCurrency: convertFrom, toCurrency: convertTo, fromAmount: fromAmountMinor.toString() }),
      });
      if (res.ok) {
        const data = await res.json();
        setConvertQuote({ toAmount: data.toAmount, rateUsed: data.rateUsed });
      }
    } catch {
      setConvertQuote(null);
    } finally {
      setConvertLoading(false);
    }
  };

  const handleExecuteConvert = async () => {
    const amountMajor = parseFloat(convertCardAmount);
    if (!Number.isFinite(amountMajor) || amountMajor <= 0 || !convertCardQuote) return;
    setExecuteConvertError(null);
    setExecuteConvertLoading(true);
    try {
      const token = localStorage.getItem('obeam_token');
      if (!token) { setExecuteConvertError('Please log in again.'); return; }
      const fromAmountMinor = BigInt(Math.round(amountMajor * 100));
      const res = await fetch(`${API_BASE}/ledger/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fromCurrency: convertCardFrom, toCurrency: convertCardTo, fromAmount: fromAmountMinor.toString() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = Array.isArray(err.message) ? err.message.join(' ') : (err.message || 'Convert failed.');
        setExecuteConvertError(msg);
        return;
      }
      setConvertCardQuote(null);
      setConvertCardAmount('');
      setRefetchKey((k) => k + 1);
    } catch {
      setExecuteConvertError('Network error.');
    } finally {
      setExecuteConvertLoading(false);
    }
  };

  const fxUpdatedAgo = fxRate?.asOf
    ? (() => {
        const s = Math.floor((Date.now() - new Date(fxRate.asOf).getTime()) / 1000);
        if (s < 60) return `${s}s ago`;
        return `${Math.floor(s / 60)}m ago`;
      })()
    : null;

  const handleTopUp = async () => {
    const amountMajor = parseFloat(topUpAmount);
    if (!Number.isFinite(amountMajor) || amountMajor <= 0) { setTopUpMessage('Enter a valid amount.'); return; }
    const amountMinor = Math.round(amountMajor * 100);
    const token = localStorage.getItem('obeam_token');
    if (!token) return;
    setTopUpLoading(true);
    setTopUpMessage(null);
    try {
      const res = await fetch(`${API_BASE}/ledger/top-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

  const handleDeposit = async () => {
    const amountMajor = parseFloat(depositAmount);
    if (!Number.isFinite(amountMajor) || amountMajor <= 0) { setDepositMessage('Enter a valid amount.'); return; }
    const token = localStorage.getItem('obeam_token');
    if (!token) return;
    setDepositLoading(true);
    setDepositMessage(null);
    try {
      const res = await fetch(`${API_BASE}/paystack/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: amountMajor, currency: depositCurrency }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        setDepositMessage(msg || 'Could not start deposit.');
        return;
      }
      window.open(data.authorization_url, '_blank');
      setDepositMessage('Payment page opened. Complete payment and your wallet will be credited automatically.');
      setDepositAmount('');
    } catch {
      setDepositMessage('Network error.');
    } finally {
      setDepositLoading(false);
    }
  };

  const fetchBanks = async (currency: string) => {
    const token = localStorage.getItem('obeam_token');
    if (!token) return;
    setWithdrawBanksLoading(true);
    try {
      const res = await fetch(`${API_BASE}/paystack/banks?currency=${currency}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.banks) setWithdrawBanks(data.banks);
    } catch { /* ignore */ }
    setWithdrawBanksLoading(false);
  };

  const handleWithdraw = async () => {
    const amountMajor = parseFloat(withdrawAmount);
    if (!Number.isFinite(amountMajor) || amountMajor <= 0) { setWithdrawMessage('Enter a valid amount.'); return; }
    if (!withdrawBankCode || !withdrawAccountNumber || !withdrawAccountName) {
      setWithdrawMessage('Fill in all bank details.'); return;
    }
    const token = localStorage.getItem('obeam_token');
    if (!token) return;
    setWithdrawLoading(true);
    setWithdrawMessage(null);
    try {
      const res = await fetch(`${API_BASE}/paystack/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: amountMajor,
          currency: withdrawCurrency,
          bankCode: withdrawBankCode,
          accountNumber: withdrawAccountNumber,
          accountName: withdrawAccountName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        setWithdrawMessage(msg || 'Withdrawal failed.');
        return;
      }
      setWithdrawMessage(`Withdrawal of ${data.amount} ${data.currency} sent to ${data.recipientName}.`);
      setWithdrawAmount('');
      setWithdrawAccountNumber('');
      setWithdrawAccountName('');
      refetchWallets();
    } catch {
      setWithdrawMessage('Network error.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleAddCurrency = async () => {
    if (!addCurrencyCode) return;
    const token = localStorage.getItem('obeam_token');
    if (!token) return;
    setAddCurrencyLoading(true);
    setAddCurrencyError(null);
    try {
      const res = await fetch(`${API_BASE}/wallets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currency: addCurrencyCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAddCurrencyError(data.message || 'Failed to add currency.');
        return;
      }
      setAddCurrencyOpen(false);
      setAddCurrencyCode('');
      refetchWallets();
    } catch {
      setAddCurrencyError('Network error.');
    } finally {
      setAddCurrencyLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('obeam_token');
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const fmtBal = (balance: string, currency: string) => formatBalance(balance, currency);

  const existingCurrencies = wallets.map((w) => w.currency);
  const availableCurrencies = CURRENCY_CODES.filter((c) => !existingCurrencies.includes(c));

  // Derived: primary wallet + others
  const primaryCurrency = business ? getPrimaryCurrency(business.country) : 'NGN';
  const primaryWallet = wallets.find((w) => w.currency === primaryCurrency) ?? wallets[0];
  const otherWallets = wallets.filter((w) => w.id !== primaryWallet?.id);


  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ backgroundColor: '#F5F1E9' }}>
        <motion.div
          className="w-16 h-16 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center shadow-xl shadow-gold-500/30"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: [1, 1.08, 1] }}
          transition={{ opacity: { duration: 0.35 }, scale: { duration: 1.3, repeat: Infinity, repeatType: 'reverse' } }}
        >
          <div className="w-4 h-6 rounded-full bg-cream-50" />
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="text-forest-900/70 text-sm font-semibold tracking-[0.2em] uppercase">
          obeam
        </motion.p>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F5F1E9' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-cream-50 rounded-2xl border border-forest-900/10 shadow-lg p-6 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">{error || 'Not found.'}</p>
          <a href="/login" className="inline-flex items-center gap-2 text-forest-900 font-semibold hover:text-forest-700">
            <ArrowLeft size={18} /> Back to login
          </a>
        </motion.div>
      </div>
    );
  }

  const navItems: { id: DashboardSection; label: string; icon: JSX.Element }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'wallets', label: 'Wallets', icon: <CreditCard size={20} /> },
    { id: 'transfers', label: 'Transfers', icon: <Send size={20} /> },
    { id: 'invoices', label: 'Invoices', icon: <FileText size={20} /> },
    { id: 'kyb', label: 'Verification', icon: <Shield size={20} /> },
  ];

  return (
    <motion.div className="h-screen flex overflow-hidden" style={{ backgroundColor: '#F5F1E9' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      {/* Sidebar */}
      <>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-forest-900/30 md:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />
          )}
        </AnimatePresence>

        <aside
          className={`fixed md:relative top-0 left-0 z-50 h-screen w-64 flex-shrink-0 flex flex-col border-r border-white/10 transform transition-transform duration-200 ease-out md:transform-none isolate ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
          style={{ backgroundColor: '#0A291B', boxShadow: '4px 0 24px rgba(10, 41, 27, 0.2)' }}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <a href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/25">
                <div className="w-2.5 h-4 bg-cream-50 rounded-full" />
              </div>
              <span className="text-lg font-extrabold text-white tracking-tight">Obeam</span>
            </a>
            <button type="button" aria-label="Close menu" className="md:hidden p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setSidebarOpen(false)}>
              <X size={22} />
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { setSection(item.id); setSidebarOpen(false); }}
                className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-medium transition-all duration-200 active:bg-white/10 ${section === item.id ? 'bg-gold-500/30 text-cream-50 shadow-md shadow-black/10' : 'text-white/80 hover:bg-white/5 hover:text-white/95'}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-white/10">
            <div className="px-3 py-2 text-xs text-white/60 truncate" title={business.name}>{business.name}</div>
            <button type="button" onClick={handleLogout} className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-medium text-white/70 hover:bg-white/5 hover:text-white/90 transition-colors active:bg-white/10">
              <LogOut size={20} /> Log out
            </button>
          </div>
        </aside>
      </>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-y-auto" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(200, 149, 46, 0.06), transparent 60%), #F5F1E9' }}>
        <header
          className="sticky top-0 z-30 flex items-center gap-4 px-4 py-3.5 border-b border-forest-900/8"
          style={{ backgroundColor: 'rgba(255, 251, 245, 0.92)', backdropFilter: 'blur(12px)', paddingTop: 'max(0.875rem, env(safe-area-inset-top))' }}
        >
          <button type="button" aria-label="Open menu" className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-forest-900 hover:bg-forest-900/10 rounded-xl transition-colors active:bg-forest-900/15" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-forest-900 truncate tracking-tight">
              {{ overview: 'Overview', wallets: 'Wallets', transfers: 'Transfers', invoices: 'Invoices', kyb: 'Verification' }[section]}
            </h1>
            <p className="text-sm text-forest-900/60 truncate mt-0.5">{business.name} · {business.country}</p>
          </div>
          {section === 'wallets' && availableCurrencies.length > 0 && (
            <button
              type="button"
              onClick={() => { setAddCurrencyOpen(!addCurrencyOpen); setAddCurrencyCode(availableCurrencies[0]); setAddCurrencyError(null); }}
              className="min-h-[40px] flex items-center gap-1 px-3 sm:px-4 py-2 rounded-xl bg-forest-900 text-white text-xs sm:text-sm font-semibold hover:bg-forest-800 shadow-md transition-all active:bg-forest-800 shrink-0"
            >
              <span className="text-base leading-none">+</span> Add wallet
            </button>
          )}
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8" style={{ paddingLeft: 'calc(1rem + env(safe-area-inset-left, 0px))', paddingRight: 'calc(1rem + env(safe-area-inset-right, 0px))', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <AnimatePresence mode="wait">
            {section === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="max-w-5xl">
                <p className="text-forest-900/70 mb-4 text-sm sm:text-[15px]">At a glance: balances, live rate, and actions.</p>

                {/* Row 1: Primary wallet + FX widget */}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 mb-3 items-start">
                  {/* Primary wallet — large */}
                  {primaryWallet && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-5 hover:shadow-xl hover:shadow-forest-900/8 transition-all duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-forest-900/70">Primary wallet</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-forest-900/10 text-forest-700">
                          {getCurrencySymbol(primaryWallet.currency)} {CURRENCIES[primaryWallet.currency]?.name ?? primaryWallet.currency}
                        </span>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-forest-900/5 flex items-center justify-center mb-2">
                        <Wallet className="w-4 h-4 text-forest-700" />
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-forest-900 tracking-tight break-words">{fmtBal(primaryWallet.balance, primaryWallet.currency)}</p>
                      <p className="text-xs text-forest-900/50 mt-1 font-medium">Available balance</p>
                      <button type="button" onClick={() => setSection('wallets')} className="mt-4 w-full min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold text-gold-600 hover:text-gold-700 transition-colors rounded-xl active:bg-forest-900/5">
                        Manage wallets <ChevronRight size={14} />
                      </button>
                    </motion.div>
                  )}

                  {/* Live FX widget — dynamic */}
                  <div className="bg-forest-900 rounded-2xl border border-forest-800 shadow-xl shadow-forest-900/20 p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-gold-400/90">
                        <Zap size={18} className="text-gold-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Live FX rate</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => { setFxRefreshing(true); await fetchFxRate(); setFxRefreshing(false); }}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        title="Refresh rate"
                      >
                        <RefreshCw size={14} className={`text-white/60 ${fxRefreshing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    {fxRate?.rate ? (
                      <>
                        <p className="text-xl sm:text-2xl font-bold text-white tracking-tight break-words">
                          1 {fxRate.base} = {getCurrencySymbol(fxRate.quote)} {Number(fxRate.rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </p>
                        <p className="text-[11px] sm:text-xs text-white/70 mt-1.5 truncate">
                          {CURRENCIES[fxRate.base]?.name} → {CURRENCIES[fxRate.quote]?.name} · {fxUpdatedAgo}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-medium text-white/90">Fetching rate…</p>
                        <p className="text-xs text-white/60 mt-1">Rate will appear shortly</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Other wallets — compact strip */}
                {otherWallets.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {otherWallets.map((w) => (
                      <div key={w.id} className="flex items-center gap-2 bg-white/80 rounded-xl border border-forest-900/8 px-3 py-2 text-sm">
                        <span className="text-forest-900/50 text-xs">{CURRENCIES[w.currency]?.flag}</span>
                        <span className="font-medium text-forest-900">{fmtBal(w.balance, w.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {wallets.length === 0 && (
                  <div className="bg-white/90 rounded-2xl border border-gold-500/30 shadow-lg p-6 mb-4 text-center">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gold-500/10 flex items-center justify-center">
                      <Wallet className="w-7 h-7 text-gold-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-forest-900 mb-1">Create your first wallet</h3>
                    <p className="text-forest-900/60 text-sm mb-4">Pick a currency to get started — you can add more later.</p>
                    <button
                      type="button"
                      onClick={() => { setSection('wallets'); setTimeout(() => { setAddCurrencyOpen(true); setAddCurrencyCode(availableCurrencies[0] || 'NGN'); setAddCurrencyError(null); }, 100); }}
                      className="min-h-[44px] inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-forest-900 text-white text-sm font-semibold hover:bg-forest-800 shadow-lg shadow-forest-900/20 transition-all active:bg-forest-800"
                    >
                      <span className="text-lg leading-none">+</span> Add wallet
                    </button>
                  </div>
                )}

                {wallets.length > 0 && wallets.length < 3 && availableCurrencies.length > 0 && (
                  <div className="bg-white/80 rounded-2xl border border-forest-900/8 shadow-sm p-4 mb-4 flex items-center justify-between gap-3">
                    <p className="text-forest-900/70 text-sm">Need another currency? Add a wallet to send or receive in more currencies.</p>
                    <button
                      type="button"
                      onClick={() => { setSection('wallets'); setTimeout(() => { setAddCurrencyOpen(true); setAddCurrencyCode(availableCurrencies[0]); setAddCurrencyError(null); }, 100); }}
                      className="min-h-[40px] flex items-center gap-1 px-4 py-2 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800 transition-all active:bg-forest-800 shrink-0 whitespace-nowrap"
                    >
                      + Add wallet
                    </button>
                  </div>
                )}

                {/* Row 2: Send + Convert */}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 mb-4 items-start">
                  {/* Send card */}
                  <motion.div className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-4 hover:shadow-xl transition-all group" whileHover={{ y: -2 }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-forest-900/10 flex items-center justify-center group-hover:bg-forest-900/15 transition-colors">
                        <Send className="w-5 h-5 text-forest-700" />
                      </div>
                      <h3 className="font-semibold text-forest-900">Send cross-border</h3>
                    </div>
                    <p className="text-sm text-forest-900/60 mb-3">Send to suppliers or partners across Africa.</p>
                    <div className="flex gap-2 mb-2">
                      <select value={sendFromCurrency} onChange={(e) => { setSendFromCurrency(e.target.value); if (e.target.value === sendToCurrency) setSendToCurrency(CURRENCY_CODES.find((c) => c !== e.target.value) || 'GHS'); }} className="flex-1 min-h-[36px] rounded-lg border border-forest-900/15 bg-white/80 px-2 py-1 text-xs text-forest-900 focus:outline-none focus:ring-2 focus:ring-gold-500">
                        {existingCurrencies.map((c) => <option key={c} value={c}>{CURRENCIES[c]?.flag} {c}</option>)}
                      </select>
                      <span className="flex items-center text-forest-900/40 text-xs">→</span>
                      <select value={sendToCurrency} onChange={(e) => { setSendToCurrency(e.target.value); if (e.target.value === sendFromCurrency) setSendFromCurrency(existingCurrencies.find((c) => c !== e.target.value) || 'NGN'); }} className="flex-1 min-h-[36px] rounded-lg border border-forest-900/15 bg-white/80 px-2 py-1 text-xs text-forest-900 focus:outline-none focus:ring-2 focus:ring-gold-500">
                        {existingCurrencies.map((c) => <option key={c} value={c}>{CURRENCIES[c]?.flag} {c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-forest-900/70">
                        <Users size={14} />
                        <span>Recipient</span>
                      </div>
                      <select value={selectedCounterpartyId} onChange={(e) => setSelectedCounterpartyId(e.target.value)} className="w-full min-h-[44px] rounded-lg border border-forest-900/15 bg-white/80 pl-3 pr-9 py-2 text-sm text-forest-900/80 focus:outline-none focus:ring-2 focus:ring-gold-500 appearance-none bg-[length:12px_12px] bg-[right_0.5rem_center] bg-no-repeat [background-image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%230A291B%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')]">
                        <option value="">{counterparties.length === 0 ? 'No saved beneficiaries' : 'Select recipient'}</option>
                        {counterparties.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.country}</option>)}
                      </select>
                      <button type="button" onClick={() => setAddBeneficiaryOpen(true)} className="min-h-[44px] flex items-center text-xs font-semibold text-gold-600 hover:text-gold-700 transition-colors active:text-gold-800">+ Add beneficiary</button>
                      <button
                        type="button"
                        onClick={() => { setSendModalOpen(true); setSendQuote(null); setSendAmount(''); setSendError(null); }}
                        disabled={!selectedCounterpartyId}
                        className="mt-2 w-full min-h-[44px] rounded-xl bg-forest-900 text-white font-semibold text-sm hover:bg-forest-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Send {sendFromCurrency} → {sendToCurrency}
                      </button>
                    </div>
                  </motion.div>

                  {/* Convert card — dynamic currencies */}
                  <motion.div className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-4 hover:shadow-xl transition-all group" whileHover={{ y: -2 }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gold-500/15 flex items-center justify-center group-hover:bg-gold-500/25 transition-colors">
                        <ArrowRightLeft className="w-5 h-5 text-gold-600" />
                      </div>
                      <h3 className="font-semibold text-forest-900">Convert currency</h3>
                    </div>
                    <p className="text-sm text-forest-900/60 mb-3">Convert between wallets at live rates.</p>
                    <div className="flex gap-2 mb-3">
                      <select value={convertCardFrom} onChange={(e) => { setConvertCardFrom(e.target.value); if (e.target.value === convertCardTo) setConvertCardTo(CURRENCY_CODES.find((c) => c !== e.target.value) || 'GHS'); setConvertCardQuote(null); }} className="flex-1 min-h-[36px] rounded-lg border border-forest-900/15 bg-white/80 px-2 py-1 text-xs text-forest-900 focus:outline-none focus:ring-2 focus:ring-gold-500">
                        {existingCurrencies.map((c) => <option key={c} value={c}>{CURRENCIES[c]?.flag} {c}</option>)}
                      </select>
                      <span className="flex items-center text-forest-900/40 text-xs">→</span>
                      <select value={convertCardTo} onChange={(e) => { setConvertCardTo(e.target.value); if (e.target.value === convertCardFrom) setConvertCardFrom(existingCurrencies.find((c) => c !== e.target.value) || 'NGN'); setConvertCardQuote(null); }} className="flex-1 min-h-[36px] rounded-lg border border-forest-900/15 bg-white/80 px-2 py-1 text-xs text-forest-900 focus:outline-none focus:ring-2 focus:ring-gold-500">
                        {existingCurrencies.map((c) => <option key={c} value={c}>{CURRENCIES[c]?.flag} {c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-forest-900/70">Amount ({convertCardFrom})</label>
                      <input type="number" min="1" step="0.01" placeholder="e.g. 10000" value={convertCardAmount} onChange={(e) => { setConvertCardAmount(e.target.value); setConvertCardQuote(null); setExecuteConvertError(null); }} className="w-full min-h-[44px] rounded-xl border border-forest-900/15 bg-white/80 pl-3 pr-3 py-2 text-sm text-forest-900 placeholder:text-forest-900/50 focus:outline-none focus:ring-2 focus:ring-gold-500" onClick={(e) => e.stopPropagation()} />
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleConvertCardGetQuote(); }} disabled={convertCardLoading || !convertCardAmount} className="w-full min-h-[44px] rounded-xl bg-gold-500/90 text-white font-semibold text-sm hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5">
                        {convertCardLoading ? 'Getting quote…' : 'Get quote'}
                        {!convertCardLoading && <ChevronRight size={14} />}
                      </button>
                    </div>
                    {convertCardQuote && (
                      <>
                        <div className="mt-3 rounded-xl bg-forest-900/5 border border-forest-900/10 p-3 text-sm">
                          <p className="text-forest-900/70 text-xs">Rate: {convertCardQuote.rateUsed}</p>
                          <p className="font-semibold text-forest-900 mt-0.5">You get: {getCurrencySymbol(convertCardTo)} {(Number(convertCardQuote.toAmount) / 100).toLocaleString()} {convertCardTo}</p>
                        </div>
                        {executeConvertError && <p className="mt-2 text-sm text-red-600">{executeConvertError}</p>}
                        <button type="button" onClick={handleExecuteConvert} disabled={executeConvertLoading} className="mt-2 w-full min-h-[44px] rounded-xl bg-forest-900 text-white font-semibold text-sm hover:bg-forest-800 disabled:opacity-60 transition-colors">
                          {executeConvertLoading ? 'Converting…' : 'Execute convert'}
                        </button>
                      </>
                    )}
                  </motion.div>
                </div>

                {/* Recent activity */}
                <div className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-forest-900">Recent activity</h2>
                    <button type="button" onClick={() => setSection('wallets')} className="text-xs font-semibold text-gold-600 hover:text-gold-700">View all →</button>
                  </div>
                  {activityLoading ? (
                    <p className="text-sm text-forest-900/60 py-3">Loading…</p>
                  ) : activity.length > 0 ? (
                    <ul className="space-y-1.5">
                      {activity.slice(0, 4).map((item) => (
                        <li key={item.id} className="flex items-center justify-between text-sm py-1.5 border-b border-forest-900/5 last:border-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${item.direction === 'CREDIT' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                            <span className="text-forest-900/60 text-xs">{item.date}</span>
                          </div>
                          <span className="text-forest-900/70 text-xs">{item.type}</span>
                          <span className={`font-medium text-sm ${item.direction === 'CREDIT' ? 'text-emerald-700' : 'text-forest-900'}`}>{item.amount} {item.currency}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-forest-900/60 text-sm py-3">No transactions yet. Top up in Wallets to begin.</p>
                  )}
                </div>
              </motion.div>
            )}

            {section === 'wallets' && (
              <motion.div key="wallets" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="max-w-5xl">
                <p className="text-forest-900/70 text-sm sm:text-[15px] mb-6">Your wallets</p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                  {wallets.map((wallet) => (
                    <motion.div key={wallet.id} className={`bg-white/90 backdrop-blur rounded-2xl border shadow-lg shadow-forest-900/5 p-4 hover:shadow-xl hover:shadow-forest-900/8 transition-all duration-200 ${Number(wallet.balance) > 0 ? 'border-forest-900/8' : 'border-forest-900/5 opacity-70'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-forest-900/50">{CURRENCIES[wallet.currency]?.flag} {wallet.currency}</span>
                        {wallet.currency === primaryCurrency && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gold-500/20 text-gold-700">PRIMARY</span>}
                      </div>
                      <p className="text-xl font-bold text-forest-900 tracking-tight">{fmtBal(wallet.balance, wallet.currency)}</p>
                      <p className="text-xs text-forest-900/50 mt-0.5">{CURRENCIES[wallet.currency]?.name}</p>
                    </motion.div>
                  ))}
                </div>

                {addCurrencyOpen && availableCurrencies.length > 0 && (
                  <div className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-4 sm:p-5 mb-6">
                    <h2 className="text-base font-semibold text-forest-900 mb-3">Add a new wallet</h2>
                    <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:gap-3">
                      <select value={addCurrencyCode} onChange={(e) => setAddCurrencyCode(e.target.value)} className="w-full sm:flex-1 min-h-[44px] rounded-xl border border-forest-900/20 bg-white pl-4 pr-10 py-3 text-forest-900 font-medium focus:outline-none focus:ring-2 focus:ring-gold-500 appearance-none">
                        {availableCurrencies.map((c) => <option key={c} value={c}>{CURRENCIES[c]?.flag} {c} — {CURRENCIES[c]?.name}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <button type="button" onClick={handleAddCurrency} disabled={addCurrencyLoading} className="flex-1 sm:flex-none min-h-[44px] bg-forest-900 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-forest-900/25 hover:bg-forest-800 transition-all disabled:opacity-60 active:bg-forest-800">
                          {addCurrencyLoading ? 'Adding…' : 'Add wallet'}
                        </button>
                        <button type="button" onClick={() => setAddCurrencyOpen(false)} className="min-h-[44px] py-3 px-4 rounded-xl text-forest-900/60 hover:text-forest-900 hover:bg-forest-900/5 transition-colors font-medium active:bg-forest-900/10">
                          Cancel
                        </button>
                      </div>
                    </div>
                    {addCurrencyError && <p className="mt-2 text-sm text-red-600">{addCurrencyError}</p>}
                  </div>
                )}

                <div className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-4 sm:p-6 mb-8">
                  <h2 className="text-lg font-semibold text-forest-900 mb-4">Top up wallet</h2>
                  <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:gap-3">
                    <select value={topUpCurrency} onChange={(e) => setTopUpCurrency(e.target.value)} className="w-full sm:w-auto min-h-[44px] rounded-xl border border-forest-900/20 bg-white pl-4 pr-10 py-3 text-forest-900 font-medium focus:outline-none focus:ring-2 focus:ring-gold-500 appearance-none bg-[length:14px_14px] bg-[right_0.75rem_center] bg-no-repeat [background-image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%230A291B%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')]">
                      {wallets.map((w) => <option key={w.currency} value={w.currency}>{CURRENCIES[w.currency]?.flag} {w.currency} — {CURRENCIES[w.currency]?.name}</option>)}
                    </select>
                    <input type="number" min="0" step="0.01" placeholder="Amount" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} className="w-full sm:flex-1 min-h-[44px] rounded-xl border border-forest-900/20 bg-white px-4 py-3 text-forest-900 placeholder:text-forest-900/50 focus:outline-none focus:ring-2 focus:ring-gold-500" />
                    <button type="button" onClick={handleTopUp} disabled={topUpLoading} className="w-full sm:w-auto min-h-[44px] bg-forest-900 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-forest-900/25 hover:bg-forest-800 transition-all disabled:opacity-60 active:bg-forest-800">
                      {topUpLoading ? 'Topping up…' : 'Top up'}
                    </button>
                  </div>
                  {topUpMessage && <p className={`mt-3 text-sm ${topUpMessage.includes('success') ? 'text-forest-700 font-medium' : 'text-red-600'}`}>{topUpMessage}</p>}
                  <p className="mt-2 text-xs text-forest-900/40">Demo top-up (ledger only). Use Deposit below for real money via Paystack.</p>
                </div>

                {wallets.length > 0 && (
                  <div className="bg-white/90 backdrop-blur rounded-2xl border border-emerald-500/20 shadow-lg shadow-forest-900/5 p-4 sm:p-6 mb-4">
                    <h2 className="text-lg font-semibold text-forest-900 mb-1">Deposit (real money)</h2>
                    <p className="text-xs text-forest-900/50 mb-4">Pay with card or bank transfer via Paystack. Your wallet is credited instantly.</p>
                    <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:gap-3">
                      <select value={depositCurrency} onChange={(e) => setDepositCurrency(e.target.value)} className="w-full sm:w-auto min-h-[44px] rounded-xl border border-forest-900/20 bg-white pl-4 pr-10 py-3 text-forest-900 font-medium focus:outline-none focus:ring-2 focus:ring-gold-500 appearance-none">
                        {wallets.map((w) => <option key={w.currency} value={w.currency}>{CURRENCIES[w.currency]?.flag} {w.currency}</option>)}
                      </select>
                      <input type="number" min="0" step="0.01" placeholder="Amount" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="w-full sm:flex-1 min-h-[44px] rounded-xl border border-forest-900/20 bg-white px-4 py-3 text-forest-900 placeholder:text-forest-900/50 focus:outline-none focus:ring-2 focus:ring-gold-500" />
                      <button type="button" onClick={handleDeposit} disabled={depositLoading} className="w-full sm:w-auto min-h-[44px] bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-700/25 hover:bg-emerald-800 transition-all disabled:opacity-60 active:bg-emerald-800">
                        {depositLoading ? 'Opening…' : 'Deposit'}
                      </button>
                    </div>
                    {depositMessage && <p className={`mt-3 text-sm ${depositMessage.includes('opened') || depositMessage.includes('credited') ? 'text-emerald-700 font-medium' : 'text-red-600'}`}>{depositMessage}</p>}
                  </div>
                )}

                {wallets.length > 0 && (
                  <div className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-4 sm:p-6 mb-8">
                    <h2 className="text-lg font-semibold text-forest-900 mb-1">Withdraw to bank</h2>
                    <p className="text-xs text-forest-900/50 mb-4">Send money from your wallet to a real bank account.</p>
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <select value={withdrawCurrency} onChange={(e) => { setWithdrawCurrency(e.target.value); fetchBanks(e.target.value); setWithdrawBankCode(''); }} className="min-h-[44px] rounded-xl border border-forest-900/20 bg-white pl-4 pr-10 py-3 text-forest-900 font-medium focus:outline-none focus:ring-2 focus:ring-gold-500 appearance-none">
                          <option value="">Select currency</option>
                          {wallets.map((w) => <option key={w.currency} value={w.currency}>{CURRENCIES[w.currency]?.flag} {w.currency}</option>)}
                        </select>
                        <select value={withdrawBankCode} onChange={(e) => setWithdrawBankCode(e.target.value)} className="min-h-[44px] rounded-xl border border-forest-900/20 bg-white pl-4 pr-10 py-3 text-forest-900 font-medium focus:outline-none focus:ring-2 focus:ring-gold-500 appearance-none" disabled={withdrawBanksLoading || withdrawBanks.length === 0}>
                          <option value="">{withdrawBanksLoading ? 'Loading banks…' : withdrawBanks.length === 0 ? 'Select currency first' : 'Select bank'}</option>
                          {withdrawBanks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                        </select>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input type="text" placeholder="Account number" value={withdrawAccountNumber} onChange={(e) => setWithdrawAccountNumber(e.target.value)} className="min-h-[44px] rounded-xl border border-forest-900/20 bg-white px-4 py-3 text-forest-900 placeholder:text-forest-900/50 focus:outline-none focus:ring-2 focus:ring-gold-500" />
                        <input type="text" placeholder="Account holder name" value={withdrawAccountName} onChange={(e) => setWithdrawAccountName(e.target.value)} className="min-h-[44px] rounded-xl border border-forest-900/20 bg-white px-4 py-3 text-forest-900 placeholder:text-forest-900/50 focus:outline-none focus:ring-2 focus:ring-gold-500" />
                      </div>
                      <div className="flex gap-3">
                        <input type="number" min="0" step="0.01" placeholder="Amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="flex-1 min-h-[44px] rounded-xl border border-forest-900/20 bg-white px-4 py-3 text-forest-900 placeholder:text-forest-900/50 focus:outline-none focus:ring-2 focus:ring-gold-500" />
                        <button type="button" onClick={handleWithdraw} disabled={withdrawLoading} className="min-h-[44px] bg-forest-900 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-forest-900/25 hover:bg-forest-800 transition-all disabled:opacity-60 active:bg-forest-800">
                          {withdrawLoading ? 'Sending…' : 'Withdraw'}
                        </button>
                      </div>
                    </div>
                    {withdrawMessage && <p className={`mt-3 text-sm ${withdrawMessage.includes('sent') ? 'text-emerald-700 font-medium' : 'text-red-600'}`}>{withdrawMessage}</p>}
                  </div>
                )}

                <div className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Receipt className="w-5 h-5 text-forest-700" />
                    <h2 className="text-lg font-semibold text-forest-900">Activity</h2>
                  </div>
                  <div className="overflow-x-auto rounded-xl" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                              <td className="py-3 text-right font-medium">
                                <span className={item.direction === 'CREDIT' ? 'text-emerald-700' : 'text-forest-900'}>{item.amount}</span>
                              </td>
                              <td className="py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-forest-600/15 text-forest-800 text-xs font-medium">{item.status}</span>
                              </td>
                              <td className="py-3 font-mono text-xs text-forest-900/70">{item.ref ?? '—'}</td>
                              <td className="py-3 text-forest-900/70">{item.currency}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-forest-900/60 text-sm py-6 text-center">No wallet activity yet. Top up to see transactions here.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {section === 'transfers' && (
              <motion.div key="transfers" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="max-w-5xl">
                <p className="text-forest-900/70 mb-6 text-[15px]">Your cross-border transfers.</p>
                <div className="flex gap-4 flex-col lg:flex-row items-start">
                  <div className="flex-1 min-w-0 w-full lg:w-auto bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-5">
                    <h2 className="text-lg font-semibold text-forest-900 mb-4">Transfers</h2>
                    {transfersLoading ? (
                      <p className="text-sm text-forest-900/60 py-4">Loading…</p>
                    ) : transfersList.length === 0 ? (
                      <p className="text-sm text-forest-900/60 py-4">No transfers yet. Go to Overview to send your first cross-border payment.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <table className="w-full text-sm min-w-[400px]">
                          <thead>
                            <tr className="text-left text-forest-900/60 border-b border-forest-900/10">
                              <th className="pb-2 pt-0.5 font-medium">Date</th>
                              <th className="pb-2 pt-0.5 font-medium">To</th>
                              <th className="pb-2 pt-0.5 font-medium text-right">Amount</th>
                              <th className="pb-2 pt-0.5 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transfersList.map((t) => (
                              <tr key={t.id} className={`border-b border-forest-900/5 last:border-0 cursor-pointer hover:bg-forest-900/5 ${selectedTransferId === t.id ? 'bg-forest-900/10' : ''}`} onClick={() => setSelectedTransferId(selectedTransferId === t.id ? null : t.id)}>
                                <td className="py-2 text-forest-900/80">{new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                <td className="py-2 text-forest-900/80">{t.counterparty?.name ?? '—'}</td>
                                <td className="py-2 text-right font-medium text-forest-900">{t.fromCurrency} {(Number(t.fromAmount) / 100).toLocaleString()} → {t.toCurrency} {(Number(t.toAmount) / 100).toLocaleString()}</td>
                                <td className="py-2"><span className="inline-flex items-center px-2 py-0.5 rounded-md bg-forest-600/15 text-forest-800 text-xs font-medium">{t.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  {transferDetail && (
                    <div className="lg:w-80 flex-shrink-0 bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-5">
                      <h2 className="text-base font-semibold text-forest-900 mb-3">Transfer details</h2>
                      <dl className="space-y-2 text-sm">
                        <div><dt className="text-forest-900/60">ID</dt><dd className="font-mono text-forest-900/80 truncate" title={transferDetail.id}>{transferDetail.id.slice(0, 8)}…</dd></div>
                        <div><dt className="text-forest-900/60">Recipient</dt><dd className="text-forest-900">{transferDetail.counterparty?.name ?? '—'} ({transferDetail.counterparty?.country ?? '—'})</dd></div>
                        <div><dt className="text-forest-900/60">Amount</dt><dd className="text-forest-900">{transferDetail.fromCurrency} {(Number(transferDetail.fromAmount) / 100).toLocaleString()} → {transferDetail.toCurrency} {(Number(transferDetail.toAmount) / 100).toLocaleString()}</dd></div>
                        <div><dt className="text-forest-900/60">Fee</dt><dd className="text-forest-900">{(Number(transferDetail.feeAmount) / 100).toLocaleString()}</dd></div>
                        <div><dt className="text-forest-900/60">Status</dt><dd><span className="inline-flex items-center px-2 py-0.5 rounded-md bg-forest-600/15 text-forest-800 text-xs font-medium">{transferDetail.status}</span></dd></div>
                        <div><dt className="text-forest-900/60">Created</dt><dd className="text-forest-900/80">{new Date(transferDetail.createdAt).toLocaleString()}</dd></div>
                      </dl>
                      {(transferDetail.status === 'DRAFT' || transferDetail.status === 'PENDING_FUNDS') && (
                        <p className="mt-3 text-xs text-forest-900/60">You can cancel while the transfer is DRAFT or PENDING_FUNDS.</p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(transferDetail.status === 'DRAFT' || transferDetail.status === 'PENDING_FUNDS') && (
                          <button type="button" onClick={handleCancelTransfer} disabled={cancelTransferLoading} className="text-xs font-medium px-3 py-1.5 rounded-xl border border-red-500/30 text-red-700 hover:bg-red-500/10 disabled:opacity-60">
                            {cancelTransferLoading ? 'Cancelling…' : 'Cancel transfer'}
                          </button>
                        )}
                        <button type="button" onClick={() => setSelectedTransferId(null)} className="text-xs font-medium text-gold-600 hover:text-gold-700">Close</button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {section === 'kyb' && (
              <motion.div key="kyb" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="max-w-3xl">
                <p className="text-forest-900/70 mb-6 text-[15px]">Verify your business to unlock full features and higher limits.</p>
                {business.status === 'ACTIVE' ? (
                  <div className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-green-600" /></div>
                      <div>
                        <h2 className="text-lg font-semibold text-forest-900">Verified</h2>
                        <p className="text-sm text-forest-900/60">Your business has been verified. All features are unlocked.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Verification pending</p>
                        <p className="text-xs text-amber-700 mt-1">Upload your business documents to complete verification. This unlocks higher transfer limits and faster settlements.</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {[
                        { type: 'CAC_CERTIFICATE', label: 'CAC Certificate', desc: 'Certificate of incorporation from the Corporate Affairs Commission' },
                        { type: 'UTILITY_BILL', label: 'Utility Bill', desc: 'Recent utility bill showing business address (within 3 months)' },
                        { type: 'BANK_STATEMENT', label: 'Bank Statement', desc: 'Business bank statement from the last 3 months' },
                        { type: 'ID_DOCUMENT', label: 'Director ID', desc: 'Government-issued ID of a company director' },
                      ].map((doc) => (
                        <div key={doc.type} className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-forest-900/5 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-forest-700" /></div>
                              <div>
                                <h3 className="font-semibold text-forest-900">{doc.label}</h3>
                                <p className="text-xs text-forest-900/60 mt-1">{doc.desc}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-amber-500" />
                              <span className="text-xs text-amber-600 font-medium">Pending</span>
                            </div>
                          </div>
                          <label className="mt-4 flex items-center justify-center gap-2 w-full min-h-[44px] rounded-xl border-2 border-dashed border-forest-900/15 bg-forest-900/[0.02] text-sm font-medium text-forest-900/60 hover:border-gold-500/40 hover:text-forest-900/80 hover:bg-forest-900/[0.04] cursor-pointer transition-all">
                            <Upload className="w-4 h-4" /> Upload document
                            <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const token = localStorage.getItem('obeam_token');
                              if (!token) return;
                              const formData = new FormData();
                              formData.append('file', file);
                              formData.append('documentType', doc.type);
                              try { await fetch(`${API_BASE}/kyb/documents`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }); } catch { /* handled */ }
                            }} />
                          </label>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {section === 'invoices' && (
              <motion.div key="invoices" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="max-w-5xl">
                <p className="text-forest-900/70 mb-6 text-[15px]">Create and manage invoices for your business.</p>
                <div className="bg-white/90 backdrop-blur rounded-2xl border border-forest-900/8 shadow-lg shadow-forest-900/5 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-forest-900">Invoices</h2>
                    <span className="text-xs text-forest-900/50 bg-forest-900/5 px-3 py-1 rounded-full">Coming soon</span>
                  </div>
                  <p className="text-sm text-forest-900/60">Create invoices, send payment links, and track when your clients pay. Invoice management is ready in the API — UI launching soon.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-forest-900/5 border border-forest-900/8 p-4">
                      <p className="text-sm font-medium text-forest-900">Create invoices</p>
                      <p className="text-xs text-forest-900/50 mt-1">Generate professional invoices in any currency</p>
                    </div>
                    <div className="rounded-xl bg-forest-900/5 border border-forest-900/8 p-4">
                      <p className="text-sm font-medium text-forest-900">Payment links</p>
                      <p className="text-xs text-forest-900/50 mt-1">Share links that let clients pay directly</p>
                    </div>
                    <div className="rounded-xl bg-forest-900/5 border border-forest-900/8 p-4">
                      <p className="text-sm font-medium text-forest-900">Track payments</p>
                      <p className="text-xs text-forest-900/50 mt-1">See when invoices are viewed and paid</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Add beneficiary modal */}
      {addBeneficiaryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => !addBeneficiaryLoading && setAddBeneficiaryOpen(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-cream-50 rounded-2xl border border-forest-900/10 shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-forest-900 mb-4">Add beneficiary</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Name" value={newBeneficiaryName} onChange={(e) => setNewBeneficiaryName(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-forest-900/20 px-4 py-2 text-forest-900 placeholder:text-forest-900/50 focus:outline-none focus:ring-2 focus:ring-gold-500" />
              <select value={newBeneficiaryCountry} onChange={(e) => setNewBeneficiaryCountry(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-forest-900/20 px-4 py-2 text-forest-900 focus:outline-none focus:ring-2 focus:ring-gold-500">
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
              </select>
              <select value={newBeneficiaryPayoutType} onChange={(e) => setNewBeneficiaryPayoutType(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-forest-900/20 px-4 py-2 text-forest-900 focus:outline-none focus:ring-2 focus:ring-gold-500">
                <option value="BANK">Bank</option>
                <option value="MOBILE">Mobile money</option>
              </select>
              <input type="text" placeholder="Account number or mobile number" value={newBeneficiaryPayoutRef} onChange={(e) => setNewBeneficiaryPayoutRef(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-forest-900/20 px-4 py-2 text-forest-900 placeholder:text-forest-900/50 focus:outline-none focus:ring-2 focus:ring-gold-500" />
            </div>
            {addBeneficiaryError && <p className="mt-2 text-sm text-red-600">{addBeneficiaryError}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => !addBeneficiaryLoading && setAddBeneficiaryOpen(false)} className="flex-1 min-h-[44px] rounded-xl border border-forest-900/20 text-forest-900 font-medium">Cancel</button>
              <button type="button" onClick={handleAddBeneficiary} disabled={addBeneficiaryLoading} className="flex-1 min-h-[44px] rounded-xl bg-forest-900 text-white font-semibold disabled:opacity-60">{addBeneficiaryLoading ? 'Adding…' : 'Add'}</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Send modal */}
      {sendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => !sendLoading && setSendModalOpen(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-cream-50 rounded-2xl border border-forest-900/10 shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-forest-900 mb-4">Send {sendFromCurrency} → {sendToCurrency}</h3>
            <p className="text-sm text-forest-900/60 mb-3">Recipient: {counterparties.find((c) => c.id === selectedCounterpartyId)?.name ?? '—'}</p>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-forest-900">Amount ({sendFromCurrency})</label>
              <input type="number" min="1" step="0.01" placeholder="0.00" value={sendAmount} onChange={(e) => { setSendAmount(e.target.value); setSendQuote(null); }} className="w-full min-h-[44px] rounded-xl border border-forest-900/20 px-4 py-2 text-forest-900 placeholder:text-forest-900/50 focus:outline-none focus:ring-2 focus:ring-gold-500" />
              {sendQuote && (
                <div className="rounded-xl bg-forest-900/5 border border-forest-900/10 p-3 text-sm">
                  <p className="text-forest-900/70">Rate: {sendQuote.rateUsed}</p>
                  <p className="font-semibold text-forest-900">They receive: {getCurrencySymbol(sendToCurrency)} {(Number(sendQuote.toAmount) / 100).toLocaleString()} {sendToCurrency}</p>
                </div>
              )}
            </div>
            {sendError && <p className="mt-2 text-sm text-red-600">{sendError}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => !sendLoading && setSendModalOpen(false)} className="flex-1 min-h-[44px] rounded-xl border border-forest-900/20 text-forest-900 font-medium">Cancel</button>
              {!sendQuote ? (
                <button type="button" onClick={handleSendGetQuote} disabled={sendLoading || !sendAmount} className="flex-1 min-h-[44px] rounded-xl bg-gold-500 text-white font-semibold disabled:opacity-60">{sendLoading ? 'Getting quote…' : 'Get quote'}</button>
              ) : (
                <button type="button" onClick={handleSendConfirm} disabled={sendLoading} className="flex-1 min-h-[44px] rounded-xl bg-forest-900 text-white font-semibold disabled:opacity-60">{sendLoading ? 'Sending…' : 'Confirm send'}</button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Convert modal */}
      {convertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setConvertModalOpen(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-cream-50 rounded-2xl border border-forest-900/10 shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-forest-900 mb-4">Convert currency</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <select value={convertFrom} onChange={(e) => { setConvertFrom(e.target.value); if (e.target.value === convertTo) setConvertTo(CURRENCY_CODES.find((c) => c !== e.target.value) || 'GHS'); setConvertQuote(null); }} className="flex-1 min-h-[44px] rounded-xl border border-forest-900/20 px-4 py-2 text-forest-900">
                  {existingCurrencies.map((c) => <option key={c} value={c}>{CURRENCIES[c]?.flag} {c}</option>)}
                </select>
                <span className="flex items-center text-forest-900/60">→</span>
                <select value={convertTo} onChange={(e) => { setConvertTo(e.target.value); if (e.target.value === convertFrom) setConvertFrom(existingCurrencies.find((c) => c !== e.target.value) || 'NGN'); setConvertQuote(null); }} className="flex-1 min-h-[44px] rounded-xl border border-forest-900/20 px-4 py-2 text-forest-900">
                  {existingCurrencies.map((c) => <option key={c} value={c}>{CURRENCIES[c]?.flag} {c}</option>)}
                </select>
              </div>
              <label className="block text-sm font-medium text-forest-900">Amount ({convertFrom})</label>
              <input type="number" min="1" step="0.01" placeholder="0.00" value={convertAmount} onChange={(e) => { setConvertAmount(e.target.value); setConvertQuote(null); }} className="w-full min-h-[44px] rounded-xl border border-forest-900/20 px-4 py-2 text-forest-900 placeholder:text-forest-900/50 focus:outline-none focus:ring-2 focus:ring-gold-500" />
              {convertQuote && (
                <div className="rounded-xl bg-forest-900/5 border border-forest-900/10 p-3 text-sm">
                  <p className="text-forest-900/70">Rate: {convertQuote.rateUsed}</p>
                  <p className="font-semibold text-forest-900">You get: {getCurrencySymbol(convertTo)} {(Number(convertQuote.toAmount) / 100).toLocaleString()} {convertTo}</p>
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConvertModalOpen(false)} className="flex-1 min-h-[44px] rounded-xl border border-forest-900/20 text-forest-900 font-medium">Close</button>
              <button type="button" onClick={handleConvertGetQuote} disabled={convertLoading || !convertAmount} className="flex-1 min-h-[44px] rounded-xl bg-gold-500 text-white font-semibold disabled:opacity-60">{convertLoading ? 'Getting quote…' : 'Get quote'}</button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
