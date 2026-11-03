'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { GroupError } from '@/components/group/GroupError';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Feedback';
import { api, ApiError } from '@/lib/api';
import type { GroupDetail } from '@/lib/types';

function NewExpense({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    api
      .getGroup(groupId)
      .then(setGroup)
      .catch((err) => setError(err instanceof ApiError ? err : new ApiError(0, 'Could not load the group')));
  }, [groupId]);

  if (error) return <GroupError error={error} />;
  if (!group) return <Spinner label="Loading group..." />;

  const backToGroup = () => router.push(`/groups/${groupId}`);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href={`/groups/${groupId}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← {group.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Add expense</h1>
      </div>
      <Card>
        <ExpenseForm groupId={groupId} members={group.members} onCreated={backToGroup} onCancel={backToGroup} />
      </Card>
    </div>
  );
}

export default function NewExpensePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireAuth>
      <NewExpense groupId={id} />
    </RequireAuth>
  );
}
