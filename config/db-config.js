import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get data directory from environment variable or default to project root
// On Railway, this should be set to /app/data
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..');

export const DB_PATHS = {
  MAIN_DB: path.join(DATA_DIR, 'db.json'),
  AUTOMATION_DB: path.join(DATA_DIR, 'automation-db.json'),
  DATA_DIR: DATA_DIR
};

export default DB_PATHS;
