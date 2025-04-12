-- Initialize database tables for home inventory system

-- Table for storage locations (rooms, cabinets, etc.)
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    description TEXT,
    image_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Table for regions within location images
CREATE TABLE IF NOT EXISTS location_regions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    x_coord INTEGER NOT NULL,
    y_coord INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Table for inventory items
CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    image_path TEXT,
    location_id INTEGER,
    region_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (region_id) REFERENCES location_regions(id) ON DELETE SET NULL
);

-- Table for item tags (for fuzzy search)
CREATE TABLE IF NOT EXISTS item_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

-- Create indexes for faster searches
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_location ON inventory_items(location_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag);
CREATE INDEX IF NOT EXISTS idx_item_tags_item ON item_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_location_regions_location ON location_regions(location_id);

-- Insert some initial data for testing
INSERT INTO locations (name, description) VALUES 
('Wohnzimmer', 'Hauptwohnbereich'),
('Keller', 'Lagerraum im Untergeschoss');

INSERT INTO locations (name, parent_id, description) VALUES 
('Schrank 1', 1, 'Großer Schrank im Wohnzimmer'),
('Schrank 2', 2, 'Metallschrank im Keller');
