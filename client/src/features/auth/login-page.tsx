import { useAuth } from '@/hooks/use-auth';
import { getApiErrorMessage, getValidationErrors } from '@/lib/api';
import { loginSchema } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form-fields';
import { toast } from '@/components/ui/toast-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { LoginInput } from '@/types';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const from = (location.state as { from?: string } | null)?.from ?? '/account';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerErrors({});
    login.mutate(values, {
      onSuccess: () => {
        toast.success('Welcome back!');
        navigate(from, { replace: true });
      },
      onError: (err) => {
        setServerErrors(getValidationErrors(err));
        toast.error(getApiErrorMessage(err));
      },
    });
  });

  function fillDemo() {
    setValue('email', 'demo@shopnova.dev');
    setValue('password', 'Demo@12345');
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-16">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back — sign in to access your account.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
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
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message ?? serverErrors.password}
            {...register('password')}
          />

          <Button type="submit" className="w-full" loading={login.isPending}>
            Sign in
          </Button>
        </form>

        <div className="mt-4 rounded-lg border border-dashed border-accent/40 bg-accent/5 p-3">
          <p className="text-xs font-semibold text-foreground">Demo accounts</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fillDemo}
              className="rounded-md bg-surface px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent/10"
            >
              Fill customer demo
            </button>
            <button
              type="button"
              onClick={() => {
                setValue('email', 'admin@shopnova.dev');
                setValue('password', 'Admin@12345');
              }}
              className="rounded-md bg-surface px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent/10"
            >
              Fill admin demo
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-accent hover:opacity-80">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
