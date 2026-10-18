import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminStats } from '@/types';

export function useAdminStats(days = 30) {
  return useQuery<AdminStats>({
    queryKey: queryKeys.admin.stats(days),
    queryFn: async () => {
      const res = await api.get<AdminStats>('/admin/stats/overview', { params: { days } });
      return res.data;
    },
    staleTime: 30_000,
  });
}
