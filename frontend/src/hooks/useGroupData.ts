'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { GroupBalances, GroupDetail } from '@/lib/types';

/** Loads a group and its balances together; reload() refreshes both after a change. */
export function useGroupData(groupId: string) {
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [balances, setBalances] = useState<GroupBalances | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const [groupData, balanceData] = await Promise.all([api.getGroup(groupId), api.getBalances(groupId)]);
      setGroup(groupData);
      setBalances(balanceData);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  return { group, balances, error, loading, reload };
}
