import { EmptyState } from '@/components/ui/Feedback';
import { CATEGORY_COLORS, CATEGORY_LABELS, formatINR } from '@/lib/format';
import type { GroupBalances } from '@/lib/types';

/** Horizontal bar chart of spending per category. */
export function CategoryChart({ data, total }: { data: GroupBalances['categoryTotals']; total: string }) {
  if (data.length === 0) {
    return <EmptyState title="No spending to chart yet" />;
  }
  const max = Math.max(...data.map((item) => Number(item.amount)));
  const totalNumber = Number(total);

  return (
    <ul className="space-y-3" aria-label="Spending by category">
      {data.map((item) => {
        const value = Number(item.amount);
        const percent = totalNumber > 0 ? Math.round((value / totalNumber) * 100) : 0;
        return (
          <li key={item.category}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-slate-700">{CATEGORY_LABELS[item.category]}</span>
              <span className="tabular-nums text-slate-900">
                {formatINR(item.amount)} <span className="text-xs text-slate-500">({percent}%)</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${CATEGORY_COLORS[item.category]}`}
                style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
