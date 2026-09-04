# DonorFlow

DonorFlow is a purpose-bound fintech accountability demo for tracking donor funding, project allocations, sub-wallet spending, and approval workflows in a controlled MVP environment.

## What this app does

- Donor creates a project and funds a wallet
- Recipient is assigned to the project and submits payment requests
- Donor approves, rejects, or freezes requests
- Admin verifies payees and vendors
- Dashboards and reports update from the internal transaction ledger
- The app simulates funding movement without real banking operations

## System flow

Donor → Project → Wallet → Sub-wallet → Payment Request → Approval → Transaction → Ledger

## Tech stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma
- Charts: Recharts

## Repository structure

```text
DonorFlow/
├── backend/
│   ├── prisma/
│   ├── src/
│   ├── .env
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── docs/
│   ├── FILE_DESCRIPTIONS.md
│   └── donorflow_system_designPDF.pdf
├── README.md
└── package-lock.json
```

## Local setup

### 1) Install dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

### 2) Configure environment

Use the `.env.example` file in `backend` as a starting point and create a `.env` with your local database connection and JWT secret.

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/donorflow"
JWT_SECRET="change-this-secret"
PORT=5000
FRONTEND_URL="http://localhost:5173"
```

### 3) Initialize the database

```bash
cd backend
npx prisma generate
npx prisma db push
npm run db:seed
```

### 4) Run the app

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Frontend URL: http://localhost:5173
Backend URL: http://localhost:5000

## Production readiness checklist

This repository is an MVP demo and is not a live banking system. Before hosting it publicly:

- Use separate production hosting for the frontend, API, and PostgreSQL database, with HTTPS enabled.
- Set `NODE_ENV=production`, a strong unique `JWT_SECRET`, the production `DATABASE_URL`, and the exact frontend URL in `FRONTEND_URL`. Multiple allowed frontend origins may be separated by commas.
- Set frontend `VITE_API_URL` to the public API base URL, including `/api` (for example, `https://api.example.com/api`). A relative `/api` works only when the host reverse-proxies `/api` to the backend.
- Configure the frontend host to serve `frontend/dist/index.html` for unknown routes so direct visits to `/dashboard` and other React routes do not return 404.
- Run database migrations against a backup, then verify `/api/health` and `/api/health/db`. Do not run the seed script against a production database.
- Replace all demo credentials, review authorization and rate limiting, and do not expose Prisma Studio or PostgreSQL publicly.
- Test the hosted app at mobile widths, desktop widths, login, refresh on a nested route, API failures, logout, and each role before announcing it.

The backend now refuses to start in production with missing configuration or the example JWT secret. That prevents an incomplete deployment from appearing healthy while authentication is unsafe.

## Demo accounts

These are the working accounts created by the seed script.

| Role | Name | Email | Password |
|------|------|-------|----------|
| Admin | System Admin | admin@donorflow.demo | password123 |
| Donor | Martha Phiri | martha.phiri@donorflow.demo | password123 |
| Recipient | Daniel Mwansa | daniel.mwansa@donorflow.demo | password123 |

## Current presentation dataset

The seed creates a realistic project called:

- Rural Health and Nutrition Program

With these key sub-wallets:

| Sub-wallet | Purpose | Allocation |
|------------|---------|------------|
| Community Screenings | Health screenings | ZMW 35,000 |
| Nutrition Support | Food and nutrition assistance | ZMW 30,000 |
| Field Transport | Travel and logistics | ZMW 25,000 |
| Community Outreach | Awareness sessions | ZMW 20,000 |

The project is funded at ZMW 150,000 and is ready for donor approval and recipient payment requests.

## Recommended presentation flow

1. Log in as the donor using `martha.phiri@donorflow.demo`
2. Open the project and review the wallet and sub-wallet balances
3. Log in as the recipient using `daniel.mwansa@donorflow.demo`
4. Create payees and verify them as admin
5. Submit payment requests from the correct sub-wallet
6. Log back in as donor and approve pending requests from Approvals
7. Check the dashboard and transaction history for the updated balances

## Important rules for the demo

- Payees must be `verified` before a payment request can be used realistically
- The request amount must stay within the selected sub-wallet balance
- Payment purpose should match the sub-wallet purpose closely
- Donor approval is required to complete a payment request

## API health checks

These endpoints are useful for validation before a public test:

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/health/db
```

Expected output: status `ok` and database connected.

## Useful commands

Reset seed and rebuild demo data:

```bash
cd backend
npm run db:push
npm run db:seed
```

Verify database health:

```bash
cd backend
npm run db:check
```

Build frontend:

```bash
cd frontend
npm run build
```

## Known good workflow for public testing

Before presenting the app:

1. Start backend
2. Start frontend
3. Confirm API health endpoints return OK
4. Seed the database fresh if the app has stale demo data
5. Log in using the demo accounts above
6. Avoid changing schema or seed logic at the last minute

## Troubleshooting

If the app looks wrong or data seems stale:

```bash
cd backend
npm run db:push
npm run db:seed
```

If login or project data fails:

- confirm PostgreSQL is running
- confirm `.env` contains a valid `DATABASE_URL`
- confirm `JWT_SECRET` exists
- confirm backend server started on port 5000

## Notes

- This is an MVP demo, not a live banking system
- No real funds move between accounts
- The ledger is an internal simulation used for accountability and reporting

For file-level implementation notes, see [docs/FILE_DESCRIPTIONS.md](docs/FILE_DESCRIPTIONS.md).
