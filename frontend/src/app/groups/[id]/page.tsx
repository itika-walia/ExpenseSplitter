'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { AddMemberForm } from '@/components/group/AddMemberForm';
import { BalancesTable } from '@/components/group/BalancesTable';
import { CategoryChart } from '@/components/group/CategoryChart';
import { ExpenseList } from '@/components/group/ExpenseList';
import { GroupError } from '@/components/group/GroupError';
import { RecordSettlementForm } from '@/components/group/RecordSettlementForm';
import { SettlementHistory } from '@/components/group/SettlementHistory';
import { SettleUpList } from '@/components/group/SettleUpList';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { useGroupData } from '@/hooks/useGroupData';
import { api, ApiError } from '@/lib/api';
import { formatINR } from '@/lib/format';

function GroupDashboard({ groupId }: { groupId: string }) {
  const { group, balances, error, loading, reload } = useGroupData(groupId);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (loading && !group) return <Spinner label="Loading group..." />;
  if (error && !group) return <GroupError error={error} />;
  if (!group || !balances) return null;

  async function exportCsv() {
    if (!group) return;
    setExporting(true);
    setExportError(null);
    try {
      const slug = group.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'group';
      await api.downloadExpensesCsv(group.id, `${slug}-expenses.csv`);
    } catch (err) {
      setExportError(err instanceof ApiError ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← All groups
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{group.name}</h1>
          <p className="text-sm text-slate-500">
            {group.members.length} members · total spent{' '}
            <span className="font-medium text-slate-700">{formatINR(balances.totalSpent)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {/* <Button variant="secondary" onClick={exportCsv} loading={exporting} disabled={group.expenses.length === 0}>
            Export CSV
          </Button> */}
          <Link
            href={`/groups/${group.id}/expenses/new`}
            className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Add expense
          </Link>
        </div>
      </div>
      {exportError && <Alert>{exportError}</Alert>}
      {error && <Alert>{error.message}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Balances" description="Positive = gets money back, negative = owes.">
          <BalancesTable balances={balances.balances} />
        </Card>
        <Card title="Settle up" description="The fewest payments that clear every balance.">
          <SettleUpList groupId={group.id} suggestions={balances.suggestions} onSettled={reload} />
        </Card>
      </div>

      <Card title="Expenses" description="Click an expense to see how it was split.">
        <ExpenseList expenses={group.expenses} onDeleted={reload} />
      </Card>

      {/* <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Spending by category">
          <CategoryChart data={balances.categoryTotals} total={balances.totalSpent} />
        </Card>
        <Card title="Payments" description="Settlements recorded between members.">
          <SettlementHistory settlements={group.settlements} />
        </Card>
      </div> */}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Record a payment" description="Log money paid back outside the app.">
          <RecordSettlementForm groupId={group.id} members={group.members} onRecorded={reload} />
        </Card>
        <Card title="Members" description="People who share costs in this group.">
          <ul className="mb-4 flex flex-wrap gap-2">
            {group.members.map((member) => (
              <li key={member.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700" title={member.email}>
                {member.name}
              </li>
            ))}
          </ul>
          <AddMemberForm groupId={group.id} onAdded={reload} />
        </Card>
      </div>
    </div>
  );
}

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireAuth>
      <GroupDashboard groupId={id} />
    </RequireAuth>
  );
}
