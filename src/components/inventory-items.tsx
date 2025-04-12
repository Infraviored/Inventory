import { useState, useEffect } from 'react';
import { getInventoryItems, deleteInventoryItem, InventoryItem } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function InventoryItems({ locationId, regionId }: { locationId?: number, regionId?: number }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch inventory items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await getInventoryItems(locationId, regionId);
        setItems(data);
      } catch (err) {
        console.error('Error fetching inventory items:', err);
        setError('Failed to fetch inventory items');
      } finally {
        setLoading(false);
      }
    };
    
    fetchItems();
  }, [locationId, regionId]);

  // Handle item deletion
  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteInventoryItem(id);
        // Refresh the items list
        const updatedItems = items.filter(item => item.id !== id);
        setItems(updatedItems);
      } catch (err) {
        console.error('Error deleting item:', err);
        setError('Failed to delete item');
      }
    }
  };

  if (loading) {
    return <div className="p-4">Loading inventory items...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Inventory Items</h2>
        <Link 
          href="/add-item"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add New Item
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center p-8 bg-gray-100 rounded">
          <p>No items found. Add a new item to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
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
                <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
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
                  <button
                    onClick={() => router.push(`/inventory?id=${item.id}`)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
