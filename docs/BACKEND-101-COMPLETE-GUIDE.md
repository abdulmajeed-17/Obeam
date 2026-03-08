# Obeam Backend 101 — Complete Guide

**Your complete walkthrough of the entire backend system.**

When you come back, we'll go through this together step by step. Everything explained from database to API endpoints to testing.

---

## 📚 Table of Contents

1. [Backend Architecture Overview](#1-backend-architecture-overview)
2. [Database Structure (Prisma)](#2-database-structure-prisma)
3. [How Everything Connects](#3-how-everything-connects)
4. [API Endpoints Explained](#4-api-endpoints-explained)
5. [Testing & Checking Things](#5-testing--checking-things)
6. [Understanding the Flow](#6-understanding-the-flow)
7. [Key Concepts](#7-key-concepts)
8. [Common Tasks](#8-common-tasks)

---

## 1. Backend Architecture Overview

### What is the Backend?

The backend is a **NestJS** application (Node.js + TypeScript framework) that:
- Handles all business logic
- Manages the database (PostgreSQL)
- Provides REST API endpoints
- Handles authentication, payments, FX rates, etc.

### Project Structure

```
backend/
├── src/
│   ├── main.ts                    # Entry point (starts the server)
│   ├── app.module.ts              # Main module (connects everything)
│   ├── prisma.service.ts          # Database connection
│   │
│   ├── auth/                      # Authentication (login, signup, JWT)
│   ├── business/                  # Business management
│   ├── wallets/                   # Wallet balances & ledger
│   ├── ledger/                    # Double-entry accounting
│   ├── fx/                        # FX rates & quotes
│   ├── transfers/                 # Transfer creation & management
│   ├── counterparties/            # Ghana suppliers/recipients
│   ├── admin/                     # Admin operations
│   ├── settlement/                # Automated bank settlement
│   ├── kyb/                       # Document verification
│   ├── aml/                       # AML checks
│   ├── encryption/                # Data encryption
│   ├── audit/                     # Audit logging
│   ├── webhooks/                  # Webhook notifications
│   ├── notifications/             # Email notifications
│   ├── monitoring/                # Health checks
│   ├── okra/                      # Nigeria bank API (Okra)
│   └── opendx/                     # Ghana bank API (OpenDX)
│
├── prisma/
│   ├── schema.prisma              # Database schema (tables)
│   └── seed.ts                    # Seed data (test data)
│
└── .env                           # Environment variables (secrets, config)
```

---

## 2. Database Structure (Prisma)

### What is Prisma?

Prisma is an **ORM** (Object-Relational Mapping) tool. It:
- Defines your database tables in `schema.prisma`
- Generates TypeScript types automatically
- Provides a type-safe database client

### Database Tables (Models)

#### **Business** (`businesses` table)
Stores business information.

```prisma
model Business {
  id         String         @id @default(dbgenerated("gen_random_uuid()"))
  name       String         // "Acme Corp"
  country    String         // "Nigeria"
  status     BusinessStatus // PENDING, ACTIVE, SUSPENDED
  createdAt  DateTime       @default(now())
  
  users      User[]         // Users belonging to this business
  accounts   Account[]      // Wallets (NGN, GHS)
  transfers  Transfer[]     // All transfers made
}
```

**What it's for:** Every customer is a "Business". When someone signs up, a Business record is created.

---

#### **User** (`users` table)
Stores user accounts (email, password).

```prisma
model User {
  id           String    @id @default(dbgenerated("gen_random_uuid()"))
  businessId   String    // Which business they belong to
  email        String    @unique // "john@acme.com"
  passwordHash String    // Encrypted password
  role         String    @default("OWNER")
  createdAt    DateTime  @default(now())
  
  business     Business  // Link to business
}
```

**What it's for:** Authentication. Users log in with email/password, get a JWT token.

---

#### **Account** (`accounts` table)
Stores wallets (NGN wallet, GHS wallet, Treasury, Clearing, etc.).

```prisma
model Account {
  id          String      @id @default(dbgenerated("gen_random_uuid()"))
  businessId  String?     // NULL = platform account (Treasury, Clearing)
  currency    CurrencyCode // NGN or GHS
  type        AccountType  // CUSTOMER_WALLET, TREASURY, CLEARING, etc.
  label       String      // "Customer Wallet NGN"
  isPlatform  Boolean     @default(false)
  createdAt   DateTime    @default(now())
  
  postings    Posting[]   // All transactions (debits/credits)
}
```

**Account Types:**
- `CUSTOMER_WALLET` — Customer's NGN or GHS wallet
- `TREASURY` — Platform's main account (where we hold funds)
- `CLEARING` — Temporary account (funds in transit)
- `FEES` — Where fees go
- `FX_REVENUE` — FX spread revenue
- `PAYABLE` — Money we owe (GHS to send)

**What it's for:** Every money movement is tracked in accounts. Like a bank account.

---

#### **JournalEntry** (`journal_entries` table)
Records every transaction (like a checkbook entry).

```prisma
model JournalEntry {
  id            String    @id @default(dbgenerated("gen_random_uuid()"))
  entryType     EntryType // WALLET_TOPUP, TRANSFER_CREATE, FX_CONVERSION, etc.
  currency      CurrencyCode // NGN or GHS
  referenceType String    // "TRANSFER", "FX_TRADE", etc.
  referenceId   String    // ID of the transfer/fx_trade
  memo          String?   // "Reserve for transfer ABC123"
  createdBy     String?   // User ID who created it
  createdAt     DateTime  @default(now())
  
  postings      Posting[] // The actual debits/credits
}
```

**What it's for:** Every transaction gets a journal entry. It's the "header" of a transaction.

---

#### **Posting** (`postings` table)
The actual debits and credits (double-entry bookkeeping).

```prisma
model Posting {
  id        String   @id @default(dbgenerated("gen_random_uuid()"))
  entryId   String   // Which journal entry
  accountId String   // Which account (wallet, treasury, etc.)
  direction String   // "DEBIT" or "CREDIT"
  amount    BigInt   // Amount in minor units (kobo/pesewas)
  createdAt DateTime @default(now())
  
  entry     JournalEntry // Link to journal entry
  account   Account      // Link to account
}
```

**Double-Entry Rule:** Every journal entry has **exactly 2 postings**:
- One DEBIT
- One CREDIT
- Same amount, same currency

**Example:**
- Customer tops up ₦10,000
- Journal Entry: `WALLET_TOPUP`
- Posting 1: DEBIT Treasury NGN account (₦10,000)
- Posting 2: CREDIT Customer Wallet NGN account (₦10,000)

**What it's for:** This is how we track money. Every movement is recorded as a debit + credit.

---

#### **Transfer** (`transfers` table)
A payment request (Nigeria → Ghana).

```prisma
model Transfer {
  id             String         @id @default(dbgenerated("gen_random_uuid()"))
  businessId     String         // Who's sending
  counterpartyId String         // Who's receiving (Ghana supplier)
  fromCurrency   CurrencyCode   // NGN
  toCurrency     CurrencyCode   // GHS
  fromAmount     BigInt         // ₦10,000 (in minor units)
  toAmount       BigInt         // ₵450 (in minor units)
  feeAmount      BigInt         @default(0)
  status         TransferStatus // DRAFT, PENDING_FUNDS, PROCESSING, SETTLED, FAILED, CANCELLED
  fxTradeId      String?        // Which FX rate was used
  createdBy      String?        // User ID
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
}
```

**Transfer Statuses:**
- `DRAFT` — Just created, not confirmed
- `PENDING_FUNDS` — Confirmed, funds reserved
- `PROCESSING` — Admin marked as processing
- `SETTLED` — Money sent, transfer complete
- `FAILED` — Something went wrong
- `CANCELLED` — User/admin cancelled

**What it's for:** This is a payment request. When a customer wants to pay a Ghana supplier, they create a Transfer.

---

#### **Counterparty** (`counterparties` table)
Ghana suppliers/recipients.

```prisma
model Counterparty {
  id         String   @id @default(dbgenerated("gen_random_uuid()"))
  businessId String   // Which business owns this counterparty
  name       String   // "Kwame Enterprises"
  country    String   // "Ghana"
  payoutType String   // "BANK_ACCOUNT" or "MOBILE_MONEY"
  payoutRef  String   // Bank account number or mobile money number
  createdAt  DateTime @default(now())
  
  transfers  Transfer[] // All transfers to this counterparty
}
```

**What it's for:** Customers save their Ghana suppliers here. When creating a transfer, they select a counterparty.

---

#### **FxRate** (`fx_rates` table)
Exchange rates (NGN ↔ GHS).

```prisma
model FxRate {
  id        String        @id @default(dbgenerated("gen_random_uuid()"))
  base      CurrencyCode  // NGN
  quote     CurrencyCode  // GHS
  rate      Decimal       // 22.5 (1 NGN = 22.5 GHS)
  source    String        // "EXCHANGERATE_API"
  asOf      DateTime      // When this rate was fetched
  createdAt DateTime      @default(now())
}
```

**What it's for:** We store live FX rates here. Updated every day via cron job from ExchangeRate-API.

---

#### **FxTrade** (`fx_trades` table)
Records FX conversions (when we convert NGN → GHS).

```prisma
model FxTrade {
  id            String        @id @default(dbgenerated("gen_random_uuid()"))
  businessId    String        // Which business
  baseCurrency  CurrencyCode  // NGN
  quoteCurrency CurrencyCode  // GHS
  baseAmount    BigInt        // ₦10,000
  quoteAmount   BigInt        // ₵450
  rateUsed      Decimal       // 22.5
  spreadBps     Int           @default(0) // Our margin (basis points)
  createdAt     DateTime      @default(now())
  
  transfers     Transfer[]    // Transfers that used this FX trade
}
```

**What it's for:** When a transfer is confirmed, we create an FX trade to lock in the rate.

---

#### **AuditLog** (`audit_logs` table)
Logs everything (for compliance).

```prisma
model AuditLog {
  id          String   @id @default(dbgenerated("gen_random_uuid()"))
  actorUserId String?  // Who did it
  businessId  String?  // Which business
  action      String   // "TRANSFER_CREATED", "ADMIN_SETTLED", etc.
  entityType  String   // "TRANSFER", "BUSINESS", etc.
  entityId    String   // ID of the transfer/business
  meta        Json     @default("{}") // Extra data
  createdAt   DateTime @default(now())
}
```

**What it's for:** Compliance. We log every important action so we can audit later.

---

### Database Relationships

```
Business
  ├── Users (1 to many) — Business has many users
  ├── Accounts (1 to many) — Business has NGN + GHS wallets
  ├── Transfers (1 to many) — Business makes many transfers
  └── Counterparties (1 to many) — Business has many suppliers

Transfer
  ├── Business (many to 1) — Transfer belongs to one business
  ├── Counterparty (many to 1) — Transfer goes to one counterparty
  └── FxTrade (many to 1) — Transfer uses one FX trade

JournalEntry
  └── Postings (1 to many) — Entry has 2 postings (debit + credit)

Posting
  ├── JournalEntry (many to 1) — Posting belongs to one entry
  └── Account (many to 1) — Posting affects one account
```

---

## 3. How Everything Connects

### Module System (NestJS)

NestJS uses **modules** to organize code. Each module:
- Has its own service (business logic)
- Has its own controller (API endpoints)
- Can import other modules

**Example: TransfersModule**

```typescript
// transfers.module.ts
@Module({
  imports: [PrismaModule, LedgerModule], // Use database + ledger
  controllers: [TransfersController],     // API endpoints
  providers: [TransfersService],          // Business logic
})
export class TransfersModule {}
```

**Flow:**
1. Request comes in → `TransfersController`
2. Controller calls → `TransfersService`
3. Service uses → `PrismaService` (database) + `LedgerService` (accounting)

---

### Dependency Injection

NestJS automatically provides services to other services.

**Example:**

```typescript
// transfers.service.ts
@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,      // Database
    private readonly ledger: LedgerService,      // Accounting
  ) {}
  
  async create(user: RequestUser, body: {...}) {
    // Use this.prisma to query database
    // Use this.ledger to move money
  }
}
```

NestJS automatically creates `PrismaService` and `LedgerService` and passes them to `TransfersService`.

---

### Request Flow

```
1. Frontend makes request
   ↓
2. HTTP Request → NestJS
   ↓
3. Controller receives request
   ↓
4. Controller calls Service
   ↓
5. Service uses PrismaService (database)
   ↓
6. Service returns data
   ↓
7. Controller returns JSON response
   ↓
8. Frontend receives response
```

**Example: Create Transfer**

```
Frontend: POST /transfers
  ↓
TransfersController.create()
  ↓
TransfersService.create()
  ↓
PrismaService.transfer.create()  // Save to database
LedgerService.reserveForTransfer() // Move money
  ↓
Return { id: "abc123", status: "DRAFT" }
  ↓
Frontend receives transfer data
```

---

## 4. API Endpoints Explained

### Authentication Endpoints

#### `POST /auth/signup`
**What it does:** Creates a new business + user account.

**Request:**
```json
{
  "email": "john@acme.com",
  "password": "secret123",
  "businessName": "Acme Corp"
}
```

**What happens:**
1. Creates `Business` record
2. Creates `User` record (with hashed password)
3. Creates NGN + GHS `Account` wallets
4. Returns JWT token

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "john@acme.com" }
}
```

---

#### `POST /auth/login`
**What it does:** Logs in existing user.

**Request:**
```json
{
  "email": "john@acme.com",
  "password": "secret123"
}
```

**What happens:**
1. Finds user by email
2. Checks password hash
3. Returns JWT token

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "john@acme.com" }
}
```

---

### Business Endpoints

#### `GET /business/me`
**What it does:** Get current business info.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "abc123",
  "name": "Acme Corp",
  "country": "Nigeria",
  "status": "ACTIVE"
}
```

---

### Wallet Endpoints

#### `GET /wallets`
**What it does:** Get all wallets (NGN + GHS) for current business.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "wallets": [
    {
      "id": "wallet1",
      "currency": "NGN",
      "balance": "1000000",  // ₦10,000.00 (in minor units)
      "type": "CUSTOMER_WALLET"
    },
    {
      "id": "wallet2",
      "currency": "GHS",
      "balance": "0",
      "type": "CUSTOMER_WALLET"
    }
  ]
}
```

**How balance is calculated:**
```typescript
// In WalletsService
balance = sum(CREDITS) - sum(DEBITS)
```

---

#### `GET /wallets/:currency/ledger`
**What it does:** Get transaction history for a wallet.

**Example:** `GET /wallets/NGN/ledger?limit=10`

**Response:**
```json
{
  "postings": [
    {
      "id": "post1",
      "direction": "CREDIT",
      "amount": "1000000",
      "memo": "Wallet top-up",
      "createdAt": "2026-02-20T07:00:00Z"
    },
    {
      "id": "post2",
      "direction": "DEBIT",
      "amount": "500000",
      "memo": "Reserve for transfer",
      "createdAt": "2026-02-20T08:00:00Z"
    }
  ]
}
```

---

### FX Endpoints

#### `GET /fx/rate?base=NGN&quote=GHS`
**What it does:** Get latest FX rate.

**Response:**
```json
{
  "base": "NGN",
  "quote": "GHS",
  "rate": "22.5",
  "asOf": "2026-02-20T07:00:00Z"
}
```

**How it works:**
1. Queries `fx_rates` table
2. Finds latest rate for NGN/GHS
3. Returns it

---

#### `POST /fx/quote`
**What it does:** Get a quote (how much GHS for X NGN).

**Request:**
```json
{
  "fromCurrency": "NGN",
  "toCurrency": "GHS",
  "fromAmount": "1000000"  // ₦10,000
}
```

**Response:**
```json
{
  "quoteId": "quote123",
  "fromCurrency": "NGN",
  "toCurrency": "GHS",
  "fromAmount": "1000000",
  "toAmount": "450000",     // ₵450 (calculated)
  "rateUsed": "22.5",
  "expiresAt": "2026-02-20T07:05:00Z"  // Valid for 5 minutes
}
```

**How it works:**
1. Gets latest rate from `fx_rates`
2. Calculates: `toAmount = fromAmount * rate`
3. Returns quote (valid for 5 minutes)

---

### Transfer Endpoints

#### `POST /transfers`
**What it does:** Create a transfer (DRAFT status).

**Request:**
```json
{
  "counterpartyId": "cp123",
  "fromCurrency": "NGN",
  "toCurrency": "GHS",
  "fromAmount": "1000000",
  "toAmount": "450000"
}
```

**What happens:**
1. Creates `Transfer` record (status: DRAFT)
2. No money moved yet

**Response:**
```json
{
  "id": "transfer123",
  "status": "DRAFT",
  "fromAmount": "1000000",
  "toAmount": "450000",
  ...
}
```

---

#### `POST /transfers/:id/confirm`
**What it does:** Confirm transfer (reserve funds).

**What happens:**
1. Creates FX quote (locks rate)
2. Reserves funds:
   - DEBIT Customer Wallet NGN
   - CREDIT Clearing NGN
3. Updates transfer status: PENDING_FUNDS

**Ledger entries:**
```
Journal Entry: TRANSFER_CREATE
  Posting 1: DEBIT Customer Wallet NGN (₦10,000)
  Posting 2: CREDIT Clearing NGN (₦10,000)
```

---

#### `GET /transfers`
**What it does:** List all transfers for current business.

**Response:**
```json
{
  "transfers": [
    {
      "id": "transfer123",
      "status": "PENDING_FUNDS",
      "fromAmount": "1000000",
      "toAmount": "450000",
      "counterparty": { "name": "Kwame Enterprises" },
      "createdAt": "2026-02-20T07:00:00Z"
    }
  ]
}
```

---

#### `GET /transfers/:id`
**What it does:** Get single transfer details.

**Response:**
```json
{
  "id": "transfer123",
  "status": "PENDING_FUNDS",
  "fromAmount": "1000000",
  "toAmount": "450000",
  "feeAmount": "0",
  "counterparty": {
    "id": "cp123",
    "name": "Kwame Enterprises",
    "country": "Ghana",
    "payoutType": "BANK_ACCOUNT",
    "payoutRef": "1234567890"
  },
  "createdAt": "2026-02-20T07:00:00Z"
}
```

---

#### `POST /transfers/:id/cancel`
**What it does:** Cancel transfer (only if DRAFT or PENDING_FUNDS).

**What happens:**
1. If PENDING_FUNDS: Reverse reserve (return money to wallet)
2. Update status: CANCELLED

**Ledger entries (if PENDING_FUNDS):**
```
Journal Entry: TRANSFER_CANCEL
  Posting 1: DEBIT Clearing NGN (₦10,000)
  Posting 2: CREDIT Customer Wallet NGN (₦10,000)
```

---

### Ledger Endpoints

#### `POST /ledger/top-up`
**What it does:** Add money to wallet (for testing/demo).

**Request:**
```json
{
  "currency": "NGN",
  "amount": "1000000"  // ₦10,000
}
```

**What happens:**
1. Creates journal entry: `WALLET_TOPUP`
2. DEBIT Treasury NGN
3. CREDIT Customer Wallet NGN

**Ledger entries:**
```
Journal Entry: WALLET_TOPUP
  Posting 1: DEBIT Treasury NGN (₦10,000)
  Posting 2: CREDIT Customer Wallet NGN (₦10,000)
```

---

#### `POST /ledger/convert`
**What it does:** Convert NGN → GHS (for testing/demo).

**Request:**
```json
{
  "fromCurrency": "NGN",
  "toCurrency": "GHS",
  "fromAmount": "1000000"  // ₦10,000
}
```

**What happens:**
1. Gets latest FX rate
2. Calculates GHS amount
3. Creates journal entry: `FX_CONVERSION`
4. DEBIT Customer Wallet NGN
5. CREDIT Customer Wallet GHS

**Ledger entries:**
```
Journal Entry: FX_CONVERSION (NGN)
  Posting 1: DEBIT Customer Wallet NGN (₦10,000)
  Posting 2: CREDIT Treasury NGN (₦10,000)

Journal Entry: FX_CONVERSION (GHS)
  Posting 1: DEBIT Treasury GHS (₵450)
  Posting 2: CREDIT Customer Wallet GHS (₵450)
```

---

### Admin Endpoints

**All admin endpoints require:** `X-Admin-Secret: <secret>` header

#### `GET /admin/transfers?status=PROCESSING`
**What it does:** List all transfers (with optional status filter).

**Response:**
```json
{
  "transfers": [
    {
      "id": "transfer123",
      "status": "PROCESSING",
      "businessName": "Acme Corp",
      "fromAmount": "1000000",
      "toAmount": "450000",
      ...
    }
  ]
}
```

---

#### `POST /admin/transfers/:id/mark-processing`
**What it does:** Change status: PENDING_FUNDS → PROCESSING

**What happens:**
1. Updates transfer status
2. Logs admin action in audit log

---

#### `POST /admin/transfers/:id/mark-settled`
**What it does:** Settle transfer (send money via bank APIs).

**What happens:**
1. Calls `SettlementService.settleTransferAutomatically()`
2. SettlementService:
   - Calls OpenDX API to send GHS to recipient
   - Updates ledger (Clearing → Treasury, Treasury → Clearing)
   - Updates transfer status: SETTLED
3. Sends email notification
4. Sends webhook notification
5. Logs in audit log

**Ledger entries:**
```
Journal Entry: TRANSFER_SETTLE (NGN)
  Posting 1: DEBIT Clearing NGN (₦10,000)
  Posting 2: CREDIT Treasury NGN (₦10,000)

Journal Entry: TRANSFER_SETTLE (GHS)
  Posting 1: DEBIT Treasury GHS (₵450)
  Posting 2: CREDIT Clearing GHS (₵450)
```

---

#### `POST /admin/transfers/:id/mark-failed`
**What it does:** Mark transfer as FAILED.

**What happens:**
1. Updates transfer status: FAILED
2. Logs in audit log

---

### KYB Endpoints

#### `POST /kyb/documents`
**What it does:** Upload KYB document (CAC, tax cert, etc.).

**Request:** Multipart form data
- `file`: PDF/JPEG/PNG file
- `documentType`: "CAC_CERTIFICATE", "TAX_CERTIFICATE", etc.

**What happens:**
1. Validates file (size, type)
2. Saves file to `backend/uploads/kyb/`
3. Encrypts file path
4. Stores record in `kyb_documents` table

---

#### `GET /kyb/documents`
**What it does:** List all documents for current business.

**Response:**
```json
{
  "documents": [
    {
      "id": "doc123",
      "documentType": "CAC_CERTIFICATE",
      "fileName": "cac.pdf",
      "status": "PENDING",
      "createdAt": "2026-02-20T07:00:00Z"
    }
  ]
}
```

---

### Health Check

#### `GET /health`
**What it does:** Check if backend is running.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-20T07:00:00Z",
  "checks": {
    "database": "ok",
    "fxFeed": "ok",
    "bankApis": {
      "okra": "not_configured",
      "opendx": "not_configured"
    }
  }
}
```

---

## 5. Testing & Checking Things

### Starting the Backend

```bash
cd backend
npm run start:dev
```

**What happens:**
1. TypeScript compiles
2. NestJS starts
3. Connects to database
4. Server runs on `http://localhost:3000`

**You should see:**
```
Obeam API running at http://localhost:3000
```

---

### Testing with cURL

#### Test Health Check
```bash
curl http://localhost:3000/health
```

#### Test Signup
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@company.com",
    "password": "password123",
    "businessName": "Test Company"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "test@company.com" }
}
```

#### Test Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@company.com",
    "password": "password123"
  }'
```

#### Test Get Wallets (with token)
```bash
TOKEN="eyJhbGciOiJIUzI1NiIs..."

curl http://localhost:3000/wallets \
  -H "Authorization: Bearer $TOKEN"
```

#### Test Create Transfer
```bash
curl -X POST http://localhost:3000/transfers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "counterpartyId": "cp123",
    "fromCurrency": "NGN",
    "toCurrency": "GHS",
    "fromAmount": "1000000",
    "toAmount": "450000"
  }'
```

---

### Testing with Postman

1. **Import collection:**
   - Create new request
   - Set method (GET, POST, etc.)
   - Set URL: `http://localhost:3000/...`
   - Add headers: `Authorization: Bearer <token>`

2. **Test flow:**
   - Signup → Get token
   - Use token in other requests
   - Create transfer
   - Confirm transfer
   - Check wallets

---

### Checking the Database

#### Using Prisma Studio (Visual)
```bash
cd backend
npx prisma studio
```

Opens browser at `http://localhost:5555` — visual database browser.

**What you can do:**
- View all tables
- See data
- Edit records
- Add test data

---

#### Using psql (Command Line)
```bash
psql $DATABASE_URL
```

**Useful queries:**

```sql
-- See all businesses
SELECT * FROM businesses;

-- See all transfers
SELECT * FROM transfers ORDER BY created_at DESC LIMIT 10;

-- See wallet balances (sum of credits - debits)
SELECT 
  a.id,
  a.currency,
  a.type,
  SUM(CASE WHEN p.direction = 'CREDIT' THEN p.amount ELSE 0 END) - 
  SUM(CASE WHEN p.direction = 'DEBIT' THEN p.amount ELSE 0 END) as balance
FROM accounts a
LEFT JOIN postings p ON p.account_id = a.id
WHERE a.business_id = 'your-business-id'
GROUP BY a.id, a.currency, a.type;

-- See all journal entries for a transfer
SELECT je.*, p.direction, p.amount, a.type as account_type
FROM journal_entries je
JOIN postings p ON p.entry_id = je.id
JOIN accounts a ON a.id = p.account_id
WHERE je.reference_id = 'transfer-id'
ORDER BY je.created_at;
```

---

### Checking Logs

**Backend logs:** Check terminal where `npm run start:dev` is running.

**What to look for:**
- `LOG` — Normal operations
- `ERROR` — Errors (fix these)
- `WARN` — Warnings (check these)

**Example logs:**
```
[Nest] 12345  - 02/20/2026, 7:00:00 AM     LOG [InstanceLoader] TransfersModule dependencies initialized
[Nest] 12345  - 02/20/2026, 7:00:00 AM     LOG [NestFactory] Starting Nest application
[Nest] 12345  - 02/20/2026, 7:00:00 AM     LOG [NestApplication] Nest application successfully started
```

---

## 6. Understanding the Flow

### Complete Transfer Flow

#### Step 1: Customer Signs Up
```
1. Frontend: POST /auth/signup
2. Backend creates:
   - Business record
   - User record
   - NGN wallet (Account)
   - GHS wallet (Account)
3. Returns JWT token
```

---

#### Step 2: Customer Tops Up Wallet
```
1. Frontend: POST /ledger/top-up { currency: "NGN", amount: "1000000" }
2. Backend:
   - Creates JournalEntry: WALLET_TOPUP
   - Creates Posting 1: DEBIT Treasury NGN (₦10,000)
   - Creates Posting 2: CREDIT Customer Wallet NGN (₦10,000)
3. Customer wallet balance: ₦10,000
```

---

#### Step 3: Customer Adds Counterparty
```
1. Frontend: POST /counterparties
   {
     name: "Kwame Enterprises",
     country: "Ghana",
     payoutType: "BANK_ACCOUNT",
     payoutRef: "1234567890"
   }
2. Backend creates Counterparty record
```

---

#### Step 4: Customer Creates Transfer
```
1. Frontend: POST /transfers
   {
     counterpartyId: "cp123",
     fromCurrency: "NGN",
     toCurrency: "GHS",
     fromAmount: "1000000",
     toAmount: "450000"
   }
2. Backend creates Transfer record (status: DRAFT)
3. No money moved yet
```

---

#### Step 5: Customer Confirms Transfer
```
1. Frontend: POST /transfers/:id/confirm
2. Backend:
   - Gets latest FX rate
   - Creates FxTrade (locks rate)
   - Creates JournalEntry: TRANSFER_CREATE
   - Creates Posting 1: DEBIT Customer Wallet NGN (₦10,000)
   - Creates Posting 2: CREDIT Clearing NGN (₦10,000)
   - Updates transfer status: PENDING_FUNDS
3. Money is now "reserved" (in Clearing account)
```

---

#### Step 6: Admin Processes Transfer
```
1. Admin: POST /admin/transfers/:id/mark-processing
2. Backend updates status: PROCESSING
```

---

#### Step 7: Admin Settles Transfer
```
1. Admin: POST /admin/transfers/:id/mark-settled
2. SettlementService:
   a. Calls OpenDX API to send GHS to recipient bank
   b. Creates JournalEntry: TRANSFER_SETTLE (NGN)
      - DEBIT Clearing NGN (₦10,000)
      - CREDIT Treasury NGN (₦10,000)
   c. Creates JournalEntry: TRANSFER_SETTLE (GHS)
      - DEBIT Treasury GHS (₵450)
      - CREDIT Clearing GHS (₵450)
   d. Updates transfer status: SETTLED
   e. Sends email notification
   f. Sends webhook notification
   g. Logs in audit log
3. Transfer complete!
```

---

### Money Flow Diagram

```
Customer Wallet NGN (₦10,000)
    ↓ [Confirm Transfer]
Clearing NGN (₦10,000)
    ↓ [Settle Transfer]
Treasury NGN (₦10,000)

Treasury GHS (₵450)
    ↓ [Settle Transfer]
Clearing GHS (₵450)
    ↓ [OpenDX API]
Recipient Bank Account (₵450)
```

---

## 7. Key Concepts

### Double-Entry Bookkeeping

**Rule:** Every transaction has exactly 2 postings:
- One DEBIT
- One CREDIT
- Same amount, same currency

**Why:** Ensures accounting is always balanced. If debits = credits, books balance.

**Example:**
- Top-up ₦10,000:
  - DEBIT Treasury NGN: ₦10,000
  - CREDIT Customer Wallet NGN: ₦10,000
  - Total debits = ₦10,000
  - Total credits = ₦10,000
  - ✅ Balanced!

---

### Account Types Explained

**CUSTOMER_WALLET:**
- Customer's money
- They can top-up, send transfers
- One per currency (NGN, GHS)

**TREASURY:**
- Platform's main account
- Where we hold customer funds
- One per currency

**CLEARING:**
- Temporary account
- Money "in transit"
- Used when reserving funds for transfers

**FEES:**
- Where fees go
- Revenue account

**FX_REVENUE:**
- FX spread revenue
- Our profit from FX conversions

**PAYABLE:**
- Money we owe
- GHS we need to send to recipients

---

### Transfer Status Flow

```
DRAFT
  ↓ [Confirm]
PENDING_FUNDS (funds reserved)
  ↓ [Admin: Mark Processing]
PROCESSING
  ↓ [Admin: Settle]
SETTLED ✅

OR

DRAFT
  ↓ [Cancel]
CANCELLED

PENDING_FUNDS
  ↓ [Cancel]
CANCELLED (funds returned)

PENDING_FUNDS / PROCESSING
  ↓ [Admin: Mark Failed]
FAILED
```

---

### Authentication Flow

```
1. User signs up/logs in
2. Backend validates credentials
3. Backend creates JWT token
4. Frontend stores token in localStorage
5. Frontend sends token in Authorization header
6. Backend validates token on each request
7. Backend extracts user info from token
```

**JWT Token contains:**
- User ID
- Email
- Business ID
- Expiration time

---

## 8. Common Tasks

### How to Add a New Endpoint

1. **Add method to Service:**
```typescript
// transfers.service.ts
async myNewMethod(params: {...}) {
  // Business logic here
  return result;
}
```

2. **Add endpoint to Controller:**
```typescript
// transfers.controller.ts
@Get('my-endpoint')
@UseGuards(JwtAuthGuard)
async myEndpoint(@GetUser() user: RequestUser) {
  return this.transfers.myNewMethod({...});
}
```

3. **Test it:**
```bash
curl http://localhost:3000/transfers/my-endpoint \
  -H "Authorization: Bearer $TOKEN"
```

---

### How to Add a New Database Table

1. **Add model to `schema.prisma`:**
```prisma
model MyNewTable {
  id        String   @id @default(dbgenerated("gen_random_uuid()"))
  name      String
  createdAt DateTime @default(now())
  
  @@map("my_new_table")
}
```

2. **Run migration:**
```bash
cd backend
npx prisma migrate dev --name add_my_new_table
```

3. **Generate Prisma client:**
```bash
npx prisma generate
```

4. **Use in code:**
```typescript
await this.prisma.myNewTable.create({ data: {...} });
```

---

### How to Debug an Issue

1. **Check backend logs** (terminal)
2. **Check database** (Prisma Studio)
3. **Check API response** (Postman/cURL)
4. **Add logging:**
```typescript
this.logger.log('Debug: value is', value);
this.logger.error('Error:', error);
```

---

### How to Test a Feature

1. **Start backend:** `npm run start:dev`
2. **Use Postman/cURL** to test endpoints
3. **Check database** (Prisma Studio) to verify data
4. **Check logs** to see what happened

---

## 🎯 Quick Reference

### Important Files

- **`backend/src/main.ts`** — Server entry point
- **`backend/src/app.module.ts`** — Main module (connects everything)
- **`backend/prisma/schema.prisma`** — Database schema
- **`backend/.env`** — Configuration (secrets, API keys)

### Important Commands

```bash
# Start backend
cd backend && npm run start:dev

# Open database browser
cd backend && npx prisma studio

# Run database migrations
cd backend && npx prisma migrate dev

# Generate Prisma client
cd backend && npx prisma generate

# Seed database (add test data)
cd backend && npm run seed
```

### Important URLs

- **Backend API:** `http://localhost:3000`
- **Health Check:** `http://localhost:3000/health`
- **Prisma Studio:** `http://localhost:5555` (when running)

---

## 📝 Next Steps When You Come Back

1. **We'll start the backend together**
2. **We'll check the database** (Prisma Studio)
3. **We'll test each endpoint** (Postman/cURL)
4. **We'll trace a transfer** from creation to settlement
5. **We'll understand the ledger** (how money moves)
6. **We'll check audit logs** (see what happened)
7. **We'll test everything** end-to-end

**Everything will be explained step by step!**

---

**Sleep well! When you come back, we'll go through everything together. 🚀**
