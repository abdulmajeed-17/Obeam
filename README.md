# Obeam

B2B cross-border payment infrastructure for African businesses. API-first platform supporting 7 currencies (NGN, GHS, KES, ZAR, XOF, USD, GBP) with smart settlement routing across 5 bank APIs.

## Getting Started

### Frontend
```bash
npm install
npm run dev
```

### Backend
```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET
npm install
npx prisma generate
npm run start:dev
```

### Run Tests
```bash
cd backend
npm test
```

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend:** NestJS, TypeScript, PostgreSQL, Prisma ORM
- **Bank APIs:** Okra (NGN), OpenDX (GHS), M-Pesa (KES), Stitch (ZAR), Interswitch (NGN)
- **Deployment:** Vercel (frontend) + Railway (backend)

## API Docs

Swagger UI available at `/api/docs` when the backend is running.
