import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type {
  AdminCustomer,
  Coupon,
  Order,
  Paginated,
  Product,
  Review,
  User,
} from '@/types';

export function useAdminProducts(params: Record<string, unknown> = {}) {
  return useQuery<Paginated<Product>>({
    queryKey: queryKeys.admin.products(params),
    queryFn: async () => {
      const res = await api.get<Paginated<Product>>('/admin/products', { params });
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useAdminOrders(params: Record<string, unknown> = {}) {
  return useQuery<Paginated<Order>>({
    queryKey: queryKeys.admin.orders(params),
    queryFn: async () => {
      const res = await api.get<Paginated<Order>>('/admin/orders', { params });
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useAdminCustomers(params: Record<string, unknown> = {}) {
  return useQuery<Paginated<AdminCustomer>>({
    queryKey: queryKeys.admin.customers(params),
    queryFn: async () => {
      const res = await api.get<Paginated<AdminCustomer>>('/admin/customers', { params });
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useAdminCustomer(id: string | undefined) {
  return useQuery<{ customer: AdminCustomer; orders: Order[] }>({
    queryKey: queryKeys.admin.customer(id!),
    queryFn: async () => {
      const res = await api.get(`/admin/customers/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useUpdateAdminCustomer(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      const res = await api.patch<{ customer: AdminCustomer }>(`/admin/customers/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.allCustomers });
    },
  });
}

export function useAdminCoupons() {
  return useQuery<{ coupons: Coupon[] }>({
    queryKey: queryKeys.admin.coupons(),
    queryFn: async () => {
      const res = await api.get<{ coupons: Coupon[] }>('/admin/coupons');
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Coupon>) => {
      const res = await api.post<{ coupon: Coupon }>('/admin/coupons', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.coupons() });
    },
  });
}

export function useUpdateCoupon(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Coupon>) => {
      const res = await api.patch<{ coupon: Coupon }>(`/admin/coupons/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.coupons() });
    },
  });
}

export function useDeleteCoupon(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/admin/coupons/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.coupons() });
    },
  });
}

export function useAdminReviews(params: Record<string, unknown> = {}) {
  return useQuery<Paginated<Review & { user: { name: string; email: string }; product: { title: string; slug: string } }>>({
    queryKey: queryKeys.admin.reviews(params),
    queryFn: async () => {
      const res = await api.get('/admin/reviews', { params });
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useModerateReview(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { isApproved: boolean }) => {
      const res = await api.patch<{ review: Review }>(`/admin/reviews/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.reviews({}) });
    },
  });
}

export function useDeleteReview(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/admin/reviews/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.reviews({}) });
    },
  });
}

export function useAdminOrder(id: string | undefined) {
  return useQuery<{ order: Order }>({
    queryKey: queryKeys.admin.order(id!),
    queryFn: async () => {
      const res = await api.get(`/admin/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useUpdateOrderStatus(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { status: Order['status']; trackingNumber?: string; carrier?: string; note?: string }) => {
      const res = await api.patch<{ order: Order }>(`/admin/orders/${id}/status`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.orders({}) });
    },
  });
}

export function useRefundOrder(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data?: { amount?: number; reason?: string }) => {
      const res = await api.post<{ order: Order }>(`/admin/orders/${id}/refund`, data ?? {});
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.orders({}) });
    },
  });
}

export function useExportOrders(params: Record<string, unknown> = {}) {
  return {
    export: async () => {
      const res = await api.get('/admin/orders/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'orders.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
  };
}
