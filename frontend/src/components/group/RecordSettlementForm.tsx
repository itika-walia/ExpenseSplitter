'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Field';
import { api, ApiError } from '@/lib/api';
import { todayISO } from '@/lib/format';
import { isValidAmount, toPaise } from '@/lib/money';
import type { Member } from '@/lib/types';

interface RecordSettlementFormProps {
  groupId: string;
  members: Member[];
  onRecorded: () => Promise<void>;
}

const initialForm = () => ({ fromMemberId: '', toMemberId: '', amount: '', date: todayISO(), note: '' });

export function RecordSettlementForm({ groupId, members, onRecorded }: RecordSettlementFormProps) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const options = members.map((member) => ({ value: member.id, label: member.name }));
  const set = (field: keyof ReturnType<typeof initialForm>) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  function validate() {
    const next: Record<string, string> = {};
    if (!form.fromMemberId) next.fromMemberId = 'Select who paid';
    if (!form.toMemberId) next.toMemberId = 'Select who received';
    else if (form.toMemberId === form.fromMemberId) next.toMemberId = 'Must be a different member';
    if (!isValidAmount(form.amount) || (toPaise(form.amount) ?? 0) <= 0) {
      next.amount = 'Enter an amount greater than 0 with at most 2 decimals';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.createSettlement(groupId, {
        fromMemberId: form.fromMemberId,
        toMemberId: form.toMemberId,
        amount: form.amount.trim(),
        date: form.date || undefined,
        note: form.note.trim() || undefined,
      });
      setForm(initialForm());
      setSuccess('Payment recorded - balances updated.');
      await onRecorded();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        setError(err.message);
      } else {
        setError('Could not record the payment');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {error && <Alert>{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="From (payer)"
          name="fromMemberId"
          placeholder="Select member"
          options={options}
          value={form.fromMemberId}
          onChange={(event) => set('fromMemberId')(event.target.value)}
          error={errors.fromMemberId}
        />
        <Select
          label="To (receiver)"
          name="toMemberId"
          placeholder="Select member"
          options={options}
          value={form.toMemberId}
          onChange={(event) => set('toMemberId')(event.target.value)}
          error={errors.toMemberId}
        />
        <Input
          label="Amount (₹)"
          name="settlementAmount"
          inputMode="decimal"
          placeholder="0.00"
          value={form.amount}
          onChange={(event) => set('amount')(event.target.value)}
          error={errors.amount}
        />
        <Input
          label="Date"
          name="settlementDate"
          type="date"
          value={form.date}
          onChange={(event) => set('date')(event.target.value)}
          error={errors.date}
        />
      </div>
      <Input
        label="Note (optional)"
        name="note"
        placeholder="e.g. UPI transfer"
        maxLength={200}
        value={form.note}
        onChange={(event) => set('note')(event.target.value)}
      />
      <Button type="submit" loading={submitting}>
        Record payment
      </Button>
    </form>
  );
}
