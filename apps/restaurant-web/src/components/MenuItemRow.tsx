'use client';

interface MenuItemRowProps {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  onToggleAvailability: (id: string, isAvailable: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function MenuItemRow({
  id,
  name,
  price,
  isAvailable,
  onToggleAvailability,
  onEdit,
  onDelete,
}: MenuItemRowProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0 pr-4">
        <h3 className={`text-base font-medium truncate ${isAvailable ? 'text-gray-900' : 'text-gray-400'}`}>
          {name}
        </h3>
        <p className={`text-sm mt-0.5 ${isAvailable ? 'text-gray-600' : 'text-gray-400'}`}>
          ฿{Number(price).toFixed(2)}
        </p>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isAvailable}
            onChange={(e) => onToggleAvailability(id, e.target.checked)}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
          <span className="ml-3 text-sm font-medium text-gray-700 w-16 text-right">
            {isAvailable ? 'Available' : 'Out'}
          </span>
        </label>

        <div className="h-6 w-px bg-gray-200" />

        <button
          onClick={() => onEdit(id)}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Edit"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        <button
          onClick={() => onDelete(id)}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
