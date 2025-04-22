import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'inventory.db');
const MIGRATION_FILE = path.resolve(process.cwd(), 'api/migrations/0001_initial.sql');

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

let db: Database.Database;

function initializeDatabase(): Database.Database {
    console.log(`Connecting to database at: ${DB_PATH}`);
    const dbInstance = new Database(DB_PATH, { verbose: console.log }); // Add verbose logging for debugging

    // Check if migration needs to run (e.g., check for a specific table)
    const tableCheck = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='locations'").get();

    if (!tableCheck) {
        console.log('Database appears empty or locations table missing. Running initial migration...');
        try {
            if (!fs.existsSync(MIGRATION_FILE)) {
                throw new Error(`Migration file not found: ${MIGRATION_FILE}`);
            }
            const migrationSql = fs.readFileSync(MIGRATION_FILE, 'utf8');
            dbInstance.exec(migrationSql);
            console.log('Database initialized successfully from migration file.');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            // Close connection if initialization failed?
            dbInstance.close();
            throw error; // Re-throw error to prevent app start?
        }
    } else {
        console.log('Database already initialized (locations table exists).');
    }

    // Enable WAL mode for better concurrency
    dbInstance.pragma('journal_mode = WAL');

    return dbInstance;
}

// Singleton instance - initialize lazily or immediately
// Initialize immediately for simplicity in API routes
try {
    db = initializeDatabase();
} catch (error) {
    console.error("CRITICAL: Database initialization failed. Application might not work correctly.");
    // Optionally exit the process if DB is critical
    // process.exit(1);
}

// Function to get the singleton DB instance
export function getDb(): Database.Database {
    if (!db) {
        console.error("Database not initialized. Attempting re-initialization.");
        // This might happen if the initial attempt failed.
        // Be cautious about re-throwing errors here in a server context.
        try {
           db = initializeDatabase();
        } catch (error) {
             console.error("CRITICAL: Subsequent database initialization failed.");
             // Handle this case appropriately - maybe return null or throw a specific error?
             throw new Error("Database connection is unavailable.");
        }
    }
    return db;
}

// Optional: Export prepared statements for reuse
// Example:
// export const getLocationByIdStmt = getDb().prepare('SELECT * FROM locations WHERE id = ?'); 