import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from './database.js';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_TYPE = process.env.DATABASE_TYPE || 'json'; // 'json' or 'mysql'
// Use /app/data directory in production (Railway), fallback to project root in dev
const dataDir = process.env.NODE_ENV === 'production' ? '/app/data' : path.join(__dirname, '..');
const DB_PATH = path.join(dataDir, 'db.json');
const AUTOMATION_DB_PATH = path.join(dataDir, 'automation-db.json');

// In-memory cache for JSON mode
let db = null;
let automationDb = null;

// Initialize database based on type
export async function initializeDatabase() {
  if (DB_TYPE === 'mysql') {
    try {
      await getPool();
      logger.info('MySQL database initialized');
      return { type: 'mysql' };
    } catch (error) {
      logger.error('MySQL initialization failed, falling back to JSON:', error);
      return await initializeJSONDatabase();
    }
  } else {
    return await initializeJSONDatabase();
  }
}

async function initializeJSONDatabase() {
  logger.info('Using JSON file storage');
  
  // Load main database
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    db = JSON.parse(data);
  } catch (error) {
    logger.warn('db.json not found, creating new');
    db = {
      posts: [],
      scheduledPosts: [],
      analytics: [],
      templates: [],
      feeds: [],
      articles: []
    };
    await saveDB();
  }

  // Load automation database
  try {
    const data = await fs.readFile(AUTOMATION_DB_PATH, 'utf8');
    automationDb = JSON.parse(data);
  } catch (error) {
    logger.warn('automation-db.json not found, creating new');
    automationDb = {
      abTests: [],
      automationConfig: {}
    };
    await saveAutomationDB();
  }

  return { type: 'json', db, automationDb };
}

export async function getDB() {
  if (DB_TYPE === 'mysql') {
    return { type: 'mysql', pool: await getPool() };
  }
  
  if (!db) {
    await initializeDatabase();
  }
  return { type: 'json', db, automationDb };
}

export async function saveDB() {
  if (DB_TYPE === 'json' && db) {
    try {
      await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
    } catch (error) {
      logger.error('Error saving db.json:', error);
      throw error;
    }
  }
}

export async function saveAutomationDB() {
  if (DB_TYPE === 'json' && automationDb) {
    try {
      await fs.writeFile(AUTOMATION_DB_PATH, JSON.stringify(automationDb, null, 2));
    } catch (error) {
      logger.error('Error saving automation-db.json:', error);
      throw error;
    }
  }
}

export function getDatabaseType() {
  return DB_TYPE;
}

export default { initializeDatabase, getDB, saveDB, saveAutomationDB, getDatabaseType };
