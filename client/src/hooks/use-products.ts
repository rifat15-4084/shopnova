import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { Category, Paginated, Product, ProductReviewInput, Review } from '@/types';

export type ProductSort = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'popular' | 'rating';

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  featured?: boolean;
  sort?: ProductSort;
}

export function useProducts(params: ProductQueryParams) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  );

  return useQuery({
    queryKey: queryKeys.products.list(clean),
    queryFn: async () => {
      const { data } = await api.get<Paginated<Product>>('/products', { params: clean });
      return data;
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

/** Product detail + related items (single request on the server side). */
export function useProduct(slugOrId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(slugOrId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<{ product: Product; related: Product[] }>(
        `/products/slug/${slugOrId}`
      );
      return data;
    },
    enabled: Boolean(slugOrId),
    staleTime: 60 * 1000,
  });
}

export function useFeaturedProducts() {
  return useProducts({ featured: true, limit: 8, sort: 'rating' });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async () => {
      const { data } = await api.get<{ categories: Category[] }>('/categories');
      return data.categories;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ['products', 'reviews', productId],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Review>>(`/products/${productId}/reviews`, {
        params: { limit: 20 },
      });
      return data;
    },
    enabled: Boolean(productId),
  });
}

export function useCreateReview(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProductReviewInput) => {
      const { data } = await api.post<{ review: Review }>(`/products/${productId}/reviews`, input);
      return data.review;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
