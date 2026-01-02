# Starting the Server

## Quick Start

1. **Navigate to server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies (if not already installed):**
   ```bash
   pnpm install
   ```

3. **Start the development server:**
   ```bash
   pnpm dev
   ```

   You should see:
   ```
   📦 Initializing database...
   ✅ Database initialized
   🚀 Server running on http://localhost:3001
   ```

4. **Verify it's working:**
   ```bash
   curl http://localhost:3001/health
   ```
   
   Should return: `{"status":"ok","timestamp":"..."}`

## Troubleshooting

### Port Already in Use
If port 3001 is already in use, set a different port:
```bash
PORT=3002 pnpm dev
```

Then update your frontend `.env.local`:
```
VITE_API_BASE_URL=http://localhost:3002/api
```

### Database Errors
If you see database errors, the `data/` directory should be created automatically. If not:
```bash
mkdir -p server/data
```

### Module Not Found
Make sure dependencies are installed:
```bash
cd server
pnpm install
```

## Running in Production

1. **Build:**
   ```bash
   pnpm build
   ```

2. **Start:**
   ```bash
   pnpm start
   ```

