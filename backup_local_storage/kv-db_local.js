// Simple browser storage implementation without external dependencies
// This file replaces the dependency on @vercel/kv with localStorage

// Helper function to generate unique IDs
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Helper to get data from localStorage with a prefix
function getStorageData(key) {
  try {
    const data = localStorage.getItem(`inventory_${key}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error getting ${key} from localStorage:`, error);
    return null;
  }
}

// Helper to set data in localStorage with a prefix
function setStorageData(key, data) {
  try {
    localStorage.setItem(`inventory_${key}`, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error setting ${key} in localStorage:`, error);
    return false;
  }
}

// Initialize storage if needed
function initializeStorage() {
  if (!getStorageData('locations')) {
    setStorageData('locations', []);
  }
  if (!getStorageData('regions')) {
    setStorageData('regions', []);
  }
  if (!getStorageData('items')) {
    setStorageData('items', []);
  }
}

// Function to get all locations
export async function getLocations() {
  initializeStorage();
  return getStorageData('locations') || [];
}

// Function to get location by ID
export async function getLocationById(id) {
  const locations = await getLocations();
  return locations.find(loc => loc.id === id) || null;
}

// Function to get child locations
export async function getChildLocations(parentId) {
  const locations = await getLocations();
  return locations.filter(loc => loc.parentId === parentId);
}

// Function to get root locations
export async function getRootLocations() {
  const locations = await getLocations();
  return locations.filter(loc => loc.parentId === null);
}

// Function to add a location
export async function addLocation(name, parentId, description, imagePath, locationType) {
  const locations = await getLocations();
  const newLocation = {
    id: parseInt(generateId().substring(0, 8), 36),
    name,
    description: description || null,
    parentId: parentId || null,
    imagePath: imagePath || null,
    locationType: locationType || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  locations.push(newLocation);
  setStorageData('locations', locations);
  return newLocation.id;
}

// Function to update a location
export async function updateLocation(id, name, parentId, description, imagePath, locationType) {
  const locations = await getLocations();
  const index = locations.findIndex(loc => loc.id === id);
  
  if (index === -1) {
    throw new Error(`Location with ID ${id} not found`);
  }
  
  locations[index] = {
    ...locations[index],
    name,
    description: description || null,
    parentId: parentId || null,
    imagePath: imagePath || locations[index].imagePath,
    locationType: locationType || locations[index].locationType,
    updatedAt: new Date().toISOString()
  };
  
  setStorageData('locations', locations);
  return locations[index];
}

// Function to delete a location
export async function deleteLocation(id) {
  const locations = await getLocations();
  const filteredLocations = locations.filter(loc => loc.id !== id);
  
  if (filteredLocations.length === locations.length) {
    throw new Error(`Location with ID ${id} not found`);
  }
  
  setStorageData('locations', filteredLocations);
  
  // Also delete child locations
  const childLocations = locations.filter(loc => loc.parentId === id);
  for (const child of childLocations) {
    await deleteLocation(child.id);
  }
  
  // Delete regions for this location
  const regions = await getLocationRegions(id);
  for (const region of regions) {
    await deleteRegion(region.id);
  }
  
  // Delete items in this location
  const items = await getInventoryItems();
  const locationItems = items.filter(item => item.locationId === id);
  for (const item of locationItems) {
    await deleteInventoryItem(item.id);
  }
  
  return true;
}

// Function to get location breadcrumbs
export async function getLocationBreadcrumbs(id) {
  const breadcrumbs = [];
  let currentId = id;
  
  while (currentId) {
    const location = await getLocationById(currentId);
    if (!location) break;
    
    breadcrumbs.unshift({ id: location.id, name: location.name });
    currentId = location.parentId;
  }
  
  return breadcrumbs;
}

// Function to get all regions for a location
export async function getLocationRegions(locationId) {
  initializeStorage();
  const regions = getStorageData('regions') || [];
  return regions.filter(region => region.locationId === locationId);
}

// Function to get region by ID
export async function getRegionById(id) {
  initializeStorage();
  const regions = getStorageData('regions') || [];
  return regions.find(region => region.id === id) || null;
}

// Function to add a region
export async function addLocationRegion(locationId, name, x, y, width, height, color) {
  const regions = getStorageData('regions') || [];
  const newRegion = {
    id: parseInt(generateId().substring(0, 8), 36),
    locationId,
    name,
    x,
    y,
    width,
    height,
    color: color || null
  };
  
  regions.push(newRegion);
  setStorageData('regions', regions);
  return newRegion.id;
}

// Function to delete a region
export async function deleteRegion(id) {
  const regions = getStorageData('regions') || [];
  const filteredRegions = regions.filter(region => region.id !== id);
  
  if (filteredRegions.length === regions.length) {
    throw new Error(`Region with ID ${id} not found`);
  }
  
  setStorageData('regions', filteredRegions);
  
  // Update items that reference this region
  const items = await getInventoryItems();
  for (const item of items) {
    if (item.regionId === id) {
      await updateInventoryItem(
        item.id,
        item.name,
        item.description,
        item.quantity,
        item.imagePath,
        item.locationId,
        null // Remove region reference
      );
    }
  }
  
  return true;
}

// Function to get all inventory items
export async function getInventoryItems() {
  initializeStorage();
  return getStorageData('items') || [];
}

// Function to get inventory item by ID
export async function getInventoryItemById(id) {
  const items = await getInventoryItems();
  const item = items.find(item => item.id === id);
  
  if (!item) return null;
  
  // Add location and region names if they exist
  if (item.locationId) {
    const location = await getLocationById(item.locationId);
    item.locationName = location ? location.name : null;
  }
  
  if (item.regionId) {
    const region = await getRegionById(item.regionId);
    item.regionName = region ? region.name : null;
  }
  
  return item;
}

// Function to add an inventory item
export async function addInventoryItem(name, description, quantity, imagePath, locationId, regionId) {
  const items = await getInventoryItems();
  const newItem = {
    id: parseInt(generateId().substring(0, 8), 36),
    name,
    description: description || null,
    quantity: quantity || 1,
    imagePath: imagePath || null,
    locationId: locationId || null,
    regionId: regionId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  items.push(newItem);
  setStorageData('items', items);
  return newItem.id;
}

// Function to update an inventory item
export async function updateInventoryItem(id, name, description, quantity, imagePath, locationId, regionId) {
  const items = await getInventoryItems();
  const index = items.findIndex(item => item.id === id);
  
  if (index === -1) {
    throw new Error(`Item with ID ${id} not found`);
  }
  
  items[index] = {
    ...items[index],
    name,
    description: description || null,
    quantity: quantity || 1,
    imagePath: imagePath || items[index].imagePath,
    locationId: locationId || null,
    regionId: regionId || null,
    updatedAt: new Date().toISOString()
  };
  
  setStorageData('items', items);
  return items[index];
}

// Function to delete an inventory item
export async function deleteInventoryItem(id) {
  const items = await getInventoryItems();
  const filteredItems = items.filter(item => item.id !== id);
  
  if (filteredItems.length === items.length) {
    throw new Error(`Item with ID ${id} not found`);
  }
  
  setStorageData('items', filteredItems);
  return true;
}

// Function to search inventory items
export async function searchItems(query) {
  if (!query) return [];
  
  const items = await getInventoryItems();
  const lowerQuery = query.toLowerCase();
  
  return items.filter(item => 
    item.name.toLowerCase().includes(lowerQuery) || 
    (item.description && item.description.toLowerCase().includes(lowerQuery))
  );
}
