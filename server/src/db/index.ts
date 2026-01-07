import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import {
  createProjectsTable,
  createTestSuitesTable,
  createTestCasesTable,
  createPromptsTable,
  createEnvironmentsTable,
  createSettingsTable,
} from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/database.sqlite');
const dbDir = path.dirname(dbPath);

// Create database directory if it doesn't exist
try {
  mkdirSync(dbDir, { recursive: true });
} catch (error: any) {
  // Ignore error if directory already exists
  if (error.code !== 'EEXIST') {
    console.error('Failed to create database directory:', error);
  }
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDatabase() {
  console.log('📦 Initializing database...');
  createProjectsTable(db);
  createTestSuitesTable(db);
  createTestCasesTable(db);
  createPromptsTable(db);
  createEnvironmentsTable(db);
  createSettingsTable(db);
  console.log('✅ Database initialized');
}

export default db;
