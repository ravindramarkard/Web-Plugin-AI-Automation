import type Database from 'better-sqlite3';

export function createProjectsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      team TEXT NOT NULL,
      icon TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);
  // Create index for faster queries
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(createdAt DESC)`);
  } catch (e) {
    // Index might already exist
  }
}

export function createTestSuitesTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_suites (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      testType TEXT,
      schedule TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
  // Create indexes for faster queries
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_test_suites_project ON test_suites(projectId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_test_suites_created ON test_suites(createdAt DESC)`);
  } catch (e) {
    // Indexes might already exist
  }
}

export function createTestCasesTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_cases (
      id TEXT PRIMARY KEY,
      testSuiteId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      prompt TEXT NOT NULL,
      plannerDescription TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      testType TEXT,
      playwrightCode TEXT,
      baseUrl TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      lastRunAt INTEGER,
      executionTime INTEGER,
      errorMessage TEXT,
      FOREIGN KEY (testSuiteId) REFERENCES test_suites(id) ON DELETE CASCADE
    )
  `);
  // Create indexes for faster queries
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_test_cases_suite ON test_cases(testSuiteId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_test_cases_status ON test_cases(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_test_cases_created ON test_cases(createdAt DESC)`);
  } catch (e) {
    // Indexes might already exist
  }
}

export function createPromptsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      promptContent TEXT NOT NULL,
      testType TEXT NOT NULL,
      tags TEXT NOT NULL,
      additionalContext TEXT,
      baseUrl TEXT,
      additionalInformation TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
  // Create indexes for faster queries
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_prompts_project ON prompts(projectId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_prompts_created ON prompts(createdAt DESC)`);
  } catch (e) {
    // Indexes might already exist
  }
}

export function createEnvironmentsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS environments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      baseUrl TEXT NOT NULL,
      apiUrl TEXT,
      username TEXT,
      password TEXT,
      timeout INTEGER NOT NULL DEFAULT 30000,
      browser TEXT NOT NULL DEFAULT 'chromium',
      headless INTEGER NOT NULL DEFAULT 0,
      jiraEnabled INTEGER NOT NULL DEFAULT 0,
      jiraUrl TEXT,
      jiraUsername TEXT,
      jiraPassword TEXT,
      jiraProjectKey TEXT,
      llmEnabled INTEGER NOT NULL DEFAULT 0,
      llmProvider TEXT,
      llmModel TEXT,
      llmApiKey TEXT,
      llmBaseUrl TEXT,
      authorizationEnabled INTEGER NOT NULL DEFAULT 0,
      authType TEXT,
      authToken TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);
  // Create indexes for faster queries
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_environments_key ON environments(key)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_environments_status ON environments(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_environments_created ON environments(createdAt DESC)`);
  } catch (e) {
    // Indexes might already exist
  }
}

export function createSettingsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);
}
