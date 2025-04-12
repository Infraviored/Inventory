// JSON file-based database implementation
import fs from 'fs';
import path from 'path';

// Define data directory
const DATA_DIR = path.join(process.cwd(), '.data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Define file paths for different data types
const LOCATIONS_FILE = path.join(DATA_DIR, 'locations.json');
const REGIONS_FILE = path.join(DATA_DIR, 'regions.json');
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');

// Helper function to read JSON file
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
}

// Helper function to write JSON file
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    throw error;
  }
}

// Function to get all locations
export function getLocations() {
  return readJsonFile(LOCATIONS_FILE);
}

// Function to get child locations
export function getChildLocations(parentId) {
  const locations = getLocations();
  return locations.filter(loc => loc.parentId === parentId);
}

// Function to get location by ID
export function getLocationById(id) {
  const locations = getLocations();
  return locations.find(loc => loc.id === id) || null;
}

// Function to get location breadcrumbs
export function getLocationBreadcrumbs(id) {
  const breadcrumbs = [];
  let currentId = id;
  
  while (currentId) {
    const location = getLocationById(currentId);
    if (!location) break;
    
    breadcrumbs.unshift({
      id: location.id,
      name: location.name
    });
    
    currentId = location.parentId;
  }
  
  return breadcrumbs;
}

// Function to add a location
export function addLocation(name, parentId, description, imagePath) {
  const locations = getLocations();
  
  // Generate a new ID
  const newId = locations.length > 0 
    ? Math.max(...locations.map(loc => loc.id)) + 1 
    : 1;
  
  const newLocation = {
    id: newId,
    name,
    parentId,
    description,
    imagePath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Add to locations array
  locations.push(newLocation);
  
  // Save to file
  writeJsonFile(LOCATIONS_FILE, locations);
  
  return newId;
}

// Function to update a location
export function updateLocation(id, name, parentId, description, imagePath) {
  const locations = getLocations();
  const index = locations.findIndex(loc => loc.id === id);
  
  if (index === -1) {
    throw new Error('Location not found');
  }
  
  // Update the location
  locations[index] = {
    ...locations[index],
    name,
    parentId,
    description,
    imagePath,
    updatedAt: new Date().toISOString()
  };
  
  // Save to file
  writeJsonFile(LOCATIONS_FILE, locations);
  
  return true;
}

// Function to delete a location
export function deleteLocation(id) {
  const locations = getLocations();
  const filteredLocations = locations.filter(loc => loc.id !== id);
  
  // Save to file
  writeJsonFile(LOCATIONS_FILE, filteredLocations);
  
  return true;
}

// Function to get all regions
export function getRegions() {
  return readJsonFile(REGIONS_FILE);
}

// Function to add a region to a location
export function addLocationRegion(locationId, name, x, y, width, height) {
  const regions = getRegions();
  
  // Generate a new ID
  const newId = regions.length > 0 
    ? Math.max(...regions.map(reg => reg.id)) + 1 
    : 1;
  
  const newRegion = {
    id: newId,
    locationId,
    name,
    x,
    y,
    width,
    height,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Add to regions array
  regions.push(newRegion);
  
  // Save to file
  writeJsonFile(REGIONS_FILE, regions);
  
  return newId;
}

// Function to get regions for a location
export function getLocationRegions(locationId) {
  const regions = getRegions();
  return regions.filter(reg => reg.locationId === locationId);
}

// Function to get a specific region
export function getRegionById(id) {
  const regions = getRegions();
  return regions.find(reg => reg.id === id) || null;
}

// Function to update a region
export function updateRegion(id, name, x, y, width, height) {
  const regions = getRegions();
  const index = regions.findIndex(reg => reg.id === id);
  
  if (index === -1) {
    throw new Error('Region not found');
  }
  
  // Update the region
  regions[index] = {
    ...regions[index],
    name,
    x,
    y,
    width,
    height,
    updatedAt: new Date().toISOString()
  };
  
  // Save to file
  writeJsonFile(REGIONS_FILE, regions);
  
  return true;
}

// Function to delete a region
export function deleteRegion(id) {
  const regions = getRegions();
  const filteredRegions = regions.filter(reg => reg.id !== id);
  
  // Save to file
  writeJsonFile(REGIONS_FILE, filteredRegions);
  
  return true;
}

// Function to get all inventory items
export function getInventoryItems() {
  const items = readJsonFile(INVENTORY_FILE);
  
  // Enrich with location and region names
  const locations = getLocations();
  const regions = getRegions();
  
  return items.map(item => {
    const location = locations.find(loc => loc.id === item.locationId);
    const region = regions.find(reg => reg.id === item.regionId);
    
    return {
      ...item,
      locationName: location ? location.name : null,
      regionName: region ? region.name : null
    };
  });
}

// Function to add an inventory item
export function addInventoryItem(name, description, quantity, imagePath, locationId, regionId) {
  const items = readJsonFile(INVENTORY_FILE);
  
  // Generate a new ID
  const newId = items.length > 0 
    ? Math.max(...items.map(item => item.id)) + 1 
    : 1;
  
  const newItem = {
    id: newId,
    name,
    description,
    quantity,
    imagePath,
    locationId,
    regionId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Add to items array
  items.push(newItem);
  
  // Save to file
  writeJsonFile(INVENTORY_FILE, items);
  
  return newId;
}

// Function to get inventory item by ID
export function getInventoryItemById(id) {
  const items = getInventoryItems();
  return items.find(item => item.id === id) || null;
}

// Function to update an inventory item
export function updateInventoryItem(id, name, description, quantity, imagePath, locationId, regionId) {
  const items = readJsonFile(INVENTORY_FILE);
  const index = items.findIndex(item => item.id === id);
  
  if (index === -1) {
    throw new Error('Item not found');
  }
  
  // Update the item
  items[index] = {
    ...items[index],
    name,
    description,
    quantity,
    imagePath,
    locationId,
    regionId,
    updatedAt: new Date().toISOString()
  };
  
  // Save to file
  writeJsonFile(INVENTORY_FILE, items);
  
  return true;
}

// Function to delete an inventory item
export function deleteInventoryItem(id) {
  const items = readJsonFile(INVENTORY_FILE);
  const filteredItems = items.filter(item => item.id !== id);
  
  // Save to file
  writeJsonFile(INVENTORY_FILE, filteredItems);
  
  return true;
}

// Function to search items by name or description (fuzzy search)
export function searchItems(query) {
  const items = getInventoryItems();
  const searchTerm = query.toLowerCase();
  
  // Filter items that match the search term
  const matchedItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm) || 
    (item.description && item.description.toLowerCase().includes(searchTerm))
  );
  
  // Sort by relevance
  return matchedItems.sort((a, b) => {
    // Exact match
    if (a.name.toLowerCase() === searchTerm) return -1;
    if (b.name.toLowerCase() === searchTerm) return 1;
    
    // Starts with search term
    if (a.name.toLowerCase().startsWith(searchTerm) && !b.name.toLowerCase().startsWith(searchTerm)) return -1;
    if (b.name.toLowerCase().startsWith(searchTerm) && !a.name.toLowerCase().startsWith(searchTerm)) return 1;
    
    // Contains search term
    if (a.name.toLowerCase().includes(searchTerm) && !b.name.toLowerCase().includes(searchTerm)) return -1;
    if (b.name.toLowerCase().includes(searchTerm) && !a.name.toLowerCase().includes(searchTerm)) return 1;
    
    // Default to alphabetical
    return a.name.localeCompare(b.name);
  });
}
