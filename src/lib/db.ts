import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure the data directory exists
const DATA_DIR = path.join(process.cwd(), '.data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'inventory.db');

// Initialize database connection
let db: Database.Database;

// This is a singleton to ensure we only have one database connection
export function getDb(): Database.Database {
  if (!db) {
    try {
      db = new Database(DB_PATH);
      
      // Enable foreign keys
      db.pragma('foreign_keys = ON');
      
      // Check if tables exist
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='locations'").get();
      
      // Initialize database if tables don't exist
      if (!tableCheck) {
        console.log('Initializing database with schema...');
        const initSql = fs.readFileSync(
          path.join(process.cwd(), 'migrations', '0001_initial.sql'),
          'utf8'
        );
        
        // Split the SQL file by semicolons and execute each statement
        const statements = initSql.split(';').filter(stmt => stmt.trim());
        
        db.transaction(() => {
          statements.forEach(statement => {
            if (statement.trim()) {
              db.prepare(statement + ';').run();
            }
          });
        })();
        
        console.log('Database initialization complete');
      }
    } catch (error) {
      console.error('Database initialization error:', error);
      // Create a new database file if there was an error
      if (fs.existsSync(DB_PATH)) {
        try {
          fs.unlinkSync(DB_PATH);
          console.log('Removed corrupted database file');
        } catch (unlinkError) {
          console.error('Failed to remove corrupted database:', unlinkError);
        }
      }
      
      // Try again with a fresh database
      db = new Database(DB_PATH);
      db.pragma('foreign_keys = ON');
      
      const initSql = fs.readFileSync(
        path.join(process.cwd(), 'migrations', '0001_initial.sql'),
        'utf8'
      );
      
      const statements = initSql.split(';').filter(stmt => stmt.trim());
      
      db.transaction(() => {
        statements.forEach(statement => {
          if (statement.trim()) {
            db.prepare(statement + ';').run();
          }
        });
      })();
      
      console.log('Created fresh database after error');
    }
  }
  
  return db;
}

// Helper function to close the database connection
export function closeDb() {
  if (db) {
    db.close();
    db = undefined as unknown as Database.Database;
  }
}

// Function to get all locations
export function getLocations() {
  const db = getDb();
  return db.prepare('SELECT * FROM locations ORDER BY name').all();
}

// Function to get child locations
export function getChildLocations(parentId: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM locations WHERE parent_id = ? ORDER BY name').all(parentId);
}

// Function to get location by ID
export function getLocationById(id: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM locations WHERE id = ?').get(id);
}

// Function to get location breadcrumbs
export function getLocationBreadcrumbs(id: number) {
  const db = getDb();
  const breadcrumbs = [];
  let currentId = id;
  let location;
  
  while (currentId) {
    location = getLocationById(currentId);
    if (!location) break;
    
    breadcrumbs.unshift({
      id: location.id,
      name: location.name
    });
    
    currentId = location.parent_id;
  }
  
  return breadcrumbs;
}

// Function to add a location
export function addLocation(name: string, parentId: number | null, description: string | null, imagePath: string | null) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO locations (name, parent_id, description, image_path) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(name, parentId, description, imagePath);
  return result.lastInsertRowid;
}

// Function to update a location
export function updateLocation(id: number, name: string, parentId: number | null, description: string | null, imagePath: string | null) {
  const db = getDb();
  const stmt = db.prepare(
    'UPDATE locations SET name = ?, parent_id = ?, description = ?, image_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );
  return stmt.run(name, parentId, description, imagePath, id);
}

// Function to delete a location
export function deleteLocation(id: number) {
  const db = getDb();
  return db.prepare('DELETE FROM locations WHERE id = ?').run(id);
}

// Function to add a region to a location
export function addLocationRegion(locationId: number, name: string, x: number, y: number, width: number, height: number) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO location_regions (location_id, name, x_coord, y_coord, width, height) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(locationId, name, x, y, width, height);
  return result.lastInsertRowid;
}

// Function to get regions for a location
export function getLocationRegions(locationId: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM location_regions WHERE location_id = ?').all(locationId);
}

// Function to get a specific region
export function getRegionById(id: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM location_regions WHERE id = ?').get(id);
}

// Function to update a region
export function updateRegion(id: number, name: string, x: number, y: number, width: number, height: number) {
  const db = getDb();
  const stmt = db.prepare(
    'UPDATE location_regions SET name = ?, x_coord = ?, y_coord = ?, width = ?, height = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );
  return stmt.run(name, x, y, width, height, id);
}

// Function to delete a region
export function deleteRegion(id: number) {
  const db = getDb();
  return db.prepare('DELETE FROM location_regions WHERE id = ?').run(id);
}

// Function to add an inventory item
export function addInventoryItem(name: string, description: string | null, quantity: number, imagePath: string | null, locationId: number | null, regionId: number | null) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO inventory_items (name, description, quantity, image_path, location_id, region_id) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(name, description, quantity, imagePath, locationId, regionId);
  return result.lastInsertRowid;
}

// Function to get all inventory items
export function getInventoryItems() {
  const db = getDb();
  return db.prepare(`
    SELECT i.*, l.name as location_name, r.name as region_name 
    FROM inventory_items i
    LEFT JOIN locations l ON i.location_id = l.id
    LEFT JOIN location_regions r ON i.region_id = r.id
    ORDER BY i.name
  `).all();
}

// Function to get inventory item by ID
export function getInventoryItemById(id: number) {
  const db = getDb();
  return db.prepare(`
    SELECT i.*, l.name as location_name, r.name as region_name 
    FROM inventory_items i
    LEFT JOIN locations l ON i.location_id = l.id
    LEFT JOIN location_regions r ON i.region_id = r.id
    WHERE i.id = ?
  `).get(id);
}

// Function to update an inventory item
export function updateInventoryItem(id: number, name: string, description: string | null, quantity: number, imagePath: string | null, locationId: number | null, regionId: number | null) {
  const db = getDb();
  const stmt = db.prepare(
    'UPDATE inventory_items SET name = ?, description = ?, quantity = ?, image_path = ?, location_id = ?, region_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );
  return stmt.run(name, description, quantity, imagePath, locationId, regionId, id);
}

// Function to delete an inventory item
export function deleteInventoryItem(id: number) {
  const db = getDb();
  return db.prepare('DELETE FROM inventory_items WHERE id = ?').run(id);
}

// Function to add a tag to an item
export function addItemTag(itemId: number, tag: string) {
  const db = getDb();
  const stmt = db.prepare('INSERT INTO item_tags (item_id, tag) VALUES (?, ?)');
  return stmt.run(itemId, tag.toLowerCase());
}

// Function to get tags for an item
export function getItemTags(itemId: number) {
  const db = getDb();
  return db.prepare('SELECT tag FROM item_tags WHERE item_id = ?').all(itemId);
}

// Function to delete all tags for an item
export function deleteItemTags(itemId: number) {
  const db = getDb();
  return db.prepare('DELETE FROM item_tags WHERE item_id = ?').run(itemId);
}

// Function to search items by name or tags (fuzzy search)
export function searchItems(query: string) {
  const db = getDb();
  const searchTerm = `%${query.toLowerCase()}%`;
  
  return db.prepare(`
    SELECT DISTINCT i.*, l.name as location_name, r.name as region_name 
    FROM inventory_items i
    LEFT JOIN locations l ON i.location_id = l.id
    LEFT JOIN location_regions r ON i.region_id = r.id
    LEFT JOIN item_tags t ON i.id = t.item_id
    WHERE LOWER(i.name) LIKE ? 
       OR LOWER(i.description) LIKE ? 
       OR t.tag LIKE ?
    ORDER BY 
      CASE 
        WHEN LOWER(i.name) = LOWER(?) THEN 0
        WHEN LOWER(i.name) LIKE LOWER(?) || '%' THEN 1
        WHEN LOWER(i.name) LIKE '%' || LOWER(?) || '%' THEN 2
        ELSE 3
      END,
      i.name
  `).all(searchTerm, searchTerm, searchTerm, query.toLowerCase(), query.toLowerCase(), query.toLowerCase());
}
