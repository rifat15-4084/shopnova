import { useAuth } from '@/hooks/use-auth';
import { useChangePassword, useUpdateProfile } from '@/hooks/use-orders';
import { getApiErrorMessage, getValidationErrors } from '@/lib/api';
import { changePasswordSchema, profileSchema, type ProfileFormValues } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form-fields';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import type { ChangePasswordInput } from '@/types';
import { z } from 'zod';

type PasswordValues = z.infer<typeof changePasswordSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onProfileSubmit = profileForm.handleSubmit((values) => {
    setProfileErrors({});
    updateProfile.mutate(values, {
      onSuccess: () => toast.success('Profile updated'),
      onError: (err) => {
        setProfileErrors(getValidationErrors(err));
        toast.error(getApiErrorMessage(err, 'Could not update profile'));
      },
    });
  });

  const onPasswordSubmit = passwordForm.handleSubmit((values) => {
    setPasswordErrors({});
    const payload: ChangePasswordInput = {
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    };
    changePassword.mutate(payload, {
      onSuccess: () => {
        toast.success('Password changed');
        passwordForm.reset();
      },
      onError: (err) => {
        setPasswordErrors(getValidationErrors(err));
        toast.error(getApiErrorMessage(err, 'Could not change password'));
      },
    });
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account information.</p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">Account details</h2>
          {user?.role === 'admin' && <Badge variant="accent">Admin</Badge>}
        </div>
        <form onSubmit={onProfileSubmit} className="max-w-md space-y-4" noValidate>
          <Input
            label="Full name"
            autoComplete="name"
            error={profileForm.formState.errors.name?.message ?? profileErrors.name}
            {...profileForm.register('name')}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={profileForm.formState.errors.email?.message ?? profileErrors.email}
            {...profileForm.register('email')}
          />
          <Button type="submit" loading={updateProfile.isPending}>
            Save changes
          </Button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">Change password</h2>
        <form onSubmit={onPasswordSubmit} className="max-w-md space-y-4" noValidate>
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            error={passwordForm.formState.errors.currentPassword?.message ?? passwordErrors.currentPassword}
            {...passwordForm.register('currentPassword')}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters, with a letter and a number."
            error={passwordForm.formState.errors.newPassword?.message ?? passwordErrors.newPassword}
            {...passwordForm.register('newPassword')}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register('confirmPassword')}
          />
          <Button type="submit" loading={changePassword.isPending}>
            Update password
          </Button>
        </form>
      </section>
    </div>
  );
}
