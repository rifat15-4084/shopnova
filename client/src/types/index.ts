/* Shared client-side types mirroring the ShopNova API responses. */

export type Role = 'customer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  addresses: Address[];
  wishlist: string[];
  isActive: boolean;
  createdAt?: string;
}

export interface Address {
  _id?: string;
  id?: string;
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string; // district
  region?: string; // division
  upazila?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
}

export interface ProductVariant {
  _id: string;
  name: string;
  value: string;
  priceDelta: number;
  stock: number;
  sku?: string;
  image?: string;
}

export interface Category {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Product {
  _id: string;
  id: string;
  title: string;
  slug: string;
  description: string;
  brand: string;
  sku: string;
  price: number;
  compareAtPrice: number;
  images: string[];
  category: Pick<Category, '_id' | 'name' | 'slug' | 'image'>;
  stock: number;
  totalStock: number;
  variants: ProductVariant[];
  ratingAverage: number;
  ratingCount: number;
  soldCount: number;
  isFeatured: boolean;
  isActive: boolean;
  tags: string[];
  weightKg: number;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  user: { _id: string; name: string };
  product: string;
  rating: number;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/* ── Cart ─────────────────────────────────────────────── */

export interface ServerCartItem {
  productId: string;
  variantId: string | null;
  variantLabel: string;
  title: string;
  slug: string;
  image: string;
  sku: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  availableStock: number;
}

export interface CartSummary {
  items: ServerCartItem[];
  subtotal: number;
  itemCount: number;
  couponCode: string | null;
}

/** Guest-side cart line (localStorage). Mirrors what the server cart stores. */
export interface CartItem {
  productId: string;
  variantId?: string | null;
  slug: string;
  title: string;
  unitPrice: number;
  image: string;
  brand: string;
  availableStock: number;
  qty: number;
}

export interface CheckoutPreview {
  itemsSubtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  couponCode: string | null;
  items: Array<{
    product: string;
    title: string;
    slug: string;
    image: string;
    sku: string;
    variantId: string | null;
    variantLabel: string;
    price: number;
    qty: number;
    lineTotal: number;
  }>;
}

export interface CheckoutConfig {
  freeShippingThreshold: number;
  flatShippingRate: number;
  taxRate: number;
  currency: string;
  paymentMethods: PaymentMethod[];
}

export interface CouponResult {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  discount: number;
  description: string;
}

/* ── Orders ───────────────────────────────────────────── */

export type PaymentMethod = 'stripe' | 'cod' | 'bkash';
export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'partially_refunded' | 'failed';

export interface OrderItem {
  product: string;
  title: string;
  slug: string;
  image: string;
  sku: string;
  variantId: string | null;
  variantLabel: string;
  price: number;
  qty: number;
  lineTotal: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  user?: string | { _id: string; name: string; email: string };
  items: OrderItem[];
  shippingAddress: Omit<Address, '_id' | 'id' | 'label' | 'isDefault'>;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt?: string | null;
  itemsSubtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  couponCode: string | null;
  status: OrderStatus;
  trackingNumber: string;
  carrier: string;
  timeline: Array<{ status: OrderStatus; note: string; at: string }>;
  refundAmount: number;
  cancelReason: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  number: string;
  orderNumber: string;
  issuedAt: string;
  seller: { name: string; address: string; email: string; phone: string };
  buyer: Order['shippingAddress'];
  items: OrderItem[];
  totals: {
    itemsSubtotal: number;
    shipping: number;
    tax: number;
    discount: number;
    total: number;
    currency: string;
  };
  payment: { method: PaymentMethod; status: PaymentStatus; paidAt: string | null };
}

/* ── Auth inputs ──────────────────────────────────────── */

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface ProfileInput {
  name?: string;
  email?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface ProductReviewInput {
  rating: number;
  comment: string;
  title?: string;
}

export interface CheckoutInput {
  paymentMethod: PaymentMethod;
  shippingAddress: Omit<Address, '_id' | 'id' | 'label' | 'isDefault'> & { label?: string };
  couponCode?: string | null;
}

/* ── Admin ────────────────────────────────────────────── */

export interface AdminStats {
  kpis: {
    revenue: number;
    revenueChangePct: number;
    orders: number;
    ordersChangePct: number;
    customers: number;
    customersChangePct: number;
    aov: number;
    aovChangePct: number;
  };
  periodDays: number;
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
  ordersByStatus: Array<{ status: OrderStatus; count: number }>;
  topProducts: Array<{ productId: string; title: string; image: string; qty: number; revenue: number }>;
  lowStock: Array<{ productId: string; title: string; slug: string; image: string; stock: number; price: number }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    status: OrderStatus;
    createdAt: string;
    customer: string;
  }>;
}

export interface AdminCustomer extends User {
  orderCount: number;
  totalSpent: number;
}

export interface Coupon {
  _id: string;
  code: string;
  description: string;
  type: 'percent' | 'fixed';
  value: number;
  maxDiscount: number;
  minOrder: number;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  applicableProductIds: string[];
  isActive: boolean;
  createdAt: string;
}
