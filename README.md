# Expense Splitter

A group expense app where friends or colleagues log shared costs and see who owes whom, settled to the rupee.

* Create groups and add members by name and email.
* Log expenses in INR: description, amount, payer, date, category, and who shares the cost.
* Split an expense **equally**, by **exact amounts**, or by **percentage**.
* A dashboard shows each member's **net balance** (positive = gets back, negative = owes).
* **Settle up** suggests the fewest payments that clear every balance. Any suggestion can be recorded with one click.
* Record any other **settlement payment**. Balances update immediately.
* Delete expenses (each expense's shares are deleted with it).
* See a **spending-by-category chart** and **export** a group's expenses to CSV.
* Sign in with email and password (**JWT**). A user can only see groups where they are a member.

| Layer | Stack |
| --- | --- |
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Backend | Node.js, Express 4, TypeScript, Zod validation, JWT auth |
| Database | PostgreSQL 16, Prisma ORM 5 (migrations, `Decimal` money) |
| Tests | Vitest + Supertest (unit and integration), Postman collection |

## Project structure

```
ExpenseSplitter/
├── frontend/                 Next.js app
│   └── src/
│       ├── app/              Pages: /, /login, /register, /groups/[id], /groups/[id]/expenses/new
│       ├── components/       ui/, auth/, layout/, groups/, group/, expenses/
│       ├── hooks/            useAuth (auth context), useGroupData (group + balances)
│       └── lib/              api client, types, formatting, money helpers
├── backend/                  Express API
│   ├── prisma/               schema.prisma, migrations/, seed.ts
│   ├── src/
│   │   ├── config/           env validation
│   │   ├── domain/           pure money, split and settle-up logic (no I/O)
│   │   ├── services/         business logic + Prisma access
│   │   ├── controllers/      HTTP request/response handling
│   │   ├── routes/           route table
│   │   ├── middleware/       auth, group access, validation, error handling
│   │   ├── validators/       Zod request schemas
│   │   └── utils/
│   ├── tests/                unit/ and integration/ (Vitest)
│   └── postman/              Postman collection for every endpoint
├── database/                 schema docs, ER diagram, reference SQL, seed data
└── docker-compose.yml        local PostgreSQL
```

## Getting started

### Prerequisites
* Node.js 20 or newer (developed on Node 24)
* Docker, for PostgreSQL. A local PostgreSQL 14+ also works; point `DATABASE_URL` at it.

### 1. Start PostgreSQL

```bash
docker compose up -d
```

This starts Postgres on **localhost:5432** (user and password are both `postgres`, database `expense_splitter`).

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env           # then set JWT_SECRET to a long random string
npx prisma migrate deploy      # apply migrations (use `npm run prisma:migrate` while developing)
npm run db:seed                # optional: demo data (deletes all existing data first)
npm run dev                    # http://localhost:4000/api
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev                    # http://localhost:3000
```

If you loaded the seed data, sign in as `aarav@example.com` with the password `password123`. Priya, Rohan and Sneha log in the same way.

## Environment variables

### `backend/.env`
| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | – | PostgreSQL connection string |
| `PORT` | `4000` | API port |
| `JWT_SECRET` | – | Secret used to sign tokens. **Required.** |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated list of allowed origins |

### `backend/.env.test`
The integration tests use this file. Its `DATABASE_URL` must point to a separate database **whose name contains `test`**, because each test run wipes it. Copy `.env.test.example` to create it.

### `frontend/.env.local`
| Variable | Default | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | Base URL of the API |

## Scripts

| Where | Command | What it does |
| --- | --- | --- |
| backend | `npm run dev` | Starts the API with hot reload |
| backend | `npm run build` / `npm start` | Compiles to `dist/` and runs the compiled API |
| backend | `npm test` | Runs the unit and integration tests (needs Postgres) |
| backend | `npm run prisma:migrate` | Creates and applies a new migration |
| backend | `npm run db:seed` / `npm run db:reset` | Loads the seed data, or resets the database and reseeds |
| frontend | `npm run dev` / `npm run build` / `npm start` | Next.js dev server, production build, production server |
| frontend | `npm run lint` / `npm run typecheck` | ESLint and TypeScript checks |

## API reference

Base URL: `http://localhost:4000/api`. Every route except `/health`, `/auth/register` and `/auth/login` requires the header `Authorization: Bearer <token>`.

| Method | Route | Purpose | Success |
| --- | --- | --- | --- |
| POST | `/auth/register` | Create an account `{ name, email, password }` | 201 `{ user, token }` |
| POST | `/auth/login` | Sign in `{ email, password }` | 200 `{ user, token }` |
| GET | `/auth/me` | Get the current user | 200 `{ user }` |
| GET | `/groups` | List the groups you belong to | 200 `{ groups }` |
| POST | `/groups` | Create a group `{ name, members?: [{ name, email }] }`. The creator is added as a member automatically. | 201 `{ group }` |
| GET | `/groups/:id` | Get a group with its members, expenses and settlements | 200 `{ group }` |
| POST | `/groups/:id/members` | Add a member `{ name, email }` | 201 `{ member }` |
| POST | `/groups/:id/expenses` | Add an expense and its shares in **one transaction** | 201 `{ expense }` |
| DELETE | `/expenses/:id` | Delete an expense and its shares | 204 |
| GET | `/groups/:id/balances` | Net balance per member, settle-up suggestions and category totals | 200 |
| POST | `/groups/:id/settlements` | Record a payment `{ fromMemberId, toMemberId, amount, date?, note? }` | 201 `{ settlement }` |
| GET | `/groups/:id/expenses/export` | Download the group's expenses as CSV | 200 `text/csv` |

**Expense body:**

```json
{
  "description": "Dinner",
  "amount": "1000",
  "paidById": "<memberId>",
  "date": "2026-10-01",
  "category": "FOOD",
  "splitType": "EQUAL",
  "shares": [{ "memberId": "<id>" }, { "memberId": "<id>" }]
}
```

For `EXACT` splits, each share needs `value` set to that member's amount. For `PERCENTAGE` splits, `value` is that member's percentage (for example `"33.33"`). Amounts can be strings or numbers with at most 2 decimal places. Responses always return money as 2-decimal strings, for example `"333.34"`.

**Errors** use one format:

```json
{ "error": { "message": "Validation failed", "details": [{ "path": "amount", "message": "..." }] } }
```

| Status | Meaning |
| --- | --- |
| 400 | Validation error or invalid split |
| 401 | Missing or invalid token |
| 403 | You aren't a member of this group |
| 404 | Not found |
| 409 | Duplicate (email already registered, or member already in the group) |
| 500 | Unexpected server error |

### Authorization model
A user can read and change a group when **their account email matches one of the group's members**. That means:
* Creating a group adds you as its first member.
* Adding someone by email gives them access as soon as they register with that email, and their account is linked to their existing balances.
* Members don't need an account to be included in a split.

## How the money works

All calculations happen in integer **paise**. Money is stored as `numeric(12,2)` and is never a `Float`. See [`database/README.md`](database/README.md#money-rules) for the full rules. In short:

* **Splits always add up.** Rs 1,000 among 3 is 333.33 / 333.33 / 333.34; the leftover paise go to the last members.
* **Net balance** = paid − own shares + settlements paid − settlements received. The balances in a group always sum to exactly 0.
* **Settle-up** is greedy: the largest debtor pays the largest creditor, as much as the smaller of the two balances, and this repeats. Every payment clears at least one person, so there are never more than *members − 1* payments.

## Testing

```bash
cd backend
cp .env.test.example .env.test     # first time only
npm test
```

* **Unit tests** (`tests/unit`) cover money parsing, all three split types (including a sweep of 1,500+ amount and member-count combinations), net balances, and 300 randomised ledgers. The randomised tests check that balances sum to 0, that settle-up uses at most *n − 1* payments, and that applying the suggested payments clears every balance.
* **Integration tests** (`tests/integration`) call the real Express app with Supertest against Postgres. They cover:
  * auth: 401 errors, duplicate registration, login
  * groups and members: validation, 403 and 404 errors, duplicate members
  * all three split types, and 9 kinds of invalid expense
  * a forced rollback, which proves an expense and its shares are saved together or not at all
  * CSV export and deleting an expense
  * recording settlements until every balance reaches 0
* **Postman:** run `postman collection run postman/expense-splitter.postman_collection.json` while the API is running. It walks every endpoint in order with 19 assertions.

### Acceptance criteria

| Criterion | Where it is enforced | Verified by |
| --- | --- | --- |
| Rs 1,000 among 3 → 333.33, 333.33, 333.34; totals always match | `domain/split.ts` `splitEqually` | `split.test.ts`, `api.test.ts`, Postman |
| Sum of all net balances is exactly 0 | `domain/balances.ts`, paise arithmetic | `balances.test.ts` (randomised), `api.test.ts`, Postman |
| Settle-up suggests at most members − 1 payments | `suggestSettlements` | `balances.test.ts` (randomised), `api.test.ts`, Postman |
| Recording a settlement updates balances immediately | Balances recomputed from the ledger on every request; UI reloads after each change | `api.test.ts`, Postman |
| An expense and its shares are saved together or not at all | `prisma.$transaction` in `persistExpense` | `api.test.ts` rollback test |

## Architecture notes

* **Layering:** a request goes route → middleware (auth, group access, Zod validation) → controller → service → Prisma. The money, split and settle-up maths in `src/domain` is pure, so it can be unit-tested without a database.
* **Single source of truth:** balances are never stored. They are derived from expenses and settlements, so they can't drift out of sync.
* **Frontend:** client components talk to the API through one typed client (`lib/api.ts`), which attaches the JWT, normalises errors, and logs the user out on a 401. Forms validate on the client for quick feedback, and the server repeats every check.
* **Security:** bcrypt password hashes; JWTs signed with a secret from the environment; Helmet; a CORS allow-list; a 100 kB JSON body limit; CSV cells protected against formula injection; post-login redirects limited to same-site paths.
