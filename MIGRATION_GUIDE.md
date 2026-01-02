# Migration Guide: Client-Side to Server-Side Storage

This guide explains the migration from localStorage (client-side) to server-side API storage.

## What Changed

### Backend (New)
- **Server API** (`server/` directory)
  - Express.js REST API
  - SQLite database (better-sqlite3)
  - CRUD endpoints for all entities

### Frontend (Updated)
- **Storage Classes** now use API calls instead of localStorage:
  - `projectStorage.ts` - Uses `/api/projects`
  - `testSuiteStorage.ts` - Uses `/api/test-suites` and `/api/test-cases`
  - `promptStorage.ts` - Uses `/api/prompts`
- **API Configuration** (`apiConfig.ts`)
  - Centralized API endpoint configuration
  - Generic HTTP request helpers

## Setup Instructions

### 1. Install Server Dependencies

```bash
cd server
pnpm install
```

### 2. Configure Environment

Create `server/.env`:
```env
PORT=3001
DATABASE_PATH=./data/database.sqlite
NODE_ENV=development
```

### 3. Start the Server

```bash
cd server
pnpm dev
```

The server will run on `http://localhost:3001`

### 4. Configure Frontend

Create or update `pages/web-app/.env.local`:
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

### 5. Start Frontend

```bash
pnpm -F web-app dev
```

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Test Suites
- `GET /api/test-suites/project/:projectId` - List suites for project
- `GET /api/test-suites/:id` - Get suite
- `POST /api/test-suites` - Create suite
- `PUT /api/test-suites/:id` - Update suite
- `DELETE /api/test-suites/:id` - Delete suite

### Test Cases
- `GET /api/test-cases` - List all test cases
- `GET /api/test-cases/suite/:suiteId` - List cases for suite
- `GET /api/test-cases/:id` - Get test case
- `POST /api/test-cases` - Create test case
- `PUT /api/test-cases/:id` - Update test case
- `DELETE /api/test-cases/:id` - Delete test case

### Prompts
- `GET /api/prompts/project/:projectId` - List prompts for project
- `GET /api/prompts/:id` - Get prompt
- `POST /api/prompts` - Create prompt
- `PUT /api/prompts/:id` - Update prompt
- `DELETE /api/prompts/:id` - Delete prompt
- `POST /api/prompts/:id/duplicate` - Duplicate prompt

## Data Migration

If you have existing localStorage data, you can:

1. **Export from localStorage** (browser console):
```javascript
const projects = JSON.parse(localStorage.getItem('web_app_projects') || '[]');
const suites = JSON.parse(localStorage.getItem('web_app_test_suites') || '[]');
const cases = JSON.parse(localStorage.getItem('web_app_test_cases') || '[]');
const prompts = JSON.parse(localStorage.getItem('web_app_prompts') || '[]');

// Save to files or use API to import
```

2. **Import via API** (using curl or Postman):
```bash
# Create projects
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project","team":"Team A","icon":"📁"}'
```

## Database Schema

The SQLite database has the following tables:
- `projects` - Project information
- `test_suites` - Test suite definitions
- `test_cases` - Individual test cases with Playwright code
- `prompts` - Automation prompts

All tables use foreign keys for referential integrity.

## Benefits

1. **Persistent Storage** - Data survives browser clearing
2. **Multi-Device Access** - Access from any device
3. **Backup & Recovery** - Database can be backed up
4. **Scalability** - Can be migrated to PostgreSQL/MySQL
5. **Security** - Server-side validation and access control

## Troubleshooting

### Server won't start
- Check if port 3001 is available
- Ensure dependencies are installed: `pnpm install`
- Check database directory permissions

### Frontend can't connect
- Verify server is running: `curl http://localhost:3001/health`
- Check `VITE_API_BASE_URL` in `.env.local`
- Check browser console for CORS errors

### Database errors
- Ensure `data/` directory exists and is writable
- Check database file permissions
- Delete `database.sqlite` to reset (⚠️ loses all data)

