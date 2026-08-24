import 'dotenv/config';
import prisma from '../src/lib/prisma.js';

const tables = [
  'users',
  'organizations',
  'projects',
  'wallets',
  'sub_wallets',
  'payees',
  'payment_requests',
  'transactions',
  'ledger_entries',
  'approvals',
  'audit_logs',
];

async function main() {
  const [{ connected }] = await prisma.$queryRaw`SELECT 1 AS connected`;
  const tableCounts = [];

  for (const table of tables) {
    const [{ count }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM ${table}`);
    tableCounts.push({ table, count });
  }

  console.log(JSON.stringify({ connected, tableCounts }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
