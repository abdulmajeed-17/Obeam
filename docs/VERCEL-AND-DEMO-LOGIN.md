# Vercel (obeam.vercel.app) + demo login

## Demo credentials

| Field | Value |
|-------|--------|
| Business name | Test Co |
| Email | test@company.com |
| Password | password123 |

## 1. Create the demo user in your **production** database

The frontend on Vercel talks to your **production** backend and database. The demo user must exist in that DB.

From your machine (with production `DATABASE_URL` set or passed inline):

```bash
cd backend
DATABASE_URL="postgresql://user:pass@host:5432/dbname" npx prisma db seed
```

Or set `DATABASE_URL` in `.env` to your production Postgres URL, then:

```bash
cd backend
npm run db:seed
```

You only need to run this once per database (or again if you reset the DB). If the user `test@company.com` already exists, the seed skips creating a duplicate.

## 2. Point the Vercel frontend at your production API

The app uses `VITE_API_URL` for all API calls (login, dashboard, etc.). If unset, it defaults to `http://localhost:3000`, which only works locally.

In **Vercel** → your project → **Settings** → **Environment Variables**:

- **Name:** `VITE_API_URL`
- **Value:** your production backend URL (e.g. `https://your-backend.railway.app` or `https://api.obeam.com`)
- **Environment:** Production (and Preview if you want)

Redeploy the frontend after adding the variable so the build gets the new value.

## 3. CORS on the backend

Your production backend must allow requests from `https://obeam.vercel.app`. If you use NestJS default CORS, enable it for that origin (or `*` for dev). Check `main.ts` and your hosting CORS settings.

## 4. Admin panel (optional)

- **URL:** `https://your-frontend.vercel.app/admin`
- **Backend:** Set `ADMIN_SECRET` in your production backend env. Use the same value in the Admin page (or set `VITE_ADMIN_SECRET` at build time so the field is pre-filled).
- **Use:** List transfers, filter by status, Mark processing / Mark settled / Mark failed.

## 5. Cancel transfer (user)

- From **Dashboard → Transfers**, select a transfer with status **DRAFT** or **PENDING_FUNDS**. In the detail panel, click **Cancel transfer** to call `POST /transfers/:id/cancel` and refund reserved NGN.

---

After this:

- **obeam.vercel.app** uses `VITE_API_URL` to call your production API.
- Log in with **test@company.com** / **password123** (Test Co) once the seed has been run on that database.
- **Admin:** Go to `/admin`, enter your `ADMIN_SECRET`, list and manage transfers.
