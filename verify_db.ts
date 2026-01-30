import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust path to point to the actual database location
// Based on server/src/db/index.ts:
// const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/database.sqlite');
// Since this script is in root, we need to point to server/data/database.sqlite
const dbPath = path.join(process.cwd(), 'server/data/database.sqlite');

console.log('Checking database at:', dbPath);

try {
  const db = new Database(dbPath);
  const tableInfo = db.pragma('table_info(environments)');
  console.log('Environments table columns:', tableInfo);

  const hasVariables = tableInfo.some((col: any) => col.name === 'variables');
  console.log('Has variables column:', hasVariables);
} catch (error) {
  console.error('Error:', error);
}
