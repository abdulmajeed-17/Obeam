# Email Setup (Resend)

Obeam sends welcome emails, money-received notifications, and transfer updates via [Resend](https://resend.com).

## Why you didn't receive emails

1. **`RESEND_API_KEY` not set in Railway** — Emails are logged to console only, never sent.
2. **`EMAIL_FROM` missing or uses an unverified domain** — Resend rejects emails from unverified domains.

## Quick setup (5 min)

### 1. Create a Resend account

Go to [resend.com](https://resend.com) and sign up with the same email you use for Obeam signup (for testing).

### 2. Create an API key

Resend Dashboard → **API Keys** → **Create API Key** → Copy the key (`re_...`).

### 3. Add env vars in Railway

In your **backend** service on Railway → **Variables**:

| Variable        | Value |
|----------------|-------|
| `RESEND_API_KEY` | `re_xxxxxxxx` (your key) |
| `EMAIL_FROM`     | `onboarding@resend.dev` |

**Note:** With `onboarding@resend.dev`, Resend only delivers to the email you signed up with on Resend. So sign up at Resend using the same email you'll test Obeam with (e.g. your Gmail). For production, verify your own domain and use `Obeam <noreply@yourdomain.com>`.

### 4. Redeploy

Redeploy the backend on Railway. Check logs — you should see: `Resend API key configured — emails will be sent via Resend`.

---

## Production (verified domain)

1. Resend Dashboard → **Domains** → **Add Domain** → Enter your domain
2. Add the DNS records Resend gives you to your domain provider
3. Set `EMAIL_FROM=Obeam <noreply@yourdomain.com>` in Railway
4. Redeploy
