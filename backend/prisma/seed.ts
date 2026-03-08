import { PrismaClient, CurrencyCode, AccountType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const DEMO_EMAIL = 'test@company.com';
const DEMO_PASSWORD = 'password123';
const DEMO_BUSINESS_NAME = 'Test Co';
const SALT_ROUNDS = 10;

const ALL_CURRENCIES: CurrencyCode[] = ['NGN', 'GHS', 'KES', 'ZAR', 'XOF', 'USD', 'GBP'];

const CURRENCY_NAMES: Record<string, string> = {
  NGN: 'Nigerian Naira', GHS: 'Ghanaian Cedi', KES: 'Kenyan Shilling',
  ZAR: 'South African Rand', XOF: 'CFA Franc', USD: 'US Dollar', GBP: 'British Pound',
};

// Approximate real-world rates vs USD (for seeding when no API key is set)
const USD_RATES: Record<string, number> = {
  NGN: 1550, GHS: 15.5, KES: 153, ZAR: 18.5, XOF: 610, USD: 1, GBP: 0.79,
};

async function main() {
  const existingUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL }, include: { business: true } });
  if (existingUser) {
    await ensureAllWallets(existingUser.businessId);
    await ensureDemoBeneficiaries(existingUser.businessId);
    await seedAllFxRates();
    console.log('Existing demo user updated with all currencies.');
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  const business = await prisma.business.create({
    data: { name: DEMO_BUSINESS_NAME, country: 'NG', status: 'ACTIVE' },
  });

  await prisma.user.create({
    data: { businessId: business.id, email: DEMO_EMAIL, passwordHash, role: 'OWNER' },
  });

  await prisma.account.createMany({
    data: ALL_CURRENCIES.map((currency) => ({
      businessId: business.id,
      currency,
      type: AccountType.CUSTOMER_WALLET,
      label: `Wallet ${CURRENCY_NAMES[currency]}`,
      isPlatform: false,
    })),
  });

  await ensureDemoBeneficiaries(business.id);
  await seedAllFxRates();

  console.log(`Demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD} — ${ALL_CURRENCIES.length} wallets, multi-country beneficiaries, all FX rates.`);
}

async function ensureAllWallets(businessId: string) {
  for (const currency of ALL_CURRENCIES) {
    const exists = await prisma.account.findFirst({
      where: { businessId, currency, type: AccountType.CUSTOMER_WALLET },
    });
    if (!exists) {
      await prisma.account.create({
        data: { businessId, currency, type: AccountType.CUSTOMER_WALLET, label: `Wallet ${CURRENCY_NAMES[currency]}`, isPlatform: false },
      });
      console.log(`  Created ${currency} wallet.`);
    }
  }
}

async function ensureDemoBeneficiaries(businessId: string) {
  const beneficiaries = [
    { name: 'Accra Trading Co.', country: 'GH', payoutType: 'BANK', payoutRef: 'GH-ACCT-1234567890' },
    { name: 'Nairobi Exports Ltd.', country: 'KE', payoutType: 'MOBILE', payoutRef: '+254712345678' },
    { name: 'Cape Town Supplies', country: 'ZA', payoutType: 'BANK', payoutRef: 'ZA-ACCT-9876543210' },
    { name: 'Dakar Import-Export', country: 'SN', payoutType: 'BANK', payoutRef: 'SN-ACCT-5555555555' },
    { name: 'Lagos Ventures', country: 'NG', payoutType: 'BANK', payoutRef: 'NG-ACCT-1111111111' },
  ];

  for (const b of beneficiaries) {
    const exists = await prisma.counterparty.findFirst({ where: { businessId, name: b.name } });
    if (!exists) {
      await prisma.counterparty.create({ data: { businessId, ...b } });
    }
  }
}

async function seedAllFxRates() {
  const existing = await prisma.fxRate.count();
  // Only seed if fewer than 20 rates exist (avoids duplicating on re-run, but seeds for new currencies)
  if (existing >= ALL_CURRENCIES.length * (ALL_CURRENCIES.length - 1)) return;

  const now = new Date();
  const inserts: { base: CurrencyCode; quote: CurrencyCode; rate: number; source: string; asOf: Date }[] = [];

  for (const base of ALL_CURRENCIES) {
    for (const quote of ALL_CURRENCIES) {
      if (base === quote) continue;
      // Cross-rate: (1 base in USD) / (1 quote in USD) = how many quote per 1 base
      const rate = USD_RATES[quote] / USD_RATES[base];
      inserts.push({ base, quote, rate: parseFloat(rate.toFixed(8)), source: 'SEED', asOf: now });
    }
  }

  await prisma.fxRate.createMany({ data: inserts });
  console.log(`Seeded ${inserts.length} FX rate pairs for ${ALL_CURRENCIES.length} currencies.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
