import { useCart, useCheckoutConfig, useCheckoutPreview } from '@/hooks/use-cart';
import { useAddresses, usePlaceOrder, useSaveAddress, useStripeCheckout, paymentMethodLabel } from '@/hooks/use-orders';
import { getApiErrorMessage, getValidationErrors } from '@/lib/api';
import { formatPrice, imageUrl, onImgError } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useCurrencyStore } from '@/stores/currency.store';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast-store';
import { AddressForm } from '@/features/account/address-form';
import { cn } from '@/lib/utils';
import type { Address, PaymentMethod } from '@/types';
import type { AddressInput } from '@/lib/validators';
import { Banknote, Check, CreditCard, Smartphone } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

function toShippingAddress(address: Address) {
  return {
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 || undefined,
    city: address.city,
    region: address.region,
    upazila: address.upazila || undefined,
    postalCode: address.postalCode || undefined,
    country: address.country || 'Bangladesh',
  };
}

const methodIcon: Record<PaymentMethod, typeof CreditCard> = {
  stripe: CreditCard,
  cod: Banknote,
  bkash: Smartphone,
};

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, couponCode } = useCart();
  const { data: config } = useCheckoutConfig();
  const previewQuery = useCheckoutPreview(couponCode);
  const { data: addresses, isLoading: addressesLoading } = useAddresses();
  const saveAddress = useSaveAddress();
  const placeOrder = usePlaceOrder();
  const stripeCheckout = useStripeCheckout();
  const currency = useCurrencyStore((s) => s.currency);
  const navigate = useNavigate();

  const preview = previewQuery.data;
  const defaultAddressId = useMemo(
    () => addresses?.find((a) => a.isDefault)?._id ?? addresses?.[0]?._id ?? null,
    [addresses]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'saved' | 'new'>('saved');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const effectiveSelectedId = selectedId ?? defaultAddressId;
  const selectedAddress = addresses?.find((a) => a._id === effectiveSelectedId) ?? null;
  const showNewForm = mode === 'new' || (!addressesLoading && (addresses?.length ?? 0) === 0);

  if (items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  function handleSaveAddress(values: AddressInput) {
    setServerErrors({});
    saveAddress.mutate(
      { ...values, country: values.country || 'Bangladesh' },
      {
        onSuccess: (list) => {
          const created = list[list.length - 1];
          if (created?._id) setSelectedId(created._id);
          setMode('saved');
          toast.success('Address saved');
        },
        onError: (err) => {
          setServerErrors(getValidationErrors(err));
          toast.error(getApiErrorMessage(err, 'Could not save address'));
        },
      }
    );
  }

  function submit() {
    if (!selectedAddress) {
      toast.error('Please choose a delivery address');
      return;
    }
    const shippingAddress = toShippingAddress(selectedAddress);

    if (paymentMethod === 'stripe') {
      stripeCheckout.mutate(
        { shippingAddress, couponCode },
        {
          onSuccess: ({ url }) => {
            if (url) window.location.assign(url);
            else toast.error('Stripe did not return a checkout URL');
          },
          onError: (err) => toast.error(getApiErrorMessage(err, 'Could not start card checkout')),
        }
      );
      return;
    }

    placeOrder.mutate(
      { paymentMethod, shippingAddress, couponCode },
      {
        onSuccess: (order) => {
          toast.success('Order placed!');
          navigate(`/checkout/success?order=${order.orderNumber}`, { replace: true });
        },
        onError: (err) => toast.error(getApiErrorMessage(err, 'Could not place your order')),
      }
    );
  }

  const submitting = placeOrder.isPending || stripeCheckout.isPending;
  const methods = config?.paymentMethods ?? (['cod'] as PaymentMethod[]);

  return (
    <Container>
      <Breadcrumbs items={[{ label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Checkout</h1>

      <div className="grid gap-8 pb-16 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {/* Delivery address */}
          <section className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Delivery address</h2>
              {(addresses?.length ?? 0) > 0 && (
                <button
                  onClick={() => setMode(showNewForm ? 'saved' : 'new')}
                  className="text-sm font-semibold text-accent transition-opacity hover:opacity-80"
                >
                  {showNewForm ? 'Use a saved address' : '+ New address'}
                </button>
              )}
            </div>

            {showNewForm ? (
              <div className="mt-4">
                <AddressForm
                  key="new-address"
                  onSubmit={handleSaveAddress}
                  submitting={saveAddress.isPending}
                  submitLabel="Save & use this address"
                  serverErrors={serverErrors}
                  onCancel={(addresses?.length ?? 0) > 0 ? () => setMode('saved') : undefined}
                />
              </div>
            ) : addressesLoading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {addresses?.map((address) => {
                  const active = address._id === effectiveSelectedId;
                  return (
                    <button
                      key={address._id}
                      type="button"
                      onClick={() => address._id && setSelectedId(address._id)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-200 ease-nova',
                        active ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                          active ? 'border-accent bg-accent text-accent-foreground' : 'border-border'
                        )}
                        aria-hidden
                      >
                        {active && <Check className="h-3 w-3" />}
                      </span>
                      <span className="text-sm">
                        <span className="block font-semibold text-foreground">
                          {address.fullName}
                          {address.label && (
                            <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {address.label}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-muted-foreground">
                          {address.line1}
                          {address.line2 ? `, ${address.line2}` : ''}, {address.upazila ? `${address.upazila}, ` : ''}
                          {address.city}
                          {address.region ? `, ${address.region}` : ''} {address.postalCode ?? ''}
                        </span>
                        <span className="mt-0.5 block text-muted-foreground">{address.phone}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Payment */}
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-semibold text-foreground">Payment method</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {methods.map((method) => {
                const Icon = methodIcon[method] ?? CreditCard;
                const active = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    aria-pressed={active}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl border p-3.5 text-sm font-medium transition-colors duration-200 ease-nova',
                      active ? 'border-accent bg-accent/5 text-accent' : 'border-border text-foreground hover:border-accent/40'
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {paymentMethodLabel[method]}
                  </button>
                );
              })}
            </div>
            {paymentMethod === 'cod' && (
              <p className="mt-3 text-xs text-muted-foreground">
                Pay in cash when your order is delivered. Stock is reserved immediately.
              </p>
            )}
            {paymentMethod === 'bkash' && (
              <p className="mt-3 text-xs text-muted-foreground">
                You will receive a bKash payment request after placing the order.
              </p>
            )}
            {paymentMethod === 'stripe' && (
              <p className="mt-3 text-xs text-muted-foreground">
                You'll be redirected to Stripe's secure checkout to pay by card.
              </p>
            )}
          </section>
        </div>

        {/* Summary */}
        <aside>
          <div className="sticky top-24 space-y-4 rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-semibold text-foreground">Your order</h2>

            {previewQuery.isLoading || !preview ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <>
                <ul className="max-h-64 space-y-3 overflow-y-auto">
                  {preview.items.map((item) => (
                    <li key={`${item.product}::${item.variantId ?? ''}`} className="flex gap-3">
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

                <dl className="space-y-2.5 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="font-medium text-foreground">
                      {formatPrice(preview.itemsSubtotal, currency)}
                    </dd>
                  </div>
                  {preview.discount > 0 && (
                    <div className="flex justify-between text-success">
                      <dt>Coupon {preview.couponCode}</dt>
                      <dd>−{formatPrice(preview.discount, currency)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Shipping</dt>
                    <dd className="font-medium text-foreground">
                      {preview.shippingCost === 0 ? (
                        <span className="text-success">Free</span>
                      ) : (
                        formatPrice(preview.shippingCost, currency)
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Tax</dt>
                    <dd className="font-medium text-foreground">{formatPrice(preview.tax, currency)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2.5 text-base">
                    <dt className="font-semibold text-foreground">Total</dt>
                    <dd className="font-bold text-foreground">{formatPrice(preview.total, currency)}</dd>
                  </div>
                </dl>
              </>
            )}

            <Button className="w-full" size="lg" onClick={submit} loading={submitting} disabled={!selectedAddress}>
              {paymentMethod === 'stripe' ? 'Pay with card' : 'Place order'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              By placing this order you agree to our terms of service.
            </p>
            {user && (
              <p className="text-center text-xs text-muted-foreground">
                Ordering as <span className="font-medium text-foreground">{user.email}</span>
              </p>
            )}
            <Link
              to="/cart"
              className="block text-center text-xs font-medium text-muted-foreground hover:text-accent"
            >
              ← Back to cart
            </Link>
          </div>
        </aside>
      </div>
    </Container>
  );
}
