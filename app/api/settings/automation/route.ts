import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'automation-db.json');

// Interface for Settings
interface AutomationSettings {
  isEnabled: boolean;
  frequency: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';
  topics: string[];
  tone: string;
  smartTimezone: string;
  lastPosted?: string;
  customIntervalEnabled?: boolean;
  customIntervalMins?: number;
}

// Interface for DB data structure
interface DbData {
  automationSettings: AutomationSettings;
  [key: string]: unknown;
}

const DEFAULT_SETTINGS: AutomationSettings = {
  isEnabled: false,
  frequency: 'MEDIUM',
  topics: [],
  tone: 'Professional',
  smartTimezone: 'UTC',
  customIntervalEnabled: false,
  customIntervalMins: 60,
};

// Helper to read DB
function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return { automationSettings: DEFAULT_SETTINGS };
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    const json = JSON.parse(data);
    
    // Ensure automationSettings exists
    if (!json.automationSettings) {
      json.automationSettings = DEFAULT_SETTINGS;
    }
    return json;
  } catch (error) {
    console.error('Error reading DB:', error);
    return { automationSettings: DEFAULT_SETTINGS };
  }
}

// Helper to write DB
function writeDb(data: DbData) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing DB:', error);
    return false;
  }
}

/**
 * GET /api/settings/automation - Get current settings
 */
export async function GET() {
  const db = readDb();
  return NextResponse.json(db.automationSettings);
}

/**
 * POST /api/settings/automation - Update settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = readDb();

    // Merge new settings with existing ones
    db.automationSettings = {
      ...db.automationSettings,
      ...body,
    };

    if (writeDb(db)) {
      return NextResponse.json(db.automationSettings);
    } else {
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
