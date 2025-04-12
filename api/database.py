import sqlite3
import os
import json
from datetime import datetime
from pathlib import Path

# Ensure data directory exists
DATA_DIR = Path('data')
DATA_DIR.mkdir(exist_ok=True)

# Database file path
DB_PATH = DATA_DIR / 'inventory.db'

# Uploads directory
UPLOADS_DIR = Path('public/uploads')
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

def get_db_connection():
    """Create a database connection and return it"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with schema"""
    conn = get_db_connection()
    
    # Read schema from migration file
    with open('migrations/0001_initial.sql', 'r') as f:
        schema = f.read()
    
    # Execute schema
    conn.executescript(schema)
    conn.commit()
    conn.close()
    
    print("Database initialized successfully")

# Location functions
def get_locations(parent_id=None, root_only=False):
    """Get all locations or filter by parent_id"""
    conn = get_db_connection()
    
    if parent_id is not None:
        locations = conn.execute(
            'SELECT * FROM locations WHERE parent_id = ?',
            (parent_id,)
        ).fetchall()
    elif root_only:
        locations = conn.execute(
            'SELECT * FROM locations WHERE parent_id IS NULL'
        ).fetchall()
    else:
        locations = conn.execute('SELECT * FROM locations').fetchall()
    
    conn.close()
    
    # Convert to dictionaries
    return [dict(loc) for loc in locations]

def get_location_by_id(location_id):
    """Get a location by its ID"""
    conn = get_db_connection()
    location = conn.execute(
        'SELECT * FROM locations WHERE id = ?',
        (location_id,)
    ).fetchone()
    conn.close()
    
    if location:
        return dict(location)
    return None

def add_location(name, parent_id=None, description=None, image_path=None):
    """Add a new location"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        '''
        INSERT INTO locations (name, parent_id, description, image_path)
        VALUES (?, ?, ?, ?)
        ''',
        (name, parent_id, description, image_path)
    )
    
    location_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return location_id

def update_location(location_id, name, parent_id=None, description=None, image_path=None):
    """Update an existing location"""
    conn = get_db_connection()
    
    # Get current image path if not provided
    if image_path is None:
        current = conn.execute(
            'SELECT image_path FROM locations WHERE id = ?',
            (location_id,)
        ).fetchone()
        if current:
            image_path = current['image_path']
    
    conn.execute(
        '''
        UPDATE locations
        SET name = ?, parent_id = ?, description = ?, image_path = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        ''',
        (name, parent_id, description, image_path, location_id)
    )
    
    conn.commit()
    conn.close()
    
    return True

def delete_location(location_id):
    """Delete a location"""
    conn = get_db_connection()
    conn.execute('DELETE FROM locations WHERE id = ?', (location_id,))
    conn.commit()
    conn.close()
    
    return True

# Region functions
def get_location_regions(location_id):
    """Get all regions for a location"""
    conn = get_db_connection()
    regions = conn.execute(
        'SELECT * FROM location_regions WHERE location_id = ?',
        (location_id,)
    ).fetchall()
    conn.close()
    
    return [dict(region) for region in regions]

def get_region_by_id(region_id):
    """Get a region by its ID"""
    conn = get_db_connection()
    region = conn.execute(
        'SELECT * FROM location_regions WHERE id = ?',
        (region_id,)
    ).fetchone()
    conn.close()
    
    if region:
        return dict(region)
    return None

def add_location_region(location_id, name, x, y, width, height):
    """Add a new region to a location"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        '''
        INSERT INTO location_regions (location_id, name, x_coord, y_coord, width, height)
        VALUES (?, ?, ?, ?, ?, ?)
        ''',
        (location_id, name, x, y, width, height)
    )
    
    region_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return region_id

def update_location_region(region_id, name, x, y, width, height):
    """Update an existing region"""
    conn = get_db_connection()
    
    conn.execute(
        '''
        UPDATE location_regions
        SET name = ?, x_coord = ?, y_coord = ?, width = ?, height = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        ''',
        (name, x, y, width, height, region_id)
    )
    
    conn.commit()
    conn.close()
    
    return True

def delete_location_region(region_id):
    """Delete a region"""
    conn = get_db_connection()
    conn.execute('DELETE FROM location_regions WHERE id = ?', (region_id,))
    conn.commit()
    conn.close()
    
    return True

# Inventory functions
def get_inventory_items(location_id=None, region_id=None):
    """Get all inventory items or filter by location and/or region"""
    conn = get_db_connection()
    
    query = '''
        SELECT i.*, l.name as location_name, r.name as region_name
        FROM inventory_items i
        LEFT JOIN locations l ON i.location_id = l.id
        LEFT JOIN location_regions r ON i.region_id = r.id
    '''
    
    params = []
    where_clauses = []
    
    if location_id is not None:
        where_clauses.append('i.location_id = ?')
        params.append(location_id)
    
    if region_id is not None:
        where_clauses.append('i.region_id = ?')
        params.append(region_id)
    
    if where_clauses:
        query += ' WHERE ' + ' AND '.join(where_clauses)
    
    items = conn.execute(query, params).fetchall()
    conn.close()
    
    return [dict(item) for item in items]

def get_inventory_item_by_id(item_id):
    """Get an inventory item by its ID"""
    conn = get_db_connection()
    
    item = conn.execute(
        '''
        SELECT i.*, l.name as location_name, r.name as region_name
        FROM inventory_items i
        LEFT JOIN locations l ON i.location_id = l.id
        LEFT JOIN location_regions r ON i.region_id = r.id
        WHERE i.id = ?
        ''',
        (item_id,)
    ).fetchone()
    
    conn.close()
    
    if item:
        return dict(item)
    return None

def add_inventory_item(name, description=None, quantity=1, image_path=None, location_id=None, region_id=None):
    """Add a new inventory item"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        '''
        INSERT INTO inventory_items (name, description, quantity, image_path, location_id, region_id)
        VALUES (?, ?, ?, ?, ?, ?)
        ''',
        (name, description, quantity, image_path, location_id, region_id)
    )
    
    item_id = cursor.lastrowid
    
    # Add tags for fuzzy search
    if name:
        cursor.execute(
            'INSERT INTO item_tags (item_id, tag) VALUES (?, ?)',
            (item_id, name.lower())
        )
    
    if description:
        # Split description into words and add as tags
        words = description.lower().split()
        for word in words:
            if len(word) > 3:  # Only add words longer than 3 characters
                cursor.execute(
                    'INSERT INTO item_tags (item_id, tag) VALUES (?, ?)',
                    (item_id, word)
                )
    
    conn.commit()
    conn.close()
    
    return item_id

def update_inventory_item(item_id, name, description=None, quantity=1, image_path=None, location_id=None, region_id=None):
    """Update an existing inventory item"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get current image path if not provided
    if image_path is None:
        current = conn.execute(
            'SELECT image_path FROM inventory_items WHERE id = ?',
            (item_id,)
        ).fetchone()
        if current:
            image_path = current['image_path']
    
    cursor.execute(
        '''
        UPDATE inventory_items
        SET name = ?, description = ?, quantity = ?, image_path = ?, location_id = ?, region_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        ''',
        (name, description, quantity, image_path, location_id, region_id, item_id)
    )
    
    # Update tags for fuzzy search
    cursor.execute('DELETE FROM item_tags WHERE item_id = ?', (item_id,))
    
    if name:
        cursor.execute(
            'INSERT INTO item_tags (item_id, tag) VALUES (?, ?)',
            (item_id, name.lower())
        )
    
    if description:
        # Split description into words and add as tags
        words = description.lower().split()
        for word in words:
            if len(word) > 3:  # Only add words longer than 3 characters
                cursor.execute(
                    'INSERT INTO item_tags (item_id, tag) VALUES (?, ?)',
                    (item_id, word)
                )
    
    conn.commit()
    conn.close()
    
    return True

def delete_inventory_item(item_id):
    """Delete an inventory item"""
    conn = get_db_connection()
    conn.execute('DELETE FROM inventory_items WHERE id = ?', (item_id,))
    conn.commit()
    conn.close()
    
    return True

# Search function
def search_items(query):
    """Search for inventory items using fuzzy search"""
    if not query:
        return []
    
    conn = get_db_connection()
    
    # Search in item names, descriptions, and tags
    items = conn.execute(
        '''
        SELECT DISTINCT i.*, l.name as location_name, r.name as region_name
        FROM inventory_items i
        LEFT JOIN locations l ON i.location_id = l.id
        LEFT JOIN location_regions r ON i.region_id = r.id
        LEFT JOIN item_tags t ON i.id = t.item_id
        WHERE 
            i.name LIKE ? OR 
            i.description LIKE ? OR 
            t.tag LIKE ?
        ORDER BY
            CASE
                WHEN i.name LIKE ? THEN 1
                WHEN i.name LIKE ? THEN 2
                WHEN i.description LIKE ? THEN 3
                ELSE 4
            END
        ''',
        (
            f'%{query}%', f'%{query}%', f'%{query}%',
            f'{query}%', f'%{query}%', f'%{query}%'
        )
    ).fetchall()
    
    conn.close()
    
    return [dict(item) for item in items]

def get_location_breadcrumbs(location_id):
    """Get breadcrumb path for a location"""
    location = get_location_by_id(location_id)
    if not location:
        return []
    
    breadcrumbs = [location]
    
    # Traverse up the parent chain
    current_parent_id = location['parent_id']
    while current_parent_id:
        parent = get_location_by_id(current_parent_id)
        if parent:
            breadcrumbs.insert(0, parent)
            current_parent_id = parent['parent_id']
        else:
            break
    
    return breadcrumbs

# Initialize database if it doesn't exist
if not os.path.exists(DB_PATH):
    init_db()
