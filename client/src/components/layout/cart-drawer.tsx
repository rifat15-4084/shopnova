import { useCart, useCheckoutConfig } from '@/hooks/use-cart';
import { formatPrice } from '@/lib/utils';
import { useCurrencyStore } from '@/stores/currency.store';
import { Drawer } from '@/components/ui/drawer';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { useUIStore } from '@/stores/ui.store';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/toast-store';

/** Slide-over mini cart shared between the header button and mobile menu. */
export function CartDrawer() {
  const { cartOpen, setCartOpen } = useUIStore();
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const { data: config } = useCheckoutConfig();
  const currency = useCurrencyStore((s) => s.currency);
  const navigate = useNavigate();

  const freeShippingRemaining = config ? config.freeShippingThreshold - subtotal : 0;

  return (
    <Drawer open={cartOpen} onClose={() => setCartOpen(false)} title={`Cart (${items.length})`}>
      {items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/40" aria-hidden />
          <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          <button
            onClick={() => {
              setCartOpen(false);
              navigate('/products');
            }}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-[filter] duration-200 ease-nova hover:brightness-110"
          >
            Start shopping
          </button>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          {freeShippingRemaining > 0 && (
            <div className="border-b border-border bg-accent/5 px-4 py-3 text-xs font-medium text-foreground">
              Add {formatPrice(freeShippingRemaining, currency)} more for free shipping.
            </div>
          )}
          <ul className="flex-1 divide-y divide-border overflow-y-auto px-4">
            {items.map((item) => {
              const key = `${item.productId}::${item.variantId ?? ''}`;
              return (
                <li key={key} className="flex gap-3 py-4">
                  <Link
                    to={`/products/${item.slug}`}
                    onClick={() => setCartOpen(false)}
                    className="shrink-0"
                    aria-label={item.title}
                  >
                    <img
                      src={item.image}
                      alt=""
                      className="h-20 w-20 rounded-lg border border-border object-cover"
                      loading="lazy"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/products/${item.slug}`}
                      onClick={() => setCartOpen(false)}
                      className="line-clamp-2 text-sm font-semibold text-foreground transition-colors duration-200 ease-nova hover:text-accent"
                    >
                      {item.title}
                    </Link>
                    {item.variantLabel && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.variantLabel}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <QuantityStepper
                        size="sm"
                        value={item.qty}
                        max={Math.max(1, item.availableStock)}
                        onChange={(qty) => updateQuantity(item.productId, item.variantId, qty)}
                      />
                      <span className="text-sm font-semibold text-foreground">
                        {formatPrice(item.lineTotal, currency)}
                      </span>
                    </div>
                    {item.qty >= item.availableStock && (
                      <p className="mt-1 text-xs text-warning">Max stock reached</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      removeItem(item.productId, item.variantId);
                      toast.info(`Removed ${item.title} from cart`);
                    }}
                    aria-label={`Remove ${item.title} from cart`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 ease-nova hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="space-y-3 border-t border-border p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-foreground">{formatPrice(subtotal, currency)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Shipping and tax calculated at checkout.</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setCartOpen(false);
                  navigate('/cart');
                }}
                className="h-11 rounded-lg border border-border text-sm font-semibold text-foreground transition-colors duration-200 ease-nova hover:bg-accent/5"
              >
                View cart
              </button>
              <button
                onClick={() => {
                  setCartOpen(false);
                  navigate('/checkout');
                }}
                className="h-11 rounded-lg bg-accent text-sm font-semibold text-accent-foreground transition-[filter] duration-200 ease-nova hover:brightness-110"
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
