# DonorFlow MVP

**Purpose-bound fintech accountability platform** — track donor funds from allocation through approval to payee, with a simulated internal ledger (no real money movement in MVP).

## Accountability chain

```
Donor → Project → Sub-Wallet → Payment Request → Approval → Payee → Report
```

## Tech stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | React + Vite + Tailwind |
| Backend  | Node.js + Express       |
| Database | PostgreSQL + Prisma   |
| Charts   | Recharts                |

## Project structure

```
DonorFlow/
├── backend/          # Express API, Prisma, business logic
│   ├── prisma/       # Schema, migrations, seed
│   └── src/
│       ├── routes/
│       ├── services/
│       └── middleware/
└── frontend/         # React dashboard (donor, recipient, admin)
```

## Quick start

### 1. Database

Create a PostgreSQL database (local or [Supabase](https://supabase.com)) and copy env:

```bash
cd backend
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET
```

### 2. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

API runs at **http://localhost:5000**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:5173**

## Demo accounts

| Role      | Email                    | Password    |
|-----------|--------------------------|-------------|
| Donor     | donor@donorflow.demo     | password123 |
| Recipient | recipient@donorflow.demo | password123 |
| Admin     | admin@donorflow.demo     | password123 |

## Demo scenario

1. **Donor** logs in — sees K100,000 Digital Skills Training project with 5 sub-wallets.
2. **Recipient** sees pending K8,000 request to ABC Printers (Training Materials).
3. **Donor** opens **Approvals**, reviews invoice/details, **Approves**.
4. System creates transaction + debit ledger entry; Training Materials balance drops to K22,000.
5. **Reports** and dashboards update automatically.

## MVP features implemented

- User registration/login (donor, recipient, admin)
- Project creation and simulated funding
- Purpose-based sub-wallets with approval limits
- Payee/vendor recording and admin verification
- Payment requests with rule engine (balance, limits, verification, invoice, purpose)
- Donor approve / reject / freeze
- Transactions + ledger entries (credit/debit)
- Donor, recipient, and admin dashboards
- Reports with Recharts
- Audit logs

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/projects` | List projects |
| POST | `/api/projects/:id/fund` | Simulate funding |
| POST | `/api/projects/:id/sub-wallets` | Create sub-wallet |
| POST | `/api/payments/requests` | Submit payment request |
| POST | `/api/payments/requests/:id/approve` | Approve/reject/freeze |
| GET | `/api/reports/dashboard` | Role-based dashboard |
| GET | `/api/reports/projects/:id` | Project report |

## Deployment (recommended)

- **Frontend:** Vercel
- **Backend:** Render or Railway
- **Database:** Supabase PostgreSQL

Set `VITE_API_URL` on the frontend to your deployed API URL.

## Out of scope (post-MVP)

Real bank/mobile money integration, KYC automation, AI fraud detection, blockchain, push notifications.
