/**
 * One-off script to delete an account by email.
 * Usage: npx ts-node scripts/delete-account.ts abdulmajeed.sulaima@gmail.com
 */
import { PrismaClient } from '@prisma/client';

const EMAIL = process.argv[2] || 'abdulmajeed.sulaima@gmail.com';

async function main() {
  const prisma = new PrismaClient();

  const user = await prisma.user.findUnique({
    where: { email: EMAIL.toLowerCase() },
    include: { business: true },
  });

  if (!user) {
    console.log(`No user found with email: ${EMAIL}`);
    process.exit(0);
    return;
  }

  const businessId = user.businessId;

  // 1. Delete postings for journal entries that touch our accounts
  const ourAccounts = await prisma.account.findMany({
    where: { businessId },
    select: { id: true },
  });
  const accountIds = ourAccounts.map((a) => a.id);

  const postingsToDelete = await prisma.posting.findMany({
    where: { accountId: { in: accountIds } },
    select: { entryId: true },
  });
  const entryIds = [...new Set(postingsToDelete.map((p) => p.entryId))];

  // Delete journal entries (cascade deletes their postings)
  await prisma.journalEntry.deleteMany({ where: { id: { in: entryIds } } });

  // 2. Delete any remaining postings that reference our accounts
  await prisma.posting.deleteMany({ where: { accountId: { in: accountIds } } });

  // 3. Delete accounts
  await prisma.account.deleteMany({ where: { businessId } });

  // 4. Delete transfers, invoices, counterparties, fx_trades, audit_logs
  await prisma.transfer.deleteMany({ where: { businessId } });
  await prisma.invoice.deleteMany({ where: { businessId } });
  await prisma.counterparty.deleteMany({ where: { businessId } });
  await prisma.fxTrade.deleteMany({ where: { businessId } });
  await prisma.auditLog.deleteMany({
    where: { OR: [{ businessId }, { actorUserId: user.id }] },
  });

  // 5. Delete pending claims (as sender or recipient)
  await prisma.pendingClaim.deleteMany({
    where: {
      OR: [
        { senderBusinessId: businessId },
        { recipientEmail: EMAIL.toLowerCase() },
      ],
    },
  });

  // 6. Delete journal entries created by this user (cascade deletes postings)
  await prisma.journalEntry.deleteMany({ where: { createdBy: user.id } });

  // 7. Delete user and business
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.business.delete({ where: { id: businessId } });

  console.log(`Deleted account for ${EMAIL} (business: ${user.business.name})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
