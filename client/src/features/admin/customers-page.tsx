import { useAdminCustomers } from '@/hooks/use-admin';
import { formatPrice } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';

export default function AdminCustomersPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1');
  const limit = Number(params.get('limit') ?? '20');
  const q = params.get('q') ?? '';
  const queryParams = useMemo(() => ({ page, limit, q }), [page, limit, q]);
  const { data, isLoading, isError, refetch } = useAdminCustomers(queryParams);

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
    return <ErrorState title="Failed to load customers" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">{data.total} customers</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="p-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Orders</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Total spent</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((c) => (
              <tr key={c._id} className="border-b border-border/80 last:border-0">
                <td className="p-3 font-medium text-foreground">{c.name}</td>
                <td className="p-3 text-foreground">{c.email}</td>
                <td className="p-3 capitalize text-foreground">{c.role}</td>
                <td className="p-3 text-foreground">{c.orderCount}</td>
                <td className="p-3 font-medium text-foreground">{formatPrice(c.totalSpent, 'usd')}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      c.isActive ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}
                  >
                    {c.isActive ? 'Active' : 'Inactive'}
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
