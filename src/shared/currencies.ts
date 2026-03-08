export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  region: string;
}

export const CURRENCIES: Record<string, CurrencyMeta> = {
  NGN: { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬', region: 'West Africa' },
  GHS: { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭', region: 'West Africa' },
  KES: { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪', region: 'East Africa' },
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', region: 'Southern Africa' },
  XOF: { code: 'XOF', name: 'CFA Franc', symbol: 'CFA', flag: '🇸🇳', region: 'West Africa' },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', region: 'Global' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', region: 'Europe' },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES);

export function formatBalance(balance: string | number, currency: string): string {
  const n = typeof balance === 'string' ? Number(balance) : balance;
  const meta = CURRENCIES[currency];
  const symbol = meta?.symbol ?? currency;
  return `${symbol} ${(n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getCurrencySymbol(code: string): string {
  return CURRENCIES[code]?.symbol ?? code;
}

export const COUNTRIES = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'GH', name: 'Ghana', currency: 'GHS' },
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'SN', name: 'Senegal', currency: 'XOF' },
  { code: 'CI', name: "Côte d'Ivoire", currency: 'XOF' },
  { code: 'ML', name: 'Mali', currency: 'XOF' },
  { code: 'BF', name: 'Burkina Faso', currency: 'XOF' },
  { code: 'NE', name: 'Niger', currency: 'XOF' },
  { code: 'TG', name: 'Togo', currency: 'XOF' },
  { code: 'BJ', name: 'Benin', currency: 'XOF' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
];
