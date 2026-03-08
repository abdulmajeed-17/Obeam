# Nigeria + Ghana bank connectivity — real money

This doc describes how Obeam connects to **real banks** in Nigeria and Ghana so you move real money instead of mock data.

---

## Are these providers legitimate?

- **OpenDX (Ghana)** — **Yes.** OpenDX is the **Bank of Ghana’s** proposed open banking platform (“Open Data Exchange”), mentioned in the central bank’s draft Open Banking Directive (Dec 2024). It’s regulatory/public infrastructure, not a random third party. [opendxgh.com](https://opendxgh.com)
- **Nigeria** — **Okra shut down in May 2025** (was real and well-funded, not a scam; closed due to market/regulatory challenges). For Nigeria, use **Mono** or **Stitch** instead — both are real, operating, and used by many apps. This repo still has an `okra/` module as scaffolding; you can replace it with **Mono** (docs: [docs.mono.co](https://docs.mono.co)) or **Stitch** for Nigerian bank linking, balance, and payments.

---

## 1. What each does

| Provider | Region | Role in Obeam |
|----------|--------|----------------|
| **Mono** (or Stitch) | Nigeria | **Debit sender:** Link customer’s Nigerian bank → read balance → initiate payment (debit). Mono: 50+ banks, DirectPay/DirectDebit. [mono.co](https://mono.co) |
| **OpenDX** | Ghana | **Credit recipient:** Push GHS into recipient’s Ghana bank or mobile money. BoG-backed. [opendxgh.com](https://opendxgh.com) |

**End-to-end flow:**  
NGN leaves sender’s Nigerian bank (Mono/Stitch) → your ledger (FX, wallets) → GHS credited to recipient’s Ghana account (OpenDX).

---

## 2. Get API access

### Nigeria: Mono (recommended; Okra has shut down)

1. Sign up: [mono.co](https://mono.co) → Developers / Get started.
2. Get **Secret Key** from the dashboard (sandbox then live).
3. Docs: [docs.mono.co](https://docs.mono.co) — Connect (link bank, balance, transactions), DirectPay/DirectDebit (payments).
4. Mono is backed by Flutterwave; 50+ Nigerian banks.

**Env (backend `.env`):** Use the existing `okra/` module as a template and point it at Mono’s API, or add a `mono/` module:

```env
# Mono (Nigeria) — replace Okra after Okra shutdown
MONO_SECRET_KEY=your_mono_secret_key
MONO_BASE_URL=https://api.withmono.com
```

### OpenDX (Ghana)

1. Sign up: [opendxgh.com](https://opendxgh.com) → Developer / API.
2. Get **API key** and **base URL** (sandbox vs production) from their portal.
3. Docs: [opendxgh.com](https://opendxgh.com) — use their API docs for payouts/transfers.

**Env (backend `.env`):**

```env
OPENDX_API_KEY=your_opendx_api_key
OPENDX_BASE_URL=https://api.opendxgh.com
# Sandbox URL from OpenDX dashboard if different
```

---

## 3. Backend scaffolding

The repo has:

- **`backend/src/okra/`** — OkraModule, OkraService, OkraController.  
  - Service: `getBalance(recordId)`, `createAuthLink(customerId, callbackUrl)`, `charge(debitParams)` (or equivalent payment endpoint).  
  - Controller: JWT-protected routes that your frontend calls (e.g. `POST /okra/link`, `GET /okra/balance`, `POST /okra/charge`).

- **`backend/src/opendx/`** — OpenDXModule, OpenDXService, OpenDXController.  
  - Service: `payout(toAccount, amountGhs, reference)`.  
  - Controller: e.g. `POST /opendx/payout` (called after you’ve converted NGN→GHS and want to push to Ghana).

Exact Okra/OpenDX endpoint paths and payloads come from their docs; the scaffolding uses env vars and placeholder URLs so you can plug in real calls once you have keys.

---

## 4. How to wire it into your flow

1. **Link bank (Nigeria)**  
   - Frontend: “Link Nigerian bank” → backend returns Okra auth/link URL (or widget config).  
   - User completes Okra flow → Okra redirects or webhook → you store `record_id` (or account id) for that user/business.

2. **Send NGN → GHS**  
   - User enters amount and recipient.  
   - Backend:  
     - (Optional) Okra: get balance; if enough, call Okra payment/debit to pull NGN into your pool (or record intent).  
     - Your ledger: create transfer, FX quote, reserve/settle NGN and GHS.  
     - OpenDX: call payout with recipient’s Ghana account and GHS amount; use transfer id as reference.

3. **Recipient (Ghana)**  
   - Recipient details (bank/momo account) come from your **Counterparties** (or recipient form).  
   - OpenDX payout API credits that account; you map counterparty to OpenDX account id or payout params.

---

## 5. Checklist

- [ ] Sign up Okra, get Secret Key, set `OKRA_SECRET_KEY` and `OKRA_BASE_URL`.
- [ ] Sign up OpenDX, get API key, set `OPENDX_API_KEY` and `OPENDX_BASE_URL`.
- [ ] Implement OkraService methods using [docs.okra.ng](https://docs.okra.ng/reference) (auth link, balance, payments).
- [ ] Implement OpenDXService payout using OpenDX API docs.
- [ ] Store Okra `record_id` (or account id) per user/business when they link bank.
- [ ] In transfer confirm flow: debit via Okra (if using bank debit), then ledger, then OpenDX payout for GHS.

Once keys and endpoints are in place, the scaffolding in `okra/` and `opendx/` is where real bank connectivity lives; the rest of Obeam (wallets, FX, transfers) stays the same and just calls these services when moving real money.
