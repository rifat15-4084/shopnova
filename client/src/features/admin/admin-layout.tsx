import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Container } from '@/components/layout/container';
import { cn } from '@/lib/utils';
import { BarChart3, Coupon, LayoutDashboard, Package, ShoppingCart, Star, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package, end: false },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart, end: false },
  { to: '/admin/customers', label: 'Customers', icon: Users, end: false },
  { to: '/admin/coupons', label: 'Coupons', icon: Coupon, end: false },
  { to: '/admin/reviews', label: 'Reviews', icon: Star, end: false },
];

export default function AdminLayout() {
  return (
    <Container>
      <Breadcrumbs items={[{ label: 'Admin' }]} />
      <div className="grid gap-8 pb-16 lg:grid-cols-[240px_1fr]">
        <aside>
          <nav aria-label="Admin navigation" className="space-y-1">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors duration-200 ease-nova',
                    isActive ? 'bg-accent/10 text-accent' : 'text-foreground hover:bg-accent/5'
                  )
                }
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </Container>
  );
}
