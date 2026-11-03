'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Spinner } from '@/components/ui/Feedback';
import { useAuth } from '@/hooks/useAuth';

/** Renders children only for signed-in users; otherwise redirects to /login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) return <Spinner />;
  return <>{children}</>;
}
