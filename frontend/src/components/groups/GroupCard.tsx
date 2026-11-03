import Link from 'next/link';
import { formatDate, formatINR } from '@/lib/format';
import type { GroupSummary } from '@/lib/types';

export function GroupCard({ group }: { group: GroupSummary }) {
  return (
    <Link
      href={`/groups/${group.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-500 hover:shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{group.name}</h3>
        <span className="whitespace-nowrap text-sm font-medium text-slate-700">{formatINR(group.totalSpent)}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {group.memberCount} member{group.memberCount === 1 ? '' : 's'} · {group.expenseCount} expense
        {group.expenseCount === 1 ? '' : 's'} · created {formatDate(group.createdAt)}
      </p>
      <p className="mt-3 truncate text-sm text-slate-600">{group.members.map((member) => member.name).join(', ')}</p>
    </Link>
  );
}
