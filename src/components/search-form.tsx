"use client";

import { useState } from 'react';
import { searchItems, InventoryItem } from '@/lib/api';
import Link from 'next/link';

export default function SearchForm() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSearched(true);
      
      const data = await searchItems(query);
      setResults(data);
    } catch (err) {
      console.error('Error searching items:', err);
      setError('Failed to search items');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Search Inventory</h2>
      
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for items (e.g., screwdriver, metal rod)"
            className="border rounded-l px-4 py-2 flex-grow"
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-r"
          >
            Search
          </button>
        </div>
      </form>
      
      {loading && <div className="p-4">Searching...</div>}
      
      {error && <div className="p-4 text-red-500">Error: {error}</div>}
      
      {searched && !loading && results.length === 0 && (
        <div className="text-center p-8 bg-gray-100 rounded">
          <p>No items found matching "{query}".</p>
        </div>
      )}
      
      {results.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Search Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="relative h-48 bg-gray-200">
                  {item.imagePath ? (
                    <img
                      src={item.imagePath}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-gray-400">No image</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h4 className="text-lg font-semibold mb-2">{item.name}</h4>
                  {item.description && (
                    <p className="text-gray-600 mb-2">{item.description}</p>
                  )}
                  <p className="text-sm mb-1">
                    <span className="font-medium">Quantity:</span> {item.quantity}
                  </p>
                  {item.locationName && (
                    <p className="text-sm mb-1">
                      <span className="font-medium">Location:</span> {item.locationName}
                      {item.regionName && ` (${item.regionName})`}
                    </p>
                  )}
                  <div className="flex space-x-2 mt-4">
                    <Link
                      href={`/inventory?id=${item.id}`}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      View
                    </Link>
                    <Link
                      href={`/api/led/${item.id}`}
                      target="_blank"
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Activate LED
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
