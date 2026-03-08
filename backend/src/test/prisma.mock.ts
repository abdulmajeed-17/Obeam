/**
 * Shared Prisma mock factory for unit tests.
 * Each test file gets its own isolated mock instance.
 */
export function createMockPrisma() {
  return {
    $transaction: jest.fn((fn: (tx: any) => Promise<any>) => fn(mockPrismaTx())),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    business: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    account: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), createMany: jest.fn(), update: jest.fn() },
    journalEntry: { create: jest.fn(), findMany: jest.fn() },
    posting: { createMany: jest.fn(), findMany: jest.fn() },
    fxRate: { findFirst: jest.fn(), createMany: jest.fn(), count: jest.fn() },
    fxTrade: { create: jest.fn(), findUnique: jest.fn() },
    transfer: { create: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
    counterparty: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    auditLog: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    invoice: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  };
}

function mockPrismaTx() {
  return {
    business: { create: jest.fn() },
    user: { create: jest.fn() },
    account: { create: jest.fn(), createMany: jest.fn(), findFirst: jest.fn() },
    journalEntry: { create: jest.fn() },
    posting: { createMany: jest.fn() },
    transfer: { create: jest.fn(), update: jest.fn() },
  };
}

export type MockPrisma = ReturnType<typeof createMockPrisma>;
