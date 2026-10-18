import { useCategories } from '@/hooks/use-products';
import type { ProductQueryParams, ProductSort } from '@/hooks/use-products';
import { formatPrice } from '@/lib/utils';
import { useCurrencyStore } from '@/stores/currency.store';
import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

type Filters = ProductQueryParams;

interface FilterSidebarProps {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}

const SORT_OPTIONS: Array<{ value: ProductSort; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top rated' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

const RATING_OPTIONS = [4, 3, 2];

export function FilterSidebar({ filters, onChange, onClear }: FilterSidebarProps) {
  const { data: categories } = useCategories();
  const currency = useCurrencyStore((s) => s.currency);
  const activeCount = [
    filters.category,
    filters.brand,
    filters.minPrice,
    filters.maxPrice,
    filters.minRating,
    filters.inStock,
  ].filter((v) => v !== undefined && v !== '' && v !== null).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
              {activeCount}
            </span>
          )}
        </h2>
        {activeCount > 0 && (
          <button
            onClick={onClear}
            className="text-xs font-semibold text-accent transition-opacity hover:opacity-80"
          >
            Clear all
          </button>
        )}
      </div>

      <FilterSection title="Sort by">
        <select
          value={filters.sort ?? 'newest'}
          onChange={(e) => onChange({ sort: e.target.value as ProductSort, page: 1 })}
          aria-label="Sort products"
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FilterSection>

      <FilterSection title="Category">
        <ul className="space-y-1">
          <li>
            <FilterRow
              label="All categories"
              checked={!filters.category}
              onChange={() => onChange({ category: undefined, page: 1 })}
            />
          </li>
          {categories?.map((c) => (
            <li key={c._id}>
              <FilterRow
                label={c.name}
                checked={filters.category === c.slug}
                onChange={() =>
                  onChange({ category: filters.category === c.slug ? undefined : c.slug, page: 1 })
                }
              />
            </li>
          ))}
        </ul>
      </FilterSection>

      <FilterSection title="Price">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={filters.minPrice ?? ''}
            onChange={(e) =>
              onChange({ minPrice: e.target.value ? Number(e.target.value) : undefined, page: 1 })
            }
            aria-label="Minimum price"
            className="h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={filters.maxPrice ?? ''}
            onChange={(e) =>
              onChange({ maxPrice: e.target.value ? Number(e.target.value) : undefined, page: 1 })
            }
            aria-label="Maximum price"
            className="h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {formatPrice(filters.minPrice ?? 0, currency)} – {formatPrice(filters.maxPrice ?? 5000, currency)}
        </p>
      </FilterSection>

      <FilterSection title="Customer rating">
        <ul className="space-y-1">
          {RATING_OPTIONS.map((r) => (
            <li key={r}>
              <FilterRow
                label={`${r}★ & up`}
                checked={filters.minRating === r}
                onChange={() =>
                  onChange({ minRating: filters.minRating === r ? undefined : r, page: 1 })
                }
              />
            </li>
          ))}
        </ul>
      </FilterSection>

      <FilterSection title="Availability">
        <FilterRow
          label="In stock only"
          checked={filters.inStock === true}
          onChange={() => onChange({ inStock: filters.inStock ? undefined : true, page: 1 })}
        />
      </FilterSection>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-5 first:border-0 first:pt-0">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function FilterRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-sm text-foreground transition-colors duration-150 ease-nova hover:bg-accent/5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-border accent-accent"
      />
      {label}
    </label>
  );
}

/** Collapsible filter panel for mobile, using a slide-over drawer. */
export function MobileFilters({ filters, onChange, onClear }: FilterSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors duration-200 ease-nova hover:bg-accent/5"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        Filters
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Product filters">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-surface shadow-2xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="font-semibold text-foreground">Filters</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-accent/10"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FilterSidebar filters={filters} onChange={onChange} onClear={onClear} />
            </div>
            <div className="shrink-0 border-t border-border p-4">
              <button
                onClick={() => setOpen(false)}
                className="h-11 w-full rounded-lg bg-accent text-sm font-semibold text-accent-foreground transition-[filter] duration-200 ease-nova hover:brightness-110"
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
