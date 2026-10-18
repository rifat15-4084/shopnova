import { useAddresses, useDeleteAddress, useSaveAddress } from '@/hooks/use-orders';
import { getApiErrorMessage, getValidationErrors } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { toast } from '@/components/ui/toast-store';
import { Modal } from '@/components/ui/modal';
import { AddressForm } from '@/features/account/address-form';
import type { AddressInput } from '@/lib/validators';
import type { Address } from '@/types';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function AddressesPage() {
  const { data: addresses, isLoading, isError, refetch } = useAddresses();
  const saveAddress = useSaveAddress();
  const deleteAddress = useDeleteAddress();

  const [editing, setEditing] = useState<Address | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  function handleSubmit(values: AddressInput) {
    setServerErrors({});
    saveAddress.mutate(
      { ...values, country: values.country || 'Bangladesh', id: editing?._id },
      {
        onSuccess: () => {
          toast.success(editing ? 'Address updated' : 'Address added');
          setEditing(null);
          setCreating(false);
        },
        onError: (err) => {
          setServerErrors(getValidationErrors(err));
          toast.error(getApiErrorMessage(err, 'Could not save address'));
        },
      }
    );
  }

  function confirmDelete() {
    if (!deleting?._id) return;
    deleteAddress.mutate(deleting._id, {
      onSuccess: () => {
        toast.success('Address removed');
        setDeleting(null);
      },
      onError: (err) => toast.error(getApiErrorMessage(err, 'Could not remove address')),
    });
  }

  const formDefaults: Partial<AddressInput> | undefined = editing
    ? {
        label: editing.label ?? '',
        fullName: editing.fullName,
        phone: editing.phone,
        line1: editing.line1,
        line2: editing.line2 ?? '',
        city: editing.city,
        region: (editing.region as AddressInput['region']) ?? 'Dhaka',
        upazila: editing.upazila ?? '',
        postalCode: editing.postalCode ?? '',
        country: editing.country ?? 'Bangladesh',
        isDefault: editing.isDefault,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Addresses</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your delivery addresses.</p>
        </div>
        <Button onClick={() => { setEditing(null); setCreating(true); }}>
          <Plus className="h-4 w-4" aria-hidden />
          Add address
        </Button>
      </div>

      {isError ? (
        <ErrorState description="We couldn't load your addresses." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (addresses?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<MapPin className="h-7 w-7" aria-hidden />}
          title="No saved addresses"
          description="Add a delivery address to speed up checkout."
          action={<Button onClick={() => setCreating(true)}>Add your first address</Button>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses?.map((address) => (
            <li key={address._id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{address.fullName}</p>
                  {address.label && <Badge>{address.label}</Badge>}
                  {address.isDefault && <Badge variant="accent">Default</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditing(address)}
                    aria-label="Edit address"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    onClick={() => setDeleting(address)}
                    aria-label="Delete address"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ''}
                <br />
                {address.upazila ? `${address.upazila}, ` : ''}
                {address.city}
                {address.region ? `, ${address.region}` : ''} {address.postalCode ?? ''}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{address.phone}</p>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
          setServerErrors({});
        }}
        title={editing ? 'Edit address' : 'Add address'}
      >
        <AddressForm
          key={editing?._id ?? 'new'}
          defaultValues={formDefaults}
          onSubmit={handleSubmit}
          submitting={saveAddress.isPending}
          serverErrors={serverErrors}
          submitLabel={editing ? 'Save changes' : 'Add address'}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
            setServerErrors({});
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Remove address?"
        description="This address will be permanently removed from your account."
        confirmLabel="Remove"
        destructive
        loading={deleteAddress.isPending}
      />
    </div>
  );
}
