import { cn } from '@/lib/utils';
import { ImageOff } from 'lucide-react';
import { useState } from 'react';

interface LazyImageProps {
  src: string | undefined | null;
  alt: string;
  className?: string;
  /** object-position utility classes, e.g. "object-top" */
  imgClassName?: string;
  sizes?: string;
  eager?: boolean;
}

/** Image with skeleton shimmer while loading and a graceful fallback when there is no image. */
export function LazyImage({ src, alt, className, imgClassName, eager }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-accent/5 text-muted-foreground',
          className
        )}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="h-8 w-8 opacity-40" aria-hidden />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', !loaded && 'skeleton', className)}>
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-nova ease-nova',
          loaded ? 'opacity-100' : 'opacity-0',
          imgClassName
        )}
      />
    </div>
  );
}
