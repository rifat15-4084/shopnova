import type { Product } from '@/types';
import { ProductCard } from '@/features/products/product-card';
import { ProductGridSkeleton } from '@/components/ui/skeleton';

interface ProductGridProps {
  products: Product[] | undefined;
  loading?: boolean;
  wishlist?: Set<string>;
  onToggleWishlist?: (id: string) => void;
}

export function ProductGrid({ products, loading, wishlist, onToggleWishlist }: ProductGridProps) {
  if (loading) return <ProductGridSkeleton />;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {products?.map((product) => (
        <ProductCard key={product._id} product={product} wishlist={wishlist} onToggleWishlist={onToggleWishlist} />
      ))}
    </div>
  );
}
