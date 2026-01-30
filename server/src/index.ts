import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/index.js';
import projectsRouter from './routes/projects.js';
import testSuitesRouter from './routes/testSuites.js';
import testCasesRouter from './routes/testCases.js';
import promptsRouter from './routes/prompts.js';
import environmentsRouter from './routes/environments.js';
import testExecutionRouter from './routes/testExecution.js';
import settingsRouter from './routes/settings.js';
import testGenRouter from './routes/testGen.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static reports
app.use('/reports', express.static(path.join(__dirname, '../public/reports')));

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  const webAppDist = path.join(__dirname, '../../../dist/web-app');
  app.use(express.static(webAppDist));

  // Handle client-side routing
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(webAppDist, 'index.html'));
  });
}

// Initialize database
initDatabase();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/projects', projectsRouter);
app.use('/api/test-suites', testSuitesRouter);
app.use('/api/test-cases', testCasesRouter);
app.use('/api/prompts', promptsRouter);
app.use('/api/environments', environmentsRouter);
app.use('/api/execution', testExecutionRouter);
app.use('/api/test-gen', testGenRouter);
app.use('/api/settings', settingsRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
