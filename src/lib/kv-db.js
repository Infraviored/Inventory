import { kv } from '@vercel/kv';

// Function to get all locations
export async function getLocations() {
  try {
    const locations = await kv.get('locations') || [];
    return locations;
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
}

// Function to get child locations
export async function getChildLocations(parentId) {
  try {
    const locations = await getLocations();
    return locations.filter(loc => loc.parentId === parentId);
  } catch (error) {
    console.error('Error fetching child locations:', error);
    return [];
  }
}

// Function to get location by ID
export async function getLocationById(id) {
  try {
    const locations = await getLocations();
    return locations.find(loc => loc.id === id) || null;
  } catch (error) {
    console.error('Error fetching location by ID:', error);
    return null;
  }
}

// Function to get location breadcrumbs
export async function getLocationBreadcrumbs(id) {
  try {
    const breadcrumbs = [];
    let currentId = id;
    
    while (currentId) {
      const location = await getLocationById(currentId);
      if (!location) break;
      
      breadcrumbs.unshift({
        id: location.id,
        name: location.name
      });
      
      currentId = location.parentId;
    }
    
    return breadcrumbs;
  } catch (error) {
    console.error('Error fetching breadcrumbs:', error);
    return [];
  }
}

// Function to add a location
export async function addLocation(name, parentId, description, imagePath) {
  try {
    const locations = await getLocations();
    
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
    
    // Save back to KV store
    await kv.set('locations', locations);
    
    return newId;
  } catch (error) {
    console.error('Error adding location:', error);
    throw error;
  }
}

// Function to update a location
export async function updateLocation(id, name, parentId, description, imagePath) {
  try {
    const locations = await getLocations();
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
    
    // Save back to KV store
    await kv.set('locations', locations);
    
    return true;
  } catch (error) {
    console.error('Error updating location:', error);
    throw error;
  }
}

// Function to delete a location
export async function deleteLocation(id) {
  try {
    const locations = await getLocations();
    const filteredLocations = locations.filter(loc => loc.id !== id);
    
    // Save back to KV store
    await kv.set('locations', filteredLocations);
    
    return true;
  } catch (error) {
    console.error('Error deleting location:', error);
    throw error;
  }
}

// Function to get all regions
export async function getRegions() {
  try {
    const regions = await kv.get('regions') || [];
    return regions;
  } catch (error) {
    console.error('Error fetching regions:', error);
    return [];
  }
}

// Function to add a region to a location
export async function addLocationRegion(locationId, name, x, y, width, height) {
  try {
    const regions = await getRegions();
    
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
    
    // Save back to KV store
    await kv.set('regions', regions);
    
    return newId;
  } catch (error) {
    console.error('Error adding region:', error);
    throw error;
  }
}

// Function to get regions for a location
export async function getLocationRegions(locationId) {
  try {
    const regions = await getRegions();
    return regions.filter(reg => reg.locationId === locationId);
  } catch (error) {
    console.error('Error fetching location regions:', error);
    return [];
  }
}

// Function to get a specific region
export async function getRegionById(id) {
  try {
    const regions = await getRegions();
    return regions.find(reg => reg.id === id) || null;
  } catch (error) {
    console.error('Error fetching region by ID:', error);
    return null;
  }
}

// Function to update a region
export async function updateRegion(id, name, x, y, width, height) {
  try {
    const regions = await getRegions();
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
    
    // Save back to KV store
    await kv.set('regions', regions);
    
    return true;
  } catch (error) {
    console.error('Error updating region:', error);
    throw error;
  }
}

// Function to delete a region
export async function deleteRegion(id) {
  try {
    const regions = await getRegions();
    const filteredRegions = regions.filter(reg => reg.id !== id);
    
    // Save back to KV store
    await kv.set('regions', filteredRegions);
    
    return true;
  } catch (error) {
    console.error('Error deleting region:', error);
    throw error;
  }
}

// Function to get all inventory items
export async function getInventoryItems() {
  try {
    const items = await kv.get('inventory_items') || [];
    
    // Enrich with location and region names
    const locations = await getLocations();
    const regions = await getRegions();
    
    return items.map(item => {
      const location = locations.find(loc => loc.id === item.locationId);
      const region = regions.find(reg => reg.id === item.regionId);
      
      return {
        ...item,
        locationName: location ? location.name : null,
        regionName: region ? region.name : null
      };
    });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return [];
  }
}

// Function to add an inventory item
export async function addInventoryItem(name, description, quantity, imagePath, locationId, regionId) {
  try {
    const items = await kv.get('inventory_items') || [];
    
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
    
    // Save back to KV store
    await kv.set('inventory_items', items);
    
    return newId;
  } catch (error) {
    console.error('Error adding inventory item:', error);
    throw error;
  }
}

// Function to get inventory item by ID
export async function getInventoryItemById(id) {
  try {
    const items = await getInventoryItems();
    return items.find(item => item.id === id) || null;
  } catch (error) {
    console.error('Error fetching inventory item by ID:', error);
    return null;
  }
}

// Function to update an inventory item
export async function updateInventoryItem(id, name, description, quantity, imagePath, locationId, regionId) {
  try {
    const items = await kv.get('inventory_items') || [];
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
    
    // Save back to KV store
    await kv.set('inventory_items', items);
    
    return true;
  } catch (error) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
}

// Function to delete an inventory item
export async function deleteInventoryItem(id) {
  try {
    const items = await kv.get('inventory_items') || [];
    const filteredItems = items.filter(item => item.id !== id);
    
    // Save back to KV store
    await kv.set('inventory_items', filteredItems);
    
    return true;
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
}

// Function to search items by name or description (fuzzy search)
export async function searchItems(query) {
  try {
    const items = await getInventoryItems();
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
  } catch (error) {
    console.error('Error searching items:', error);
    return [];
  }
}
