import { useCart } from '@/hooks/use-cart';
import { useUIStore } from '@/stores/ui.store';
import { Container } from '@/components/layout/container';
import { SearchBar } from '@/components/layout/search-bar';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { UserMenu } from '@/components/layout/user-menu';
import { MobileDrawer } from '@/components/layout/mobile-drawer';
import { CartDrawer } from '@/components/layout/cart-drawer';
import { Heart, ShoppingBag } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Shop' },
  { to: '/categories', label: 'Categories' },
  { to: '/deals', label: 'Deals' },
];

/**
 * The header is sticky with a fixed height, so the page never shifts and
 * there is no layout jolt when it "fixes" on scroll.
 */
export function Header() {
  const { itemCount } = useCart();
  const setCartOpen = useUIStore((s) => s.setCartOpen);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center gap-3">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 text-lg font-extrabold tracking-tight text-foreground"
            aria-label="ShopNova home"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-black text-accent-foreground"
              aria-hidden
            >
              N
            </span>
            <span className="hidden sm:inline">
              Shop<span className="text-accent">Nova</span>
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Primary">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ease-nova ${
                    isActive
                      ? 'text-accent'
                      : 'text-foreground hover:bg-accent/8 hover:text-accent'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <SearchBar className="mx-auto hidden w-full max-w-md md:block" />

          <div className="ml-auto flex items-center gap-0.5 md:ml-0">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors duration-200 ease-nova hover:bg-accent/10 md:hidden"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>

            <ThemeToggle className="hidden lg:flex" />

            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors duration-200 ease-nova hover:bg-accent/10 sm:flex"
            >
              <Heart className="h-5 w-5" aria-hidden />
            </Link>

            <button
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart, ${itemCount} items`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors duration-200 ease-nova hover:bg-accent/10"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden />
              {itemCount > 0 && (
                <span
                  className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground"
                  aria-hidden
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>

            <UserMenu />
          </div>
        </div>
      </Container>

      {/* Mobile search sheet */}
      <MobileSearchSheet />
      <MobileDrawer />
      <CartDrawer />
    </header>
  );
}

function MobileSearchSheet() {
  const { searchOpen, setSearchOpen } = useUIStore();

  if (!searchOpen) return null;

  return (
    <div className="border-t border-border bg-background p-3 md:hidden">
      <SearchBar autoFocus onNavigate={() => setSearchOpen(false)} />
    </div>
  );
}
