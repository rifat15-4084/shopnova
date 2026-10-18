import { useCart } from '@/hooks/use-cart';
import type { Product } from '@/types';
import { discountPercent, formatPrice } from '@/lib/utils';
import { useCurrencyStore } from '@/stores/currency.store';
import { Badge } from '@/components/ui/badge';
import { LazyImage } from '@/components/ui/lazy-image';
import { Rating } from '@/components/ui/rating';
import { Check, Heart, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/components/ui/toast-store';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
  wishlist?: Set<string>;
  onToggleWishlist?: (id: string) => void;
}

/** Hover-lift card: only transform/opacity animate, image cross-fades to the secondary shot. */
export function ProductCard({ product, wishlist, onToggleWishlist }: ProductCardProps) {
  const { addItem } = useCart();
  const currency = useCurrencyStore((s) => s.currency);
  const [added, setAdded] = useState(false);
  const discount = discountPercent(product.price, product.compareAtPrice);
  const wished = wishlist?.has(product._id) ?? false;
  const outOfStock = product.stock <= 0;

  function handleAdd() {
    addItem({
      productId: product._id,
      variantId: null,
      slug: product.slug,
      title: product.title,
      unitPrice: product.price,
      image: product.images[0] ?? '',
      brand: product.brand,
      availableStock: product.stock,
      qty: 1,
    });
    setAdded(true);
    toast.success(`${product.title} added to cart`);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <article className="card group relative flex flex-col overflow-hidden transition-transform duration-nova ease-nova hover:-translate-y-1">
      <Link
        to={`/products/${product.slug}`}
        className="relative block aspect-square overflow-hidden"
        aria-label={product.title}
      >
        <LazyImage
          src={product.images[0]}
          alt={product.title}
          className="h-full w-full transition-opacity duration-nova ease-nova group-hover:opacity-0"
        />
        {product.images[1] && (
          <span className="absolute inset-0 opacity-0 transition-opacity duration-nova ease-nova group-hover:opacity-100">
            <LazyImage src={product.images[1]} alt="" className="h-full w-full" />
          </span>
        )}
        {discount !== null && (
          <span className="absolute left-3 top-3">
            <Badge variant="danger">−{discount}%</Badge>
          </span>
        )}
        {outOfStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/45">
            <Badge variant="danger" className="text-sm">
              Out of stock
            </Badge>
          </span>
        )}
      </Link>

      {onToggleWishlist && (
        <button
          onClick={() => onToggleWishlist(product._id)}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wished}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-sm backdrop-blur transition-[color,transform] duration-200 ease-nova hover:scale-105 hover:text-danger"
        >
          <Heart className={`h-4 w-4 ${wished ? 'fill-danger text-danger' : ''}`} aria-hidden />
        </button>
      )}

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{product.brand}</p>
        <Link
          to={`/products/${product.slug}`}
          className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-foreground transition-colors duration-200 ease-nova hover:text-accent"
        >
          {product.title}
        </Link>

        <div className="mt-1.5">
          <Rating value={product.ratingAverage} count={product.ratingCount} size="sm" />
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <p className="text-base font-bold text-foreground">{formatPrice(product.price, currency)}</p>
            {discount !== null && (
              <p className="text-xs text-muted-foreground">
                <s>{formatPrice(product.compareAtPrice, currency)}</s>
              </p>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            aria-label={`Add ${product.title} to cart`}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-2.5 text-xs font-semibold text-accent-foreground transition-[filter] duration-200 ease-nova hover:brightness-110 disabled:pointer-events-none disabled:opacity-50 sm:px-3"
          >
            {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
            <span className="hidden sm:inline">{added ? 'Added' : 'Add'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
