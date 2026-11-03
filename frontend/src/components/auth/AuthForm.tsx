'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }) {
  const { user, login, register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  // Only follow same-site relative paths to avoid open redirects
  const redirectTo = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.replace(redirectTo);
  }, [user, router, redirectTo]);

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  function validate() {
    const errors: Record<string, string> = {};
    if (mode === 'register' && !form.name.trim()) errors.name = 'Name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address';
    if (mode === 'register' && form.password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (mode === 'login' && !form.password) errors.password = 'Password is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(form.email.trim(), form.password);
      } else {
        await register(form.name.trim(), form.email.trim(), form.password);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors());
        setError(err.message);
      } else {
        setError('Something went wrong');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = mode === 'login';
  return (
    <div className="mx-auto max-w-sm pt-8">
      <Card
        title={isLogin ? 'Welcome back' : 'Create your account'}
        description={
          isLogin
            ? 'Sign in to see your groups and balances.'
            : 'Use the same email your friends add you with to see their groups.'
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <Alert>{error}</Alert>}
          {!isLogin && (
            <Input label="Name" name="name" value={form.name} onChange={update('name')} error={fieldErrors.name} />
          )}
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            error={fieldErrors.email}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            value={form.password}
            onChange={update('password')}
            error={fieldErrors.password}
          />
          <Button type="submit" loading={submitting} className="w-full">
            {isLogin ? 'Sign in' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <Link
            href={`${isLogin ? '/register' : '/login'}${next ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="font-medium text-brand-600 hover:underline"
          >
            {isLogin ? 'Create one' : 'Sign in'}
          </Link>
        </p>
      </Card>
    </div>
  );
}
