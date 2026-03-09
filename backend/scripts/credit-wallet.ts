/**
 * Credit a user's wallet (e.g. after manual Paystack verification).
 * Usage: npx ts-node -r dotenv/config scripts/credit-wallet.ts email@example.com 500 NGN
 */
import { PrismaClient } from '@prisma/client';

const EMAIL = process.argv[2] || 'abdulmajeed.sulaima@gmail.com';
const AMOUNT = parseFloat(process.argv[3] || '500');
const CURRENCY = (process.argv[4] || 'NGN').toUpperCase();

async function main() {
  const prisma = new PrismaClient();

  const user = await prisma.user.findUnique({
    where: { email: EMAIL.toLowerCase() },
    include: { business: true },
  });

  if (!user) {
    console.log(`No user found with email: ${EMAIL}`);
    process.exit(1);
  }

  const amountMinor = BigInt(Math.round(AMOUNT * 100));

  let treasury = await prisma.account.findFirst({
    where: { businessId: null, currency: CURRENCY as any, type: 'TREASURY', isPlatform: true },
  });
  if (!treasury) {
    treasury = await prisma.account.create({
      data: { businessId: null, currency: CURRENCY as any, type: 'TREASURY', label: `Platform Treasury ${CURRENCY}`, isPlatform: true },
    });
  }

  let wallet = await prisma.account.findFirst({
    where: { businessId: user.businessId, currency: CURRENCY as any, type: 'CUSTOMER_WALLET' },
  });
  if (!wallet) {
    wallet = await prisma.account.create({
      data: { businessId: user.businessId, currency: CURRENCY as any, type: 'CUSTOMER_WALLET', label: `Wallet ${CURRENCY}`, isPlatform: false },
    });
  }

  const entry = await prisma.journalEntry.create({
    data: {
      entryType: 'WALLET_TOPUP',
      currency: CURRENCY as any,
      referenceType: 'MANUAL_CREDIT',
      referenceId: wallet.id,
      memo: `Manual credit: Paystack deposit ${CURRENCY} ${AMOUNT}`,
      createdBy: user.id,
    },
  });

  await prisma.posting.createMany({
    data: [
      { entryId: entry.id, accountId: treasury.id, direction: 'DEBIT', amount: amountMinor },
      { entryId: entry.id, accountId: wallet.id, direction: 'CREDIT', amount: amountMinor },
    ],
  });

  console.log(`Credited ${CURRENCY} ${AMOUNT} to ${EMAIL} (business: ${user.business.name})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
