'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">₹</span>
          Expense Splitter
        </Link>
        {user && (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{user.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                router.push('/login');
              }}
            >
              Log out
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
