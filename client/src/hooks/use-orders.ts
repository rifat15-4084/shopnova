import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type {
  Address,
  ChangePasswordInput,
  CheckoutInput,
  Invoice,
  Order,
  Paginated,
  PaymentMethod,
  ProfileInput,
  User,
} from '@/types';

export function useOrders(params: { page?: number; status?: string } = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
  return useQuery({
    queryKey: [...queryKeys.orders.mine, clean],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Order>>('/orders', {
        params: { limit: 50, ...clean },
      });
      return data;
    },
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await api.get<{ order: Order }>(`/orders/${id}`);
      return data.order;
    },
    enabled: Boolean(id),
  });
}

export function useOrderByNumber(orderNumber: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderNumber ?? ''),
    queryFn: async () => {
      const { data } = await api.get<{ order: Order }>(`/orders/number/${orderNumber}`);
      return data.order;
    },
    enabled: Boolean(orderNumber),
  });
}

export function useInvoice(orderId: string | undefined) {
  return useQuery({
    queryKey: ['orders', 'invoice', orderId],
    queryFn: async () => {
      const { data } = await api.get<{ invoice: Invoice }>(`/orders/${orderId}/invoice`);
      return data.invoice;
    },
    enabled: Boolean(orderId),
  });
}

/** Cash on delivery / bKash: creates the order and reserves stock immediately. */
export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CheckoutInput) => {
      const { data } = await api.post<{ order: Order }>('/checkout/order', input);
      return data.order;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

/** Stripe: creates a Checkout Session and returns the redirect URL. */
export function useStripeCheckout() {
  return useMutation({
    mutationFn: async (input: Pick<CheckoutInput, 'shippingAddress' | 'couponCode'>) => {
      const { data } = await api.post<{ url: string; orderNumber: string }>('/checkout/session', input);
      return data;
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await api.post<{ order: Order }>(`/orders/${orderId}/cancel`, {
        reason: 'Cancelled by customer',
      });
      return data.order;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfileInput) => {
      const { data } = await api.patch<{ user: User }>('/auth/me', input);
      return data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me, user);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: ChangePasswordInput) => {
      await api.post('/auth/change-password', input);
    },
  });
}

export function useAddresses() {
  return useQuery({
    queryKey: ['account', 'addresses'],
    queryFn: async () => {
      const { data } = await api.get<{ addresses: Address[] }>('/account/addresses');
      return data.addresses;
    },
  });
}

export function useSaveAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (address: Omit<Address, '_id' | 'id'> & { id?: string }) => {
      if (address.id) {
        const { data } = await api.patch<{ addresses: Address[] }>(`/account/addresses/${address.id}`, address);
        return data.addresses;
      }
      const { data } = await api.post<{ addresses: Address[] }>('/account/addresses', address);
      return data.addresses;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['account', 'addresses'] });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ addresses: Address[] }>(`/account/addresses/${id}`);
      return data.addresses;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['account', 'addresses'] });
    },
  });
}

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  stripe: 'Card (Stripe)',
  cod: 'Cash on Delivery',
  bkash: 'bKash',
};
