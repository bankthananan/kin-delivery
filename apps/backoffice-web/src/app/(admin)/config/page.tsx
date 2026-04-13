'use client';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function ConfigPage() {
  const [config, setConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchApi<any[]>('/admin/config')
      .then(setConfig)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setConfig(prev => prev.map(c => c.key === key ? { ...c, value } : c));
  };

  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    setMessage('');
    try {
      await fetchApi('/admin/config', {
        method: 'PUT',
        body: JSON.stringify({ key, value }),
      });
      setMessage(`Successfully updated ${key}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading config...</div>;

  return (
    <div className="max-w-3xl space-y-6">
      {message && (
        <div className={`p-4 rounded text-sm ${message.startsWith('Error') ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>
          {message}
        </div>
      )}
      <div className="card-container p-6">
        <h3 className="text-lg font-medium text-zinc-900 mb-6">Platform Settings</h3>
        <div className="space-y-6">
          {config.map((item) => (
            <div key={item.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
              <div className="w-1/2 pr-4">
                <label className="block text-sm font-medium text-zinc-700">{item.key.replace(/_/g, ' ').toUpperCase()}</label>
              </div>
              <div className="flex flex-1 items-center space-x-4 mt-2 sm:mt-0">
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => handleChange(item.key, e.target.value)}
                  className="input-base flex-1"
                />
                <button
                  onClick={() => handleSave(item.key, item.value)}
                  disabled={saving}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  Save
                </button>
              </div>
            </div>
          ))}
          {config.length === 0 && (
            <div className="text-center text-zinc-500 py-4">No configuration keys found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
