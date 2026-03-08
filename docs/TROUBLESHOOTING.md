# Troubleshooting — Backend Connection Issues

## Problem: "Network error: Failed to fetch. Is the backend running at http://localhost:3000?"

### Quick Fix Steps

1. **Check if backend is running:**
   ```bash
   # In backend directory
   cd backend
   npm run start:dev
   ```

2. **Look for this message:**
   ```
   Obeam API running at http://localhost:3000
   ```
   If you see this, backend is running ✅

3. **If backend crashes, check the error:**
   - Look for `ERROR` messages in terminal
   - Common issues:
     - Missing environment variables
     - Database connection issues
     - Port already in use

---

## Common Issues & Fixes

### Issue 1: ENCRYPTION_KEY Error

**Error:**
```
Error: ENCRYPTION_KEY must be set
```

**Fix:**
Add to `backend/.env`:
```env
ENCRYPTION_KEY=obeam-dev-encryption-key-change-in-production
```

**Then restart backend.**

---

### Issue 2: Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Fix:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill it
kill -9 $(lsof -ti:3000)

# Or use different port
# In backend/.env, change:
PORT=3001
```

---

### Issue 3: Database Connection Error

**Error:**
```
Can't reach database server
```

**Fix:**
1. Check `DATABASE_URL` in `backend/.env`
2. Test connection:
   ```bash
   cd backend
   npx prisma db pull
   ```
3. If Railway database, might need:
   ```env
   NODE_TLS_REJECT_UNAUTHORIZED=0
   ```
   (dev only!)

---

### Issue 4: TypeScript Compilation Errors

**Error:**
```
error TS2307: Cannot find module...
```

**Fix:**
1. Make sure all files exist
2. Restart TypeScript compiler:
   ```bash
   cd backend
   # Stop server (Ctrl+C)
   npm run start:dev
   ```

---

### Issue 5: Frontend Can't Connect

**Symptoms:**
- Backend is running ✅
- Frontend shows "Failed to fetch" ❌

**Fix:**
1. **Check CORS:**
   - Backend allows `http://localhost:5173`
   - Check `backend/.env`: `CORS_ORIGIN=http://localhost:5173`

2. **Check frontend API URL:**
   - Frontend uses: `http://localhost:3000`
   - Check `src/components/Auth.tsx`: `const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';`

3. **Test backend directly:**
   ```bash
   curl http://localhost:3000/health
   ```
   Should return JSON.

4. **Check browser console:**
   - Open DevTools (F12)
   - Check Network tab
   - See if request is being made
   - Check for CORS errors

---

## Step-by-Step Debugging

### Step 1: Verify Backend is Running

```bash
# Terminal 1: Start backend
cd backend
npm run start:dev

# Should see:
# [Nest] Starting Nest application...
# Obeam API running at http://localhost:3000
```

### Step 2: Test Backend Health

```bash
# Terminal 2: Test health endpoint
curl http://localhost:3000/health

# Should return:
# {"status":"healthy",...}
```

### Step 3: Test from Browser

Open: `http://localhost:3000/health`

Should see JSON response.

### Step 4: Check Frontend

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to login
4. Check if request shows up
5. Check response/error

---

## Still Not Working?

### Check These:

1. **Backend terminal:**
   - Any ERROR messages?
   - Is server actually running?
   - Check last log message

2. **Frontend terminal:**
   - Any errors?
   - Is frontend running on port 5173?

3. **Ports:**
   - Backend: `http://localhost:3000`
   - Frontend: `http://localhost:5173`
   - Both should be different!

4. **Environment variables:**
   ```bash
   cd backend
   cat .env
   ```
   Should have:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `ENCRYPTION_KEY`
   - `PORT=3000`
   - `CORS_ORIGIN=http://localhost:5173`

---

## Quick Test Script

```bash
#!/bin/bash

echo "1. Checking backend..."
curl -s http://localhost:3000/health > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Backend is running"
else
  echo "❌ Backend is NOT running"
  echo "   Start it with: cd backend && npm run start:dev"
fi

echo ""
echo "2. Checking frontend..."
curl -s http://localhost:5173 > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Frontend is running"
else
  echo "❌ Frontend is NOT running"
  echo "   Start it with: npm run dev"
fi
```

---

## Still Stuck?

**Share:**
1. Backend terminal output (last 20 lines)
2. Frontend browser console errors
3. Network tab screenshot

Then we can debug together! 🚀
