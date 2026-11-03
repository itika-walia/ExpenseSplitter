/**
 * Seeds the database from ../../database/seed/seed-data.json.
 * Data is written through the application services so seeded expenses use
 * exactly the same split rules and validation as the API.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { prisma } from '../src/lib/prisma';
import { register } from '../src/services/auth.service';
import { createExpense } from '../src/services/expense.service';
import { createGroup } from '../src/services/group.service';
import { createSettlement } from '../src/services/settlement.service';
import { createExpenseSchema, createSettlementSchema } from '../src/validators/group.validators';

interface SeedData {
  users: { name: string; email: string; password: string }[];
  groups: {
    name: string;
    createdBy: string;
    members: { name: string; email: string }[];
    expenses: {
      description: string;
      amount: string;
      paidBy: string;
      date: string;
      category: string;
      splitType: string;
      shares: { email: string; value?: string }[];
    }[];
    settlements: { from: string; to: string; amount: string; date?: string; note?: string }[];
  }[];
}

const seedPath = path.resolve(__dirname, '../../database/seed/seed-data.json');

async function main() {
  const data = JSON.parse(readFileSync(seedPath, 'utf8')) as SeedData;

  console.log('Clearing existing data...');
  await prisma.$transaction([
    prisma.expenseShare.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.settlement.deleteMany(),
    prisma.member.deleteMany(),
    prisma.group.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const users = new Map<string, Awaited<ReturnType<typeof register>>['user']>();
  for (const user of data.users) {
    const { user: created } = await register(user);
    users.set(created.email, created);
  }
  console.log(`Created ${users.size} users`);

  for (const groupData of data.groups) {
    const creator = users.get(groupData.createdBy);
    if (!creator) throw new Error(`Unknown group creator ${groupData.createdBy}`);

    const group = await createGroup(creator, { name: groupData.name, members: groupData.members });
    const memberId = (email: string) => {
      const member = group.members.find((m) => m.email === email);
      if (!member) throw new Error(`${email} is not a member of ${group.name}`);
      return member.id;
    };

    for (const expense of groupData.expenses) {
      const input = createExpenseSchema.parse({
        ...expense,
        paidById: memberId(expense.paidBy),
        shares: expense.shares.map((share) => ({ memberId: memberId(share.email), value: share.value })),
      });
      await createExpense(group.id, input);
    }

    for (const settlement of groupData.settlements) {
      const input = createSettlementSchema.parse({
        fromMemberId: memberId(settlement.from),
        toMemberId: memberId(settlement.to),
        amount: settlement.amount,
        date: settlement.date,
        note: settlement.note,
      });
      await createSettlement(group.id, input);
    }
    console.log(
      `Created group "${group.name}" with ${group.members.length} members, ` +
        `${groupData.expenses.length} expenses, ${groupData.settlements.length} settlements`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
