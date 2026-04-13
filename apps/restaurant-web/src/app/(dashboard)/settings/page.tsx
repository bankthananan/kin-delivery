'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface RestaurantProfile {
  name: string;
  description: string;
  openingTime: string;
  closingTime: string;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<RestaurantProfile>({
    name: '',
    description: '',
    openingTime: '09:00',
    closingTime: '22:00',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (!user?.restaurantId) return;

    const loadProfile = async () => {
      try {
        const data = await fetchApi<RestaurantProfile>(`/restaurants/${user.restaurantId}`);
        setProfile({
          name: data.name || '',
          description: data.description || '',
          openingTime: data.openingTime || '09:00',
          closingTime: data.closingTime || '22:00',
        });
      } catch (error) {
        console.error('Failed to load profile', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      await fetchApi('/restaurant/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      });
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Restaurant Settings</h1>
        <p className="text-gray-500 mt-1">Manage your public profile and operating hours</p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          {message.text && (
            <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
              Restaurant Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-base text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              value={profile.description}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-base text-gray-900 resize-none"
              placeholder="Describe your restaurant's specialty..."
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="openingTime" className="block text-sm font-semibold text-gray-900 mb-2">
                Opening Time
              </label>
              <input
                type="time"
                id="openingTime"
                required
                value={profile.openingTime}
                onChange={(e) => setProfile({ ...profile, openingTime: e.target.value })}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-base text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="closingTime" className="block text-sm font-semibold text-gray-900 mb-2">
                Closing Time
              </label>
              <input
                type="time"
                id="closingTime"
                required
                value={profile.closingTime}
                onChange={(e) => setProfile({ ...profile, closingTime: e.target.value })}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-base text-gray-900"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
