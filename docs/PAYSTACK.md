# Paystack — How to Move Money

Paystack powers **deposits** (add money to your wallet) and **withdrawals** (send money to your bank) in Obeam.

---

## Setup (one-time)

1. Create a Paystack account at [dashboard.paystack.com](https://dashboard.paystack.com)
2. Go to **Settings → API Keys & Webhooks**
3. Copy **Secret Key** (`sk_test_...` for test, `sk_live_...` for production)
4. In Railway, add: `PAYSTACK_SECRET_KEY=sk_test_xxxxx`
5. Set **Webhook URL**: `https://YOUR-RAILWAY-URL/paystack/webhook`  
   (e.g. `https://obeam-production.up.railway.app/paystack/webhook`)
6. Redeploy the backend

---

## How it works

### Deposit (add money to wallet)

1. In Obeam: **Wallets** → **Deposit (real money)**
2. Pick a currency (NGN, GHS, ZAR, KES, USD)
3. Enter amount → click **Deposit**
4. You're redirected to Paystack's checkout page
5. Pay with **card** or **bank transfer**
6. Paystack sends a webhook to your backend → your wallet is credited
7. You see the balance in Obeam

**Flow:** Your card/bank → Paystack → Obeam wallet

### Withdraw (send money to bank)

1. In Obeam: **Wallets** → **Withdraw to bank**
2. Select currency, bank, enter account number and name
3. Enter amount → click **Withdraw**
4. Money is debited from your Obeam wallet and sent to the bank account via Paystack
5. Usually arrives within minutes (NGN) or a few hours depending on the bank

**Flow:** Obeam wallet → Paystack → Your bank account

---

## Supported currencies

- **NGN** (Nigeria) — card, bank transfer, bank payout
- **GHS** (Ghana) — card, mobile money
- **ZAR** (South Africa) — card, bank
- **KES** (Kenya) — M-Pesa, card
- **USD** — card only (deposits)

---

## Test mode

Use **test keys** (`sk_test_...`, `pk_test_...`) for development. Paystack requires **test card numbers** — real cards are declined in test mode.

### Test card (successful payment)

| Field   | Value              |
|--------|--------------------|
| Card   | `4084 0840 8408 4081` |
| Expiry | Any future date (e.g. `02/27`) |
| CVV    | `408`              |
| PIN    | `0000` (if asked)  |
| OTP    | `123456` (if asked)|

**Alternative (with PIN):** `5078 5078 5078 5078 12` — Expiry: 02/27, CVV: 081, PIN: 1111

No real money is charged. See [Paystack Test Payments](https://docs.paystack.co/payments/test-payments) for more.
