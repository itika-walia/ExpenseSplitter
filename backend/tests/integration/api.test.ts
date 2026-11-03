import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { persistExpense } from '../../src/services/expense.service';

const app = createApp();

async function registerUser(name: string, email: string) {
  const res = await request(app).post('/api/auth/register').send({ name, email, password: 'password123' });
  expect(res.status).toBe(201);
  return res.body.token as string;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const sumMoney = (values: string[]) => values.reduce((total, value) => total + Math.round(Number(value) * 100), 0);

describe('Expense Splitter API', () => {
  let ownerToken: string;
  let outsiderToken: string;
  let groupId: string;
  let members: { id: string; name: string; email: string }[];
  const memberId = (name: string) => members.find((member) => member.name === name)!.id;

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "ExpenseShare", "Expense", "Settlement", "Member", "Group", "User" CASCADE',
    );
    ownerToken = await registerUser('Asha', 'asha@test.com');
    outsiderToken = await registerUser('Outsider', 'outsider@test.com');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('authentication', () => {
    it('rejects requests without a token', async () => {
      const res = await request(app).get('/api/groups');
      expect(res.status).toBe(401);
    });

    it('rejects an invalid token', async () => {
      const res = await request(app).get('/api/groups').set(auth('not-a-jwt'));
      expect(res.status).toBe(401);
    });

    it('rejects duplicate registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Asha', email: 'ASHA@test.com', password: 'password123' });
      expect(res.status).toBe(409);
    });

    it('logs in with correct credentials and rejects wrong ones', async () => {
      const ok = await request(app).post('/api/auth/login').send({ email: 'asha@test.com', password: 'password123' });
      expect(ok.status).toBe(200);
      expect(ok.body.token).toBeTruthy();

      const bad = await request(app).post('/api/auth/login').send({ email: 'asha@test.com', password: 'wrong-pass' });
      expect(bad.status).toBe(401);
    });

    it('returns the current user', async () => {
      const res = await request(app).get('/api/auth/me').set(auth(ownerToken));
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('asha@test.com');
    });
  });

  describe('groups and members', () => {
    it('validates the group name', async () => {
      const res = await request(app).post('/api/groups').set(auth(ownerToken)).send({ name: '  ' });
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].path).toBe('name');
    });

    it('creates a group with the creator as first member', async () => {
      const res = await request(app)
        .post('/api/groups')
        .set(auth(ownerToken))
        .send({ name: 'Trip', members: [{ name: 'Bala', email: 'bala@test.com' }] });
      expect(res.status).toBe(201);
      groupId = res.body.group.id;
      expect(res.body.group.members.map((m: { email: string }) => m.email)).toEqual([
        'asha@test.com',
        'bala@test.com',
      ]);
    });

    it('adds a member by name and email', async () => {
      const res = await request(app)
        .post(`/api/groups/${groupId}/members`)
        .set(auth(ownerToken))
        .send({ name: 'Chitra', email: 'chitra@test.com' });
      expect(res.status).toBe(201);
      expect(res.body.member.name).toBe('Chitra');
    });

    it('rejects a duplicate member email and an invalid email', async () => {
      const duplicate = await request(app)
        .post(`/api/groups/${groupId}/members`)
        .set(auth(ownerToken))
        .send({ name: 'Bala again', email: 'BALA@test.com' });
      expect(duplicate.status).toBe(409);

      const invalid = await request(app)
        .post(`/api/groups/${groupId}/members`)
        .set(auth(ownerToken))
        .send({ name: 'X', email: 'not-an-email' });
      expect(invalid.status).toBe(400);
    });

    it('lists only groups the user belongs to', async () => {
      const mine = await request(app).get('/api/groups').set(auth(ownerToken));
      expect(mine.body.groups).toHaveLength(1);
      const theirs = await request(app).get('/api/groups').set(auth(outsiderToken));
      expect(theirs.body.groups).toHaveLength(0);
    });

    it('forbids non-members and 404s unknown groups', async () => {
      const forbidden = await request(app).get(`/api/groups/${groupId}`).set(auth(outsiderToken));
      expect(forbidden.status).toBe(403);
      const missing = await request(app).get('/api/groups/does-not-exist').set(auth(ownerToken));
      expect(missing.status).toBe(404);
    });

    it('returns the group with members and expenses', async () => {
      const res = await request(app).get(`/api/groups/${groupId}`).set(auth(ownerToken));
      expect(res.status).toBe(200);
      members = res.body.group.members;
      expect(members).toHaveLength(3);
      expect(res.body.group.expenses).toEqual([]);
    });
  });

  describe('expenses', () => {
    let expenseId: string;

    it('splits Rs 1,000 among 3 as 333.33 / 333.33 / 333.34', async () => {
      const res = await request(app)
        .post(`/api/groups/${groupId}/expenses`)
        .set(auth(ownerToken))
        .send({
          description: 'Dinner',
          amount: '1000',
          paidById: memberId('Asha'),
          date: '2026-10-01',
          category: 'FOOD',
          shares: members.map((member) => ({ memberId: member.id })),
        });
      expect(res.status).toBe(201);
      expenseId = res.body.expense.id;
      const shareAmounts = res.body.expense.shares.map((s: { shareAmount: string }) => s.shareAmount);
      expect(shareAmounts).toEqual(['333.33', '333.33', '333.34']);
      expect(sumMoney(shareAmounts)).toBe(100_000);
      expect(res.body.expense.amount).toBe('1000.00');
      expect(res.body.expense.date).toBe('2026-10-01');
    });

    it('supports exact and percentage splits', async () => {
      const exact = await request(app)
        .post(`/api/groups/${groupId}/expenses`)
        .set(auth(ownerToken))
        .send({
          description: 'Taxi',
          amount: 450.5,
          paidById: memberId('Bala'),
          date: '2026-10-02',
          splitType: 'EXACT',
          shares: [
            { memberId: memberId('Bala'), value: '200.25' },
            { memberId: memberId('Chitra'), value: '250.25' },
          ],
        });
      expect(exact.status).toBe(201);

      const percent = await request(app)
        .post(`/api/groups/${groupId}/expenses`)
        .set(auth(ownerToken))
        .send({
          description: 'Hotel',
          amount: '999.99',
          paidById: memberId('Chitra'),
          date: '2026-10-03',
          splitType: 'PERCENTAGE',
          shares: [
            { memberId: memberId('Asha'), value: '50' },
            { memberId: memberId('Chitra'), value: '50' },
          ],
        });
      expect(percent.status).toBe(201);
      expect(sumMoney(percent.body.expense.shares.map((s: { shareAmount: string }) => s.shareAmount))).toBe(99_999);
    });

    it('rejects invalid expenses', async () => {
      const base = {
        description: 'Bad',
        amount: '100',
        paidById: memberId('Asha'),
        date: '2026-10-01',
        shares: [{ memberId: memberId('Asha') }],
      };
      const cases = [
        { ...base, amount: '-5' },
        { ...base, amount: '10.999' },
        { ...base, description: '' },
        { ...base, shares: [] },
        { ...base, date: 'not-a-date' },
        { ...base, paidById: 'someone-else' },
        { ...base, shares: [{ memberId: 'stranger' }] },
        { ...base, splitType: 'EXACT', shares: [{ memberId: memberId('Asha'), value: '50' }] },
        { ...base, splitType: 'PERCENTAGE', shares: [{ memberId: memberId('Asha'), value: '90' }] },
      ];
      for (const body of cases) {
        const res = await request(app).post(`/api/groups/${groupId}/expenses`).set(auth(ownerToken)).send(body);
        expect(res.status, JSON.stringify(body)).toBe(400);
      }
    });

    it('saves an expense and its shares together or not at all', async () => {
      const before = await prisma.expense.count();
      await expect(
        persistExpense({
          groupId,
          description: 'Will roll back',
          amountPaise: 1_000,
          date: new Date('2026-10-05'),
          paidById: memberId('Asha'),
          category: 'OTHER',
          splitType: 'EQUAL',
          // Second share references a non-existent member -> FK violation
          shares: [
            { memberId: memberId('Asha'), sharePaise: 500 },
            { memberId: 'missing-member', sharePaise: 500 },
          ],
        }),
      ).rejects.toThrow();
      expect(await prisma.expense.count()).toBe(before);
    });

    it('exports expenses as CSV', async () => {
      const res = await request(app).get(`/api/groups/${groupId}/expenses/export`).set(auth(ownerToken));
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text.split('\r\n')).toHaveLength(4);
      expect(res.text).toContain('"Dinner"');
    });

    it('deletes an expense and its shares', async () => {
      const forbidden = await request(app).delete(`/api/expenses/${expenseId}`).set(auth(outsiderToken));
      expect(forbidden.status).toBe(403);

      const res = await request(app).delete(`/api/expenses/${expenseId}`).set(auth(ownerToken));
      expect(res.status).toBe(204);
      expect(await prisma.expenseShare.count({ where: { expenseId } })).toBe(0);

      const again = await request(app).delete(`/api/expenses/${expenseId}`).set(auth(ownerToken));
      expect(again.status).toBe(404);
    });
  });

  describe('balances and settlements', () => {
    async function getBalances() {
      const res = await request(app).get(`/api/groups/${groupId}/balances`).set(auth(ownerToken));
      expect(res.status).toBe(200);
      return res.body as {
        balances: { memberId: string; net: string }[];
        suggestions: { fromMemberId: string; toMemberId: string; amount: string }[];
        categoryTotals: { category: string; amount: string }[];
      };
    }

    it('net balances sum to exactly zero and settle-up uses at most n - 1 payments', async () => {
      await request(app)
        .post(`/api/groups/${groupId}/expenses`)
        .set(auth(ownerToken))
        .send({
          description: 'Snacks',
          amount: '100',
          paidById: memberId('Asha'),
          date: '2026-10-04',
          shares: members.map((member) => ({ memberId: member.id })),
        });

      const body = await getBalances();
      expect(sumMoney(body.balances.map((b) => b.net))).toBe(0);
      expect(body.suggestions.length).toBeGreaterThan(0);
      expect(body.suggestions.length).toBeLessThanOrEqual(members.length - 1);
      expect(body.categoryTotals.length).toBeGreaterThan(0);
    });

    it('validates settlements', async () => {
      const same = await request(app)
        .post(`/api/groups/${groupId}/settlements`)
        .set(auth(ownerToken))
        .send({ fromMemberId: memberId('Asha'), toMemberId: memberId('Asha'), amount: '10' });
      expect(same.status).toBe(400);

      const stranger = await request(app)
        .post(`/api/groups/${groupId}/settlements`)
        .set(auth(ownerToken))
        .send({ fromMemberId: memberId('Asha'), toMemberId: 'stranger', amount: '10' });
      expect(stranger.status).toBe(400);
    });

    it('recording the suggested settlements updates balances immediately and clears them', async () => {
      const { suggestions } = await getBalances();
      for (const suggestion of suggestions) {
        const res = await request(app)
          .post(`/api/groups/${groupId}/settlements`)
          .set(auth(ownerToken))
          .send({ ...suggestion, note: 'UPI' });
        expect(res.status).toBe(201);
      }

      const after = await getBalances();
      expect(after.balances.every((b) => b.net === '0.00')).toBe(true);
      expect(after.suggestions).toEqual([]);

      const detail = await request(app).get(`/api/groups/${groupId}`).set(auth(ownerToken));
      expect(detail.body.group.settlements).toHaveLength(suggestions.length);
    });
  });

  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/not found/);
  });
});
