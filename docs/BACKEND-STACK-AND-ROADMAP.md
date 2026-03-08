# Obeam Backend — Stack & Roadmap

**Product:** B2B cross-border payments • Nigeria → Ghana • Naira in → Cedis out • 24hr settlement.

**Principle:** Every money movement is double-entry: debit one account, credit another. Same amount, same currency, same journal entry. Result: auditability + correctness.

---

## Stack

| Layer | Choice |
|-------|--------|
| **Backend** | NestJS (Node + TypeScript) |
| **Database** | PostgreSQL |
| **Auth** | JWT + refresh tokens, RBAC (or Supabase Auth for faster launch) |
| **Hosting** | Railway or Render (backend) + Neon (Postgres) + Vercel (frontend) |

---

## Core Backend Structure

```
/src
  /auth
  /users
  /business
  /wallet
  /ledger
  /transfers
  /fx
  /admin
```

**Core entities:** User, Business, Wallet (Account), Transaction (JournalEntry + Postings), FXRate, Transfer, Settlement.

---

## Phase 1 – Backend Foundation

- [x] Set up NestJS
- [x] Connect Postgres (Prisma or TypeORM)
- [x] User auth (signup, login, refresh, JWT)
- [x] Business creation (on signup + GET/PATCH /business/me)
- [x] Wallet (account) creation per business per currency (on signup + GET /wallets, balance, ledger)
- [x] Internal ledger transfers (double-entry: top-up, reserve for transfer, FX conversion)

## Phase 2 – FX Engine

- [x] Store live FX rates (manual seed + optional sync from ExchangeRate-API)
- [x] FX quote endpoint: `POST /fx/quote` (fromAmount → toAmount, rateUsed, expiresAt)
- [x] Execute convert: `POST /ledger/convert` (debit from-currency wallet, credit to-currency wallet, FX_CONVERSION journal entry)

## Phase 3 – Simulated Corridor

- [x] Naira wallet + Cedis wallet
- [x] Counterparties (create, list, get by id)
- [x] Transfer request (create → confirm → reserve funds)
- [x] Status flow: DRAFT → PENDING_FUNDS → QUEUED → PROCESSING → SETTLED
- [x] Transfers list + detail (GET /transfers, GET /transfers/:id) and dashboard UI

## Phase 4 – Admin Panel

- [x] List transfers (filter by status): `GET /admin/transfers?status=...` (header `X-Admin-Secret`)
- [x] Mark processing: `POST /admin/transfers/:id/mark-processing` (PENDING_FUNDS → PROCESSING)
- [x] Mark settled: `POST /admin/transfers/:id/mark-settled` (ledger settle: Clearing NGN → Treasury NGN, Treasury GHS → Clearing GHS; status → SETTLED)
- [x] Mark failed: `POST /admin/transfers/:id/mark-failed`
- [x] Admin UI: `/admin` page (list transfers, filter, Mark processing / Settle / Fail)
- [x] Cancel transfer in dashboard: Transfers detail → Cancel transfer (DRAFT or PENDING_FUNDS)
- [ ] Adjust FX (manual rate entry) — optional

---

## API Endpoints (V1)

### Auth
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### Business
- `GET /business/me`
- `PATCH /business/me`
- `POST /business/kyb/submit`
- `GET /business/kyb/status`

### Counterparties (Ghana suppliers)
- `POST /counterparties`
- `GET /counterparties`
- `GET /counterparties/:id`
- `PATCH /counterparties/:id`

### Wallets
- `GET /wallets`
- `GET /wallets/:currency/balance`
- `GET /wallets/:currency/ledger` (paged postings)

### FX
- `GET /fx/rate?base=NGN&quote=GHS`
- `POST /fx/quote` — Body: `{ fromCurrency, toCurrency, fromAmount }` → `{ toAmount, rateUsed, expiresAt, quoteId }`
- `GET /fx/sync` — Sync rates from external feed (cron)

### Ledger
- `POST /ledger/top-up` — Body: `{ currency, amount }` (minor units)
- `POST /ledger/convert` — Body: `{ fromCurrency, toCurrency, fromAmount }` (minor units); uses latest FX rate, debits from wallet, credits to wallet

### Transfers
- `POST /transfers` (create draft)
- `POST /transfers/:id/confirm` (lock quote + reserve funds)
- `GET /transfers`
- `GET /transfers/:id`
- `POST /transfers/:id/cancel`

### Admin (internal)
- `GET /admin/transfers?status=PROCESSING`
- `POST /admin/transfers/:id/mark-processing`
- `POST /admin/transfers/:id/mark-settled`
- `POST /admin/transfers/:id/mark-failed`

---

## Money Flows (Ledger)

- **Wallet top-up:** DEBIT Treasury NGN, CREDIT Customer Wallet NGN.
- **Transfer create (reserve):** DEBIT Customer Wallet NGN, CREDIT Clearing NGN.
- **FX conversion (NGN):** DEBIT Clearing NGN, CREDIT Treasury NGN.
- **FX conversion (GHS):** DEBIT Treasury GHS, CREDIT Payable GHS.
- **Settle payout:** DEBIT Payable GHS, CREDIT Partner settlement GHS; then `transfers.status = SETTLED`.
- **Fee charge:** DEBIT Customer Wallet NGN, CREDIT Fees NGN.

**Rule:** Do not mix currencies in one journal entry. For FX, use two entries (one NGN, one GHS) linked by `fx_trade_id`.

---

## Minimal V1 (Build First)

1. [x] Auth + business creation
2. [x] Create NGN + GHS wallets for each business
3. [x] Ledger endpoints to show balances
4. [x] FX quote endpoint (manual rate ok; demo rates in seed)
5. [x] Transfer create + confirm (reserve funds in ledger)
6. [x] Execute convert (NGN → GHS in-app; POST /ledger/convert)
7. [x] Transfers list + detail (dashboard section + GET /transfers, GET /transfers/:id)
8. [x] Admin list + mark processing/settled/failed; ledger settle; cancel transfer (`POST /transfers/:id/cancel`)

That’s a legit end-to-end MVP with real accounting.
