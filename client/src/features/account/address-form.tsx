import { BD_DIVISIONS, addressSchema, type AddressInput } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/form-fields';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

const divisionOptions = BD_DIVISIONS.map((d) => ({ value: d, label: d }));

interface AddressFormProps {
  defaultValues?: Partial<AddressInput>;
  onSubmit: (values: AddressInput) => void;
  submitting?: boolean;
  submitLabel?: string;
  serverErrors?: Record<string, string>;
  onCancel?: () => void;
}

/**
 * Bangladesh-shaped address form (division + district + upazila + 4-digit postcode).
 * Remount with a `key` when switching between addresses so defaults refresh.
 */
export function AddressForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel = 'Save address',
  serverErrors,
  onCancel,
}: AddressFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: '',
      fullName: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      region: 'Dhaka',
      upazila: '',
      postalCode: '',
      country: 'Bangladesh',
      isDefault: false,
      ...defaultValues,
    },
  });

  const err = (field: keyof AddressInput) => errors[field]?.message ?? serverErrors?.[field];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full name"
          autoComplete="name"
          placeholder="Ayesha Rahman"
          error={err('fullName')}
          {...register('fullName')}
        />
        <Input
          label="Mobile number"
          autoComplete="tel"
          placeholder="01712345678"
          hint="BD mobile, e.g. 01712345678 or +8801712345678"
          error={err('phone')}
          {...register('phone')}
        />
      </div>

      <Input
        label="Street address"
        autoComplete="address-line1"
        placeholder="House 12, Road 5, Banani"
        error={err('line1')}
        {...register('line1')}
      />
      <Input
        label="Apartment, suite, landmark (optional)"
        autoComplete="address-line2"
        placeholder="Level 3, opposite the pharmacy"
        error={err('line2')}
        {...register('line2')}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label="Division"
          options={divisionOptions}
          error={err('region')}
          {...register('region')}
        />
        <Input
          label="District / city"
          placeholder="Dhaka"
          error={err('city')}
          {...register('city')}
        />
        <Input
          label="Upazila / thana (optional)"
          placeholder="Banani"
          error={err('upazila')}
          {...register('upazila')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Postal code"
          inputMode="numeric"
          placeholder="1213"
          error={err('postalCode')}
          {...register('postalCode')}
        />
        <Input
          label="Address label (optional)"
          placeholder="Home, Office…"
          error={err('label')}
          {...register('label')}
        />
      </div>

      <label className="flex items-center gap-2.5 text-sm text-foreground">
        <input type="checkbox" className="h-4 w-4 rounded border-border accent-accent" {...register('isDefault')} />
        Set as my default address
      </label>

      <div className="flex flex-wrap gap-3 pt-1">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
