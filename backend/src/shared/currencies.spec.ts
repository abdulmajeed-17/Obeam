import { SUPPORTED_CURRENCIES, CURRENCY_CODES, isValidCurrency, getCurrencyMeta } from './currencies';

describe('Currencies', () => {
  it('has exactly 7 supported currencies', () => {
    expect(CURRENCY_CODES).toHaveLength(7);
  });

  it('contains all expected currencies', () => {
    expect(CURRENCY_CODES).toContain('NGN');
    expect(CURRENCY_CODES).toContain('GHS');
    expect(CURRENCY_CODES).toContain('KES');
    expect(CURRENCY_CODES).toContain('ZAR');
    expect(CURRENCY_CODES).toContain('XOF');
    expect(CURRENCY_CODES).toContain('USD');
    expect(CURRENCY_CODES).toContain('GBP');
  });

  describe('isValidCurrency', () => {
    it('returns true for valid currencies', () => {
      for (const code of CURRENCY_CODES) {
        expect(isValidCurrency(code)).toBe(true);
      }
    });

    it('returns false for invalid currencies', () => {
      expect(isValidCurrency('BTC')).toBe(false);
      expect(isValidCurrency('ETH')).toBe(false);
      expect(isValidCurrency('')).toBe(false);
      expect(isValidCurrency('INVALID')).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(isValidCurrency('ngn')).toBe(false);
      expect(isValidCurrency('Ngn')).toBe(false);
    });
  });

  describe('getCurrencyMeta', () => {
    it('returns correct metadata for each currency', () => {
      const ngn = getCurrencyMeta('NGN');
      expect(ngn.name).toBe('Nigerian Naira');
      expect(ngn.symbol).toBe('₦');
      expect(ngn.minorPerMajor).toBe(100);

      const ghs = getCurrencyMeta('GHS');
      expect(ghs.name).toBe('Ghanaian Cedi');
      expect(ghs.symbol).toBe('₵');

      const kes = getCurrencyMeta('KES');
      expect(kes.name).toBe('Kenyan Shilling');
      expect(kes.region).toBe('East Africa');

      const zar = getCurrencyMeta('ZAR');
      expect(zar.name).toBe('South African Rand');
      expect(zar.symbol).toBe('R');

      const xof = getCurrencyMeta('XOF');
      expect(xof.name).toBe('CFA Franc (BCEAO)');
      expect(xof.minorPerMajor).toBe(1); // XOF has no minor unit in practice

      const usd = getCurrencyMeta('USD');
      expect(usd.name).toBe('US Dollar');
      expect(usd.symbol).toBe('$');

      const gbp = getCurrencyMeta('GBP');
      expect(gbp.name).toBe('British Pound');
      expect(gbp.symbol).toBe('£');
    });

    it('every currency has required fields', () => {
      for (const code of CURRENCY_CODES) {
        const meta = getCurrencyMeta(code as any);
        expect(meta.code).toBe(code);
        expect(meta.name).toBeTruthy();
        expect(meta.symbol).toBeTruthy();
        expect(meta.region).toBeTruthy();
        expect(meta.countries.length).toBeGreaterThan(0);
        expect(meta.minorPerMajor).toBeGreaterThan(0);
      }
    });
  });

  describe('SUPPORTED_CURRENCIES', () => {
    it('has same keys as CURRENCY_CODES', () => {
      const keys = Object.keys(SUPPORTED_CURRENCIES);
      expect(keys.sort()).toEqual([...CURRENCY_CODES].sort());
    });
  });
});
