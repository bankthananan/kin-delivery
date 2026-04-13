'use client';

import { useEffect, useState } from 'react';
import { useOrdersStore } from '@/store/orders';
import { socketClient } from '@/lib/socket';
import { fetchApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function OrdersQueuePage() {
  const { orders, setOrders, addOrder, updateOrderStatus } = useOrdersStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchApi<any[]>('/orders')
      .then((data) => setOrders(data))
      .catch(console.error)
      .finally(() => setIsLoading(false));

    const socket = socketClient.connect();
    
    socket.on('order_status_update', (data: any) => {
      if (data.status === 'CONFIRMED') {
        const orderId = data.orderId;
        fetchApi<any>(`/orders/${orderId}`).then(addOrder).catch(console.error);
      } else {
        updateOrderStatus(data.orderId, data.status);
      }
    });

    const interval = setInterval(() => {
      fetchApi<any[]>('/orders')
        .then((data) => setOrders(data))
        .catch(console.error);
    }, 30000);

    return () => {
      socket.off('order_status_update');
      socketClient.disconnect();
      clearInterval(interval);
    };
  }, [setOrders, addOrder, updateOrderStatus]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      updateOrderStatus(orderId, status as any);
      await fetchApi(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error(err);
      fetchApi<any[]>('/orders').then((data) => setOrders(data));
    }
  };

  const confirmedOrders = orders.filter(o => o.status === 'CONFIRMED');
  const preparingOrders = orders.filter(o => o.status === 'PREPARING');
  const readyOrders = orders.filter(o => o.status === 'READY');

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Live Order Queue</h1>
      
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0">
        <Column 
          title="New Orders" 
          count={confirmedOrders.length}
          orders={confirmedOrders}
          onAccept={(id) => handleUpdateStatus(id, 'PREPARING')}
          onReject={(id) => handleUpdateStatus(id, 'CANCELLED')}
        />
        <Column 
          title="Preparing" 
          count={preparingOrders.length}
          orders={preparingOrders}
          onMarkReady={(id) => handleUpdateStatus(id, 'READY')}
        />
        <Column 
          title="Ready for Pickup" 
          count={readyOrders.length}
          orders={readyOrders}
        />
      </div>
    </div>
  );
}

function Column({ 
  title, 
  count, 
  orders, 
  onAccept, 
  onReject, 
  onMarkReady 
}: { 
  title: string; 
  count: number; 
  orders: any[];
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onMarkReady?: (id: string) => void;
}) {
  return (
    <div className="flex flex-col bg-surface-100 rounded-xl overflow-hidden border border-surface-200 h-full">
      <div className="p-4 bg-white border-b border-surface-200 flex items-center justify-between sticky top-0 z-10">
        <h3 className="font-semibold text-surface-900">{title}</h3>
        <span className="bg-surface-200 text-surface-700 px-2.5 py-0.5 rounded-full text-sm font-medium">
          {count}
        </span>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {orders.map((order) => (
          <Card key={order.id} className="border-surface-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 border-b-0 px-4 pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">#{order.orderNumber}</CardTitle>
                  <p className="text-surface-500 text-sm mt-1">{order.customerName}</p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-surface-900">฿{order.total}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="space-y-2 mb-4">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm text-surface-700">
                    <span>{item.quantity}x {item.name}</span>
                  </div>
                ))}
              </div>
              
              {onAccept && onReject && (
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" className="flex-1" onClick={() => onReject(order.id)}>
                    Reject
                  </Button>
                  <Button variant="primary" size="sm" className="flex-1" onClick={() => onAccept(order.id)}>
                    Accept
                  </Button>
                </div>
              )}
              
              {onMarkReady && (
                <Button variant="primary" className="w-full" onClick={() => onMarkReady(order.id)}>
                  Mark Ready
                </Button>
              )}
              
              {!onAccept && !onMarkReady && (
                <div className="text-sm text-center text-surface-500 bg-surface-50 py-2 rounded-lg border border-surface-100">
                  Waiting for driver
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && (
          <div className="h-full flex items-center justify-center text-surface-400 text-sm p-8 text-center">
            No orders
          </div>
        )}
      </div>
    </div>
  );
}
