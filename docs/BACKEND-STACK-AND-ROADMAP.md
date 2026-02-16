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

- [ ] Set up NestJS
- [ ] Connect Postgres (Prisma or TypeORM)
- [ ] User auth (signup, login, refresh, JWT)
- [ ] Business creation
- [ ] Wallet (account) creation per business per currency
- [ ] Internal ledger transfers (double-entry)

## Phase 2 – FX Engine

- [ ] Store live FX rates (manual or provider)
- [ ] Apply spread
- [ ] FX quote endpoint: `POST /fx/quote` (fromAmount → quoteAmount, rateUsed, expiresAt)

## Phase 3 – Simulated Corridor

- [ ] Naira wallet + Cedis wallet
- [ ] Transfer request (create → confirm → reserve funds)
- [ ] Status flow: DRAFT → PENDING_FUNDS → QUEUED → PROCESSING → SETTLED

## Phase 4 – Admin Panel

- [ ] List transfers (filter by status)
- [ ] Adjust FX (manual rate entry)
- [ ] Approve / mark settled (simulate payout, ledger settle)

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
- `POST /fx/quote` — Body: `{ fromCurrency, toCurrency, fromAmount }` → `{ quoteAmount, rateUsed, spreadBps, expiresAt, quoteId }`

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

1. Auth + business creation
2. Create NGN + GHS wallets for each business
3. Ledger endpoints to show balances
4. FX quote endpoint (manual rate ok)
5. Transfer create + confirm (reserve funds in ledger)
6. Admin “settle” action (simulate payout, ledger settle)

That’s a legit end-to-end MVP with real accounting.
