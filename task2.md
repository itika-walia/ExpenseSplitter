## Project 2: Expense Splitter

Build a group expense app where friends or colleagues log shared costs and see who owes whom, settled to the rupee.

**Problem.** After a trip or team lunch, working out balances by hand is slow and causes disputes.

**Core features (must have)**

- Create a group and add members by name and email.
- Add an expense: description, amount (INR), who paid, date, and which members share it.
- Split equally among selected members (unequal split is a stretch goal).
- Group dashboard showing each member's net balance (positive = gets back, negative = owes).
- "Settle up" suggestions: the minimum list of payments that clears all balances.
- Record a settlement payment, which updates balances.

**Data model (Prisma)**

| Model | Key fields | Relations |
| --- | --- | --- |
| Group | id, name, createdAt | has many Members, Expenses, Settlements |
| Member | id, name, email, groupId | belongs to Group |
| Expense | id, description, amount (Decimal), date, groupId, paidById | belongs to Group; payer is a Member |
| ExpenseShare | id, expenseId, memberId, shareAmount (Decimal) | joins Expense and Member |
| Settlement | id, fromMemberId, toMemberId, amount (Decimal), date, groupId | belongs to Group |

Store money as Prisma `Decimal` (PostgreSQL `numeric(12,2)`), never `Float`.

**API endpoints (Node.js)**

| Method | Route | Purpose |
| --- | --- | --- |
| GET / POST | /api/groups | List or create groups |
| GET | /api/groups/:id | Group with members and expenses |
| POST | /api/groups/:id/members | Add a member |
| POST | /api/groups/:id/expenses | Add expense and create shares in one Prisma transaction |
| DELETE | /api/expenses/:id | Delete expense and its shares |
| GET | /api/groups/:id/balances | Net balance per member + settle-up suggestions |
| POST | /api/groups/:id/settlements | Record a payment |

**Pages (Next.js)**

- `/` lists groups with a "New group" form.
- `/groups/[id]` shows balances, settle-up suggestions and the expense list.
- `/groups/[id]/expenses/new` is the add-expense form with member checkboxes.

**Acceptance criteria**

- [ ] Rs 1,000 split among 3 people gives shares of 333.33, 333.33 and 333.34; totals always match.
- [ ] Sum of all net balances in a group is exactly 0.
- [ ] Settle-up suggests no more payments than members minus one.
- [ ] Recording a settlement updates balances immediately.
- [ ] An expense and its shares are saved together or not at all.

**Stretch goals:** unequal and percentage splits, expense categories with a simple chart, CSV export of a group's expenses.