import { useCategories, useFeaturedProducts, useProducts } from '@/hooks/use-products';
import { Container } from '@/components/layout/container';
import { ProductGrid } from '@/features/products/product-grid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/ui/lazy-image';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { motion } from 'framer-motion';
import { ArrowRight, Headphones, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

export default function HomePage() {
  const {
    data: featured,
    isLoading: featuredLoading,
    isError: featuredError,
    refetch: refetchFeatured,
  } = useFeaturedProducts();
  const {
    data: newest,
    isLoading: newestLoading,
    isError: newestError,
    refetch: refetchNewest,
  } = useProducts({ limit: 8, sort: 'newest' });
  const {
    data: dealSource,
    isLoading: dealsLoading,
    isError: dealsError,
    refetch: refetchDeals,
  } = useProducts({ limit: 24, sort: 'popular', inStock: true });
  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useCategories();

  const deals = (dealSource?.items ?? [])
    .filter((p) => p.compareAtPrice > p.price)
    .slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-surface">
        <Container>
          <div className="grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-2 lg:py-20">
            <motion.div {...fadeUp} className="max-w-xl">
              <Badge variant="accent" className="mb-4">
                New season · Free shipping over $100
              </Badge>
              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Tech that feels{' '}
                <span className="bg-gradient-to-r from-accent to-accent bg-clip-text text-transparent">
                  premium
                </span>
                . Prices that don't.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                Curated audio, smart devices, and everyday accessories — tested by our team, shipped across
                Bangladesh with cash on delivery and bKash.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/products">
                  <Button size="lg">
                    Shop all products
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </Link>
                <Link to="/deals">
                  <Button size="lg" variant="outline">
                    View today's deals
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="relative hidden lg:block">
              <div className="grid grid-cols-2 gap-4">
                <LazyImage
                  src={featured?.items[0]?.images[0]}
                  alt="Featured product"
                  className="aspect-[3/4] rounded-2xl shadow-lg"
                />
                <div className="space-y-4">
                  <LazyImage
                    src={featured?.items[1]?.images[0]}
                    alt="Featured product"
                    className="aspect-square rounded-2xl shadow-lg"
                  />
                  <LazyImage
                    src={featured?.items[2]?.images[0]}
                    alt="Featured product"
                    className="aspect-square rounded-2xl shadow-lg"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Trust badges */}
      <section className="border-b border-border bg-background">
        <Container>
          <div className="grid grid-cols-2 divide-border py-6 sm:grid-cols-4 sm:divide-x">
            <TrustItem icon={<Truck className="h-5 w-5" aria-hidden />} title="Free shipping" subtitle="Orders over $100" />
            <TrustItem icon={<RefreshCw className="h-5 w-5" aria-hidden />} title="7-day returns" subtitle="No questions asked" />
            <TrustItem icon={<ShieldCheck className="h-5 w-5" aria-hidden />} title="1-year warranty" subtitle="On every device" />
            <TrustItem icon={<Headphones className="h-5 w-5" aria-hidden />} title="24/7 support" subtitle="Real humans, fast" />
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section className="py-12 sm:py-16">
        <Container>
          <SectionHeading title="Shop by category" to="/categories" />
          {categoriesError ? (
            <ErrorState title="Couldn't load categories" onRetry={() => refetchCategories()} />
          ) : categoriesLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton aspect-[4/3] rounded-2xl" />
              ))}
            </div>
          ) : categories && categories.length === 0 ? (
            <EmptyState
              title="No products yet"
              description="This store's catalogue is empty — check back soon."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {categories?.slice(0, 8).map((category, i) => (
                <motion.div key={category._id} {...fadeUp} transition={{ ...fadeUp.transition, delay: (i % 4) * 0.05 }}>
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
      </section>

      {/* Featured */}
      <section className="py-12 sm:py-16">
        <Container>
          <SectionHeading title="Featured picks" subtitle="Hand-picked by our team this week" to="/products?featured=true" />
          {featuredError ? (
            <ErrorState title="Couldn't load featured products" onRetry={() => refetchFeatured()} />
          ) : (
            <ProductGrid products={featured?.items} loading={featuredLoading} />
          )}
        </Container>
      </section>

      {/* Deals banner + products */}
      <section className="bg-surface py-12 sm:py-16">
        <Container>
          <SectionHeading title="Today's deals" subtitle="Limited-time discounts — while stocks last" to="/deals" />
          {dealsError ? (
            <ErrorState title="Couldn't load deals" onRetry={() => refetchDeals()} />
          ) : (
            <ProductGrid products={deals} loading={dealsLoading} />
          )}
        </Container>
      </section>

      {/* New arrivals */}
      <section className="py-12 sm:py-16">
        <Container>
          <SectionHeading title="New arrivals" subtitle="Fresh stock, just landed" to="/products?sort=newest" />
          {newestError ? (
            <ErrorState title="Couldn't load new arrivals" onRetry={() => refetchNewest()} />
          ) : (
            <ProductGrid products={newest?.items} loading={newestLoading} />
          )}
        </Container>
      </section>

      {/* Newsletter */}
      <section className="border-t border-border bg-surface py-14">
        <Container>
          <motion.div {...fadeUp} className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Get $10 off your first order
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Join the list for early access to drops and exclusive coupons. Use code{' '}
              <span className="font-semibold text-accent">WELCOME10</span> at checkout.
            </p>
            <form
              className="mx-auto mt-6 flex max-w-sm gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                e.currentTarget.reset();
              }}
            >
              <input
                type="email"
                required
                placeholder="you@example.com"
                aria-label="Email address"
                className="h-11 flex-1 rounded-lg border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <Button type="submit">Subscribe</Button>
            </form>
          </motion.div>
        </Container>
      </section>
    </div>
  );
}

function SectionHeading({ title, subtitle, to }: { title: string; subtitle?: string; to?: string }) {
  return (
    <motion.div {...fadeUp} className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className="group flex shrink-0 items-center gap-1 text-sm font-semibold text-accent transition-opacity hover:opacity-80"
        >
          View all
          <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-nova group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </motion.div>
  );
}

function TrustItem({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 sm:justify-center">
      <span className="text-accent" aria-hidden>
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
