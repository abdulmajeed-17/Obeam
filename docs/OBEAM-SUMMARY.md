# Obeam — Product Summary & Positioning

## Quick Run Check ✅

- **Backend:** Builds successfully
- **Frontend:** Builds successfully  
- **Tests:** 81 tests passing
- **Linter:** No errors

---

## What Obeam Does

**Obeam** is a B2B cross-border payments platform for African businesses. Think Stripe + Wise, built for Africa.

### Core Value Proposition

Send and receive money across African borders (Nigeria, Ghana, Kenya, South Africa, etc.) with:
- **Multi-currency wallets** — NGN, GHS, KES, ZAR, XOF, USD, GBP
- **Instant internal transfers** — Send to anyone by email; if they're on Obeam, money lands in seconds
- **Cross-currency conversion** — Automatic FX at live rates with transparent 1% spread
- **Deposits & withdrawals** — Paystack for card/bank deposits; withdraw to local bank accounts
- **Email-based sending** — No account? Recipient gets an email to sign up and claim

---

## What It's Used For

| Use Case | How Obeam Helps |
|----------|-----------------|
| **Pay suppliers abroad** | Nigerian business pays Ghanaian supplier in GHS — no SWIFT, no correspondent banks |
| **Receive payments** | Ghanaian exporter gets paid in NGN from a Nigerian buyer — converted automatically |
| **Freelancer payouts** | Pay remote contractors across borders by email — they claim when they sign up |
| **Multi-currency operations** | Hold NGN, GHS, KES in one dashboard; convert at live rates when needed |
| **SMB treasury** | Small businesses manage cross-border cash flow without a corporate bank setup |

---

## How It's Different From Competitors

| | **Obeam** | **Flutterwave** | **Paystack** | **Wise** |
|---|-----------|-----------------|--------------|----------|
| **Focus** | B2B cross-border, Africa-first | Payments aggregation | Domestic + some cross-border | Global consumer/SMB |
| **Email-to-claim** | ✅ Send to unregistered email | ❌ | ❌ | ❌ |
| **Multi-currency wallets** | ✅ In-app | Via partners | Limited | ✅ |
| **Internal ledger** | ✅ Double-entry, audit-ready | ❌ | ❌ | ✅ |
| **API-first** | ✅ | ✅ | ✅ | ✅ |
| **Africa corridors** | NGN↔GHS, KES, ZAR, XOF | Broad | Nigeria-centric | Limited Africa |

**Obeam's edge:** Email-based sending + instant internal transfers + multi-currency wallets in one product. Competitors either focus on domestic payments, require both parties to have accounts, or don't offer the same wallet + FX + send-by-email combo.

---

## Why Obeam, Why Now

1. **Africa's trade is growing** — Intra-African trade is rising (AfCFTA); businesses need simple cross-border rails.
2. **Existing solutions are clunky** — SWIFT is slow and expensive; local players are often domestic-only or fragmented.
3. **Email = low friction** — You don't need the recipient's bank details or Obeam account. Send by email; they claim when ready.
4. **Regulatory tailwinds** — CBN, BOG, and others are opening up; fintech infrastructure is maturing.
5. **Infrastructure play** — Double-entry ledger, API-first design — built to be the rails others build on.

---

## What It Does Right Now

### Live Features

- **Auth** — Signup, login, JWT, default wallet by country
- **Wallets** — Multi-currency (NGN, GHS, KES, ZAR, XOF, USD, GBP), add/remove, balances
- **Deposits** — Paystack (card/bank) → wallet credited; test mode with test cards
- **Withdrawals** — Wallet → bank account via Paystack (NGN, GHS, ZAR, KES)
- **Send by email** — Internal transfers; cross-currency FX; unregistered users get email to claim
- **Convert** — FX conversion between wallets at live rates (1% spread)
- **Activity feed** — Recent transactions, sent/received
- **Verification** — KYB document upload (CAC, utility, bank statement, director ID)
- **Invoices** — API ready; UI coming soon
- **Emails** — Welcome, money-received (requires Resend + verified domain for any email)

### Tech Stack

- **Frontend:** React, Vite, Tailwind, Framer Motion
- **Backend:** NestJS, Prisma, PostgreSQL
- **Payments:** Paystack (deposits, withdrawals)
- **Email:** Resend
- **Deploy:** Vercel (frontend), Railway (backend)

---

## What's Next

### Near-term (Next 3–6 months)

1. **Invoice UI** — Create, send, track invoices; payment links
2. **Webhook reliability** — Ensure Paystack webhook credits wallet without manual verify
3. **Resend domain** — Verify domain so emails reach any address
4. **More corridors** — Expand Paystack/bank support for XOF, USD
5. **Settlement automation** — Replace manual admin settlement with automated rails

### Medium-term (6–12 months)

1. **API platform** — Public API for other fintechs to integrate Obeam
2. **Enterprise** — Volume pricing, SLA, dedicated support
3. **AML/KYC automation** — Document OCR, risk scoring, sanctions screening
4. **Multi-currency Paystack** — Enable more currencies per merchant

### Long-term (Acquisition path)

1. **White-label** — Banks/neobanks use Obeam under their brand
2. **Settlement rails** — Direct bank/switch integrations (Okra, OpenDX, M-Pesa, Stitch)
3. **Compliance moat** — SOC 2, regulatory reporting, audit trail
4. **AI-powered** — Smart routing, fraud detection, FX prediction

---

## One-Liner

**Obeam:** Send money across Africa by email. Multi-currency wallets, live FX, instant if they're on Obeam — or they sign up to claim.
