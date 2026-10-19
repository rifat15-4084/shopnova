import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { useCreateReview, useProduct, useProductReviews } from '@/hooks/use-products';
import { useWishlist } from '@/hooks/use-wishlist';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Container } from '@/components/layout/container';
import { LazyImage } from '@/components/ui/lazy-image';
import { Price } from '@/components/ui/price';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { Rating } from '@/components/ui/rating';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Textarea } from '@/components/ui/form-fields';
import { toast } from '@/components/ui/toast-store';
import { useCurrencyStore } from '@/stores/currency.store';
import { formatDate, formatPrice, imageUrl, onImgError } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Heart, Leaf, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError, refetch } = useProduct(slug);
  const product = data?.product;
  const related = data?.related ?? [];

  const { data: reviewsData, isLoading: reviewsLoading } = useProductReviews(product?._id);
  const { addItem } = useCart();
  const { wishlist, toggle } = useWishlist();
  const { isAuthenticated } = useAuth();
  const createReview = useCreateReview(product?._id ?? '');
  const currency = useCurrencyStore((s) => s.currency);

  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const variant = useMemo(
    () => product?.variants.find((v) => v._id === variantId) ?? null,
    [product?.variants, variantId]
  );

  if (isLoading) {
    return (
      <Container>
        <div className="grid gap-8 py-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </Container>
    );
  }

  if (isError || !product) {
    return (
      <Container>
        <ErrorState
          title="Product not found"
          description="This product may have been removed or the link is incorrect."
          onRetry={() => refetch()}
        />
      </Container>
    );
  }

  const wished = wishlist.has(product._id);
  const effectivePrice = product.price + (variant?.priceDelta ?? 0);
  const availableStock = variant ? variant.stock : product.stock;
  const outOfStock = availableStock <= 0;
  const wishedId = product._id;

  function handleAdd() {
    if (!product || outOfStock) return;
    addItem({
      productId: product._id,
      variantId,
      slug: product.slug,
      title: variant ? `${product!.title} — ${variant.value}` : product.title,
      unitPrice: effectivePrice,
      image: variant?.image || product.images[0] || '',
      brand: product.brand,
      availableStock,
      qty: quantity,
    });
    toast.success(`${quantity} × ${product.title} added to cart`);
  }

  function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    createReview.mutate(
      { rating, comment: comment.trim() },
      {
        onSuccess: () => {
          toast.success('Thanks for your review!');
          setComment('');
          setReviewOpen(false);
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Could not submit review'),
      }
    );
  }

  return (
    <Container>
      <Breadcrumbs
        items={[
          {
            label: product.category?.name ?? 'Products',
            to: `/products?category=${product.category?.slug ?? ''}`,
          },
          { label: product.title },
        ]}
      />

      <div className="grid gap-8 pb-12 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="card overflow-hidden p-0">
            <LazyImage
              src={product.images[activeImage] ?? product.images[0]}
              alt={product.title}
              className="aspect-square w-full"
              eager
            />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={`${img}-${i}`}
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                  className={cn(
                    'h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors duration-200 ease-nova',
                    i === activeImage ? 'border-accent' : 'border-border hover:border-accent/40'
                  )}
                >
                  <img
                    src={imageUrl(img)}
                    alt=""
                    onError={onImgError}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">{product.brand}</Badge>
            {outOfStock ? (
              <Badge variant="danger">Out of stock</Badge>
            ) : availableStock <= 5 ? (
              <Badge variant="warning">Only {availableStock} left</Badge>
            ) : (
              <Badge variant="success">In stock</Badge>
            )}
            {product.isFeatured && <Badge variant="info">Featured</Badge>}
          </div>

          <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            {product.title}
          </h1>

          <div className="mt-2">
            <Link to="/products?sort=rating" className="inline-block">
              <Rating value={product.ratingAverage} count={product.ratingCount} />
            </Link>
          </div>

          <div className="mt-4">
            <Price amount={effectivePrice} compareAt={product.compareAtPrice} size="lg" />
          </div>

          {product.variants.length > 0 && (
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-semibold text-foreground">Options</legend>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const disabled = v.stock <= 0;
                  const selected = variantId === v._id;
                  return (
                    <button
                      key={v._id}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setVariantId(selected ? null : v._id);
                        setQuantity(1);
                      }}
                      aria-pressed={selected}
                      className={cn(
                        'rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors duration-200 ease-nova',
                        selected
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-foreground hover:border-accent/40',
                        disabled && 'cursor-not-allowed line-through opacity-40'
                      )}
                    >
                      {v.name}: {v.value}
                      {v.priceDelta !== 0 && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {v.priceDelta > 0 ? '+' : '−'}
                          {formatPrice(Math.abs(v.priceDelta), currency)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              max={Math.max(1, availableStock)}
              disabled={outOfStock}
            />
            <Button size="lg" onClick={handleAdd} disabled={outOfStock} className="flex-1 sm:flex-none">
              <ShoppingCart className="h-[18px] w-[18px]" aria-hidden />
              Add to cart
            </Button>
            <button
              onClick={() => toggle(wishedId)}
              aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={wished}
              className="flex h-12 w-12 items-center justify-center rounded-lg border border-border text-foreground transition-[color,border-color] duration-200 ease-nova hover:border-danger hover:text-danger"
            >
              <Heart className={cn('h-5 w-5', wished && 'fill-danger text-danger')} aria-hidden />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-border p-4 text-sm sm:grid-cols-3">
            <span className="flex items-center gap-2 text-foreground">
              <Truck className="h-4 w-4 text-accent" aria-hidden />
              Free over $100
            </span>
            <span className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-4 w-4 text-accent" aria-hidden />
              1-year warranty
            </span>
            <span className="flex items-center gap-2 text-foreground">
              <Leaf className="h-4 w-4 text-accent" aria-hidden />
              7-day returns
            </span>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-foreground">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>

          <div className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
            <p>
              SKU: <span className="font-mono">{product.sku || '—'}</span>
              {product.tags.length > 0 && <> · Tags: {product.tags.join(', ')}</>}
            </p>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="border-t border-border py-10" aria-labelledby="reviews-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="reviews-heading" className="text-xl font-bold text-foreground">
            Customer reviews
            {product.ratingCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({product.ratingCount})
              </span>
            )}
          </h2>
          <Button variant="outline" onClick={() => setReviewOpen((v) => !v)}>
            {isAuthenticated ? 'Write a review' : 'Sign in to review'}
          </Button>
        </div>

        {reviewOpen && (
          <form onSubmit={submitReview} className="card mt-4 max-w-xl space-y-4">
            {!isAuthenticated && (
              <p className="text-sm text-muted-foreground">
                Please{' '}
                <Link to="/login" className="font-semibold text-accent">
                  sign in
                </Link>{' '}
                to write a review.
              </p>
            )}
            <fieldset disabled={!isAuthenticated} className="space-y-4 disabled:opacity-60">
              <div>
                <legend className="mb-2 text-sm font-medium text-foreground">Your rating</legend>
                <div className="flex gap-1" role="radiogroup">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={rating === value}
                      aria-label={`${value} star${value > 1 ? 's' : ''}`}
                      onClick={() => setRating(value)}
                      className="p-1 transition-transform duration-200 ease-nova hover:scale-110"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className={cn(
                          'h-6 w-6',
                          value <= rating ? 'fill-amber-400 text-amber-400' : 'fill-none text-muted-foreground/40'
                        )}
                        aria-hidden
                      >
                        <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                label="Your review"
                name="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you like or dislike?"
                required
                minLength={3}
              />
              <Button type="submit" loading={createReview.isPending}>
                Submit review
              </Button>
            </fieldset>
          </form>
        )}

        <div className="mt-6 space-y-5">
          {reviewsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          ) : reviewsData && reviewsData.items.length > 0 ? (
            reviewsData.items.map((review) => (
              <article key={review._id} className="border-b border-border pb-5 last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Rating value={review.rating} size="sm" />
                  <span className="text-sm font-semibold text-foreground">
                    {review.user?.name ?? 'Anonymous'}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                  {review.isVerifiedPurchase && <Badge variant="success">Verified purchase</Badge>}
                </div>
                {review.title && (
                  <p className="mt-2 text-sm font-semibold text-foreground">{review.title}</p>
                )}
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>
              </article>
            ))
          ) : (
            <EmptyState title="No reviews yet" description="Be the first to review this product." />
          )}
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-border py-10" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-5 text-xl font-bold text-foreground">
            You may also like
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.map((item) => (
              <Link
                key={item._id}
                to={`/products/${item.slug}`}
                className="card group flex flex-col overflow-hidden transition-transform duration-nova ease-nova hover:-translate-y-1"
              >
                <LazyImage src={item.images[0]} alt={item.title} className="aspect-square w-full" />
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    {formatPrice(item.price, currency)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
