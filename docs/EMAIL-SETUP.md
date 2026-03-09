# Email Setup (Resend)

Obeam sends welcome emails, money-received notifications, and transfer updates via [Resend](https://resend.com).

## Why you didn't receive emails

1. **`RESEND_API_KEY` not set in Railway** — Emails are logged to console only, never sent.
2. **`onboarding@resend.dev`** — Resend's test sender only delivers to the ONE email you signed up with on Resend. Any other email (e.g. majeed.sulaiman5@gmail.com) will NOT receive emails.
3. **To send to ANY email** — You must verify your own domain (see below).

---

## Send to ANY email (verified domain)

To get welcome emails regardless of which email someone signs up with:

### 1. Add a domain in Resend

Resend Dashboard → **Domains** → **Add domain**

- If you have a domain (e.g. `obeam.com`): use it
- If you use Vercel: you get `your-app.vercel.app` — add that
- Or buy a cheap domain (e.g. Namecheap, ~$10/year)

### 2. Add DNS records

Resend will show you TXT, MX, and optional DKIM records. Add them in your domain provider (Vercel, Namecheap, etc.). Verification usually takes a few minutes.

### 3. Set env vars in Railway

| Variable        | Value |
|----------------|-------|
| `RESEND_API_KEY` | Your key from Resend |
| `EMAIL_FROM`     | `Obeam <noreply@yourdomain.com>` or `Obeam <noreply@your-app.vercel.app>` |

### 4. Redeploy

Redeploy the backend. Emails will now be delivered to any address.

---

## Quick test (one email only)

With `EMAIL_FROM=onboarding@resend.dev`, Resend only delivers to the email you signed up with on Resend. Use this only for quick testing.
