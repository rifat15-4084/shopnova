import { useAdminStats } from '@/hooks/use-admin-stats';
import { useCurrencyStore } from '@/stores/currency.store';
import { formatPrice, getOrderStatusMeta } from '@/lib/utils';
import { Container } from '@/components/layout/container';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { TrendingUp, ShoppingCart, Users, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function StatCard({
  title,
  value,
  change,
  icon: Icon,
}: {
  title: string;
  value: string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const isPositive = change >= 0;
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
      {change !== 0 && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-success' : 'text-danger'}`}>
          {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
          <span>{Math.abs(change).toFixed(1)}% vs previous</span>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading, isError, refetch } = useAdminStats(30);
  const currency = useCurrencyStore((s) => s.currency);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return <ErrorState title="Failed to load dashboard" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Last {stats.periodDays} days overview</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Revenue"
          value={formatPrice(stats.kpis.revenue, currency)}
          change={stats.kpis.revenueChangePct}
          icon={DollarSign}
        />
        <StatCard
          title="Orders"
          value={stats.kpis.orders.toLocaleString()}
          change={stats.kpis.ordersChangePct}
          icon={ShoppingCart}
        />
        <StatCard
          title="Customers"
          value={stats.kpis.customers.toLocaleString()}
          change={stats.kpis.customersChangePct}
          icon={Users}
        />
        <StatCard
          title="AOV"
          value={formatPrice(stats.kpis.aov, currency)}
          change={stats.kpis.aovChangePct}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Revenue by day</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.revenueByDay} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--c-border))" opacity={0.4} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'hsl(var(--c-muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--c-muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--c-surface))',
                    border: '1px solid hsl(var(--c-border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatPrice(value, currency)}
                />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--c-accent))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Orders by status</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.ordersByStatus} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--c-border))" opacity={0.4} />
                <XAxis dataKey="status" tick={{ fontSize: 12, fill: 'hsl(var(--c-muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--c-muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--c-surface))',
                    border: '1px solid hsl(var(--c-border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--c-accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Top products</h2>
            <Link to="/admin/products" className="text-xs font-medium text-accent hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {stats.topProducts.map((p) => (
              <div key={p.productId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <img
                  src={p.image}
                  alt=""
                  className="h-12 w-12 rounded-lg border border-border object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.qty} sold</p>
                </div>
                <span className="text-sm font-semibold text-foreground">{formatPrice(p.revenue, currency)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Low stock</h2>
            <Link to="/admin/products" className="text-xs font-medium text-accent hover:underline">
              Manage
            </Link>
          </div>
          <div className="divide-y divide-border">
            {stats.lowStock.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">All products well stocked</p>
            ) : (
              stats.lowStock.map((p) => (
                <div key={p.productId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <img
                    src={p.image}
                    alt=""
                    className="h-12 w-12 rounded-lg border border-border object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium text-foreground">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-danger">{p.stock} left</span>
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">{formatPrice(p.price, currency)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent orders</h2>
          <Link to="/admin/orders" className="text-xs font-medium text-accent hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left font-medium text-muted-foreground">Order</th>
                <th className="pb-2 text-left font-medium text-muted-foreground">Customer</th>
                <th className="pb-2 text-left font-medium text-muted-foreground">Total</th>
                <th className="pb-2 text-left font-medium text-muted-foreground">Status</th>
                <th className="pb-2 text-left font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-border/80 last:border-0">
                  <td className="py-3 font-mono text-xs text-foreground">{o.orderNumber}</td>
                  <td className="py-3 text-foreground">{o.customer}</td>
                  <td className="py-3 font-medium text-foreground">{formatPrice(o.total, currency)}</td>
                  <td className="py-3">
                    <span className={`${getOrderStatusMeta(o.status).className} rounded-full px-2 py-0.5 text-xs font-semibold`}>
                      {getOrderStatusMeta(o.status).label}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
