import { CurrencyCode } from '@prisma/client';

export interface CurrencyMeta {
  code: CurrencyCode;
  name: string;
  symbol: string;
  region: string;
  countries: string[];
  minorUnit: string;
  minorPerMajor: number;
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  NGN: {
    code: 'NGN',
    name: 'Nigerian Naira',
    symbol: '₦',
    region: 'West Africa',
    countries: ['Nigeria'],
    minorUnit: 'kobo',
    minorPerMajor: 100,
  },
  GHS: {
    code: 'GHS',
    name: 'Ghanaian Cedi',
    symbol: '₵',
    region: 'West Africa',
    countries: ['Ghana'],
    minorUnit: 'pesewas',
    minorPerMajor: 100,
  },
  KES: {
    code: 'KES',
    name: 'Kenyan Shilling',
    symbol: 'KSh',
    region: 'East Africa',
    countries: ['Kenya'],
    minorUnit: 'cents',
    minorPerMajor: 100,
  },
  ZAR: {
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
    region: 'Southern Africa',
    countries: ['South Africa'],
    minorUnit: 'cents',
    minorPerMajor: 100,
  },
  XOF: {
    code: 'XOF',
    name: 'CFA Franc (BCEAO)',
    symbol: 'CFA',
    region: 'West Africa',
    countries: [
      'Senegal', 'Côte d\'Ivoire', 'Mali', 'Burkina Faso',
      'Niger', 'Togo', 'Benin', 'Guinea-Bissau',
    ],
    minorUnit: 'centime',
    minorPerMajor: 1, // XOF has no minor unit in practice
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    region: 'Global',
    countries: ['United States'],
    minorUnit: 'cents',
    minorPerMajor: 100,
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    region: 'Europe',
    countries: ['United Kingdom'],
    minorUnit: 'pence',
    minorPerMajor: 100,
  },
};

export const CURRENCY_CODES = Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[];

/** Country code (ISO 3166-1 alpha-2) → currency code for default wallet on signup */
export const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR',
  SN: 'XOF', CI: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF', TG: 'XOF', BJ: 'XOF', GW: 'XOF',
  US: 'USD', GB: 'GBP',
};

export function getCurrencyForCountry(countryCode: string): CurrencyCode | null {
  const upper = (countryCode || '').toUpperCase();
  return COUNTRY_TO_CURRENCY[upper] ?? null;
}

export function isValidCurrency(code: string): code is CurrencyCode {
  return code in SUPPORTED_CURRENCIES;
}

export function getCurrencyMeta(code: CurrencyCode): CurrencyMeta {
  return SUPPORTED_CURRENCIES[code];
}
