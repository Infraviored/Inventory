// Storage Provider - Abstraction layer for database access
// This file provides a unified interface for accessing data storage
// It automatically detects the environment and uses the appropriate storage method:
// - SQLite via Python Flask API for local development
// - Browser storage (localStorage) for Cloudflare deployment

import * as ApiClient from './api';

// Type definitions
export interface StorageConfig {
  mode: 'api' | 'browser';
  apiBaseUrl?: string;
}

// Simple browser storage implementation without external dependencies
// Directly embedded to avoid import issues
const browserStorage = {
  // Helper function to generate unique IDs
  generateId: () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  // Helper to get data from localStorage with a prefix
  getStorageData: (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(`inventory_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting ${key} from localStorage:`, error);
      return null;
    }
  },

  // Helper to set data in localStorage with a prefix
  setStorageData: (key: string, data: any) => {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(`inventory_${key}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error setting ${key} in localStorage:`, error);
      return false;
    }
  },

  // Initialize storage if needed
  initializeStorage: () => {
    if (typeof window === 'undefined') return;
    if (!browserStorage.getStorageData('locations')) {
      browserStorage.setStorageData('locations', []);
    }
    if (!browserStorage.getStorageData('regions')) {
      browserStorage.setStorageData('regions', []);
    }
    if (!browserStorage.getStorageData('items')) {
      browserStorage.setStorageData('items', []);
    }
  },

  // Function to get all locations
  getLocations: async () => {
    browserStorage.initializeStorage();
    return browserStorage.getStorageData('locations') || [];
  },

  // Function to get location by ID
  getLocationById: async (id: number) => {
    const locations = await browserStorage.getLocations();
    return locations.find((loc: any) => loc.id === id) || null;
  },

  // Function to get child locations
  getChildLocations: async (parentId: number) => {
    const locations = await browserStorage.getLocations();
    return locations.filter((loc: any) => loc.parentId === parentId);
  },

  // Function to get root locations
  getRootLocations: async () => {
    const locations = await browserStorage.getLocations();
    return locations.filter((loc: any) => loc.parentId === null);
  },

  // Function to add a location
  addLocation: async (name: string, parentId: number | null, description: string | null, imagePath: string | null, locationType?: string | null) => {
    const locations = await browserStorage.getLocations();
    const newLocation = {
      id: parseInt(browserStorage.generateId().substring(0, 8), 36),
      name,
      description: description || null,
      parentId: parentId || null,
      imagePath: imagePath || null,
      locationType: locationType || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    locations.push(newLocation);
    browserStorage.setStorageData('locations', locations);
    return newLocation; // Return the full location object instead of just the ID
  },

  // Function to update a location
  updateLocation: async (id: number, name: string, parentId: number | null, description: string | null, imagePath: string | null, locationType?: string | null) => {
    const locations = await browserStorage.getLocations();
    const index = locations.findIndex((loc: any) => loc.id === id);
    
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
    
    browserStorage.setStorageData('locations', locations);
    return locations[index];
  },

  // Function to delete a location
  deleteLocation: async (id: number) => {
    const locations = await browserStorage.getLocations();
    const filteredLocations = locations.filter((loc: any) => loc.id !== id);
    
    if (filteredLocations.length === locations.length) {
      throw new Error(`Location with ID ${id} not found`);
    }
    
    browserStorage.setStorageData('locations', filteredLocations);
    
    // Also delete child locations
    const childLocations = locations.filter((loc: any) => loc.parentId === id);
    for (const child of childLocations) {
      await browserStorage.deleteLocation(child.id);
    }
    
    // Delete regions for this location
    const regions = await browserStorage.getLocationRegions(id);
    for (const region of regions) {
      await browserStorage.deleteRegion(region.id);
    }
    
    // Delete items in this location
    const items = await browserStorage.getInventoryItems();
    const locationItems = items.filter((item: any) => item.locationId === id);
    for (const item of locationItems) {
      await browserStorage.deleteInventoryItem(item.id);
    }
    
    return true;
  },

  // Function to get location breadcrumbs
  getLocationBreadcrumbs: async (id: number) => {
    const breadcrumbs = [];
    let currentId = id;
    
    while (currentId) {
      const location = await browserStorage.getLocationById(currentId);
      if (!location) break;
      
      breadcrumbs.unshift({ id: location.id, name: location.name });
      currentId = location.parentId;
    }
    
    return breadcrumbs;
  },

  // Function to get all regions for a location
  getLocationRegions: async (locationId: number) => {
    browserStorage.initializeStorage();
    const regions = browserStorage.getStorageData('regions') || [];
    return regions.filter((region: any) => region.locationId === locationId);
  },

  // Function to get region by ID
  getRegionById: async (id: number) => {
    browserStorage.initializeStorage();
    const regions = browserStorage.getStorageData('regions') || [];
    return regions.find((region: any) => region.id === id) || null;
  },

  // Function to add a region
  addLocationRegion: async (locationId: number, name: string, x: number, y: number, width: number, height: number, color?: string) => {
    const regions = browserStorage.getStorageData('regions') || [];
    const newRegion = {
      id: parseInt(browserStorage.generateId().substring(0, 8), 36),
      locationId,
      name,
      x,
      y,
      width,
      height,
      color: color || null
    };
    
    regions.push(newRegion);
    browserStorage.setStorageData('regions', regions);
    return newRegion; // Return the full region object instead of just the ID
  },

  // Function to delete a region
  deleteRegion: async (id: number) => {
    const regions = browserStorage.getStorageData('regions') || [];
    const filteredRegions = regions.filter((region: any) => region.id !== id);
    
    if (filteredRegions.length === regions.length) {
      throw new Error(`Region with ID ${id} not found`);
    }
    
    browserStorage.setStorageData('regions', filteredRegions);
    
    // Update items that reference this region
    const items = await browserStorage.getInventoryItems();
    for (const item of items) {
      if (item.regionId === id) {
        await browserStorage.updateInventoryItem(
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
  },

  // Function to get all inventory items
  getInventoryItems: async () => {
    browserStorage.initializeStorage();
    return browserStorage.getStorageData('items') || [];
  },

  // Function to get inventory item by ID
  getInventoryItemById: async (id: number) => {
    const items = await browserStorage.getInventoryItems();
    const item = items.find((item: any) => item.id === id);
    
    if (!item) return null;
    
    // Add location and region names if they exist
    if (item.locationId) {
      const location = await browserStorage.getLocationById(item.locationId);
      item.locationName = location ? location.name : null;
    }
    
    if (item.regionId) {
      const region = await browserStorage.getRegionById(item.regionId);
      item.regionName = region ? region.name : null;
    }
    
    return item;
  },

  // Function to add an inventory item
  addInventoryItem: async (name: string, description: string | null, quantity: number, imagePath: string | null, locationId: number | null, regionId: number | null) => {
    const items = await browserStorage.getInventoryItems();
    const newItem = {
      id: parseInt(browserStorage.generateId().substring(0, 8), 36),
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
    browserStorage.setStorageData('items', items);
    return newItem.id;
  },

  // Function to update an inventory item
  updateInventoryItem: async (id: number, name: string, description: string | null, quantity: number, imagePath: string | null, locationId: number | null, regionId: number | null) => {
    const items = await browserStorage.getInventoryItems();
    const index = items.findIndex((item: any) => item.id === id);
    
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
    
    browserStorage.setStorageData('items', items);
    return items[index];
  },

  // Function to delete an inventory item
  deleteInventoryItem: async (id: number) => {
    const items = await browserStorage.getInventoryItems();
    const filteredItems = items.filter((item: any) => item.id !== id);
    
    if (filteredItems.length === items.length) {
      throw new Error(`Item with ID ${id} not found`);
    }
    
    browserStorage.setStorageData('items', filteredItems);
    return true;
  },

  // Function to search inventory items
  searchItems: async (query: string) => {
    if (!query) return [];
    
    const items = await browserStorage.getInventoryItems();
    const lowerQuery = query.toLowerCase();
    
    return items.filter((item: any) => 
      item.name.toLowerCase().includes(lowerQuery) || 
      (item.description && item.description.toLowerCase().includes(lowerQuery))
    );
  }
};

// Detect environment and determine storage mode
export function detectEnvironment(): StorageConfig {
  // Use API mode when Flask backend is available
  // Initialize browser storage as fallback
  if (typeof window !== 'undefined') {
    browserStorage.initializeStorage();
    console.log('Browser storage initialized as fallback');
  }
  
  // Use the Flask API backend that's running on port 5000
  // Use relative URL to avoid CORS issues
  return {
    mode: 'api',
    apiBaseUrl: ''
  };
}

// Storage provider class
export class StorageProvider {
  private config: StorageConfig;

  constructor(config?: StorageConfig) {
    this.config = config || detectEnvironment();
  }

  // Locations API
  async getAllLocations() {
    if (this.config.mode === 'api') {
      const response = await fetch(`${this.config.apiBaseUrl}/api/locations`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return response.json();
    }
    return browserStorage.getLocations();
  }

  async getRootLocations() {
    if (this.config.mode === 'api') {
      const response = await fetch(`${this.config.apiBaseUrl}/api/locations?root=true`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return response.json();
    }
    return browserStorage.getRootLocations();
  }

  async getLocationsByParentId(parentId: number) {
    if (this.config.mode === 'api') {
      const response = await fetch(`${this.config.apiBaseUrl}/api/locations?parentId=${parentId}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return response.json();
    }
    return browserStorage.getChildLocations(parentId);
  }

  async getLocationById(id: number) {
    if (this.config.mode === 'api') {
      const response = await fetch(`${this.config.apiBaseUrl}/api/locations/${id}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return response.json();
    }
    return browserStorage.getLocationById(id);
  }

  async createLocation(location: {
    name: string;
    description: string | null;
    parentId: number | null;
    imagePath: string | null;
    locationType?: string | null;
  }) {
    if (this.config.mode === 'api') {
      const formData = new FormData();
      formData.append('name', location.name);
      if (location.description) formData.append('description', location.description);
      if (location.parentId !== null) formData.append('parentId', location.parentId.toString());
      if (location.imagePath) formData.append('imagePath', location.imagePath);
      if (location.locationType) formData.append('locationType', location.locationType);
      
      const response = await fetch(`${this.config.apiBaseUrl}/api/locations`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return response.json();
    }
    const newLocation = await browserStorage.addLocation(
      location.name,
      location.parentId,
      location.description,
      location.imagePath,
      location.locationType
    );
    return newLocation; // Now returns the full location object
  }

  async updateLocation(id: number, formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const parentIdStr = formData.get('parentId') as string;
    const parentId = parentIdStr ? parseInt(parentIdStr, 10) : null;
    const imageFile = formData.get('image') as File;
    
    // Get current location to preserve image path if no new image
    const currentLocation = await browserStorage.getLocationById(id);
    let imagePath = currentLocation ? currentLocation.imagePath : null;
    
    if (imageFile && imageFile.size > 0) {
      // Handle image storage for browser mode
      imagePath = `/uploads/browser-storage-${Date.now()}.jpg`;
    }
    
    await browserStorage.updateLocation(id, name, parentId, description, imagePath);
    return browserStorage.getLocationById(id);
  }

  async deleteLocation(id: number) {
    return browserStorage.deleteLocation(id);
  }

  async getLocationBreadcrumbs(id: number) {
    return browserStorage.getLocationBreadcrumbs(id);
  }

  // Regions API
  async getLocationRegions(locationId: number) {
    return browserStorage.getLocationRegions(locationId);
  }

  async createRegion(locationId: number, region: {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
  }) {
    const newRegion = await browserStorage.addLocationRegion(
      locationId, 
      region.name, 
      region.x, 
      region.y, 
      region.width, 
      region.height,
      region.color
    );
    return newRegion; // Now returns the full region object
  }

  // Inventory API
  async getInventoryItems(locationId?: number, regionId?: number) {
    let items = await browserStorage.getInventoryItems();
    
    if (locationId !== undefined) {
      items = items.filter((item: any) => item.locationId === locationId);
    }
    
    if (regionId !== undefined) {
      items = items.filter((item: any) => item.regionId === regionId);
    }
    
    return items;
  }

  async getInventoryItemById(id: number) {
    return browserStorage.getInventoryItemById(id);
  }

  async addInventoryItem(formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const quantityStr = formData.get('quantity') as string;
    const quantity = parseInt(quantityStr, 10);
    const locationIdStr = formData.get('locationId') as string;
    const locationId = locationIdStr ? parseInt(locationIdStr, 10) : null;
    const regionIdStr = formData.get('regionId') as string;
    const regionId = regionIdStr ? parseInt(regionIdStr, 10) : null;
    const imageFile = formData.get('image') as File;
    
    let imagePath = null;
    if (imageFile && imageFile.size > 0) {
      // Handle image storage for browser mode
      imagePath = `/uploads/browser-storage-${Date.now()}.jpg`;
    }
    
    const id = await browserStorage.addInventoryItem(
      name, 
      description, 
      quantity, 
      imagePath, 
      locationId, 
      regionId
    );
    return browserStorage.getInventoryItemById(id);
  }

  async updateInventoryItem(id: number, formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const quantityStr = formData.get('quantity') as string;
    const quantity = parseInt(quantityStr, 10);
    const locationIdStr = formData.get('locationId') as string;
    const locationId = locationIdStr ? parseInt(locationIdStr, 10) : null;
    const regionIdStr = formData.get('regionId') as string;
    const regionId = regionIdStr ? parseInt(regionIdStr, 10) : null;
    const imageFile = formData.get('image') as File;
    
    // Get current item to preserve image path if no new image
    const currentItem = await browserStorage.getInventoryItemById(id);
    let imagePath = currentItem ? currentItem.imagePath : null;
    
    if (imageFile && imageFile.size > 0) {
      // Handle image storage for browser mode
      imagePath = `/uploads/browser-storage-${Date.now()}.jpg`;
    }
    
    await browserStorage.updateInventoryItem(
      id,
      name, 
      description, 
      quantity, 
      imagePath, 
      locationId, 
      regionId
    );
    return browserStorage.getInventoryItemById(id);
  }

  async deleteInventoryItem(id: number) {
    return browserStorage.deleteInventoryItem(id);
  }

  // Search API
  async searchItems(query: string) {
    return browserStorage.searchItems(query);
  }

  // LED API
  async getLedData(itemId: number) {
    // This is a specialized API that might not be fully implemented in browser storage
    // For now, we'll just return a basic implementation
    const item = await browserStorage.getInventoryItemById(itemId);
    if (!item || !item.locationId || !item.regionId) {
      throw new Error('Item not found or missing location/region');
    }
    
    const location = await browserStorage.getLocationById(item.locationId);
    const region = await browserStorage.getRegionById(item.regionId);
    
    return {
      item: { id: item.id, name: item.name },
      location: { id: location.id, name: location.name },
      region: { 
        id: region.id, 
        name: region.name, 
        x: region.x, 
        y: region.y, 
        width: region.width, 
        height: region.height 
      },
      ledPosition: { 
        x: region.x + region.width / 2, 
        y: region.y + region.height / 2 
      }
    };
  }
}

// Export a singleton instance for use throughout the application
export const storageProvider = new StorageProvider();

// Export the direct API client for cases where direct API access is needed
export { ApiClient };
