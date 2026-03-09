# Email Setup (Resend)

Obeam sends welcome emails, money-received notifications, and transfer updates via [Resend](https://resend.com).

## Why you didn't receive emails

1. **`RESEND_API_KEY` not set** — Emails are logged to the console only.
2. **`EMAIL_FROM` uses an unverified domain** — Resend only allows sending from domains you've verified.

## Setup steps

### 1. Create a Resend account

Go to [resend.com](https://resend.com) and sign up.

### 2. Add and verify your domain

1. In Resend Dashboard → **Domains** → **Add Domain**
2. Enter your domain (e.g. `obeam.com` or `yourdomain.com`)
3. Add the DNS records Resend gives you (TXT, MX, etc.) to your domain provider
4. Wait for verification (usually a few minutes)

**Alternative:** If you don't have a domain yet, Resend offers a test domain. For production, you'll need your own verified domain.

### 3. Create an API key

1. Resend Dashboard → **API Keys** → **Create API Key**
2. Copy the key (starts with `re_`)

### 4. Set environment variables in Railway

Add these to your backend service in Railway:

| Variable        | Example value                          |
|----------------|----------------------------------------|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxxxxx`                 |
| `EMAIL_FROM`     | `Obeam <noreply@yourdomain.com>`      |

**Important:** `EMAIL_FROM` must use a domain you verified in Resend.  
Example: if you verified `obeam.com`, use `Obeam <noreply@obeam.com>`.

### 5. Redeploy

Redeploy the backend on Railway so it picks up the new env vars.

---

After this, new signups will receive the welcome email.
