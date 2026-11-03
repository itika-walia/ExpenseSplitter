import type {
  AuthResponse,
  Expense,
  GroupBalances,
  GroupDetail,
  GroupSummary,
  Member,
  NewExpenseInput,
  NewSettlementInput,
  Settlement,
  User,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
export const TOKEN_KEY = 'expense-splitter-token';

export interface FieldError {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: FieldError[],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Validation messages keyed by field path, e.g. { amount: "..." }. */
  fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const detail of this.details ?? []) {
      errors[detail.path] ??= detail.message;
    }
    return errors;
  }
}

let onUnauthorized: (() => void) | null = null;

/** Lets the auth provider log the user out when the API rejects the token. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check that the API is running.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = new ApiError(
      response.status,
      body?.error?.message ?? `Request failed (${response.status})`,
      Array.isArray(body?.error?.details) ? body.error.details : undefined,
    );
    if (response.status === 401 && token) onUnauthorized?.();
    throw error;
  }
  return response;
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const api = {
  register: (input: { name: string; email: string; password: string }) =>
    json<AuthResponse>('/auth/register', post(input)),
  login: (input: { email: string; password: string }) => json<AuthResponse>('/auth/login', post(input)),
  me: () => json<{ user: User }>('/auth/me').then((res) => res.user),

  listGroups: () => json<{ groups: GroupSummary[] }>('/groups').then((res) => res.groups),
  createGroup: (input: { name: string; members: { name: string; email: string }[] }) =>
    json<{ group: GroupDetail }>('/groups', post(input)).then((res) => res.group),
  getGroup: (id: string) => json<{ group: GroupDetail }>(`/groups/${id}`).then((res) => res.group),
  addMember: (groupId: string, input: { name: string; email: string }) =>
    json<{ member: Member }>(`/groups/${groupId}/members`, post(input)).then((res) => res.member),

  createExpense: (groupId: string, input: NewExpenseInput) =>
    json<{ expense: Expense }>(`/groups/${groupId}/expenses`, post(input)).then((res) => res.expense),
  deleteExpense: (expenseId: string) => json<void>(`/expenses/${expenseId}`, { method: 'DELETE' }),

  getBalances: (groupId: string) => json<GroupBalances>(`/groups/${groupId}/balances`),
  createSettlement: (groupId: string, input: NewSettlementInput) =>
    json<{ settlement: Settlement }>(`/groups/${groupId}/settlements`, post(input)).then((res) => res.settlement),

  /** Downloads the group's expenses as a CSV file. */
  async downloadExpensesCsv(groupId: string, fileName: string) {
    const response = await request(`/groups/${groupId}/expenses/export`);
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  },
};
