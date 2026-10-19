import { useProducts } from '@/hooks/use-products';
import { useDebounce } from '@/hooks/use-debounce';
import { formatPrice, imageUrl, onImgError } from '@/lib/utils';
import { useCurrencyStore } from '@/stores/currency.store';
import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchBarProps {
  autoFocus?: boolean;
  onNavigate?: () => void;
  className?: string;
}

/** Combobox-style search box with live product suggestions. */
export function SearchBar({ autoFocus, onNavigate, className }: SearchBarProps) {
  const [term, setTerm] = useState('');
  const [focused, setFocused] = useState(false);
  const debounced = useDebounce(term.trim(), 300);
  const navigate = useNavigate();
  const currency = useCurrencyStore((s) => s.currency);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useProducts({ q: debounced, limit: 6 });
  const showSuggestions = focused && debounced.length >= 2;
  const results = debounced.length >= 2 ? data?.items ?? [] : [];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!term.trim()) return;
    setFocused(false);
    navigate(`/products?q=${encodeURIComponent(term.trim())}`);
    onNavigate?.();
  }

  function goProduct(slug: string) {
    setFocused(false);
    setTerm('');
    navigate(`/products/${slug}`);
    onNavigate?.();
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <form onSubmit={submit} role="search" className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted-foreground">
          {isFetching && debounced ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Search className="h-4 w-4" aria-hidden />
          )}
        </span>
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => setFocused(true)}
          autoFocus={autoFocus}
          placeholder="Search products…"
          aria-label="Search products"
          className="h-11 w-full rounded-full border border-border bg-surface-2 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-[border-color,background-color] duration-200 ease-nova focus:border-accent focus:bg-background focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        {term && (
          <button
            type="button"
            onClick={() => setTerm('')}
            aria-label="Clear search"
            className="absolute inset-y-0 right-2 flex w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </form>

      {showSuggestions && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          {results.length > 0 ? (
            <ul className="max-h-96 overflow-y-auto py-1.5">
              {results.map((p) => (
                <li key={p._id}>
                  <button
                    type="button"
                    onClick={() => goProduct(p.slug)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 ease-nova hover:bg-accent/5"
                  >
                    <img
                      src={imageUrl(p.images[0])}
                      alt=""
                      onError={onImgError}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{p.title}</span>
                      <span className="block text-xs text-muted-foreground">{p.brand}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-foreground">
                      {formatPrice(p.price, currency)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            !isFetching && (
              <p className="px-4 py-3 text-sm text-muted-foreground">No products match “{debounced}”.</p>
            )
          )}
          <button
            type="button"
            onClick={() => {
              setFocused(false);
              navigate(`/products?q=${encodeURIComponent(debounced)}`);
              onNavigate?.();
            }}
            className="w-full border-t border-border px-4 py-2.5 text-left text-sm font-semibold text-accent transition-colors hover:bg-accent/5"
          >
            See all results for “{debounced}”
          </button>
        </div>
      )}
    </div>
  );
}
