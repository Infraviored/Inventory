// API client for the Python Flask backend
// All requests go through Next.js API routes which then proxy to the Flask backend
// This keeps URLs relative and simplifies deployment
// Updated to use the proxy API route

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
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateRegionData {
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
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
  let url = `/api/locations`;
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
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
    console.error('API request failed:', errorMessage);
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function getLocationById(id: number): Promise<Location> {
  const response = await fetch(`/api/locations/${id}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
    console.error('API request failed:', errorMessage);
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function addLocation(formData: FormData): Promise<Location> {
  const response = await fetch(`/api/locations`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
    console.error('API request failed:', errorMessage);
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function updateLocation(id: number, formData: FormData): Promise<Location> {
  const response = await fetch(`/api/locations/${id}`, {
    method: 'PUT',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
    console.error('API request failed:', errorMessage);
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function deleteLocation(id: number): Promise<void> {
  const response = await fetch(`/api/locations/${id}`, {
    method: 'DELETE',
    cache: 'no-store',
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
    console.error('API request failed:', errorMessage);
    throw new Error(errorMessage);
  }
  
  // Success - no need to process response for DELETE operations
  console.log('Delete operation successful');
}

export async function getLocationBreadcrumbs(id: number): Promise<{id: number, name: string}[]> {
  const response = await fetch(`/api/locations/${id}/breadcrumbs`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
    console.error('API request failed:', errorMessage);
    throw new Error(errorMessage);
  }
  
  return response.json();
}

// Regions API
export async function getLocationRegions(locationId: number): Promise<Region[]> {
  const response = await fetch(`/api/locations/${locationId}/regions`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
    console.error('API request failed:', errorMessage);
    throw new Error(errorMessage);
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
  const response = await fetch(`/api/locations/${locationId}/regions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(region),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
    console.error('API request failed:', errorMessage);
    throw new Error(errorMessage);
  }
  
  return response.json();
}

// Inventory API
export async function getInventoryItems(locationId?: number, regionId?: number): Promise<InventoryItem[]> {
  let url = `/api/inventory`;
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
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
    console.error('API request failed:', errorMessage);
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function getInventoryItemById(id: number): Promise<InventoryItem> {
  const response = await fetch(`/api/inventory/${id}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
    console.error('API request failed:', errorMessage);
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function addInventoryItem(formData: FormData): Promise<InventoryItem> {
  const response = await fetch(`/api/inventory`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
    console.error('API request failed:', errorMessage);
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function updateInventoryItem(id: number, formData: FormData): Promise<InventoryItem> {
  const response = await fetch(`/api/inventory/${id}`, {
    method: 'PUT',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
    console.error('API request failed:', errorMessage);
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function deleteInventoryItem(id: number): Promise<void> {
  const response = await fetch(`/api/inventory/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
    console.error('API request failed:', errorMessage);
    throw new Error(errorMessage);
  }
}

// Search API
export async function searchItems(query: string): Promise<InventoryItem[]> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
    console.error('API request failed:', errorMessage);
    throw new Error(errorMessage);
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
  const response = await fetch(`/api/led/${itemId}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
    console.error('API request failed:', errorMessage);
    throw new Error(errorMessage);
  }
  
  return response.json();
}

// ADD: Function to update a specific region
export async function updateLocationRegion(
    locationId: number,
    regionId: number,
    updateData: UpdateRegionData
): Promise<Region> {
    const response = await fetch(`/api/locations/${locationId}/regions/${regionId}`, {
        method: 'PUT',
        headers: {
             'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
        console.error('API request failed:', errorMessage);
        throw new Error(errorMessage);
    }

    return response.json();
}

// ADD: Function to delete a specific region
export async function deleteLocationRegion(
    locationId: number,
    regionId: number
): Promise<void> {
    const response = await fetch(`/api/locations/${locationId}/regions/${regionId}`, {
        method: 'DELETE',
        cache: 'no-store',
    });

    if (!response.ok) {
        // Handle 204 No Content as success for DELETE
        if (response.status === 204) {
             console.log('Region deleted successfully (204 No Content).');
             return;
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
        console.error('API request failed:', errorMessage);
        throw new Error(errorMessage);
    }
    // Also handle cases where server returns 200/OK with message (though 204 is standard)
    console.log('Region deleted successfully.');
}
