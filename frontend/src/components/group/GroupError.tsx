import Link from 'next/link';
import { Alert } from '@/components/ui/Feedback';
import type { ApiError } from '@/lib/api';

/** Friendly message for a group that failed to load (missing, forbidden, offline). */
export function GroupError({ error }: { error: ApiError }) {
  const message =
    error.status === 404
      ? 'This group does not exist.'
      : error.status === 403
        ? 'You are not a member of this group. Ask a member to add your email.'
        : error.message;
  return (
    <div className="space-y-4">
      <Alert>{message}</Alert>
      <Link href="/" className="text-sm font-medium text-brand-600 hover:underline">
        ← Back to your groups
      </Link>
    </div>
  );
}
