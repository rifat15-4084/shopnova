import { useCategories } from '@/hooks/use-products';
import { Container } from '@/components/layout/container';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { LazyImage } from '@/components/ui/lazy-image';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function CategoriesPage() {
  const { data: categories, isLoading, isError, refetch } = useCategories();

  return (
    <Container>
      <Breadcrumbs items={[{ label: 'Categories' }]} />
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Shop by category</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse the full catalog by category.
        </p>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} className="pb-16" />
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-4 pb-16 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 pb-16 md:grid-cols-3 lg:grid-cols-4">
          {categories?.map((category, i) => (
            <motion.div
              key={category._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.32), ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                to={`/products?category=${category.slug}`}
                className="card group relative block aspect-[4/3] overflow-hidden"
              >
                <LazyImage
                  src={category.image}
                  alt={category.name}
                  className="h-full w-full transition-transform duration-nova ease-nova group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />
                <span className="absolute bottom-3 left-3 right-3">
                  <span className="block text-sm font-bold text-white drop-shadow">{category.name}</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </Container>
  );
}
