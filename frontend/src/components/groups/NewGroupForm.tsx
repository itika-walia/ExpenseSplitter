'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { api, ApiError } from '@/lib/api';
import type { GroupDetail } from '@/lib/types';

interface MemberRow {
  key: number;
  name: string;
  email: string;
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
let nextKey = 1;
const emptyRow = (): MemberRow => ({ key: nextKey++, name: '', email: '' });

export function NewGroupForm({ onCreated }: { onCreated: (group: GroupDetail) => void }) {
  const [name, setName] = useState('');
  const [rows, setRows] = useState<MemberRow[]>([emptyRow()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateRow = (key: number, field: 'name' | 'email', value: string) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)));

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Group name is required';
    const seen = new Set<string>();
    rows.forEach((row) => {
      const hasAny = row.name.trim() || row.email.trim();
      if (!hasAny) return;
      if (!row.name.trim()) next[`name-${row.key}`] = 'Name is required';
      const email = row.email.trim().toLowerCase();
      if (!EMAIL_PATTERN.test(email)) next[`email-${row.key}`] = 'Enter a valid email';
      else if (seen.has(email)) next[`email-${row.key}`] = 'Duplicate email';
      seen.add(email);
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const members = rows
        .filter((row) => row.name.trim() || row.email.trim())
        .map((row) => ({ name: row.name.trim(), email: row.email.trim() }));
      const group = await api.createGroup({ name: name.trim(), members });
      setName('');
      setRows([emptyRow()]);
      onCreated(group);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the group');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && <Alert>{error}</Alert>}
      <Input
        label="Group name"
        name="groupName"
        placeholder="e.g. Goa Trip"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-700">Members</legend>
        <p className="text-xs text-slate-500">You are added automatically. Add everyone else by name and email.</p>
        {rows.map((row, index) => (
          <div key={row.key} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
            <Input
              label={`Member ${index + 1} name`}
              id={`member-name-${row.key}`}
              placeholder="Name"
              value={row.name}
              onChange={(event) => updateRow(row.key, 'name', event.target.value)}
              error={errors[`name-${row.key}`]}
            />
            <Input
              label="Email"
              id={`member-email-${row.key}`}
              type="email"
              placeholder="name@example.com"
              value={row.email}
              onChange={(event) => updateRow(row.key, 'email', event.target.value)}
              error={errors[`email-${row.key}`]}
            />
            <Button
              variant="ghost"
              size="sm"
              className="mt-7"
              aria-label={`Remove member ${index + 1}`}
              disabled={rows.length === 1}
              onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
            >
              ✕
            </Button>
          </div>
        ))}
        <Button variant="secondary" size="sm" onClick={() => setRows((current) => [...current, emptyRow()])}>
          + Add another member
        </Button>
      </fieldset>

      <Button type="submit" loading={submitting} className="w-full">
        Create group
      </Button>
    </form>
  );
}
