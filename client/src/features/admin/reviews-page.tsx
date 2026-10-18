import { useAdminReviews, useModerateReview, useDeleteReview } from '@/hooks/use-admin';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';

export default function AdminReviewsPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1');
  const limit = Number(params.get('limit') ?? '20');
  const pending = params.get('pending') === 'true';
  const queryParams = useMemo(() => ({ page, limit, pending }), [page, limit, pending]);
  const { data, isLoading, isError, refetch } = useAdminReviews(queryParams);
  const moderate = useModerateReview(undefined);
  const remove = useDeleteReview(undefined);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState title="Failed to load reviews" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reviews</h1>
          <p className="text-sm text-muted-foreground">{data.total} reviews</p>
        </div>
      </div>

      <div className="space-y-3">
        {data.items.map((r: any) => (
          <div key={r._id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{r.title || 'Review'}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    r.isApproved ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                  }`}>
                    {r.isApproved ? 'Approved' : 'Pending'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  By {r.user?.name} · {r.rating}★ · {new Date(r.createdAt).toLocaleDateString()} · {r.product?.title}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!r.isApproved && (
                  <Button size="sm" onClick={() => moderate.mutate({ isApproved: true })}>
                    Approve
                  </Button>
                )}
                {r.isApproved && (
                  <Button size="sm" variant="outline" onClick={() => moderate.mutate({ isApproved: false })}>
                    Reject
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => remove.mutate()}>
                  Delete
                </Button>
              </div>
            </div>
            {r.comment && <p className="mt-3 text-sm leading-relaxed text-foreground">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
