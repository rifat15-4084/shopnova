import { useAdminProducts } from '@/hooks/use-admin';
import { useCurrencyStore } from '@/stores/currency.store';
import { formatPrice } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';

export default function AdminProductsPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1');
  const limit = Number(params.get('limit') ?? '20');
  const q = params.get('q') ?? '';
  const queryParams = useMemo(() => ({ page, limit, q }), [page, limit, q]);
  const { data, isLoading, isError, refetch } = useAdminProducts(queryParams);
  const currency = useCurrencyStore((s) => s.currency);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState title="Failed to load products" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">{data.total} products</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="p-3 text-left font-medium text-muted-foreground">Product</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Price</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Stock</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Featured</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p._id} className="border-b border-border/80 last:border-0">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.images?.[0]}
                      alt=""
                      className="h-12 w-12 rounded-lg border border-border object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-medium text-foreground">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.sku}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 font-medium text-foreground">{formatPrice(p.price, currency)}</td>
                <td className="p-3 text-foreground">{p.stock}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      p.isActive ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}
                  >
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      p.isFeatured ? 'bg-accent/10 text-accent' : 'bg-muted/20 text-muted-foreground'
                    }`}
                  >
                    {p.isFeatured ? 'Yes' : 'No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={data.page} pages={data.pages} onPageChange={(p) => setParams({ page: String(p), limit: String(limit), q })} />
    </div>
  );
}
