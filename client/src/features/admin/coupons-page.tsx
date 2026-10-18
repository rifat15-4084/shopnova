import { useAdminCoupons, useCreateCoupon } from '@/hooks/use-admin';
import { formatPrice } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { Coupon } from '@/types';

export default function AdminCouponsPage() {
  const { data, isLoading, isError, refetch } = useAdminCoupons();
  const createMutation = useCreateCoupon();
  const [showForm, setShowForm] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState title="Failed to load coupons" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Coupons</h1>
          <p className="text-sm text-muted-foreground">{data.coupons.length} coupons</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>Add coupon</Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <CouponForm
            onSubmit={async (values) => {
              await createMutation.mutateAsync(values);
              setShowForm(false);
            }}
            isLoading={createMutation.isPending}
          />
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="p-3 text-left font-medium text-muted-foreground">Code</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Value</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Min order</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Usage</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.coupons.map((c) => (
              <tr key={c._id} className="border-b border-border/80 last:border-0">
                <td className="p-3 font-mono font-medium text-foreground">{c.code}</td>
                <td className="p-3 capitalize text-foreground">{c.type}</td>
                <td className="p-3 font-medium text-foreground">
                  {c.type === 'percent' ? `${c.value}%` : formatPrice(c.value, 'usd')}
                </td>
                <td className="p-3 text-foreground">{formatPrice(c.minOrder, 'usd')}</td>
                <td className="p-3 text-foreground">
                  {c.usedCount} / {c.usageLimit === 0 ? '∞' : c.usageLimit}
                </td>
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
    </div>
  );
}

function CouponForm({ onSubmit, isLoading }: { onSubmit: (values: Partial<Coupon>) => void; isLoading: boolean }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onSubmit({
          code: String(formData.get('code') || '').toUpperCase(),
          type: String(formData.get('type')) as Coupon['type'],
          value: Number(formData.get('value')),
          minOrder: Number(formData.get('minOrder') || 0),
          usageLimit: Number(formData.get('usageLimit') || 0),
          maxDiscount: Number(formData.get('maxDiscount') || 0),
          isActive: true,
        });
      }}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Code</label>
        <input
          name="code"
          required
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
        <select
          name="type"
          required
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="percent">Percent</option>
          <option value="fixed">Fixed</option>
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Value</label>
        <input
          name="value"
          type="number"
          step="0.01"
          required
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Min order</label>
        <input
          name="minOrder"
          type="number"
          step="0.01"
          defaultValue="0"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Usage limit</label>
        <input
          name="usageLimit"
          type="number"
          defaultValue="0"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Max discount</label>
        <input
          name="maxDiscount"
          type="number"
          step="0.01"
          defaultValue="0"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create coupon'}
        </Button>
      </div>
    </form>
  );
}
