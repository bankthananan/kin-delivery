'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { MenuItemRow } from '@/components/MenuItemRow';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  categoryId: string;
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export default function MenuPage() {
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMenu = async () => {
    if (!user?.restaurantId) return;
    try {
      const data = await fetchApi<MenuCategory[]>(`/restaurants/${user.restaurantId}/menu`);
      setCategories(data);
    } catch (error) {
      console.error('Failed to load menu', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, [user?.restaurantId]);

  const toggleAvailability = async (itemId: string, isAvailable: boolean) => {
    try {
      await fetchApi(`/restaurant/menu/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ isAvailable }),
      });
      await loadMenu();
    } catch (error) {
      console.error('Failed to toggle availability', error);
      alert('Failed to update availability');
    }
  };

  const handleAddCategory = async () => {
    const name = prompt('Enter category name:');
    if (!name) return;
    try {
      await fetchApi('/restaurant/menu/categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      await loadMenu();
    } catch (error) {
      console.error('Failed to add category', error);
      alert('Failed to add category');
    }
  };

  const handleAddItem = async (categoryId: string) => {
    const name = prompt('Enter item name:');
    if (!name) return;
    const priceStr = prompt('Enter item price (฿):');
    if (!priceStr) return;
    const price = parseFloat(priceStr);
    if (isNaN(price)) return alert('Invalid price');

    try {
      await fetchApi('/restaurant/menu/items', {
        method: 'POST',
        body: JSON.stringify({ categoryId, name, price, isAvailable: true }),
      });
      await loadMenu();
    } catch (error) {
      console.error('Failed to add item', error);
      alert('Failed to add item');
    }
  };

  const handleEditItem = async (item: MenuItem) => {
    const name = prompt('Enter new item name:', item.name);
    if (!name) return;
    const priceStr = prompt('Enter new item price (฿):', item.price.toString());
    if (!priceStr) return;
    const price = parseFloat(priceStr);
    if (isNaN(price)) return alert('Invalid price');

    try {
      await fetchApi(`/restaurant/menu/items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, price }),
      });
      await loadMenu();
    } catch (error) {
      console.error('Failed to edit item', error);
      alert('Failed to edit item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await fetchApi(`/restaurant/menu/items/${itemId}`, {
        method: 'DELETE',
      });
      await loadMenu();
    } catch (error) {
      console.error('Failed to delete item', error);
      alert('Failed to delete item');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading menu...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-500 mt-1">Organize your categories and items</p>
        </div>
        <button
          onClick={handleAddCategory}
          className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
        >
          + Add Category
        </button>
      </div>

      <div className="space-y-6">
        {categories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">No menu categories found.</p>
          </div>
        ) : (
          categories.map((category) => (
            <div key={category.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">{category.name}</h2>
                <button
                  onClick={() => handleAddItem(category.id)}
                  className="text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  + Add Item
                </button>
              </div>
              <div className="p-6 space-y-4">
                {category.items.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No items in this category</p>
                ) : (
                  category.items.map((item) => (
                    <MenuItemRow
                      key={item.id}
                      id={item.id}
                      name={item.name}
                      price={item.price}
                      isAvailable={item.isAvailable}
                      onToggleAvailability={toggleAvailability}
                      onEdit={() => handleEditItem(item)}
                      onDelete={handleDeleteItem}
                    />
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
