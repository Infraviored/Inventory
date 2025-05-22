import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const JSON_DB_PATH = path.join(DATA_DIR, 'inventory.json');

export interface Location {
    id: number;
    name: string;
    description: string | null;
    parentId: number | null;
    imagePath: string | null;
    locationType: string | null;
    createdAt?: string;
    updatedAt?: string;
    regions?: LocationRegion[];
}

export interface LocationRegion {
    id: number;
    location_id: number;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface Item {
    id: number;
    name: string;
    description: string | null;
    quantity: number;
    imagePath: string | null;
    location_id: number;
    region_id: number | null;
    createdAt?: string;
    updatedAt?: string;
    tags?: string[];
}

interface JsonDbSchema {
    locations: Location[];
    location_regions: LocationRegion[];
    items: Item[];
    nextLocationId: number;
    nextRegionId: number;
    nextItemId: number;
}

const defaultDb: JsonDbSchema = {
    locations: [],
    location_regions: [],
    items: [],
    nextLocationId: 1,
    nextRegionId: 1,
    nextItemId: 1,
};

fs.mkdirSync(DATA_DIR, { recursive: true });

let memoryDb: JsonDbSchema | null = null;

function loadDb(): JsonDbSchema {
    if (memoryDb) {
        return memoryDb;
    }
    try {
        if (fs.existsSync(JSON_DB_PATH)) {
            const fileContent = fs.readFileSync(JSON_DB_PATH, 'utf-8');
            memoryDb = JSON.parse(fileContent) as JsonDbSchema;
            if (!memoryDb.nextLocationId) memoryDb.nextLocationId = defaultDb.nextLocationId;
            if (!memoryDb.nextRegionId) memoryDb.nextRegionId = defaultDb.nextRegionId;
            if (!memoryDb.nextItemId) memoryDb.nextItemId = defaultDb.nextItemId;
            if (!memoryDb.locations) memoryDb.locations = [];
            if (!memoryDb.location_regions) memoryDb.location_regions = [];
            if (!memoryDb.items) memoryDb.items = [];
            memoryDb.nextLocationId = Math.max(memoryDb.nextLocationId, ...memoryDb.locations.map(l => l.id + 1), 1);
            memoryDb.nextRegionId = Math.max(memoryDb.nextRegionId, ...memoryDb.location_regions.map(r => r.id + 1), 1);
            memoryDb.nextItemId = Math.max(memoryDb.nextItemId, ...memoryDb.items.map(i => i.id + 1), 1);
            return memoryDb!;
        } else {
            memoryDb = JSON.parse(JSON.stringify(defaultDb));
            saveDb(memoryDb!);
            return memoryDb!;
        }
    } catch (error) {
        console.error('[JSON_DB] Error loading or initializing database:', error);
        memoryDb = JSON.parse(JSON.stringify(defaultDb));
        return memoryDb!;
    }
}

function saveDb(dbToSave: JsonDbSchema): void {
    try {
        const data = JSON.stringify(dbToSave, null, 2);
        fs.writeFileSync(JSON_DB_PATH, data, 'utf-8');
        memoryDb = JSON.parse(JSON.stringify(dbToSave));
    } catch (error) {
        console.error('[JSON_DB] Error saving database:', error);
    }
}

export function getAllLocations(): Location[] {
    const db = loadDb();
    return JSON.parse(JSON.stringify(db.locations));
}

export function getLocationById(id: number): Location | undefined {
    const db = loadDb();
    const location = db.locations.find(loc => loc.id === id);
    if (!location) return undefined;
    // Attach regions to the location object
    const regions = db.location_regions.filter(r => r.location_id === id);
    return JSON.parse(JSON.stringify({ ...location, regions: regions }));
}

export function createLocation(data: Omit<Location, 'id' | 'createdAt' | 'updatedAt' | 'regions'> & { regions?: Omit<LocationRegion, 'id' | 'location_id' | 'createdAt' | 'updatedAt'>[] }): Location {
    const db = loadDb();
    const now = new Date().toISOString();
    const newLocationData: Omit<Location, 'id' | 'regions'> = {
        name: data.name,
        description: data.description || null,
        parentId: data.parentId || null,
        imagePath: data.imagePath || null,
        locationType: data.locationType || null,
        createdAt: now,
        updatedAt: now,
    };
    const newLocation: Location = {
        ...newLocationData,
        id: db.nextLocationId++,
        regions: [],
    };
    db.locations.push(newLocation);

    const createdRegions: LocationRegion[] = [];
    if (data.regions && Array.isArray(data.regions)) {
        for (const regionData of data.regions) {
            const newRegion: LocationRegion = {
                ...regionData,
                id: db.nextRegionId++,
                location_id: newLocation.id,
                createdAt: now,
                updatedAt: now,
            };
            db.location_regions.push(newRegion);
            createdRegions.push(JSON.parse(JSON.stringify(newRegion)));
        }
    }
    saveDb(db);
    return JSON.parse(JSON.stringify({ ...newLocation, regions: createdRegions }));
}

export function updateLocation(id: number, data: Partial<Omit<Location, 'id' | 'createdAt' | 'updatedAt' | 'regions'>> & { regions?: (Omit<LocationRegion, 'id' | 'location_id' | 'createdAt' | 'updatedAt'> & { id?: number })[] }): Location | undefined {
    const db = loadDb();
    const now = new Date().toISOString();
    const locationIndex = db.locations.findIndex(loc => loc.id === id);
    if (locationIndex === -1) {
        return undefined;
    }

    const existingLocation = db.locations[locationIndex]; 
    const updatedLocationData: Location = {
        ...existingLocation,
        name: data.name ?? existingLocation.name,
        description: data.description !== undefined ? data.description : existingLocation.description,
        parentId: data.parentId !== undefined ? data.parentId : existingLocation.parentId,
        imagePath: data.imagePath !== undefined ? data.imagePath : existingLocation.imagePath,
        locationType: data.locationType !== undefined ? data.locationType : existingLocation.locationType,
        updatedAt: now,
        // Regions will be handled separately below, so ensure current regions are carried if not updated
        regions: existingLocation.regions ? [...existingLocation.regions] : [], 
    };

    // Handle regions: remove old, add/update new
    const finalRegions: LocationRegion[] = [];
    if (data.regions !== undefined) { // Check if regions array is provided (even if empty)
        // Remove existing regions for this location from the global list
        db.location_regions = db.location_regions.filter(r => r.location_id !== id);
        
        if (Array.isArray(data.regions)) {
            for (const regionData of data.regions) {
                const newRegion: LocationRegion = {
                    name: regionData.name,
                    x: regionData.x ?? 0,
                    y: regionData.y ?? 0,
                    width: regionData.width ?? 0,
                    height: regionData.height ?? 0,
                    id: regionData.id ?? db.nextRegionId++,
                    location_id: id,
                    createdAt: db.location_regions.find(r => r.id === regionData.id)?.createdAt || now, // Preserve original if updating
                    updatedAt: now,
                };
                db.location_regions.push(newRegion); // Add to global list
                finalRegions.push(JSON.parse(JSON.stringify(newRegion)));
            }
        }
    }
    updatedLocationData.regions = finalRegions; // Set the regions on the location object
    db.locations[locationIndex] = updatedLocationData;
    
    saveDb(db);
    return JSON.parse(JSON.stringify(updatedLocationData));
}

export function deleteLocation(id: number): boolean {
    const db = loadDb();
    const initialLength = db.locations.length;
    db.locations = db.locations.filter(loc => loc.id !== id);
    db.location_regions = db.location_regions.filter(reg => reg.location_id !== id);
    db.items = db.items.filter(item => item.location_id !== id);
    if (db.locations.length < initialLength) {
        saveDb(db);
        return true;
    }
    return false;
}

export function getAllItems(filters?: { locationId?: number, regionId?: number, queryTerm?: string }): Item[] {
    const db = loadDb();
    let filteredItems = JSON.parse(JSON.stringify(db.items));
    if (filters?.locationId) {
        filteredItems = filteredItems.filter((item: Item) => item.location_id === filters.locationId);
    }
    if (filters?.regionId) {
        filteredItems = filteredItems.filter((item: Item) => item.region_id === filters.regionId);
    }
    if (filters?.queryTerm) {
        const term = filters.queryTerm.toLowerCase();
        const locationNames = db.locations.reduce((acc, loc) => ({...acc, [loc.id]: loc.name.toLowerCase()}), {} as Record<number, string>); 
        const regionNames = db.location_regions.reduce((acc, reg) => ({...acc, [reg.id]: reg.name.toLowerCase()}), {} as Record<number, string>); 

        filteredItems = filteredItems.filter((item: Item) => {
            const itemMatch = item.name.toLowerCase().includes(term) || (item.description && item.description.toLowerCase().includes(term));
            const locationMatch = item.location_id && locationNames[item.location_id]?.includes(term);
            const regionMatch = item.region_id && regionNames[item.region_id]?.includes(term);
            return itemMatch || locationMatch || regionMatch;
        });
    }
    return filteredItems;
}

export function getItemById(id: number): Item | undefined {
    const db = loadDb();
    const item = db.items.find(i => i.id === id);
    if (!item) return undefined;
    return JSON.parse(JSON.stringify(item));
}

export function createItem(data: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'tags'> & { tags?: string[] }): Item {
    const db = loadDb();
    const now = new Date().toISOString();
    const newItem: Item = {
        name: data.name,
        description: data.description || null,
        quantity: data.quantity === undefined ? 1 : data.quantity,
        imagePath: data.imagePath || null,
        location_id: data.location_id,
        region_id: data.region_id || null,
        id: db.nextItemId++,
        createdAt: now,
        updatedAt: now,
        tags: data.tags || []
    };
    // Basic validation for location_id
    if (!db.locations.find(l => l.id === newItem.location_id)) {
        throw new Error(`Location with ID ${newItem.location_id} not found. Cannot create item.`);
    }
    // Basic validation for region_id (if provided)
    if (newItem.region_id !== null && !db.location_regions.find(r => r.id === newItem.region_id && r.location_id === newItem.location_id)) {
        throw new Error(`Region with ID ${newItem.region_id} not found or does not belong to location ${newItem.location_id}. Cannot create item.`);
    }

    db.items.push(newItem);
    saveDb(db);
    return JSON.parse(JSON.stringify(newItem));
}

export function updateItem(id: number, data: Partial<Omit<Item, 'id' | 'createdAt' | 'updatedAt'>>): Item | undefined {
    const db = loadDb();
    const now = new Date().toISOString();
    const itemIndex = db.items.findIndex(item => item.id === id);
    if (itemIndex === -1) {
        return undefined;
    }
    const existingItem = db.items[itemIndex];
    const updatedItem: Item = {
        ...existingItem,
        ...data,
        updatedAt: now,
    };

    // Basic validation for location_id if it's being changed
    if (data.location_id !== undefined && data.location_id !== existingItem.location_id) {
        if (!db.locations.find(l => l.id === data.location_id)) {
            throw new Error(`Location with ID ${data.location_id} not found. Cannot update item.`);
        }
    }
    // Basic validation for region_id if it's being changed
    const finalLocationId = data.location_id ?? existingItem.location_id;
    if (data.region_id !== undefined && data.region_id !== existingItem.region_id) {
        if (data.region_id !== null && !db.location_regions.find(r => r.id === data.region_id && r.location_id === finalLocationId)) {
             throw new Error(`Region with ID ${data.region_id} not found or does not belong to location ${finalLocationId}. Cannot update item.`);
        }
    }
    // If location_id changes, region_id should likely be nullified unless also explicitly changed
    if (data.location_id !== undefined && data.location_id !== existingItem.location_id && data.region_id === undefined) {
        updatedItem.region_id = null;
    }

    db.items[itemIndex] = updatedItem;
    saveDb(db);
    return JSON.parse(JSON.stringify(updatedItem));
}

export function deleteItem(id: number): boolean {
    const db = loadDb();
    const initialLength = db.items.length;
    db.items = db.items.filter(item => item.id !== id);
    if (db.items.length < initialLength) {
        saveDb(db);
        return true;
    }
    return false;
}

export function getLocationRegionsByLocationId(locationId: number): LocationRegion[] {
    const db = loadDb();
    return JSON.parse(JSON.stringify(db.location_regions.filter(r => r.location_id === locationId)));
}

console.log('[JSON_DB] JSON DB module initialized. DB Path:', JSON_DB_PATH); 