// In-memory database with persistence via localStorage in the browser
// This approach works in Cloudflare environment since it doesn't require file system access

// Store data in memory
let locations = [];
let regions = [];
let inventoryItems = [];

// Initialize with default data if needed
if (typeof window !== 'undefined') {
  try {
    // Load data from localStorage if available
    const storedLocations = localStorage.getItem('locations');
    const storedRegions = localStorage.getItem('regions');
    const storedInventory = localStorage.getItem('inventory');
    
    if (storedLocations) locations = JSON.parse(storedLocations);
    if (storedRegions) regions = JSON.parse(storedRegions);
    if (storedInventory) inventoryItems = JSON.parse(storedInventory);
  } catch (error) {
    console.error('Error loading data from localStorage:', error);
  }
}

// Helper function to save data to localStorage
const saveToStorage = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('locations', JSON.stringify(locations));
      localStorage.setItem('regions', JSON.stringify(regions));
      localStorage.setItem('inventory', JSON.stringify(inventoryItems));
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
    }
  }
};

// Function to get all locations
export function getLocations() {
  return [...locations];
}

// Function to get child locations
export function getChildLocations(parentId) {
  return locations.filter(loc => loc.parentId === parentId);
}

// Function to get location by ID
export function getLocationById(id) {
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
  
  // Save to localStorage
  saveToStorage();
  
  return newId;
}

// Function to update a location
export function updateLocation(id, name, parentId, description, imagePath) {
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
  
  // Save to localStorage
  saveToStorage();
  
  return true;
}

// Function to delete a location
export function deleteLocation(id) {
  locations = locations.filter(loc => loc.id !== id);
  
  // Save to localStorage
  saveToStorage();
  
  return true;
}

// Function to get all regions
export function getRegions() {
  return [...regions];
}

// Function to add a region to a location
export function addLocationRegion(locationId, name, x, y, width, height) {
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
  
  // Save to localStorage
  saveToStorage();
  
  return newId;
}

// Function to get regions for a location
export function getLocationRegions(locationId) {
  return regions.filter(reg => reg.locationId === locationId);
}

// Function to get a specific region
export function getRegionById(id) {
  return regions.find(reg => reg.id === id) || null;
}

// Function to update a region
export function updateRegion(id, name, x, y, width, height) {
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
  
  // Save to localStorage
  saveToStorage();
  
  return true;
}

// Function to delete a region
export function deleteRegion(id) {
  regions = regions.filter(reg => reg.id !== id);
  
  // Save to localStorage
  saveToStorage();
  
  return true;
}

// Function to get all inventory items
export function getInventoryItems() {
  // Enrich with location and region names
  return inventoryItems.map(item => {
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
  // Generate a new ID
  const newId = inventoryItems.length > 0 
    ? Math.max(...inventoryItems.map(item => item.id)) + 1 
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
  inventoryItems.push(newItem);
  
  // Save to localStorage
  saveToStorage();
  
  return newId;
}

// Function to get inventory item by ID
export function getInventoryItemById(id) {
  const item = inventoryItems.find(item => item.id === id);
  if (!item) return null;
  
  const location = locations.find(loc => loc.id === item.locationId);
  const region = regions.find(reg => reg.id === item.regionId);
  
  return {
    ...item,
    locationName: location ? location.name : null,
    regionName: region ? region.name : null
  };
}

// Function to update an inventory item
export function updateInventoryItem(id, name, description, quantity, imagePath, locationId, regionId) {
  const index = inventoryItems.findIndex(item => item.id === id);
  
  if (index === -1) {
    throw new Error('Item not found');
  }
  
  // Update the item
  inventoryItems[index] = {
    ...inventoryItems[index],
    name,
    description,
    quantity,
    imagePath,
    locationId,
    regionId,
    updatedAt: new Date().toISOString()
  };
  
  // Save to localStorage
  saveToStorage();
  
  return true;
}

// Function to delete an inventory item
export function deleteInventoryItem(id) {
  inventoryItems = inventoryItems.filter(item => item.id !== id);
  
  // Save to localStorage
  saveToStorage();
  
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
