# Starting the Servers

## Quick Start (Recommended)

Run the startup script:
```bash
./start-servers.sh
```

This will:
1. Kill any existing processes on ports 3001 and 5173
2. Start the backend server on http://localhost:3001
3. Start the frontend server on http://localhost:5173
4. Show you the status of both servers

## Manual Start

### Terminal 1 - Backend Server
```bash
cd server
pnpm dev
```

You should see:
```
📦 Initializing database...
✅ Database initialized
🚀 Server running on http://localhost:3001
```

### Terminal 2 - Frontend Server
```bash
cd pages/web-app
pnpm dev
```

You should see:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## Verify Servers Are Running

### Backend Health Check
```bash
curl http://localhost:3001/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### Frontend
Open http://localhost:5173 in your browser

## Troubleshooting

### Port Already in Use

**Backend (port 3001):**
```bash
# Find and kill process
lsof -ti:3001 | xargs kill -9

# Or use a different port
cd server
PORT=3002 pnpm dev
```

Then update `pages/web-app/.env.local`:
```
VITE_API_BASE_URL=http://localhost:3002/api
```

**Frontend (port 5173):**
```bash
# Find and kill process
lsof -ti:5173 | xargs kill -9

# Or use a different port
cd pages/web-app
pnpm dev --port 5174
```

### Backend Not Starting

1. Check if dependencies are installed:
   ```bash
   cd server
   pnpm install
   ```

2. Check database directory exists:
   ```bash
   ls -la server/data
   ```

3. Check server logs for errors

### Frontend Can't Connect to Backend

1. Verify backend is running:
   ```bash
   curl http://localhost:3001/health
   ```

2. Check `.env.local` file exists in `pages/web-app/`:
   ```env
   VITE_API_BASE_URL=http://localhost:3001/api
   ```

3. Restart frontend after changing `.env.local`

### Database Errors

If you see database errors:
```bash
# Create data directory
mkdir -p server/data

# Restart server
cd server
pnpm dev
```

## Stopping Servers

### If using the script:
Press `Ctrl+C` in the terminal running the script

### If started manually:
Press `Ctrl+C` in each terminal, or:
```bash
# Kill by port
lsof -ti:3001 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
```

