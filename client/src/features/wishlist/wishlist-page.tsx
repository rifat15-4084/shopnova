import { useAuth } from '@/hooks/use-auth';
import { useProducts } from '@/hooks/use-products';
import { useWishlist } from '@/hooks/use-wishlist';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { ProductGrid } from '@/features/products/product-grid';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WishlistPage() {
  const { isAuthenticated } = useAuth();
  const { wishlist, toggle, products } = useWishlist();
  // Guests have no product details locally, so we resolve them from the catalog.
  const { data, isLoading } = useProducts({ limit: 100 });

  const items = isAuthenticated
    ? products
    : (data?.items ?? []).filter((p) => wishlist.has(p._id));

  const count = isAuthenticated ? products.length : wishlist.size;

  return (
    <Container>
      <Breadcrumbs items={[{ label: 'Wishlist' }]} />
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">My wishlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {count} {count === 1 ? 'item' : 'items'} saved
          {isAuthenticated ? ' to your account.' : ' on this device.'}
        </p>
      </div>

      {wishlist.size === 0 ? (
        <EmptyState
          icon={<Heart className="h-7 w-7" aria-hidden />}
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it for later."
          action={
            <Link to="/products">
              <Button>Browse products</Button>
            </Link>
          }
          className="pb-16"
        />
      ) : (
        <div className="pb-16">
          <ProductGrid
            products={items}
            loading={isLoading && !isAuthenticated}
            wishlist={wishlist}
            onToggleWishlist={toggle}
          />
        </div>
      )}
    </Container>
  );
}
