// Storage Provider - Abstraction layer for database access
// This file provides a unified interface for accessing data storage
// It automatically detects the environment and uses the appropriate storage method:
// - SQLite via Python Flask API for local development
// - Browser storage (localStorage/IndexedDB) for Cloudflare deployment

import * as ApiClient from './api';

// Type definitions
export interface StorageConfig {
  mode: 'api' | 'browser';
  apiBaseUrl?: string;
}

// Detect environment and determine storage mode
export function detectEnvironment(): StorageConfig {
  // Check if we're running in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // Check if we're running on Cloudflare Pages
  const isCloudflare = isBrowser && 
    (window.location.hostname.includes('.pages.dev') || 
     process.env.NEXT_PUBLIC_CLOUDFLARE_PAGES === 'true');
  
  // If we're on Cloudflare Pages, use browser storage
  // Otherwise, use the API (SQLite)
  return {
    mode: isCloudflare ? 'browser' : 'api',
    apiBaseUrl: '/api'
  };
}

// Storage provider class
export class StorageProvider {
  private config: StorageConfig;
  private browserStorage: any = null;

  constructor(config?: StorageConfig) {
    this.config = config || detectEnvironment();
    
    // If we're using browser storage, dynamically import the appropriate module
    if (this.config.mode === 'browser') {
      // We'll load this dynamically to avoid issues with SSR
      this.loadBrowserStorage();
    }
  }

  private async loadBrowserStorage() {
    try {
      // Dynamically import the browser storage implementation
      // Using kv-db_local.js as it's the most robust option
      const module = await import('/backup_local_storage/kv-db_local.js');
      this.browserStorage = module;
    } catch (error) {
      console.error('Failed to load browser storage:', error);
      // Fallback to API mode if browser storage fails to load
      this.config.mode = 'api';
    }
  }

  // Ensure browser storage is loaded
  private async ensureBrowserStorage() {
    if (this.config.mode === 'browser' && !this.browserStorage) {
      await this.loadBrowserStorage();
    }
  }

  // Locations API
  async getLocations(parentId?: number, rootOnly?: boolean) {
    await this.ensureBrowserStorage();
    
    if (this.config.mode === 'browser') {
      if (rootOnly) {
        const locations = await this.browserStorage.getLocations();
        return locations.filter(loc => loc.parentId === null);
      } else if (parentId !== undefined) {
        return this.browserStorage.getChildLocations(parentId);
      } else {
        return this.browserStorage.getLocations();
      }
    } else {
      return ApiClient.getLocations(parentId, rootOnly);
    }
  }

  async getLocationById(id: number) {
    await this.ensureBrowserStorage();
    
    if (this.config.mode === 'browser') {
      return this.browserStorage.getLocationById(id);
    } else {
      return ApiClient.getLocationById(id);
    }
  }

  async addLocation(formData: FormData) {
    await this.ensureBrowserStorage();
    
    if (this.config.mode === 'browser') {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const parentIdStr = formData.get('parentId') as string;
      const parentId = parentIdStr ? parseInt(parentIdStr, 10) : null;
      const imageFile = formData.get('image') as File;
      
      let imagePath = null;
      if (imageFile && imageFile.size > 0) {
        // Handle image storage for browser mode
        // This would need to be implemented separately
        // For now, we'll just store a placeholder
        imagePath = `/uploads/browser-storage-${Date.now()}.jpg`;
      }
      
      const id = await this.browserStorage.addLocation(name, parentId, description, imagePath);
      return this.browserStorage.getLocationById(id);
    } else {
      return ApiClient.addLocation(formData);
    }
  }

  async updateLocation(id: number, formData: FormData) {
    await this.ensureBrowserStorage();
    
    if (this.config.mode === 'browser') {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const parentIdStr = formData.get('parentId') as string;
      const parentId = parentIdStr ? parseInt(parentIdStr, 10) : null;
      const imageFile = formData.get('image') as File;
      
      // Get current location to preserve image path if no new image
      const currentLocation = await this.browserStorage.getLocationById(id);
      let imagePath = currentLocation.imagePath;
      
      if (imageFile && imageFile.size > 0) {
        // Handle image storage for browser mode
        imagePath = `/uploads/browser-storage-${Date.now()}.jpg`;
      }
      
      await this.browserStorage.updateLocation(id, name, parentId, description, imagePath);
      return this.browserStorage.getLocationById(id);
    } else {
      return ApiClient.updateLocation(id, formData);
    }
  }

  async deleteLocation(id: number) {
    await this.ensureBrowserStorage();
    
    if (this.config.mode === 'browser') {
      return this.browserStorage.deleteLocation(id);
    } else {
      return ApiClient.deleteLocation(id);
    }
  }

  async getLocationBreadcrumbs(id: number) {
    await this.ensureBrowserStorage();
    
    if (this.config.mode === 'browser') {
      return this.browserStorage.getLocationBreadcrumbs(id);
    } else {
      return ApiClient.getLocationBreadcrumbs(id);
    }
  }

  // Regions API
  async getLocationRegions(locationId: number) {
    await this.ensureBrowserStorage();
    
    if (this.config.mode === 'browser') {
      return this.browserStorage.getLocationRegions(locationId);
    } else {
      return ApiClient.getLocationRegions(locationId);
    }
  }

  async addLocationRegion(locationId: number, region: {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
  }) {
    await this.ensureBrowserStorage();
    
    if (this.config.mode === 'browser') {
      const id = await this.browserStorage.addLocationRegion(
        locationId, 
        region.name, 
        region.x, 
        region.y, 
        region.width, 
        region.height
      );
      return this.browserStorage.getRegionById(id);
    } else {
      return ApiClient.addLocationRegion(locationId, region);
    }
  }

  // Inventory API
  async getInventoryItems(locationId?: number, regionId?: number) {
    await this.ensureBrowserStorage();
    
    if (this.config.mode === 'browser') {
      let items = await this.browserStorage.getInventoryItems();
      
      if (locationId !== undefined) {
        items = items.filter(item => item.locationId === locationId);
      }
      
      if (regionId !== undefined) {
        items = items.filter(item => item.regionId === regionId);
      }
      
      return items;
    } else {
      return ApiClient.getInventoryItems(locationId, regionId);
    }
  }

  async getInventoryItemById(id: number) {
    await this.ensureBrowserStorage();
    
    if (this.config.mode === 'browser') {
      return this.browserStorage.getInventoryItemById(id);
    } else {
      return ApiClient.getInventoryItemById(id);
    }
  }

  async addInventoryItem(formData: FormData) {
    await this.ensureBrowserStorage();
    
    if (this.config.mode === 'browser') {
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
      
      const id = await this.browserStorage.addInventoryItem(
        name, 
        description, 
        quantity, 
        imagePath, 
        locationId, 
        regionId
      );
      return this.browserStorage.getInventoryItemById(id);
    } else {
      return ApiClient.addInventoryItem(formData);
    }
  }

  async updateInventoryItem(id: number, formData: FormData) {
    await this.ensureBrowserStorage();
    
    if (this.config.mode === 'browser') {
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
      const currentItem = await this.browserStorage.getInventoryItemById(id);
      let imagePath = currentItem.imagePath;
      
      if (imageFile && imageFile.size > 0) {
        // Handle image storage for browser mode
        imagePath = `/uploads/browser-storage-${Date.now()}.jpg`;
      }
      
      await this.browserStorage.updateInventoryItem(
        id,
        name, 
        description, 
        quantity, 
        imagePath, 
        locationId, 
        regionId
      );
      return this.browserStorage.getInventoryItemById(id);
    } else {
      return ApiClient.updateInventoryItem(id, formData);
    }
  }

  async deleteInventoryItem(id: number) {
    await this.ensureBrowserStorage();
    
    if (this.config.mode === 'browser') {
      return this.browserStorage.deleteInventoryItem(id);
    } else {
      return ApiClient.deleteInventoryItem(id);
    }
  }

  // Search API
  async searchItems(query: string) {
    await this.ensureBrowserStorage();
    
    if (this.config.mode === 'browser') {
      return this.browserStorage.searchItems(query);
    } else {
      return ApiClient.searchItems(query);
    }
  }

  // LED API
  async getLedData(itemId: number) {
    await this.ensureBrowserStorage();
    
    if (this.config.mode === 'browser') {
      // This is a specialized API that might not be fully implemented in browser storage
      // For now, we'll just return a basic implementation
      const item = await this.browserStorage.getInventoryItemById(itemId);
      if (!item || !item.locationId || !item.regionId) {
        throw new Error('Item not found or missing location/region');
      }
      
      const location = await this.browserStorage.getLocationById(item.locationId);
      const region = await this.browserStorage.getRegionById(item.regionId);
      
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
    } else {
      return ApiClient.getLedData(itemId);
    }
  }
}

// Export a singleton instance for use throughout the application
export const storageProvider = new StorageProvider();

// Export the direct API client for cases where direct API access is needed
export { ApiClient };
