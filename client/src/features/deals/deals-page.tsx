import { useProducts } from '@/hooks/use-products';
import { useWishlist } from '@/hooks/use-wishlist';
import { Container } from '@/components/layout/container';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ProductGrid } from '@/features/products/product-grid';
import { ErrorState } from '@/components/ui/states';

/** Deals page: products whose compare-at price is above the current price. */
export default function DealsPage() {
  const { data, isLoading, isError, refetch } = useProducts({ limit: 48, sort: 'popular' });
  const { wishlist, toggle } = useWishlist();

  const deals = data?.items.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price) ?? [];

  return (
    <Container>
      <Breadcrumbs items={[{ label: 'Deals' }]} />
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Today's deals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Limited-time discounts across the store — while stocks last.
        </p>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} className="pb-16" />
      ) : (
        <>
          <ProductGrid products={deals} loading={isLoading} wishlist={wishlist} onToggleWishlist={toggle} />
          {!isLoading && deals.length === 0 && (
            <ErrorState title="No deals right now" description="Check back soon — new offers drop weekly." />
          )}
        </>
      )}
      <div className="pb-16" />
    </Container>
  );
}
