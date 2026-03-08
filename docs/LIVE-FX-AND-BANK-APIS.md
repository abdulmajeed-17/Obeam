# Live FX feed & bank connectivity APIs

Real data instead of mocked: options for **live FX rates** (NGN/GHS) and **bank connectivity** (Nigeria & Ghana).

---

## 1. Live FX rate APIs

Your app needs **real-time or near–real-time** NGN/GHS (and optionally other) rates to show in the dashboard and to use for quotes. Options:

| Provider | NGN / GHS | Notes | Best for |
|----------|-----------|--------|----------|
| **ExchangeRate-API** | ✅ Both | 165+ currencies, free tier (1,500 req/mo, daily update) or paid. Simple REST, API key. | Quick start, low cost. |
| **Open Exchange Rates** | ✅ Both | 200+ currencies, free tier (1,000 req/mo). JSON, widely used. | SaaS / production. |
| **AbokiFX** | ✅ NGN-focused | Naira specialist, trusted in Nigeria. Subscription, token auth. Endpoints: current, previous, parallel. | NGN accuracy / compliance. |
| **BankFxApi** | ✅ NGN | NGN rates from central banks, 13+ pairs, JSON. | NGN official/parallel. |

**Suggested path**

- **Development / MVP:** Use **ExchangeRate-API** or **Open Exchange Rates** (free tier, NGN + GHS). Backend calls their API on a schedule (e.g. every 5–15 min), maps response to your `fx_rates` table, and your existing `GET /fx/rate` and `POST /fx/quote` use that.
- **Production / Nigeria focus:** Add or switch to **AbokiFX** for NGN if you need local trust and parallel rates; keep a generic provider for GHS or other pairs.

**Integration pattern**

- Add a **feed job** (cron or NestJS `@nestjs/schedule`) that:
  1. Calls the provider (e.g. `GET https://v6.exchangerate-api.com/v6/<KEY>/pair/NGN/GHS`).
  2. Writes or upserts a row into `fx_rates` (base, quote, rate, source, asOf).
- Your existing `FxService.getLatestRate()` already reads from `fx_rates`; no change to quote logic, only the **source of data** becomes live.

---

## 2. Bank connectivity APIs (Nigeria & Ghana)

For **payments, balances, and account data** (not just FX), you need bank/payment APIs.

### Free / sandbox options

| Provider | Region | Free / sandbox | What you get |
|----------|--------|----------------|--------------|
| **Okra** | Nigeria (Africa) | **100 free API calls** on signup + sandbox | Open finance: identity, transactions, income verification, payments. [okra.ng](https://okra.ng/) · [docs](https://docs.okra.ng/get-started) |
| **Open Banking Nigeria** | Nigeria | **Sandbox API** (GitHub) | CBN-aligned standards; sandbox for testing. [openbanking.ng](https://openbanking.ng/) · [GitHub sandbox](https://github.com/openbankingnigeria) |
| **OpenDX** | Ghana | **Free docs + sandbox** | Real-time banking data, consent, PSD2-style. [opendxgh.com](https://opendxgh.com/) |

So yes — there **are** free ways to connect to banks: Okra’s free tier (Nigeria), OBN sandbox (Nigeria), and OpenDX sandbox (Ghana).

### Nigeria

- **Open Banking Nigeria (CBN-backed)**  
  - **Site:** [openbanking.ng](https://openbanking.ng/)  
  - **Docs:** [docs.openbanking.ng](https://docs.openbanking.ng/standard/developer-center/api-architecture)  
  - REST + JSON; categories include **Payment APIs** (account info, fund transfers), **Registration**, **Meta-Directory**, **Open-Data**.  
  - Use for: **payment initiation**, **account information**, compliance-friendly bank connectivity in Nigeria.

- **API aggregators**  
  - Several aggregators sit on top of the Nigerian open banking ecosystem; they simplify multi-bank access (one integration, many banks). Check [Open Banking Tracker – Nigeria](https://www.openbankingtracker.com/country/nigeria) for current aggregators.

### Ghana

- **Bank of Ghana – Open Banking**  
  - Draft **Open Banking Directive** (late 2024); moving from pilot to formal framework.  
  - Focus: consent, data protection, cybersecurity.  
  - Use for: future **standardised** bank connectivity in Ghana.

- **OpenDX**  
  - **Site:** [opendxgh.com](https://opendxgh.com/)  
  - PSD2-style platform in Ghana: **real-time banking data**, **consent management**, developer APIs.  
  - Use for: **Ghana bank/payment connectivity** today (pilots and early production).

### Summary

| Region | What to use | Use case |
|--------|-------------|----------|
| **Nigeria** | Open Banking Nigeria (+ aggregators) | Payments, account info, transfers |
| **Ghana** | OpenDX (and BoG when directive is live) | Bank data, payments |

You do **not** need PSD2 Europe for Nigeria/Ghana; use the local frameworks above.

---

## 3. What to implement first

1. **Live FX**  
   - Pick one provider (e.g. ExchangeRate-API), add a **scheduled job** that fetches NGN/GHS (and any other pairs you need) and writes to `fx_rates`.  
   - Your existing `/fx/rate` and `/fx/quote` then serve **real** rates.

2. **Banks**  
   - When you’re ready for **real** payments/balances:  
     - **Nigeria:** Register / integrate with Open Banking Nigeria (or an aggregator).  
     - **Ghana:** Integrate OpenDX (and later Bank of Ghana APIs when available).  
   - This is a larger piece (KYC, compliance, contracts); treat it as Phase 2 after FX is live.

---

## 4. Using the built-in live FX feed (ExchangeRate-API)

The backend has a **sync** that pulls NGN/GHS from ExchangeRate-API and writes into `fx_rates`.

**Setup**

1. Get a free API key: [exchangerate-api.com](https://www.exchangerate-api.com/) (free tier: 1,500 requests/month).
2. In `backend/.env` add:
   ```env
   FX_FEED_API_KEY=your_api_key_here
   ```
   Optional (recommended for production): set `FX_SYNC_SECRET` and call the sync endpoint with header `X-Fx-Sync-Secret: <same value>` so only your cron can trigger it.

**Trigger the feed**

- **Manual:** `GET https://your-api.com/fx/sync` (no auth). If `FX_SYNC_SECRET` is set, send header `X-Fx-Sync-Secret: <value>`.
- **Cron:** Call the same URL every 5–15 minutes (e.g. Vercel Cron, GitHub Actions, or a server cron). ExchangeRate-API free tier updates once per day; more frequent calls just reuse the same rate until the provider updates.

After the first successful sync, `GET /fx/rate?base=GHS&quote=NGN` (and your dashboard Live FX) will return **real** rates from the feed instead of “No FX rate found”.
