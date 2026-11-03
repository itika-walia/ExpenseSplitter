'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Field';
import { api, ApiError } from '@/lib/api';
import { CATEGORY_LABELS, formatINR, todayISO } from '@/lib/format';
import { fromPaise, isValidAmount, previewEqualSplit, toPaise } from '@/lib/money';
import { CATEGORIES, SPLIT_TYPES, type Category, type Expense, type Member, type SplitType } from '@/lib/types';

const SPLIT_TYPE_LABELS: Record<SplitType, string> = {
  EQUAL: 'Equally',
  EXACT: 'Exact amounts',
  PERCENTAGE: 'Percentages',
};

interface ExpenseFormProps {
  groupId: string;
  members: Member[];
  onCreated: (expense: Expense) => void;
  onCancel: () => void;
}

export function ExpenseForm({ groupId, members, onCreated, onCancel }: ExpenseFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(members[0]?.id ?? '');
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<Category>('OTHER');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(members.map((member) => member.id)));
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Keep the group's member order so the API assigns rounding paise predictably
  const sharers = members.filter((member) => selected.has(member.id));
  const totalPaise = toPaise(amount);

  /** Per-member preview and the running total for exact / percentage splits. */
  const preview = (() => {
    if (splitType === 'EQUAL') {
      const shares = totalPaise ? previewEqualSplit(totalPaise, sharers.length) : [];
      return { shares: new Map(sharers.map((member, index) => [member.id, shares[index]])), allocated: null };
    }
    const allocated = sharers.reduce((sum, member) => sum + (toPaise(values[member.id] ?? '') ?? 0), 0);
    return { shares: new Map<string, number | undefined>(), allocated };
  })();

  function toggleMember(memberId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!description.trim()) next.description = 'Description is required';
    if (!totalPaise || totalPaise <= 0) next.amount = 'Enter an amount greater than 0 with at most 2 decimals';
    if (!paidById) next.paidById = 'Select who paid';
    if (!date) next.date = 'Pick a date';
    if (sharers.length === 0) next.shares = 'Select at least one member to share the expense';

    if (splitType !== 'EQUAL' && sharers.length > 0) {
      for (const member of sharers) {
        if (!isValidAmount(values[member.id] ?? '')) next[`value-${member.id}`] = 'Required';
      }
      if (splitType === 'EXACT' && totalPaise && preview.allocated !== totalPaise) {
        next.shares = `Exact amounts add up to ${formatINR(fromPaise(preview.allocated ?? 0))}, expense is ${formatINR(fromPaise(totalPaise))}`;
      }
      if (splitType === 'PERCENTAGE' && preview.allocated !== 10_000) {
        next.shares = `Percentages add up to ${fromPaise(preview.allocated ?? 0)}%, they must total 100%`;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const expense = await api.createExpense(groupId, {
        description: description.trim(),
        amount: amount.trim(),
        paidById,
        date,
        category,
        splitType,
        shares: sharers.map((member) => ({
          memberId: member.id,
          ...(splitType === 'EQUAL' ? {} : { value: values[member.id].trim() }),
        })),
      });
      onCreated(expense);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        setError(err.message);
      } else {
        setError('Could not save the expense');
      }
      setSubmitting(false);
    }
  }

  const memberOptions = members.map((member) => ({ value: member.id, label: member.name }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && <Alert>{error}</Alert>}

      <Input
        label="Description"
        name="description"
        placeholder="e.g. Dinner at Baga"
        maxLength={200}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        error={errors.description}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Amount (₹)"
          name="amount"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={errors.amount}
        />
        <Input
          label="Date"
          name="date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          error={errors.date}
        />
        <Select
          label="Paid by"
          name="paidById"
          options={memberOptions}
          value={paidById}
          onChange={(event) => setPaidById(event.target.value)}
          error={errors.paidById}
        />
        <Select
          label="Category"
          name="category"
          options={CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }))}
          value={category}
          onChange={(event) => setCategory(event.target.value as Category)}
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Split</legend>
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5" role="radiogroup">
          {SPLIT_TYPES.map((type) => (
            <label
              key={type}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm ${splitType === type ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <input
                type="radio"
                name="splitType"
                value={type}
                checked={splitType === type}
                onChange={() => setSplitType(type)}
                className="sr-only"
              />
              {SPLIT_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <div className="mb-2 flex items-center justify-between">
          <legend className="text-sm font-medium text-slate-700">Shared by</legend>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              className="text-brand-600 hover:underline"
              onClick={() => setSelected(new Set(members.map((member) => member.id)))}
            >
              Select all
            </button>
            <button type="button" className="text-slate-500 hover:underline" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </div>
        </div>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {members.map((member) => {
            const checked = selected.has(member.id);
            const share = preview.shares.get(member.id);
            return (
              <li key={member.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <label className="flex flex-1 cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMember(member.id)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-slate-800">{member.name}</span>
                </label>
                {checked && splitType === 'EQUAL' && share !== undefined && (
                  <span className="text-sm tabular-nums text-slate-600">{formatINR(fromPaise(share))}</span>
                )}
                {checked && splitType !== 'EQUAL' && (
                  <div className="w-32">
                    <input
                      aria-label={`${member.name} ${splitType === 'EXACT' ? 'amount' : 'percentage'}`}
                      inputMode="decimal"
                      placeholder={splitType === 'EXACT' ? '₹ 0.00' : '% 0'}
                      value={values[member.id] ?? ''}
                      onChange={(event) => setValues((current) => ({ ...current, [member.id]: event.target.value }))}
                      className={`w-full rounded-md border px-2 py-1 text-right text-sm ${errors[`value-${member.id}`] ? 'border-red-400' : 'border-slate-300'}`}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {splitType !== 'EQUAL' && (
          <p className="mt-2 text-xs text-slate-500">
            {splitType === 'EXACT'
              ? `Allocated ${formatINR(fromPaise(preview.allocated ?? 0))} of ${formatINR(fromPaise(totalPaise ?? 0))}`
              : `Allocated ${fromPaise(preview.allocated ?? 0)}% of 100%`}
          </p>
        )}
        {errors.shares && (
          <p className="mt-2 text-xs text-red-600" role="alert">
            {errors.shares}
          </p>
        )}
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" loading={submitting}>
          Save expense
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
