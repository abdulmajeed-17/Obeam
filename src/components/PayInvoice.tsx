import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', GHS: '₵', KES: 'KSh', ZAR: 'R', XOF: 'CFA', USD: '$', GBP: '£',
};

export function PayInvoice() {
  const [invoice, setInvoice] = useState<{
    invoiceNumber: string;
    currency: string;
    amount: string;
    description: string | null;
    dueDate: string | null;
    status: string;
    paidAt: string | null;
    business: { name: string; country: string };
    counterparty: { name: string; country: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const invoiceNumber = typeof window !== 'undefined' ? (window.location.pathname.match(/\/pay\/(.+)/)?.[1] ?? '') : '';

  useEffect(() => {
    if (!invoiceNumber) {
      setError('Invalid invoice link');
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/invoices/pay/${invoiceNumber}`)
      .then((res) => {
        if (!res.ok) throw new Error('Invoice not found');
        return res.json();
      })
      .then(setInvoice)
      .catch(() => setError('Invoice not found'))
      .finally(() => setLoading(false));
  }, [invoiceNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-forest-950 flex items-center justify-center">
        <p className="text-cream-100">Loading invoice…</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-forest-950 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-cream-50 rounded-2xl p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-medium">{error || 'Invoice not found'}</p>
          <a href="/" className="mt-4 inline-block text-forest-900 font-semibold hover:underline">Back to Obeam</a>
        </motion.div>
      </div>
    );
  }

  const symbol = CURRENCY_SYMBOLS[invoice.currency] || invoice.currency;
  const amountFormatted = (Number(invoice.amount) / 100).toLocaleString();

  return (
    <div className="min-h-screen bg-forest-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-cream-50 rounded-2xl shadow-xl border border-forest-900/10 overflow-hidden max-w-md w-full"
      >
        <div className="bg-forest-900 text-white p-6 text-center">
          <h1 className="text-xl font-bold">Obeam</h1>
          <p className="text-cream-200 text-sm mt-1">Invoice from {invoice.business.name}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-forest-900/60">Invoice #</span>
            <span className="font-medium text-forest-900">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-forest-900/60">To</span>
            <span className="font-medium text-forest-900">{invoice.counterparty.name}</span>
          </div>
          <div className="py-4 border-y border-forest-900/10">
            <p className="text-forest-900/60 text-sm">Amount due</p>
            <p className="text-2xl font-bold text-forest-900 mt-1">{symbol}{amountFormatted} {invoice.currency}</p>
          </div>
          {invoice.description && (
            <p className="text-sm text-forest-900/70">{invoice.description}</p>
          )}
          {invoice.dueDate && (
            <p className="text-sm text-forest-900/60">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
          )}
          {invoice.status === 'PAID' ? (
            <div className="rounded-xl bg-emerald-100 text-emerald-800 p-4 text-center font-medium">
              ✓ Paid{invoice.paidAt && ` on ${new Date(invoice.paidAt).toLocaleDateString()}`}
            </div>
          ) : invoice.status === 'SENT' ? (
            <div className="space-y-3">
              <a
                href="/signup"
                className="block w-full py-3.5 rounded-xl bg-forest-900 text-white font-bold text-center hover:bg-forest-800 transition-colors"
              >
                Sign up to pay
              </a>
              <p className="text-xs text-forest-900/50 text-center">Already have an account? <a href="/login" className="text-gold-600 font-medium">Log in</a></p>
            </div>
          ) : invoice.status === 'CANCELLED' ? (
            <p className="text-center text-forest-900/60 font-medium">This invoice has been cancelled.</p>
          ) : (
            <p className="text-center text-forest-900/60">This invoice is not yet sent.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
