import { useProducts } from '@/hooks/use-products';
import type { ProductQueryParams, ProductSort } from '@/hooks/use-products';
import { useWishlist } from '@/hooks/use-wishlist';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Container } from '@/components/layout/container';
import { Pagination } from '@/components/ui/pagination';
import { ErrorState, NoResults } from '@/components/ui/states';
import { FilterSidebar, MobileFilters } from '@/features/products/filter-sidebar';
import { ProductGrid } from '@/features/products/product-grid';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const LIMIT = 12;

/** Reads/writes the catalog state in the URL so filters are shareable. */
export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const { wishlist, toggle } = useWishlist();

  const filters: ProductQueryParams = useMemo(() => {
    const out: ProductQueryParams = { page: Number(params.get('page')) || 1, limit: LIMIT };
    const q = params.get('q');
    const category = params.get('category');
    const brand = params.get('brand');
    const sort = params.get('sort') as ProductSort | null;
    if (q) out.q = q;
    if (category) out.category = category;
    if (brand) out.brand = brand;
    if (sort) out.sort = sort;
    if (params.get('minPrice')) out.minPrice = Number(params.get('minPrice'));
    if (params.get('maxPrice')) out.maxPrice = Number(params.get('maxPrice'));
    if (params.get('minRating')) out.minRating = Number(params.get('minRating'));
    if (params.get('inStock')) out.inStock = true;
    if (params.get('featured')) out.featured = true;
    return out;
  }, [params]);

  const { data, isLoading, isError, refetch } = useProducts(filters);

  function patch(next: Partial<ProductQueryParams>) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === '' || value === null || value === false) merged.delete(key);
      else merged.set(key, String(value));
    }
    if (!('page' in next)) merged.delete('page');
    setParams(merged, { replace: true });
  }

  function clear() {
    setParams(new URLSearchParams(), { replace: true });
  }

  const search = params.get('q');

  return (
    <Container>
      <Breadcrumbs
        items={[{ label: 'Shop', to: '/products' }, ...(search ? [{ label: `“${search}”` }] : [])]}
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {search
              ? `Results for “${search}”`
              : params.get('category')
                ? titleCase(params.get('category')!)
                : 'All products'}
          </h1>
          {data && (
            <p className="mt-1 text-sm text-muted-foreground">
              {data.total} {data.total === 1 ? 'product' : 'products'}
            </p>
          )}
        </div>
        <div className="lg:hidden">
          <MobileFilters filters={filters} onChange={patch} onClear={clear} />
        </div>
      </div>

      <div className="grid gap-8 pb-16 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <FilterSidebar filters={filters} onChange={patch} onClear={clear} />
          </div>
        </aside>

        <div>
          {isError ? (
            <ErrorState
              description="We couldn't load the products. Check your connection and try again."
              onRetry={() => refetch()}
            />
          ) : (
            <>
              <ProductGrid
                products={data?.items}
                loading={isLoading}
                wishlist={wishlist}
                onToggleWishlist={toggle}
              />
              {data && data.items.length === 0 && !isLoading && <NoResults onClear={clear} />}
              {data && (
                <Pagination
                  className="mt-10"
                  page={data.page}
                  totalPages={data.pages}
                  onPageChange={(page) => patch({ page })}
                />
              )}
            </>
          )}
        </div>
      </div>
    </Container>
  );
}

function titleCase(value: string) {
  return value
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
