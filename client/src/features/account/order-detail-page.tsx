import { useCancelOrder, useOrder, paymentMethodLabel } from '@/hooks/use-orders';
import { formatDateTime, formatPrice, getOrderStatusMeta, cn } from '@/lib/utils';
import { useCurrencyStore } from '@/stores/currency.store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { toast } from '@/components/ui/toast-store';
import { Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError, refetch } = useOrder(id);
  const cancelOrder = useCancelOrder();
  const currency = useCurrencyStore((s) => s.currency);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !order) {
    return <ErrorState title="Order not found" onRetry={() => refetch()} />;
  }

  const meta = getOrderStatusMeta(order.status);
  const cancelable = order.status === 'pending' || order.status === 'paid';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/account/orders" className="text-sm font-medium text-accent hover:opacity-80">
            ← All orders
          </Link>
          <h1 className="mt-1 font-mono text-xl font-bold text-foreground">{order.orderNumber}</h1>
          <p className="text-xs text-muted-foreground">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>
            {meta.label}
          </span>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-foreground">
            {methodLabel[order.paymentMethod]}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Items</h2>
            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li key={`${item.product}::${item.variantId ?? ''}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <img
                    src={item.image}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/products/${item.slug}`}
                      className="line-clamp-2 text-sm font-medium text-foreground hover:text-accent"
                    >
                      {item.title}
                    </Link>
                    {item.variantLabel && (
                      <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(item.price, currency)} × {item.qty}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {formatPrice(item.lineTotal, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Status timeline</h2>
            <ol className="space-y-4">
              {order.timeline.map((event, i) => (
                <li key={`${event.status}-${i}`} className="flex gap-3">
                  <span
                    className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', getOrderStatusMeta(event.status).dot)}
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-medium capitalize text-foreground">{event.status}</p>
                    {event.note && <p className="text-xs text-muted-foreground">{event.note}</p>}
                    <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Summary</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium text-foreground">{formatPrice(order.itemsSubtotal, currency)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Discount {order.couponCode ? `(${order.couponCode})` : ''}</dt>
                  <dd>−{formatPrice(order.discount, currency)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd className="font-medium text-foreground">{formatPrice(order.shippingCost, currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="font-medium text-foreground">{formatPrice(order.tax, currency)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2.5 text-base">
                <dt className="font-semibold text-foreground">Total</dt>
                <dd className="font-bold text-foreground">{formatPrice(order.total, currency)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Delivery address</h2>
            <p className="text-sm text-foreground">{order.shippingAddress.fullName}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
              <br />
              {order.shippingAddress.upazila ? `${order.shippingAddress.upazila}, ` : ''}
              {order.shippingAddress.city}
              {order.shippingAddress.region ? `, ${order.shippingAddress.region}` : ''}{' '}
              {order.shippingAddress.postalCode ?? ''}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{order.shippingAddress.phone}</p>
            {order.trackingNumber && (
              <p className="mt-3 text-xs text-muted-foreground">
                Tracking: <span className="font-mono text-foreground">{order.trackingNumber}</span>
                {order.carrier ? ` · ${order.carrier}` : ''}
              </p>
            )}
          </section>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden />
              Print invoice
            </Button>
            {cancelable && (
              <Button
                variant="danger"
                loading={cancelOrder.isPending}
                onClick={() =>
                  cancelOrder.mutate(order._id, {
                    onSuccess: () => toast.success('Order cancelled'),
                    onError: (err) =>
                      toast.error(err instanceof Error ? err.message : 'Could not cancel order'),
                  })
                }
              >
                Cancel order
              </Button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
