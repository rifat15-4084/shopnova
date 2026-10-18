import { useAdminOrders, useExportOrders } from '@/hooks/use-admin';
import { useCurrencyStore } from '@/stores/currency.store';
import { formatPrice, getOrderStatusMeta } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';

export default function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1');
  const limit = Number(params.get('limit') ?? '20');
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const queryParams = useMemo(() => ({ page, limit, q, status }), [page, limit, q, status]);
  const { data, isLoading, isError, refetch } = useAdminOrders(queryParams);
  const { export: exportOrders } = useExportOrders(queryParams);
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
    return <ErrorState title="Failed to load orders" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground">{data.total} orders</p>
        </div>
        <Button variant="outline" onClick={() => exportOrders()}>
          Export CSV
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="p-3 text-left font-medium text-muted-foreground">Order</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Customer</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Total</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Payment</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((o) => (
              <tr key={o._id} className="border-b border-border/80 last:border-0">
                <td className="p-3 font-mono text-xs text-foreground">{o.orderNumber}</td>
                <td className="p-3 text-foreground">
                  {typeof o.user === 'object' ? o.user?.name : '-'}
                </td>
                <td className="p-3 font-medium text-foreground">{formatPrice(o.total, currency)}</td>
                <td className="p-3 text-foreground capitalize">{o.paymentStatus}</td>
                <td className="p-3">
                  <span className={`${getOrderStatusMeta(o.status).className} rounded-full px-2 py-0.5 text-xs font-semibold`}>
                    {getOrderStatusMeta(o.status).label}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={data.page} pages={data.pages} onPageChange={(p) => setParams({ page: String(p), limit: String(limit), q, status })} />
    </div>
  );
}
