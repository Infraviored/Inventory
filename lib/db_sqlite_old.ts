import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'inventory.db');
// const MIGRATION_FILE = path.resolve(process.cwd(), 'api/migrations/0001_initial.sql'); // REMOVED

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

// Define the database schema directly as a string
const SCHEMA_SQL = `
-- Locations Table
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    parent_id INTEGER,
    image_path TEXT,
    location_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES locations (id) ON DELETE SET NULL
);

-- Location Regions Table
CREATE TABLE IF NOT EXISTS location_regions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    x_coord REAL NOT NULL,
    y_coord REAL NOT NULL,
    width REAL NOT NULL,
    height REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

-- Items Table
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    image_path TEXT,
    location_id INTEGER NOT NULL, -- Made location_id NOT NULL based on API logic
    region_id INTEGER,   -- Allow NULL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE, -- Cascade delete items if location deleted
    FOREIGN KEY (region_id) REFERENCES location_regions (id) ON DELETE SET NULL
);

-- Item Tags Table
CREATE TABLE IF NOT EXISTS item_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE,
    UNIQUE (item_id, tag)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON locations (parent_id);
CREATE INDEX IF NOT EXISTS idx_location_regions_location_id ON location_regions (location_id);
CREATE INDEX IF NOT EXISTS idx_items_location_id ON items (location_id);
CREATE INDEX IF NOT EXISTS idx_items_region_id ON items (region_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags (item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags (tag);

-- Triggers for updated_at
CREATE TRIGGER locations_updated_at AFTER UPDATE ON locations FOR EACH ROW
BEGIN
    UPDATE locations SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER location_regions_updated_at AFTER UPDATE ON location_regions FOR EACH ROW
BEGIN
    UPDATE location_regions SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER items_updated_at AFTER UPDATE ON items FOR EACH ROW
BEGIN
    UPDATE items SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
`;

let db: Database.Database;

function initializeDatabase(): Database.Database {
    console.log(`[DB_LOG] Current working directory: ${process.cwd()}`);
    console.log(`[DB_LOG] Resolved DB_PATH: ${DB_PATH}`);
    console.log(`[DB_LOG] Attempting to create Database instance for: ${DB_PATH}`);
    let dbInstance: Database.Database;
    try {
        dbInstance = new Database(DB_PATH, { verbose: console.log });
        console.log('[DB_LOG] Successfully created Database instance.');
    } catch (e: any) {
        console.error(`[DB_LOG] CRITICAL ERROR during new Database(DB_PATH): ${e.message}`);
        console.error(`[DB_LOG] Error stack: ${e.stack}`);
        console.error(`[DB_LOG] DB_PATH was: ${DB_PATH}`);
        console.error(`[DB_LOG] process.cwd() was: ${process.cwd()}`);
        throw e; // Re-throw after logging
    }

    // Temporarily comment out all subsequent operations
    /* 
    // Check if all essential tables exist
    const tablesToCheck = ['locations', 'location_regions', 'items', 'item_tags'];
    let allTablesExist = true;
    console.log('[DB_LOG] Starting table existence check.');
    for (const tableName of tablesToCheck) {
         console.log(`[DB_LOG] Checking for table: ${tableName}`);
         const tableCheck = dbInstance.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`).get();
         console.log(`[DB_LOG] Result for table ${tableName}: ${tableCheck ? 'found' : 'not found'}`);
         if (!tableCheck) {
              allTablesExist = false;
              console.log(`[DB_LOG] Table '${tableName}' not found. Setting allTablesExist to false.`);
              break; // No need to check further if one is missing
         }
    }
    console.log('[DB_LOG] Finished table existence check. allTablesExist: ', allTablesExist);

    if (!allTablesExist) {
        console.log('[DB_LOG] Database appears incomplete. Running schema creation...');
        try {
            // Execute the embedded schema SQL
            console.log('[DB_LOG] Attempting to execute SCHEMA_SQL.');
            dbInstance.exec(SCHEMA_SQL);
            console.log('[DB_LOG] Database initialized successfully from embedded schema.');
        } catch (error) {
            console.error('[DB_LOG] Failed to initialize database schema:', error);
            dbInstance.close();
            console.log('[DB_LOG] Database connection closed due to schema initialization error.');
            throw error;
        }
    } else {
        console.log('[DB_LOG] Database already initialized (all essential tables exist).');
    }

    // Enable WAL mode for better concurrency
    console.log('[DB_LOG] Attempting to set WAL mode.');
    dbInstance.pragma('journal_mode = WAL');
    console.log('[DB_LOG] WAL mode set successfully.');
    */

    console.log('[DB_LOG] Database initialization function finished (minimal operations).');
    return dbInstance;
}

// Singleton instance - initialize immediately
try {
    console.log('[DB_LOG] Starting initial database initialization.');
    db = initializeDatabase();
    console.log('[DB_LOG] Initial database initialization successful.');
} catch (error) {
    console.error("[DB_LOG] CRITICAL: Database initialization failed. Application might not work correctly.", error);
    // Optionally exit the process if DB is critical
    // process.exit(1);
}

// Function to get the singleton DB instance
export function getDb(): Database.Database {
    console.log('[DB_LOG] getDb called.');
    if (!db || !db.open) { // Add check for closed db
        console.log("[DB_LOG] Database not initialized or closed. Attempting (re-)initialization.");
        try {
           console.log('[DB_LOG] Attempting (re-)initialization inside getDb.');
           db = initializeDatabase();
           console.log('[DB_LOG] (Re-)initialization inside getDb successful.');
        } catch (error: any) {
             console.error("[DB_LOG] CRITICAL: Subsequent database (re-)initialization failed inside getDb.", error.message, error.stack);
             throw new Error(`Database connection is unavailable. Original error: ${error.message}`);
        }
    }
    console.log('[DB_LOG] Returning db instance from getDb.');
    return db;
}

// Optional: Export prepared statements for reuse
// Example:
// export const getLocationByIdStmt = getDb().prepare('SELECT * FROM locations WHERE id = ?'); 