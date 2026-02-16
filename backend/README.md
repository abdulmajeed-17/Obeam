# Obeam Backend

NestJS + PostgreSQL API for B2B cross-border payments (Nigeria → Ghana). Double-entry ledger, FX, transfers.

## Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** NestJS
- **Database:** PostgreSQL (see `schema/001_initial_ledger.sql`)
- **ORM (optional):** Prisma — run `npx prisma init` and point to the same schema

## Setup

1. **Node**
   ```bash
   cd backend && npm install
   ```

2. **Postgres**
   - Create a DB (e.g. Neon, Railway, or local).
   - Run the schema:
     ```bash
     psql $DATABASE_URL -f schema/001_initial_ledger.sql
     ```
   - Or with connection string in `.env`:
     ```bash
     DATABASE_URL="postgresql://user:pass@host:5432/obeam" npm run db:migrate
     ```

3. **Env**
   ```env
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secret
   CORS_ORIGIN=http://localhost:5173
   PORT=3000
   ```

4. **Run**
   ```bash
   npm run start:dev
   ```
   - **Railway:** From your laptop, Prisma may fail with "bad certificate format" (P1011) on Railway's *public* URL. Deploy the backend to Railway and use the Postgres service's **internal** `DATABASE_URL` (e.g. `postgres.railway.internal`) — then the API connects without TLS issues. For local dev you can use a local Postgres or Neon.
   - API: http://localhost:3000
   - Health: http://localhost:3000/health
   - Auth: POST /auth/signup, POST /auth/login

## Project layout (to build)

- `src/auth` — signup, login, refresh, JWT
- `src/users` — user profile
- `src/business` — business + KYB
- `src/wallet` — balances, ledger (postings)
- `src/ledger` — journal entries, double-entry service
- `src/transfers` — create, confirm, cancel
- `src/fx` — rates, quote
- `src/admin` — mark processing / settled

## Roadmap

See **`../docs/BACKEND-STACK-AND-ROADMAP.md`** for phases, endpoints, and money flows.

## Ledger rule

Every movement is double-entry: debit one account, credit another. Same amount, same currency per journal entry. FX = two entries (NGN + GHS) linked by `fx_trade_id`.
# Obeam
