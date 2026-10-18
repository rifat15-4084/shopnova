export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  products: {
    all: ['products'] as const,
    list: (params: Record<string, unknown>) => ['products', 'list', params] as const,
    detail: (slugOrId: string) => ['products', 'detail', slugOrId] as const,
    featured: ['products', 'featured'] as const,
    related: (id: string) => ['products', 'related', id] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  cart: {
    preview: ['cart', 'preview'] as const,
  },
  orders: {
    mine: ['orders', 'mine'] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  admin: {
    stats: ['admin', 'stats'] as const,
    products: (params: Record<string, unknown>) => ['admin', 'products', params] as const,
    orders: (params: Record<string, unknown>) => ['admin', 'orders', params] as const,
    users: (params: Record<string, unknown>) => ['admin', 'users', params] as const,
    coupons: ['admin', 'coupons'] as const,
    reviews: ['admin', 'reviews'] as const,
  },
} as const;
