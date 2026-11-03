import { formatINR } from '@/lib/format';
import type { MemberBalance } from '@/lib/types';

function netLabel(net: number) {
  if (net > 0) return { text: 'gets back', className: 'text-emerald-600' };
  if (net < 0) return { text: 'owes', className: 'text-red-600' };
  return { text: 'settled up', className: 'text-slate-400' };
}

export function BalancesTable({ balances }: { balances: MemberBalance[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-3 font-medium">Member</th>
            <th className="py-2 pr-3 text-right font-medium">Paid</th>
            <th className="py-2 pr-3 text-right font-medium">Share</th>
            <th className="py-2 text-right font-medium">Net balance</th>
          </tr>
        </thead>
        <tbody>
          {balances.map((balance) => {
            const net = Number(balance.net);
            const label = netLabel(net);
            return (
              <tr key={balance.memberId} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 pr-3">
                  <div className="font-medium text-slate-900">{balance.name}</div>
                  <div className="text-xs text-slate-500">{balance.email}</div>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{formatINR(balance.totalPaid)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{formatINR(balance.totalShare)}</td>
                <td className="py-2.5 text-right">
                  <div className={`font-semibold tabular-nums ${label.className}`}>
                    {net > 0 ? '+' : ''}
                    {formatINR(balance.net)}
                  </div>
                  <div className={`text-xs ${label.className}`}>{label.text}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
