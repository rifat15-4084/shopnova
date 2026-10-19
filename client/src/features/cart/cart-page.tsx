import { useCart, useCheckoutConfig, useCheckoutPreview, useValidateCoupon } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { getApiErrorMessage } from '@/lib/api';
import { formatPrice, imageUrl, onImgError } from '@/lib/utils';
import { useCurrencyStore } from '@/stores/currency.store';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { toast } from '@/components/ui/toast-store';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { useState } from 'react';

export default function CartPage() {
  const { isAuthenticated } = useAuth();
  const {
    items,
    subtotal,
    couponCode,
    updateQuantity,
    removeItem,
    clear,
    setCoupon,
    validateCoupon,
  } = useCart();
  const { data: config } = useCheckoutConfig();
  const previewQuery = useCheckoutPreview(couponCode);
  const validate = useValidateCoupon();
  const currency = useCurrencyStore((s) => s.currency);
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const preview = isAuthenticated ? previewQuery.data : undefined;

  // Guests never trust client math in production, but we still show an estimate.
  const guestShipping = config
    ? subtotal <= 0 || subtotal >= config.freeShippingThreshold
      ? 0
      : config.flatShippingRate
    : 0;
  const guestTax = config ? Math.round(subtotal * config.taxRate * 100) / 100 : 0;
  const guestTotal = Math.round((subtotal + guestShipping + guestTax) * 100) / 100;

  const total = preview ? preview.total : guestTotal;
  const shipping = preview ? preview.shippingCost : guestShipping;
  const tax = preview ? preview.tax : guestTax;
  const discount = preview?.discount ?? 0;

  if (items.length === 0) {
    return (
      <Container>
        <Breadcrumbs items={[{ label: 'Cart' }]} />
        <EmptyState
          icon={<ShoppingBag className="h-7 w-7" aria-hidden />}
          title="Your cart is empty"
          description="Browse the catalog and add something you love."
          action={
            <Link to="/products">
              <Button>Start shopping</Button>
            </Link>
          }
          className="pb-16"
        />
      </Container>
    );
  }

  function applyCouponCode() {
    const value = code.trim().toUpperCase();
    if (!value) return;
    validate.mutate(value, {
      onSuccess: (coupon) => {
        setCoupon(coupon.code);
        toast.success(`Coupon ${coupon.code} applied — you save ${formatPrice(coupon.discount, currency)}`);
        setCode('');
      },
      onError: (err) => toast.error(getApiErrorMessage(err, 'Invalid or expired coupon')),
    });
  }

  function proceed() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    navigate('/checkout');
  }

  const isBusy = validateCoupon.isPending || previewQuery.isLoading;

  return (
    <Container>
      <Breadcrumbs items={[{ label: 'Cart' }]} />
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Shopping cart</h1>

      <div className="grid gap-8 pb-16 lg:grid-cols-[1fr_360px]">
        <div>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {items.map((item) => {
              const key = `${item.productId}::${item.variantId ?? ''}`;
              return (
                <li key={key} className="flex gap-4 p-4">
                  <Link to={`/products/${item.slug}`} className="shrink-0" aria-label={item.title}>
                    <img
                      src={imageUrl(item.image)}
                      alt=""
                      onError={onImgError}
                      className="h-20 w-20 rounded-lg border border-border object-cover sm:h-24 sm:w-24"
                      loading="lazy"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {item.sku || 'ShopNova'}
                        </p>
                        <Link
                          to={`/products/${item.slug}`}
                          className="line-clamp-2 text-sm font-semibold text-foreground transition-colors duration-200 ease-nova hover:text-accent"
                        >
                          {item.title}
                        </Link>
                        {item.variantLabel && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.variantLabel}</p>
                        )}
                        {item.qty >= item.availableStock && (
                          <p className="mt-1 text-xs text-warning">Maximum available stock reached</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          removeItem(item.productId, item.variantId);
                          toast.info(`Removed ${item.title}`);
                        }}
                        aria-label={`Remove ${item.title} from cart`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 ease-nova hover:bg-danger/10 hover:text-danger"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                      <QuantityStepper
                        value={item.qty}
                        max={Math.max(1, item.availableStock)}
                        onChange={(qty) => updateQuantity(item.productId, item.variantId, qty)}
                      />
                      <span className="text-sm font-bold text-foreground">
                        {formatPrice(item.lineTotal, currency)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex items-center justify-between">
            <Link
              to="/products"
              className="text-sm font-semibold text-accent transition-opacity hover:opacity-80"
            >
              ← Continue shopping
            </Link>
            <button
              onClick={() => {
                clear();
                toast.info('Cart cleared');
              }}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-danger"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Clear cart
            </button>
          </div>
        </div>

        {/* Summary */}
        <aside>
          <div className="sticky top-24 space-y-4 rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-semibold text-foreground">Order summary</h2>

            {isAuthenticated ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag
                    className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Coupon code"
                    aria-label="Coupon code"
                    className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm uppercase tracking-wide text-foreground placeholder:normal-case placeholder:tracking-normal focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={applyCouponCode} loading={validate.isPending}>
                  Apply
                </Button>
              </div>
            ) : (
              <p className="rounded-lg bg-accent/5 px-3 py-2 text-xs text-muted-foreground">
                <Link to="/login" className="font-semibold text-accent">
                  Sign in
                </Link>{' '}
                to apply a coupon at checkout.
              </p>
            )}

            {couponCode && (
              <div className="flex items-center justify-between rounded-lg bg-accent/5 px-3 py-2 text-xs">
                <span className="font-semibold text-foreground">Coupon {couponCode}</span>
                <button
                  onClick={() => setCoupon(null)}
                  className="font-medium text-muted-foreground transition-colors hover:text-danger"
                >
                  Remove
                </button>
              </div>
            )}

            {isBusy ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-medium text-foreground">{formatPrice(subtotal, currency)}</dd>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-success">
                    <dt>Coupon {couponCode}</dt>
                    <dd>−{formatPrice(discount, currency)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd className="font-medium text-foreground">
                    {shipping === 0 ? (
                      <span className="text-success">Free</span>
                    ) : (
                      formatPrice(shipping, currency)
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Tax{config ? ` (${Math.round(config.taxRate * 100)}%)` : ''}
                  </dt>
                  <dd className="font-medium text-foreground">{formatPrice(tax, currency)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2.5 text-base">
                  <dt className="font-semibold text-foreground">Total</dt>
                  <dd className="font-bold text-foreground">{formatPrice(total, currency)}</dd>
                </div>
              </dl>
            )}

            {config && subtotal > 0 && subtotal < config.freeShippingThreshold && (
              <p className="rounded-lg bg-accent/5 px-3 py-2 text-xs font-medium text-foreground">
                Add {formatPrice(config.freeShippingThreshold - subtotal, currency)} more to unlock free
                shipping.
              </p>
            )}

            <Button className="w-full" size="lg" onClick={proceed} disabled={items.length === 0}>
              {isAuthenticated ? 'Proceed to checkout' : 'Sign in to checkout'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Stripe · bKash · Cash on delivery</p>
          </div>
        </aside>
      </div>
    </Container>
  );
}
