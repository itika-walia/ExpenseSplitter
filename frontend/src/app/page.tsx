'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { GroupCard } from '@/components/groups/GroupCard';
import { NewGroupForm } from '@/components/groups/NewGroupForm';
import { Card } from '@/components/ui/Card';
import { Alert, EmptyState, Spinner } from '@/components/ui/Feedback';
import { api, ApiError } from '@/lib/api';
import type { GroupSummary } from '@/lib/types';

function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setGroups(await api.listGroups());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load groups');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your groups</h1>
          <p className="text-sm text-slate-500">Trips, flats, team lunches - everything you split with others.</p>
        </div>
        {error && <Alert>{error}</Alert>}
        {!groups && !error && <Spinner label="Loading groups..." />}
        {groups?.length === 0 && (
          <EmptyState title="No groups yet">Create your first group with the form to start splitting.</EmptyState>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {groups?.map((group) => <GroupCard key={group.id} group={group} />)}
        </div>
      </div>

      <Card title="New group" description="Name it and add the people you are splitting with.">
        <NewGroupForm onCreated={(group) => router.push(`/groups/${group.id}`)} />
      </Card>
    </div>
  );
}

export default function HomePage() {
  return (
    <RequireAuth>
      <GroupsPage />
    </RequireAuth>
  );
}
