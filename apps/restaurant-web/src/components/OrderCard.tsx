'use client';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface OrderCardProps {
  id: string;
  orderNumber: string;
  customerName: string;
  status: 'CONFIRMED' | 'PREPARING' | 'READY';
  items: OrderItem[];
  total: number;
  createdAt: string;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onMarkReady?: (id: string) => void;
}

export function OrderCard({
  id,
  orderNumber,
  customerName,
  status,
  items,
  total,
  createdAt,
  onAccept,
  onReject,
  onMarkReady,
}: OrderCardProps) {
  const timeSincePlaced = Math.round((new Date().getTime() - new Date(createdAt).getTime()) / 60000);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
      <div className={`px-4 py-3 border-b flex justify-between items-center ${status === 'CONFIRMED' ? 'bg-amber-50 border-amber-100' : status === 'PREPARING' ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100'}`}>
        <div>
          <span className="font-bold text-gray-900">#{orderNumber.substring(0, 8)}</span>
          <p className="text-xs text-gray-500 mt-0.5">{timeSincePlaced} min ago</p>
        </div>
        <span className="text-sm font-medium px-2.5 py-1 rounded-full bg-white bg-opacity-60 text-gray-800">
          {status}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-900 truncate mb-3">{customerName}</p>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-sm">
                <div className="flex gap-2 text-gray-700">
                  <span className="font-medium text-gray-900">{item.quantity}x</span>
                  <span>{item.name}</span>
                </div>
                <span className="text-gray-500 min-w-[3rem] text-right">฿{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center mb-4">
          <span className="text-gray-500 text-sm">Total</span>
          <span className="font-bold text-lg text-gray-900">฿{total.toFixed(2)}</span>
        </div>

        <div className="flex gap-2">
          {status === 'CONFIRMED' && (
            <>
              <button
                onClick={() => onReject?.(id)}
                className="flex-1 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => onAccept?.(id)}
                className="flex-1 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors shadow-sm"
              >
                Accept
              </button>
            </>
          )}
          {status === 'PREPARING' && (
            <button
              onClick={() => onMarkReady?.(id)}
              className="w-full py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              Mark Ready
            </button>
          )}
          {status === 'READY' && (
            <div className="w-full py-2.5 text-sm font-medium text-green-700 bg-green-50 text-center rounded-lg border border-green-100 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Waiting for driver
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
