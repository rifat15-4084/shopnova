import { useAuth } from '@/hooks/use-auth';
import { getApiErrorMessage, getValidationErrors } from '@/lib/api';
import { registerSchema } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form-fields';
import { toast } from '@/components/ui/toast-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import type { RegisterInput } from '@/types';

type FormValues = RegisterInput & { confirmPassword: string };

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(({ confirmPassword: _confirm, ...values }) => {
    setServerErrors({});
    registerUser.mutate(values, {
      onSuccess: () => {
        toast.success('Account created — welcome to ShopNova!');
        navigate('/account', { replace: true });
      },
      onError: (err) => {
        setServerErrors(getValidationErrors(err));
        toast.error(getApiErrorMessage(err));
      },
    });
  });

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-16">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Join ShopNova for faster checkout and order tracking.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <Input
            label="Full name"
            autoComplete="name"
            placeholder="Ayesha Rahman"
            error={errors.name?.message ?? serverErrors.name}
            {...register('name')}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message ?? serverErrors.email}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            hint="At least 8 characters, with a letter and a number."
            error={errors.password?.message ?? serverErrors.password}
            {...register('password')}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button type="submit" className="w-full" loading={registerUser.isPending}>
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent hover:opacity-80">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
