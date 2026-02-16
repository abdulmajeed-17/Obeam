# Deploy Obeam Backend to Railway

Use this when your Postgres is already on Railway (e.g. project **perpetual-clarity**). The backend will use the **internal** `DATABASE_URL` so Prisma connects without TLS issues.

---

## 1. Add a new service in the same project

1. Open [Railway](https://railway.app) → your project (the one with Postgres).
2. Click **+ New** → **GitHub Repo**.
3. Select **abdulmajeed-17/Obeam** (or your repo).
4. Railway will add a new service from that repo.

---

## 2. Set Root Directory to `backend`

1. Open the **new service** (not Postgres).
2. Go to **Settings** (or the service’s config).
3. Find **Root Directory** (or **Source**).
4. Set it to **`backend`** so the app is built from the `backend/` folder.

---

## 3. Build and start commands

If not auto-detected, set:

| Setting         | Value                    |
|----------------|--------------------------|
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start:prod`         |

(`backend/railway.toml` already sets these if Railway reads it.)

---

## 4. Connect to Postgres (internal URL)

1. In the **backend service**, go to **Variables**.
2. Add a variable:
   - **Name:** `DATABASE_URL`
   - **Value:** Click **Add Reference** / **Variable Reference** and select the **Postgres** service’s **`DATABASE_URL`** (the one with `postgres.railway.internal`).
3. That way the backend uses the internal URL and avoids TLS errors.

---

## 5. Other variables (optional)

| Variable      | Example / note |
|---------------|----------------|
| `JWT_SECRET`  | A long random string (e.g. 32+ chars). **Required** for auth. |
| `CORS_ORIGIN` | Your frontend URL, e.g. `https://obeam-noi1.vercel.app` so the browser can call the API. |
| `PORT`        | Railway usually sets this; leave default if present. |

---

## 6. Deploy

1. Save settings.
2. Trigger a **Deploy** (or push to the connected branch).
3. After the build, open the service → **Settings** → **Networking** → **Generate Domain** to get a public URL (e.g. `https://your-service.up.railway.app`).

---

## 7. Test

- **Health:** `GET https://your-service.up.railway.app/health` → `{ "status": "ok", "service": "obeam-api" }`.
- **Signup:** `POST https://your-service.up.railway.app/auth/signup` with body `{ "email": "you@example.com", "password": "password123", "businessName": "My Co" }`.

---

## 8. Point the frontend at the API

In your **frontend** (Vercel), add an env var:

- **Name:** `VITE_API_URL`
- **Value:** `https://your-service.up.railway.app`

Then use `import.meta.env.VITE_API_URL` in the frontend for API calls (e.g. signup, login). Redeploy the frontend after adding the variable.
