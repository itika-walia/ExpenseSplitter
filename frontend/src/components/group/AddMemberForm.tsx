'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { api, ApiError } from '@/lib/api';

interface AddMemberFormProps {
  groupId: string;
  onAdded: () => Promise<void>;
}

export function AddMemberForm({ groupId, onAdded }: AddMemberFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Name is required';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await api.addMember(groupId, { name: name.trim(), email: email.trim() });
      setName('');
      setEmail('');
      await onAdded();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        setError(err.message);
      } else {
        setError('Could not add the member');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Name"
          name="memberName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
        />
        <Input
          label="Email"
          name="memberEmail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />
      </div>
      <Button type="submit" variant="secondary" loading={submitting}>
        Add member
      </Button>
    </form>
  );
}
