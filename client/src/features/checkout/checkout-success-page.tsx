import { useOrderByNumber } from '@/hooks/use-orders';
import { formatPrice, getOrderStatusMeta, imageUrl, onImgError } from '@/lib/utils';
import { useCurrencyStore } from '@/stores/currency.store';
import { Container } from '@/components/layout/container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { CheckCircle2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export default function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const orderNumber = params.get('order') ?? undefined;
  const { data: order, isLoading, isError } = useOrderByNumber(orderNumber);
  const currency = useCurrencyStore((s) => s.currency);

  return (
    <Container>
      <div className="mx-auto max-w-2xl py-14">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Thank you for your order!
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {order
              ? `We've received order ${order.orderNumber} and emailed a confirmation to you.`
              : 'Your order has been received. A confirmation email is on its way.'}
          </p>
        </div>

        {isLoading ? (
          <div className="mt-10 space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : isError || !order ? (
          <div className="mt-8">
            <ErrorState
              title="Order details unavailable"
              description="Your order was placed, but we couldn't load its details. Check your account for the latest status."
            />
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Order number</p>
                <p className="font-mono text-sm font-semibold text-foreground">{order.orderNumber}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'warning'}>
                  {order.paymentStatus === 'paid' ? 'Paid' : 'Payment pending'}
                </Badge>
                <span className={getOrderStatusMeta(order.status).className + ' rounded-full px-2.5 py-0.5 text-xs font-semibold'}>
                  {getOrderStatusMeta(order.status).label}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Items</h2>
              <ul className="divide-y divide-border">
                {order.items.map((item) => (
                  <li key={`${item.product}::${item.variantId ?? ''}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <img
                      src={imageUrl(item.image)}
                      alt=""
                      onError={onImgError}
                      className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.variantLabel ? `${item.variantLabel} · ` : ''}Qty {item.qty}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {formatPrice(item.lineTotal, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5">
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-medium text-foreground">{formatPrice(order.itemsSubtotal, currency)}</dd>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <dt>Discount</dt>
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
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/account/orders">
                <Button>View my orders</Button>
              </Link>
              <Link to="/products">
                <Button variant="outline">Continue shopping</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
