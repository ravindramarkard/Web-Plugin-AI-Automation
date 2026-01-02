# AITestGen Backend API Server

Server-side API for managing projects, test suites, test cases, and prompts.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Start development server:
```bash
pnpm dev
```

The server will run on `http://localhost:3001` by default.

## API Endpoints

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Test Suites
- `GET /api/test-suites/project/:projectId` - Get all test suites for a project
- `GET /api/test-suites/:id` - Get test suite by ID
- `POST /api/test-suites` - Create test suite
- `PUT /api/test-suites/:id` - Update test suite
- `DELETE /api/test-suites/:id` - Delete test suite

### Test Cases
- `GET /api/test-cases` - Get all test cases
- `GET /api/test-cases/suite/:suiteId` - Get test cases by suite
- `GET /api/test-cases/:id` - Get test case by ID
- `POST /api/test-cases` - Create test case
- `PUT /api/test-cases/:id` - Update test case
- `DELETE /api/test-cases/:id` - Delete test case

### Prompts
- `GET /api/prompts/project/:projectId` - Get all prompts for a project
- `GET /api/prompts/:id` - Get prompt by ID
- `POST /api/prompts` - Create prompt
- `PUT /api/prompts/:id` - Update prompt
- `DELETE /api/prompts/:id` - Delete prompt
- `POST /api/prompts/:id/duplicate` - Duplicate prompt

## Database

Uses SQLite (better-sqlite3) for data storage. Database file is created at `./data/database.sqlite` by default.

## Environment Variables

- `PORT` - Server port (default: 3001)
- `DATABASE_PATH` - Path to SQLite database file (default: ./data/database.sqlite)
- `NODE_ENV` - Environment (development/production)

