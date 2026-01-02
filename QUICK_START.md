# Quick Start Guide

## Start Both Servers

### Step 1: Start Backend Server

Open Terminal 1:
```bash
cd server
pnpm install  # Only needed first time
pnpm dev
```

Wait for:
```
📦 Initializing database...
✅ Database initialized
🚀 Server running on http://localhost:3001
```

### Step 2: Start Frontend Server

Open Terminal 2:
```bash
cd pages/web-app
pnpm dev
```

Wait for:
```
  VITE v6.x.x  ready in xxx ms
  ➜  Local:   http://localhost:3000/
```

### Step 3: Verify

1. **Backend Health Check:**
   ```bash
   curl http://localhost:3001/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Frontend:**
   Open http://localhost:3000 in your browser

## How It Works

- **Backend**: Runs on `http://localhost:3001`
- **Frontend**: Runs on `http://localhost:3000`
- **Proxy**: Vite automatically proxies `/api/*` requests to the backend

## Troubleshooting

### Backend Not Starting

1. Check if port 3001 is in use:
   ```bash
   lsof -ti:3001
   ```

2. Kill existing process:
   ```bash
   lsof -ti:3001 | xargs kill -9
   ```

3. Check database directory:
   ```bash
   ls -la server/data
   ```
   Should exist and be writable

### Frontend Can't Connect

1. Verify backend is running:
   ```bash
   curl http://localhost:3001/health
   ```

2. Check browser console for errors

3. Restart frontend after backend starts

### Still Getting 404 Errors

1. Make sure backend is running on port 3001
2. Check backend logs for route registration
3. Verify the proxy is working (check Network tab in browser DevTools)

## Production

For production, set `VITE_API_BASE_URL` in your environment:
```env
VITE_API_BASE_URL=https://your-api-domain.com/api
```

