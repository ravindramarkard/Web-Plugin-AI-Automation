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
      testSuiteId TEXT,
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
      projectId TEXT,
      name TEXT NOT NULL,
      key TEXT NOT NULL,
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
      authKey TEXT,
      authValue TEXT,
      authLocation TEXT,
      authUsername TEXT,
      authPassword TEXT,
      oauthClientId TEXT,
      oauthClientSecret TEXT,
      oauthTokenUrl TEXT,
      oauthScope TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      variables TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(key, projectId)
    )
  `);
  // Create indexes for faster queries
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_environments_key ON environments(key)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_environments_project ON environments(projectId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_environments_status ON environments(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_environments_created ON environments(createdAt DESC)`);
  } catch (e) {
    // Indexes might already exist
  }
}

export function migrateDatabase(db: Database.Database) {
  // Check if projectId column exists in environments table
  try {
    const tableInfo = db.pragma('table_info(environments)') as any[];
    const hasProjectId = tableInfo.some(col => col.name === 'projectId');
    const hasVariables = tableInfo.some(col => col.name === 'variables');
    const hasAuthKey = tableInfo.some(col => col.name === 'authKey');

    if (!hasProjectId || !hasVariables || !hasAuthKey) {
      console.log('🔄 Migrating environments table...');

      // 1. Rename existing table
      db.exec('ALTER TABLE environments RENAME TO environments_old');

      // 2. Create new table with updated schema
      createEnvironmentsTable(db);

      // 3. Copy data

      // Construct select list based on what we have
      const selectList = `
        id, 
        ${hasProjectId ? 'projectId' : 'NULL as projectId'}, 
        name, key, description, baseUrl, apiUrl, username, password, 
        timeout, browser, headless, jiraEnabled, jiraUrl, jiraUsername, 
        jiraPassword, jiraProjectKey, llmEnabled, llmProvider, llmModel, 
        llmApiKey, llmBaseUrl, authorizationEnabled, authType, authToken, 
        NULL as authKey, NULL as authValue, NULL as authLocation,
        NULL as authUsername, NULL as authPassword,
        NULL as oauthClientId, NULL as oauthClientSecret, NULL as oauthTokenUrl, NULL as oauthScope,
        status, 
        ${hasVariables ? 'variables' : 'NULL as variables'},
        createdAt, updatedAt
      `;

      db.exec(`
        INSERT INTO environments (
          id, projectId, name, key, description, baseUrl, apiUrl, username, password, 
          timeout, browser, headless, jiraEnabled, jiraUrl, jiraUsername, 
          jiraPassword, jiraProjectKey, llmEnabled, llmProvider, llmModel, 
          llmApiKey, llmBaseUrl, authorizationEnabled, authType, authToken, 
          authKey, authValue, authLocation, authUsername, authPassword,
          oauthClientId, oauthClientSecret, oauthTokenUrl, oauthScope,
          status, variables, createdAt, updatedAt
        )
        SELECT ${selectList} FROM environments_old
      `);

      // 4. Drop old table
      db.exec('DROP TABLE environments_old');

      console.log('✅ Environments table migration completed');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    // Attempt to rollback/restore if possible, or just log
    // For now, we just log. In production, we'd want transactions.
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
