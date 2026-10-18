import { useAuth } from '@/hooks/use-auth';
import { useUIStore } from '@/stores/ui.store';
import { Menu, Heart, User, LayoutDashboard, LogOut, Package, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function UserMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const setMenuOpen = useUIStore((s) => s.setMenuOpen);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-1">
        <Link
          to="/login"
          className="hidden rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors duration-200 ease-nova hover:bg-accent/10 sm:block"
        >
          Sign in
        </Link>
        <Link
          to="/register"
          className="hidden rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-[filter] duration-200 ease-nova hover:brightness-110 sm:block"
        >
          Sign up
        </Link>
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors duration-200 ease-nova hover:bg-accent/10 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground transition-[filter] duration-200 ease-nova hover:brightness-110"
      >
        <span className="text-sm font-bold" aria-hidden>
          {user?.name?.charAt(0).toUpperCase()}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-surface py-1.5 shadow-xl">
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <div className="py-1.5">
              <MenuLink to="/account" icon={<User className="h-4 w-4" aria-hidden />} onClick={() => setOpen(false)}>
                My account
              </MenuLink>
              <MenuLink to="/account/orders" icon={<Package className="h-4 w-4" aria-hidden />} onClick={() => setOpen(false)}>
                Orders
              </MenuLink>
              <MenuLink to="/account/addresses" icon={<MapPin className="h-4 w-4" aria-hidden />} onClick={() => setOpen(false)}>
                Addresses
              </MenuLink>
              <MenuLink to="/wishlist" icon={<Heart className="h-4 w-4" aria-hidden />} onClick={() => setOpen(false)}>
                Wishlist
              </MenuLink>
              {user?.role === 'admin' && (
                <MenuLink to="/admin" icon={<LayoutDashboard className="h-4 w-4" aria-hidden />} onClick={() => setOpen(false)}>
                  Admin dashboard
                </MenuLink>
              )}
            </div>
            <div className="border-t border-border py-1.5">
              <button
                onClick={() => {
                  setOpen(false);
                  logout.mutate(undefined, {
                    onSettled: () => navigate('/'),
                  });
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-danger transition-colors duration-200 ease-nova hover:bg-danger/5"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuLink({
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
      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 ease-nova hover:bg-accent/8"
    >
      {icon}
      {children}
    </Link>
  );
}
