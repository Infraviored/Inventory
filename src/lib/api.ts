// API client for the Python Flask backend

// Base URL for API requests
const API_BASE_URL = 'http://localhost:5000/api';

// Types
export interface Location {
  id: number;
  name: string;
  description: string | null;
  parentId: number | null;
  imagePath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Region {
  id: number;
  locationId: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  description: string | null;
  quantity: number;
  imagePath: string | null;
  locationId: number | null;
  locationName: string | null;
  regionId: number | null;
  regionName: string | null;
  createdAt: string;
  updatedAt: string;
}

// Locations API
export async function getLocations(parentId?: number, rootOnly?: boolean): Promise<Location[]> {
  let url = `${API_BASE_URL}/locations`;
  const params = new URLSearchParams();
  
  if (parentId !== undefined) {
    params.append('parentId', parentId.toString());
  }
  
  if (rootOnly) {
    params.append('root', 'true');
  }
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch locations');
  }
  
  return response.json();
}

export async function getLocationById(id: number): Promise<Location> {
  const response = await fetch(`${API_BASE_URL}/locations/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch location');
  }
  
  return response.json();
}

export async function addLocation(formData: FormData): Promise<Location> {
  const response = await fetch(`${API_BASE_URL}/locations`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Failed to create location');
  }
  
  return response.json();
}

export async function updateLocation(id: number, formData: FormData): Promise<Location> {
  const response = await fetch(`${API_BASE_URL}/locations/${id}`, {
    method: 'PUT',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Failed to update location');
  }
  
  return response.json();
}

export async function deleteLocation(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/locations/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete location');
  }
}

export async function getLocationBreadcrumbs(id: number): Promise<{id: number, name: string}[]> {
  const response = await fetch(`${API_BASE_URL}/locations/${id}/breadcrumbs`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch breadcrumbs');
  }
  
  return response.json();
}

// Regions API
export async function getLocationRegions(locationId: number): Promise<Region[]> {
  const response = await fetch(`${API_BASE_URL}/locations/${locationId}/regions`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch regions');
  }
  
  return response.json();
}

export async function addLocationRegion(locationId: number, region: {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}): Promise<Region> {
  const response = await fetch(`${API_BASE_URL}/locations/${locationId}/regions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(region),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create region');
  }
  
  return response.json();
}

// Inventory API
export async function getInventoryItems(locationId?: number, regionId?: number): Promise<InventoryItem[]> {
  let url = `${API_BASE_URL}/inventory`;
  const params = new URLSearchParams();
  
  if (locationId !== undefined) {
    params.append('locationId', locationId.toString());
  }
  
  if (regionId !== undefined) {
    params.append('regionId', regionId.toString());
  }
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch inventory items');
  }
  
  return response.json();
}

export async function getInventoryItemById(id: number): Promise<InventoryItem> {
  const response = await fetch(`${API_BASE_URL}/inventory/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch inventory item');
  }
  
  return response.json();
}

export async function addInventoryItem(formData: FormData): Promise<InventoryItem> {
  const response = await fetch(`${API_BASE_URL}/inventory`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Failed to create inventory item');
  }
  
  return response.json();
}

export async function updateInventoryItem(id: number, formData: FormData): Promise<InventoryItem> {
  const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
    method: 'PUT',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Failed to update inventory item');
  }
  
  return response.json();
}

export async function deleteInventoryItem(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete inventory item');
  }
}

// Search API
export async function searchItems(query: string): Promise<InventoryItem[]> {
  const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
  
  if (!response.ok) {
    throw new Error('Failed to search items');
  }
  
  return response.json();
}

// LED API
export async function getLedData(itemId: number): Promise<{
  item: { id: number; name: string };
  location: { id: number; name: string };
  region: { id: number; name: string; x: number; y: number; width: number; height: number };
  ledPosition: { x: number; y: number };
}> {
  const response = await fetch(`${API_BASE_URL}/led/${itemId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch LED data');
  }
  
  return response.json();
}
