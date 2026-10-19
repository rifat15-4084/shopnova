import { useCancelOrder, useOrders } from '@/hooks/use-orders';
import { formatDate, formatPrice, getOrderStatusMeta, imageUrl, onImgError } from '@/lib/utils';
import { useCurrencyStore } from '@/stores/currency.store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { toast } from '@/components/ui/toast-store';
import { Package } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function OrdersPage() {
  const [status, setStatus] = useState('');
  const { data, isLoading, isError, refetch } = useOrders({ status: status || undefined });
  const cancelOrder = useCancelOrder();
  const currency = useCurrencyStore((s) => s.currency);

  const orders = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track and manage your orders.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 ease-nova ' +
              (status === f.value
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-foreground hover:border-accent/40')
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {isError ? (
        <ErrorState description="We couldn't load your orders." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Package className="h-7 w-7" aria-hidden />}
          title="No orders found"
          description={
            status ? 'No orders with this status yet.' : "You haven't placed any orders yet."
          }
          action={
            <Link to="/products">
              <Button>Start shopping</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const meta = getOrderStatusMeta(order.status);
            const cancelable = order.status === 'pending' || order.status === 'paid';
            return (
              <li key={order._id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-foreground">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>
                    {meta.label}
                  </span>
                </div>

                <ul className="mt-3 flex gap-2 overflow-x-auto">
                  {order.items.slice(0, 4).map((item) => (
                    <li key={`${item.product}::${item.variantId ?? ''}`} className="shrink-0">
                      <img
                        src={imageUrl(item.image)}
                        alt={item.title}
                        onError={onImgError}
                        className="h-14 w-14 rounded-lg border border-border object-cover"
                        loading="lazy"
                      />
                    </li>
                  ))}
                  {order.items.length > 4 && (
                    <li className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border text-xs text-muted-foreground">
                      +{order.items.length - 4}
                    </li>
                  )}
                </ul>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Total </span>
                    <span className="font-bold text-foreground">{formatPrice(order.total, currency)}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    {cancelable && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={cancelOrder.isPending}
                        onClick={() =>
                          cancelOrder.mutate(order._id, {
                            onSuccess: () => toast.success('Order cancelled'),
                            onError: (err) =>
                              toast.error(err instanceof Error ? err.message : 'Could not cancel order'),
                          })
                        }
                      >
                        Cancel
                      </Button>
                    )}
                    <Link to={`/account/orders/${order._id}`}>
                      <Button size="sm">View details</Button>
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
