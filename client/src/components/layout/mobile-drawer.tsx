import { useAuth } from '@/hooks/use-auth';
import { useUIStore } from '@/stores/ui.store';
import { Drawer } from '@/components/ui/drawer';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { SearchBar } from '@/components/layout/search-bar';
import {
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  Package,
  Store,
  User,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

/** Full-height mobile navigation sheet. */
export function MobileDrawer() {
  const { menuOpen, setMenuOpen } = useUIStore();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  function close() {
    setMenuOpen(false);
  }

  function goAndClose(to: string) {
    close();
    navigate(to);
  }

  return (
    <Drawer open={menuOpen} onClose={close} title="Menu" side="right">
      <div className="space-y-5 p-4">
        <SearchBar autoFocus onNavigate={close} />

        <nav className="space-y-1" aria-label="Mobile navigation">
          <MobileLink to="/" icon={<Store className="h-[18px] w-[18px]" aria-hidden />} onClick={close}>
            Home
          </MobileLink>
          <MobileLink to="/products" icon={<Store className="h-[18px] w-[18px]" aria-hidden />} onClick={close}>
            All products
          </MobileLink>
          <MobileLink to="/wishlist" icon={<Heart className="h-[18px] w-[18px]" aria-hidden />} onClick={close}>
            Wishlist
          </MobileLink>
        </nav>

        <div className="border-t border-border pt-4">
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isAuthenticated ? (user?.name ?? 'Account') : 'Account'}
          </p>
          {isAuthenticated ? (
            <nav className="space-y-1" aria-label="Account navigation">
              <MobileLink to="/account" icon={<User className="h-[18px] w-[18px]" aria-hidden />} onClick={close}>
                My account
              </MobileLink>
              <MobileLink to="/account/orders" icon={<Package className="h-[18px] w-[18px]" aria-hidden />} onClick={close}>
                Orders
              </MobileLink>
              <MobileLink to="/account/addresses" icon={<MapPin className="h-[18px] w-[18px]" aria-hidden />} onClick={close}>
                Addresses
              </MobileLink>
              {isAdmin && (
                <MobileLink to="/admin" icon={<LayoutDashboard className="h-[18px] w-[18px]" aria-hidden />} onClick={close}>
                  Admin dashboard
                </MobileLink>
              )}
              <button
                onClick={() => {
                  close();
                  logout.mutate(undefined, { onSettled: () => navigate('/') });
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-danger transition-colors duration-200 ease-nova hover:bg-danger/5"
              >
                <LogOut className="h-[18px] w-[18px]" aria-hidden />
                Sign out
              </button>
            </nav>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => goAndClose('/login')}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold text-foreground transition-colors duration-200 ease-nova hover:bg-accent/5"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                Sign in
              </button>
              <button
                onClick={() => goAndClose('/register')}
                className="flex h-11 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground transition-[filter] duration-200 ease-nova hover:brightness-110"
              >
                Sign up
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm font-medium text-foreground">Appearance</span>
          <ThemeToggle />
        </div>
      </div>
    </Drawer>
  );
}

function MobileLink({
  to,
  icon,
  children,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 ease-nova hover:bg-accent/8"
    >
      {icon}
      {children}
    </Link>
  );
}
