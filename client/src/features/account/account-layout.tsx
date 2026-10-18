import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Container } from '@/components/layout/container';
import { cn } from '@/lib/utils';
import { Heart, MapPin, Package, User } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/account', label: 'Profile', icon: User, end: true },
  { to: '/account/orders', label: 'Orders', icon: Package, end: false },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin, end: false },
  { to: '/wishlist', label: 'Wishlist', icon: Heart, end: false },
];

export default function AccountLayout() {
  return (
    <Container>
      <Breadcrumbs items={[{ label: 'My account' }]} />
      <div className="grid gap-8 pb-16 lg:grid-cols-[220px_1fr]">
        <aside>
          <nav aria-label="Account navigation" className="space-y-1">
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
